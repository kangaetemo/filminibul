// Hybrid reranker (sunucu tarafı). scripts/rerank/reranker.mjs'deki kazanan konfigürasyonun
// ("lightNoRec") TypeScript karşılığı. Ağırlıkları değiştirmeden önce scripts/rerank/llm_judge.mjs ile ölç.
//
// LLM eval (gpt-4.1, 50 seed, v3 embedding) nDCG@10: ağır hybrid 0.78 · saf semantic 0.80 · bu konfigürasyon 0.82.
// v3 embedding keyword/tür/yönetmeni zaten içerdiği için semantic ana sinyal; diğerleri küçük düzeltme.
// Keyword aday kanalı ve TMDB öneri bonusu ölçülebilir katkı yapmadığı için burada yok.

import english from "@/lib/i18n/en.json";
import idf from "@/data/idf.json";
// Keyword'lerin Türkçe karşılıkları + açıklamada gösterilmeyecekler (scripts/tmdb/translate_keywords.mjs üretir).
// Sadece gösterim: skorlama İngilizce keyword'lerle yapılır.
import keywordsTr from "@/data/keywords_tr.json";
import { GENRE_MAP_TR } from "@/lib/tmdb";
import type { FilmRow, Candidate } from "./types";
import { collectionLabel } from "./collections";

const CONFIG = {
    weights: {
        semantic: 0.75,
        keyword: 0.05,
        genre: 0.04,
        director: 0.03,
        quality: 0.04,
        collection: 0.08,
    },
    penalties: {
        genreMismatch: 0.15, // seed'de olmayan "tür değiştiren" genre adayda varsa
        adultContent: 0.3, // seed yetişkin içerik değilken aday öyleyse
        lowVotes: 0.08, // vote_count < minVotes
        noOverview: 0.05,
        noPoster: 0.05,
    },
    minVotes: 20,
    qualityVoteTarget: 5000,
    maxPerDirector: 10,
    maxPerCollection: 4,
} as const;

type Component = keyof typeof CONFIG.weights;

// Seed'de yoksa adayda görünmesi filmin karakterini değiştiren türler
const MISMATCH_GENRES = new Set([16, 99, 10770, 10402]);
const ADULT_KEYWORDS = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

const idfTable = idf as { n: number; keywords: Record<string, number>; genres: Record<string, number> };
const idfOf = (df: number | undefined) => Math.log((idfTable.n + 1) / ((df ?? 0) + 1)) + 1;
const kwIdf = (k: string) => idfOf(idfTable.keywords[k]);
const genreIdf = (g: number) => idfOf(idfTable.genres[String(g)]);

const kwDict = keywordsTr as { tr: Record<string, string>; hidden: string[] };
const HIDDEN_KEYWORDS = new Set(kwDict.hidden);
// Paylaşılması benzerlik anlamına gelmeyen keyword'leri (ör. "woman director") at, kalanları Türkçeleştir
const displayKeywords = (keywords: string[]) => keywords.filter((k) => !HIDDEN_KEYWORDS.has(k)).map((k) => kwDict.tr[k] ?? k);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const genreIds = (f: FilmRow) => (f.genres ?? []).map((g) => g.id);
const isAdult = (f: FilmRow) => (f.keywords ?? []).some((k) => ADULT_KEYWORDS.has(k));

// IDF ağırlıklı ikili vektörler arasında cosine: ortak nadir öğeler yüksek skor verir
function weightedOverlap<T>(seedItems: T[], candItems: T[], weight: (x: T) => number) {
    const a = new Set(seedItems);
    const b = new Set(candItems);
    if (a.size === 0 || b.size === 0) return { score: 0, shared: [] as T[] };
    let dot = 0;
    let na = 0;
    let nb = 0;
    const shared: T[] = [];
    for (const x of Array.from(a)) {
        const w = weight(x) ** 2;
        na += w;
        if (b.has(x)) {
            dot += w;
            shared.push(x);
        }
    }
    for (const x of Array.from(b)) nb += weight(x) ** 2;
    shared.sort((x, y) => weight(y) - weight(x));
    return { score: dot / Math.sqrt(na * nb), shared };
}

export interface ScoredFilm {
    film: Candidate;
    final: number;
    components: Record<Component, number>;
    weighted: Record<Component, number>;
    penalties: Partial<Record<keyof typeof CONFIG.penalties, number>>;
    signals: {
        sameCollection: string | null;
        sameDirector: boolean;
        sharedKeywords: string[];
        sharedGenres: string[];
    };
}

