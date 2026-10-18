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

import idf from "@/data/idf.json";
import keywordsTr from "@/data/keywords_tr.json";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "@/lib/recommend/embeddingDoc.mjs";
import { supabaseRpc } from "@/lib/server/supabase";
import { createVibeOpenAI, VibeProviderError } from "@/lib/server/vibeOpenAI.mjs";
import { toFilmDTO } from "./similar";
import { matchThemes, themeCoverage, type ThemeMatch } from "./vibeThemes.mjs";
import { countryFit, eraFit, parseConditions, type VibeConditions } from "./vibeConditions.mjs";
import type { Candidate, FilmDTO } from "./types";

export const VIBE_MIN_CHARS = 4;
export const VIBE_MAX_CHARS = 240;
// Aday havuzu: tema eşleşmesi derindeki uygun filmleri öne alabilsin diye 60 → 150 (SQL en fazla 300 aday bakar)
const POOL = 150;
const RESULT_LIMIT = 24;

export class VibeError extends Error {
    constructor(message: string, public status: number, public code = "vibe_search_failed", public retryAfter?: number) {
        super(message);
    }
}

export interface VibeFilm {
    film: FilmDTO;
    /** Aramanın temalarıyla eşleşen gerçek film keyword'leri (Türkçe), en fazla 3 */
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

export const normalizeQuery = (q: string) => q.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

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

/**
 * Tema eşleşmesinin sıralamaya katkısı (AR-04). Son skor = benzerlik + kalite (≤0,04) + ağırlık × tema kapsamı.
 * 0 = eski davranış. 18 Ekim yerel ölçümü (32 tarif, aynı adaylar, gpt-4.1 hakem): 0 → 2,18 · 0,1 → 2,19 ·
 * 0,2 → 2,20 · 0,3 → 2,19; kazanç çoğunlukla ruh hâli tariflerinde (ton 2,20 → 2,30). Değiştirmeden önce yeniden ölç:
 * scripts/rerank/vibe_judge.mjs --source local --weights …
 */
export const VIBE_THEME_WEIGHT = 0.2;

/**
 * Tarifte açıkça geçen dönem ("80'lerde") ve ülke / dil ("Kore yapımı") şartlarına uyan filmlerin katkısı ve
 * aday olmak için en az oy sayısı (AR-04). Varsayılanlar eski davranış; değerler tek yerel ölçümde
 * (vibe_judge.mjs --variants …) her biri ayrı ve hepsi birlikte denenerek seçilir.
 */
export const VIBE_ERA_WEIGHT = 0;
export const VIBE_COUNTRY_WEIGHT = 0;
export const VIBE_MIN_VOTES = 100;

export interface VibeRankOptions {
    themeWeight?: number;
    eraWeight?: number;
    countryWeight?: number;
    conditions?: VibeConditions;
    limit?: number;
}

/** Semantic benzerlik ana sinyal; oy/puan sadece eşitliği bozacak kadar (≤0.04) etki eder. */
function qualityBonus(c: Candidate): number {
    return clamp01(((c.rating ?? 0) - 6) / 3) * 0.02 + clamp01((Math.log10(Math.max(c.vote_count ?? 1, 1)) - 2) / 3) * 0.02;
}

const idfTable = idf as { n: number; keywords: Record<string, number> };
const IDF_MAX = Math.log(idfTable.n + 1) + 1;
/** Nadir keyword daha değerli: film önerilerindeki reranker ile aynı IDF, 0–1'e ölçekli. */
const keywordWeight = (k: string) => (Math.log((idfTable.n + 1) / ((idfTable.keywords[k] ?? 0) + 1)) + 1) / IDF_MAX;

function parseThemes(doc: string): string[] {
    const line = doc.split("\n").find((l) => l.toLowerCase().startsWith("themes:"));
    return Array.from(new Set((line?.slice(7) ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

/** "Neden eşleşti" etiketleri: tema ile eşleşen gerçek keyword'ler (Türkçe / İngilizce), en fazla 3. */
function reasonLabels(matches: ThemeMatch[], language: "tr" | "en"): string[] {
    return [...matches].sort((a, b) => b.similarity * b.weight - a.similarity * a.weight).slice(0, 3).map((m) => (language === "en" ? m.keyword : kwDict.tr[m.keyword] ?? m.keyword));
}

const NO_CONDITIONS: VibeConditions = { decades: [], countries: [], languages: [] };

/** Aday listesini sıralar; ücretli çağrı yok. Değerlendirme betiği aynı adaylarla farklı ağırlıkları dener. */
export function rankVibe(rows: Candidate[], themes: string[], { themeWeight = VIBE_THEME_WEIGHT, eraWeight = VIBE_ERA_WEIGHT, countryWeight = VIBE_COUNTRY_WEIGHT, conditions = NO_CONDITIONS, limit = RESULT_LIMIT }: VibeRankOptions = {}): VibeFilm[] {
    return rows
        .filter((r) => r.poster_path && !(r.keywords ?? []).some((k) => ADULT.has(k)))
        .map((r) => {
            const matches = matchThemes(themes, r.keywords, { hidden: HIDDEN, idf: keywordWeight });
            const score = r.similarity + qualityBonus(r) + themeWeight * themeCoverage(matches, themes.length)
                + eraWeight * (eraFit(r.year, conditions.decades) ?? 0)
                + countryWeight * (countryFit(r.countries, r.language, conditions) ?? 0);
            return { film: toFilmDTO(r), matched: reasonLabels(matches, "tr"), matchedEn: reasonLabels(matches, "en"), score: Math.round(score * 1000) / 1000 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

// ---- Ana fonksiyon ----

/** Aşama süreleri (ms); yalnız önbellekte olmayan aramada doldurulur. */
export interface VibeTiming {
    chat?: number;
    embed?: number;
    db?: number;
}

function cleanQuery(rawQuery: string): string {
    const query = rawQuery.replace(/\s+/g, " ").trim();
    if (query.length < VIBE_MIN_CHARS) throw new VibeError("Biraz daha ayrıntı yaz.", 400);
    if (query.length > VIBE_MAX_CHARS) throw new VibeError(`En fazla ${VIBE_MAX_CHARS} karakter yazabilirsin.`, 400);
    return query;
}

/** Embedding'e en yakın adaylar (Supabase). Oy sınırı farklı aday havuzlarını denemek için ayrı çağrılabilir. */
export async function vibeRows(vector: number[], minVotes = VIBE_MIN_VOTES): Promise<Candidate[]> {
    // pgvector metin biçimi: "[0.1,0.2,...]"
    return supabaseRpc<Candidate[]>("vibe_search_v3", { query_embedding: `[${vector.join(",")}]`, match_limit: POOL, ...(minVotes !== 100 && { min_votes: minVotes }) }, 3600);
}

/** Ücretli kısım: tarif → film belgesi (LLM) → embedding → Supabase adayları. Hız sınırı burada uygulanır. */
export async function vibeCandidates(rawQuery: string, ip = "unknown", timing: VibeTiming = {}): Promise<{ query: string; doc: string; themes: string[]; conditions: VibeConditions; vector: number[]; rows: Candidate[] }> {
    const query = cleanQuery(rawQuery);
    try { openai.ensureAvailable(); } catch (error) { providerError(error); }
    checkRate(ip);

    let started = Date.now();
    const doc = await expandToDoc(query);
    timing.chat = Date.now() - started;
    if (!doc || doc === "NONE" || !/^genres:|^themes:|^story:/im.test(doc)) {
        throw new VibeError("Bunu bir film aramasına çeviremedim. Nasıl bir film istediğini biraz daha anlat.", 422);
    }
    started = Date.now();
    const vector = await embedDoc(doc);
    timing.embed = Date.now() - started;
    started = Date.now();
    const rows = await vibeRows(vector);
    timing.db = Date.now() - started;
    // Sorgu metni loglanmaz; yalnız aşama süreleri (Vercel loglarında yavaş aramaları ayırmak için)
    console.info("vibe_timing", timing);
    return { query, doc, themes: parseThemes(doc), conditions: parseConditions(query, doc), vector, rows };
}

export async function vibeSearch(rawQuery: string, ip = "unknown", timing: VibeTiming = {}): Promise<VibeResult> {
    const key = normalizeQuery(cleanQuery(rawQuery));
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const { query, themes, conditions, rows } = await vibeCandidates(rawQuery, ip, timing);
    const value: VibeResult = { query, films: rankVibe(rows, themes, { conditions }) };
    cache.set(key, { at: Date.now(), value });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return value;
}
