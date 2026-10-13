// Doğal dil ("vibe") arama: "zaman döngüsünde sıkışmış bir karakter", "yağmurlu melankolik bir film"…
//
// Akış: sorgu → LLM ile film belgesi formatına (Genres/Themes/Setting/Story) çevrilir → embed edilir →
//       Supabase vibe_search_v3 (HNSW) → hafif kalite ayarı → film listesi + "neden eşleşti".
//
// Neden belgeye çeviriyoruz: filmler "Genres/Themes/Story" belgeleriyle embed'li. Türkçe cümleyi doğrudan
// embed etmek alakasız sonuç veriyor (ölçüldü: scripts/rerank/vibe_try.mjs), belge formatına çevirmek çok daha iyi.
//
// Maliyet: arama başına ~$0.0002 (gpt-4.1-mini + embedding). Sonuçlar sunucuda önbelleklenir ve IP başına
// hız sınırı vardır, çünkü bu uç nokta herkese açık ve OpenAI'ye para ödüyor.

import keywordsTr from "@/data/keywords_tr.json";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "@/lib/recommend/embeddingDoc.mjs";
import { supabaseRpc } from "@/lib/server/supabase";
import { createVibeOpenAI, VibeProviderError } from "@/lib/server/vibeOpenAI.mjs";
import { toFilmDTO } from "./similar";
import type { Candidate, FilmDTO } from "./types";

export const VIBE_MIN_CHARS = 4;
export const VIBE_MAX_CHARS = 240;
const POOL = 60;
const RESULT_LIMIT = 24;

export class VibeError extends Error {
    constructor(message: string, public status: number, public code = "vibe_search_failed", public retryAfter?: number) {
        super(message);
    }
}

export interface VibeFilm {
    film: FilmDTO;
    /** Aramanın temalarıyla filmin keyword'lerinin kesişimi (Türkçe), en fazla 3 */
    matched: string[];
    matchedEn: string[];
    score: number;
}

export interface VibeResult {
    query: string;
    films: VibeFilm[];
}

const EXPAND_SYSTEM = `You convert a movie-search request (usually Turkish) into a short document in the exact format used to index films, so it can be matched by semantic search. Output ONLY these lines, in English:
Genres: <1-3 genres>
Themes: <8-14 comma-separated lowercase themes/keywords: plot devices, motifs, mood, tone, setting>
Setting: <countries · language · decade — ONLY if the request explicitly names a country, language or era; never infer it from the language the request is written in; otherwise omit this line>
Story: <1-2 sentences describing the kind of film wanted, in the style of a film synopsis, never naming a specific film>
Never include film titles. Capture mood and atmosphere, not just plot. If the request is not about films at all, output exactly: NONE`;

const kwDict = keywordsTr as { tr: Record<string, string>; hidden: string[] };
const HIDDEN = new Set(kwDict.hidden);
const ADULT = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

// ---- Önbellek ve hız sınırı (sunucu örneği başına; Vercel'de her sıcak örnek kendi kopyasına sahip) ----

const CACHE_TTL_MS = 6 * 3600_000;
const CACHE_MAX = 300;
const cache = new Map<string, { at: number; value: VibeResult }>();

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8; // IP başına dakikada 8 yeni (önbellekte olmayan) arama
const hits = new Map<string, number[]>();

function checkRate(ip: string): void {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) throw new VibeError("Çok hızlı arıyorsun, bir dakika sonra tekrar dene.", 429);
    recent.push(now);
    hits.set(ip, recent);
    // Bellek şişmesin: çok IP birikirse süresi dolmuş kayıtları temizle
    if (hits.size > 5000) hits.forEach((v, k) => v.every((t) => now - t >= RATE_WINDOW_MS) && hits.delete(k));
}

const normalizeQuery = (q: string) => q.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

// ---- OpenAI ----

const openai = createVibeOpenAI();