function scoreCandidate(seed: FilmRow, cand: Candidate, semanticNorm: number, kwMax: number): ScoredFilm {
    const kw = weightedOverlap(seed.keywords ?? [], cand.keywords ?? [], kwIdf);
    const gen = weightedOverlap(genreIds(seed), genreIds(cand), genreIdf);
    const sameDirector = !!seed.director && seed.director === cand.director;
    const sameCollection = seed.collection_id != null && seed.collection_id === cand.collection_id;

    const components: Record<Component, number> = {
        semantic: semanticNorm,
        // Havuzdaki en iyi keyword eşleşmesine göre ölçekle; eşleşme zayıfsa şişirme (taban 0.25)
        keyword: clamp01(kw.score / Math.max(kwMax, 0.25)),
        genre: gen.score,
        director: sameDirector ? 1 : 0,
        quality: clamp01(
            0.7 * (Math.log10((cand.vote_count ?? 0) + 1) / Math.log10(CONFIG.qualityVoteTarget)) +
                0.3 * clamp01(((cand.rating ?? 0) - 5) / 3)
        ),
        collection: sameCollection ? 1 : 0,
    };

    const seedGenres = new Set(genreIds(seed));
    const penalties: ScoredFilm["penalties"] = {};
    if (genreIds(cand).some((g) => MISMATCH_GENRES.has(g) && !seedGenres.has(g))) penalties.genreMismatch = CONFIG.penalties.genreMismatch;
    if (isAdult(cand) && !isAdult(seed)) penalties.adultContent = CONFIG.penalties.adultContent;
    if ((cand.vote_count ?? 0) < CONFIG.minVotes) penalties.lowVotes = CONFIG.penalties.lowVotes;
    if (!cand.overview && !cand.tr_overview) penalties.noOverview = CONFIG.penalties.noOverview;
    if (!cand.poster_path) penalties.noPoster = CONFIG.penalties.noPoster;

    const weighted = {} as Record<Component, number>;
    let total = 0;
    for (const name of Object.keys(CONFIG.weights) as Component[]) {
        weighted[name] = CONFIG.weights[name] * components[name];
        total += weighted[name];
    }
    const penaltyTotal = Object.values(penalties).reduce((s, p) => s + (p ?? 0), 0);

    return {
        film: cand,
        final: total - penaltyTotal,
        components,
        weighted,
        penalties,
        signals: {
            sameCollection: sameCollection ? collectionLabel(seed.collection_id, seed.collection_name) : null,
            sameDirector,
            sharedKeywords: kw.shared,
            sharedGenres: gen.shared.map((g) => GENRE_MAP_TR[g] ?? String(g)),
        },
    };
}

/**
 * "Neden önerildi?" satırları, önem sırasıyla (UI ilk 1-2'sini gösterir).
 * Sadece pipeline'daki gerçek sinyallerden üretilir.
 */
export function explainParts(s: ScoredFilm, language: "tr" | "en" = "tr"): string[] {
    const en = language === "en";
    const { signals, components } = s;
    const parts: string[] = [];
    if (signals.sameCollection) parts.push(en ? `Collection: ${s.film.collection_name || signals.sameCollection}` : `Seri: ${signals.sameCollection}`);
    if (signals.sameDirector) parts.push(`${en ? "Director" : "Yönetmen"}: ${s.film.director}`);
    const themes = (en ? signals.sharedKeywords.filter(k => !HIDDEN_KEYWORDS.has(k)) : displayKeywords(signals.sharedKeywords)).slice(0, 3);
    if (themes.length) parts.push(`${en ? "Themes" : "Temalar"}: ${themes.join(", ")}`);
    if (signals.sharedGenres.length >= 2) parts.push(`${en ? "Genres" : "Türler"}: ${signals.sharedGenres.map(g => en ? (english as Record<string, string>)[g] || g : g).join(", ")}`);
    if (!parts.length) parts.push(components.semantic > 0.7 ? (en ? "Similar story and atmosphere" : "Hikâye ve atmosfer benzerliği") : (en ? "General similarity" : "Genel benzerlik"));
    return parts;
}

export const explain = (s: ScoredFilm) => explainParts(s).join(" · ");

/** İki filmin ortak temaları, en nadirden başlayarak, Türkçe (gösterilmeyen meta keyword'ler hariç). */
export function sharedThemes(a: string[] | null, b: string[] | null, limit = 2, language: "tr" | "en" = "tr"): string[] {
    const other = new Set(b ?? []);
    const shared = (a ?? []).filter((k) => other.has(k) && !HIDDEN_KEYWORDS.has(k));
    shared.sort((x, y) => kwIdf(y) - kwIdf(x));
    return language === "en" ? shared.slice(0, limit) : displayKeywords(shared.slice(0, limit));
}

/** Semantic adayları yeniden sıralar; diversity sınırlarıyla Top N döndürür. */
export function rerank(seed: FilmRow, candidates: Candidate[], topN = 20): ScoredFilm[] {
    if (!candidates.length) return [];
    const sims = candidates.map((c) => c.similarity);
    const min = Math.min(...sims);
    const span = Math.max(...sims) - min || 1;
    const kwMax = Math.max(0, ...candidates.map((c) => weightedOverlap(seed.keywords ?? [], c.keywords ?? [], kwIdf).score));

    const scored = candidates
        .map((c) => scoreCandidate(seed, c, (c.similarity - min) / span, kwMax))
        .sort((a, b) => b.final - a.final);

    // Diversity: relevance sırasını bozmadan aynı yönetmen / aynı seriden en fazla N film
    const perDirector = new Map<string, number>();
    const perCollection = new Map<number, number>();
    const top: ScoredFilm[] = [];
    for (const s of scored) {
        if (top.length >= topN) break;
        const d = s.film.director;
        const c = s.film.collection_id;
        if (d && (perDirector.get(d) ?? 0) >= CONFIG.maxPerDirector) continue;
        if (c != null && (perCollection.get(c) ?? 0) >= CONFIG.maxPerCollection) continue;
        if (d) perDirector.set(d, (perDirector.get(d) ?? 0) + 1);
        if (c != null) perCollection.set(c, (perCollection.get(c) ?? 0) + 1);
        top.push(s);
    }
    return top;
}