function providerError(error: unknown): never {
    if (error instanceof VibeProviderError) {
        const unavailable = error.kind === "quota" || error.kind === "unavailable";
        throw new VibeError(unavailable ? "Tarif araması şu an kullanılamıyor. Film adıyla arama yapabilir veya ruh hâline göre keşfedebilirsin." : "Tarif araması şu an yoğun. Biraz sonra yeniden deneyebilirsin.", 503, unavailable ? "vibe_service_unavailable" : "vibe_service_busy", error.retryAfter);
    }
    throw error;
}

async function expandToDoc(query: string): Promise<string> {
    try {
        const data = await openai.call("chat/completions", {
            model: "gpt-4.1-mini",
            temperature: 0,
            max_tokens: 300,
            messages: [
                { role: "system", content: EXPAND_SYSTEM },
                { role: "user", content: query },
            ],
        });
        return (data?.choices?.[0]?.message?.content ?? "").trim();
    } catch (error) { return providerError(error); }
}

async function embedDoc(doc: string): Promise<number[]> {
    try {
        const data = await openai.call("embeddings", { model: EMBEDDING_MODEL, input: doc, dimensions: EMBEDDING_DIMS });
        const vector = data?.data?.[0]?.embedding;
        if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMS || !vector.every(Number.isFinite)) throw new VibeProviderError("busy");
        return vector;
    } catch (error) { return providerError(error); }
}

// ---- Sıralama ----

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Semantic benzerlik ana sinyal; oy/puan sadece eşitliği bozacak kadar (≤0.04) etki eder. */
function finalScore(c: Candidate): number {
    const quality = clamp01(((c.rating ?? 0) - 6) / 3) * 0.02 + clamp01((Math.log10(Math.max(c.vote_count ?? 1, 1)) - 2) / 3) * 0.02;
    return c.similarity + quality;
}

function parseThemes(doc: string): Set<string> {
    const line = doc.split("\n").find((l) => l.toLowerCase().startsWith("themes:"));
    return new Set((line?.slice(7) ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
}

function matchedThemes(themes: Set<string>, keywords: string[] | null, language: "tr" | "en" = "tr"): string[] {
    const out: string[] = [];
    for (const k of keywords ?? []) {
        if (HIDDEN.has(k) || !themes.has(k.toLowerCase())) continue;
        out.push(language === "en" ? k : kwDict.tr[k] ?? k);
        if (out.length === 3) break;
    }
    return out;
}

// ---- Ana fonksiyon ----

export async function vibeSearch(rawQuery: string, ip = "unknown"): Promise<VibeResult> {
    const query = rawQuery.replace(/\s+/g, " ").trim();
    if (query.length < VIBE_MIN_CHARS) throw new VibeError("Biraz daha ayrıntı yaz.", 400);
    if (query.length > VIBE_MAX_CHARS) throw new VibeError(`En fazla ${VIBE_MAX_CHARS} karakter yazabilirsin.`, 400);

    const key = normalizeQuery(query);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    try { openai.ensureAvailable(); } catch (error) { providerError(error); }
    checkRate(ip);

    const doc = await expandToDoc(query);
    if (!doc || doc === "NONE" || !/^genres:|^themes:|^story:/im.test(doc)) {
        throw new VibeError("Bunu bir film aramasına çeviremedim. Nasıl bir film istediğini biraz daha anlat.", 422);
    }
    const vector = await embedDoc(doc);
    // pgvector metin biçimi: "[0.1,0.2,...]"
    const rows = await supabaseRpc<Candidate[]>("vibe_search_v3", { query_embedding: `[${vector.join(",")}]`, match_limit: POOL }, 3600);

    const themes = parseThemes(doc);
    const films = rows
        .filter((r) => r.poster_path && !(r.keywords ?? []).some((k) => ADULT.has(k)))
        .map((r) => ({ film: toFilmDTO(r), matched: matchedThemes(themes, r.keywords), matchedEn: matchedThemes(themes, r.keywords, "en"), score: Math.round(finalScore(r) * 1000) / 1000 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, RESULT_LIMIT);

    const value: VibeResult = { query, films };
    cache.set(key, { at: Date.now(), value });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return value;
}
