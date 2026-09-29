// Hybrid reranker: semantic adayları metadata sinyalleriyle yeniden sıralar.
// Saf fonksiyonlar; ağ/dosya erişimi yok. Her skor bileşeni [0,1] aralığında normalize edilir,
// ağırlıklarla toplanır, sonra ceza düşülür. Her aday için bileşenler debug için saklanır.

// Varsayılan: "lightNoRec". LLM eval (gpt-4.1, 50 seed, v3 embedding) nDCG@10:
//   ağır hybrid 0.78 · saf semantic 0.80 · light ailesi 0.82
// v3 embedding keyword/tür/yönetmeni zaten içerdiği için semantic ana sinyal; diğerleri küçük düzeltme.
// TMDB öneri bonusu ölçülebilir katkı yapmadı (light ile lightNoRec eşit), bu yüzden kapalı.
export const DEFAULT_CONFIG = {
    weights: {
        semantic: 0.75,
        keyword: 0.05,
        genre: 0.04,
        director: 0.03,
        cast: 0,
        year: 0,
        language: 0,
        quality: 0.04,
        // TMDB'nin davranışsal önerisi: aday havuzda VE TMDB de öneriyorsa bonus (aday eklemez)
        tmdbRec: 0,
        collection: 0.08,
    },
    // Keyword kanalının eklediği adaylar LLM'den ort. 0.95/3 aldı; kapalı
    keywordChannel: false,
    penalties: {
        // Seed'de olmayan "tür değiştiren" genre adayda varsa (ör. drama filmine animasyon)
        genreMismatch: 0.15,
        // Seed yetişkin içerik değilken aday öyleyse
        adultContent: 0.3,
        lowVotes: 0.08, // vote_count < minVotes
        noOverview: 0.05,
        noPoster: 0.05,
    },
    minVotes: 20,
    yearHalfLife: 15, // yıl farkı bu kadar olunca year skoru ~0.5
    qualityVoteTarget: 5000, // bu kadar oy alan film quality'de tavan yapar
    diversity: {
        // Düşük sınır auteur'leri kesiyordu (Wes Anderson, Miyazaki); 10 pratikte sadece aşırı uçları sınırlar
        maxPerDirector: 10,
        maxPerCollection: 4,
    },
};

// Seed'de yoksa adayda görünmesi filmin karakterini değiştiren türler
const MISMATCH_GENRES = new Map([
    [16, "Animasyon"],
    [99, "Belgesel"],
    [10770, "TV Filmi"],
    [10402, "Müzik"],
]);

const ADULT_KEYWORDS = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

const genreIds = (film) => (film.genres ?? []).map((g) => g.id);
const genreNames = (film) => new Map((film.genres ?? []).map((g) => [g.id, g.name]));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const isAdult = (film) => (film.keywords ?? []).some((k) => ADULT_KEYWORDS.has(k));

/**
 * Tüm katalogdan IDF tabloları çıkarır. Yaygın keyword/genre ("murder", "Drama") az,
 * nadir olanlar ("time loop") çok ağırlık alır.
 */
export function buildCorpusStats(films) {
    const kwDf = new Map();
    const genreDf = new Map();
    for (const f of films) {
        for (const k of new Set(f.keywords ?? [])) kwDf.set(k, (kwDf.get(k) ?? 0) + 1);
        for (const g of new Set(genreIds(f))) genreDf.set(g, (genreDf.get(g) ?? 0) + 1);
    }
    const n = films.length;
    const idf = (df) => Math.log((n + 1) / (df + 1)) + 1;
    return {
        n,
        kwIdf: (k) => idf(kwDf.get(k) ?? 0),
        genreIdf: (g) => idf(genreDf.get(g) ?? 0),
    };
}

// IDF ağırlıklı ikili vektörler arasında cosine: ortak nadir öğeler yüksek skor verir
export function weightedOverlap(seedItems, candItems, idf) {
    const a = new Set(seedItems);
    const b = new Set(candItems);
    if (a.size === 0 || b.size === 0) return { score: 0, shared: [] };
    let dot = 0;
    let na = 0;
    let nb = 0;
    const shared = [];
    for (const x of a) {
        const w = idf(x) ** 2;
        na += w;
        if (b.has(x)) {
            dot += w;
            shared.push(x);
        }
    }
    for (const x of b) nb += idf(x) ** 2;
    shared.sort((x, y) => idf(y) - idf(x));
    return { score: dot / Math.sqrt(na * nb), shared };
}

/**
 * Keyword retrieval kanalı: seed ile nadir keyword paylaşan filmleri tüm katalogda arar.
 * Embedding'in kaçırdığı tematik bağlantıları (ör. "time loop") aday havuzuna sokar.
 */
export function keywordCandidates(seed, corpus, stats, limit = 100, exclude = new Set()) {
    const seedKw = seed.keywords ?? [];
    if (!seedKw.length) return [];
    return corpus
        .filter((f) => f.movie_id !== seed.movie_id && !exclude.has(f.movie_id))
        .map((f) => ({ film: f, score: weightedOverlap(seedKw, f.keywords ?? [], stats.kwIdf).score }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((x) => x.film);
}

function scoreCandidate(seed, cand, semanticNorm, kwMax, stats, cfg) {
    const kwRaw = weightedOverlap(seed.keywords ?? [], cand.keywords ?? [], stats.kwIdf);
    // Havuzdaki en iyi keyword eşleşmesine göre ölçekle; eşleşme zayıfsa şişirme (taban 0.25)
    const kw = { ...kwRaw, score: clamp01(kwRaw.score / Math.max(kwMax, 0.25)) };
    const gen = weightedOverlap(genreIds(seed), genreIds(cand), stats.genreIdf);

    const sameDirector = !!seed.director && seed.director === cand.director;
    const sharedCast = (cand.cast_names ?? []).filter((c) => (seed.cast_names ?? []).includes(c));

    const yearDiff = seed.year && cand.year ? Math.abs(seed.year - cand.year) : null;

    // TMDB önerisi: seed'in listesindeki sıraya göre 1.0 → 0.5; ters yön (aday seed'i öneriyor) 0.8
    const recRank = (seed.tmdb_recs ?? []).indexOf(cand.movie_id);
    const forward = recRank >= 0 ? 1 - (0.5 * recRank) / Math.max(seed.tmdb_recs.length - 1, 1) : 0;
    const backward = (cand.tmdb_recs ?? []).includes(seed.movie_id) ? 0.8 : 0;
    const sameCollection = !!seed.collection && seed.collection.id === cand.collection?.id;

    const components = {
        semantic: semanticNorm,
        keyword: kw.score,
        genre: gen.score,
        director: sameDirector ? 1 : 0,
        cast: clamp01(sharedCast.length / 2),
        year: yearDiff === null ? 0.5 : Math.pow(0.5, yearDiff / cfg.yearHalfLife),
        language: seed.language && seed.language === cand.language ? 1 : 0,
        quality: clamp01(
            0.7 * (Math.log10((cand.vote_count ?? 0) + 1) / Math.log10(cfg.qualityVoteTarget)) +
                0.3 * clamp01(((cand.rating ?? 0) - 5) / 3)
        ),
        // recGate: bonus semantic benzerlikle çarpılır → "ikisi de diyorsa" yukarı taşı,
        // semantic'te zayıf ama TMDB'de popüler adayları şişirme
        tmdbRec: Math.max(forward, backward) * (cfg.recGate ? semanticNorm : 1),
        collection: sameCollection ? 1 : 0,
    };

    const seedGenres = new Set(genreIds(seed));
    const penalties = {};
    const mismatched = genreIds(cand).filter((g) => MISMATCH_GENRES.has(g) && !seedGenres.has(g));
    if (mismatched.length) penalties.genreMismatch = cfg.penalties.genreMismatch;
    if (isAdult(cand) && !isAdult(seed)) penalties.adultContent = cfg.penalties.adultContent;
    if ((cand.vote_count ?? 0) < cfg.minVotes) penalties.lowVotes = cfg.penalties.lowVotes;
    if (!cand.overview) penalties.noOverview = cfg.penalties.noOverview;
    if (!cand.poster_path) penalties.noPoster = cfg.penalties.noPoster;

    const weighted = {};
    let total = 0;
    for (const [name, w] of Object.entries(cfg.weights)) {
        weighted[name] = w * components[name];
        total += weighted[name];
    }
    const penaltyTotal = Object.values(penalties).reduce((s, p) => s + p, 0);

    const seedGenreNames = genreNames(seed);
    return {
        film: cand,
        source: cand.source ?? "semantic",
        similarity: cand.similarity,
        components,
        weighted,
        penalties,
        final: total - penaltyTotal,
        signals: {
            sameCollection: sameCollection ? seed.collection.name : null,
            tmdbRecommends: forward > 0 || backward > 0,
            sharedKeywords: kw.shared,
            sharedGenres: gen.shared.map((g) => seedGenreNames.get(g) ?? String(g)),
            sameDirector,
            sharedCast,
            mismatchedGenres: mismatched.map((g) => MISMATCH_GENRES.get(g)),
        },
    };
}

/**
 * Pipeline'daki gerçek sinyallerden "neden önerildi" metni üretir (uydurma yok).
 */
export function explain(scored) {
    const { signals, components } = scored;
    const parts = [];
    if (signals.sameCollection) parts.push(`aynı seri (${signals.sameCollection})`);
    if (signals.sameDirector) parts.push(`aynı yönetmen (${scored.film.director})`);
    if (signals.sharedKeywords.length) parts.push(`ortak temalar: ${signals.sharedKeywords.slice(0, 3).join(", ")}`);
    if (signals.sharedGenres.length >= 2) parts.push(`ortak türler: ${signals.sharedGenres.join(", ")}`);
    if (signals.sharedCast.length) parts.push(`ortak oyuncu: ${signals.sharedCast.slice(0, 2).join(", ")}`);
    if (signals.tmdbRecommends) parts.push("bu filmi sevenler bunu da beğeniyor");
    if (!parts.length && components.semantic > 0.7) parts.push("hikâye ve atmosfer benzerliği");
    return parts.join(" · ") || "genel benzerlik";
}

/**
 * seed: film metadata'sı; candidates: metadata + `similarity` (cosine) alanı olan filmler.
 * Döner: tüm adaylar skorlanmış ve sıralanmış hâlde (debug için), diversity uygulanmış top N.
 */
export function rerank(seed, allCandidates, stats, config = DEFAULT_CONFIG, topN = 20) {
    // keywordChannel: false → keyword kanalından gelen adaylar kullanılmaz (LLM eval: ort. puanları düşük)
    const candidates = config.keywordChannel === false ? allCandidates.filter((c) => c.source !== "keyword") : allCandidates;
    const sims = candidates.map((c) => c.similarity);
    const min = Math.min(...sims);
    const max = Math.max(...sims);
    const span = max - min || 1;
    const kwMax = Math.max(
        0,
        ...candidates.map((c) => weightedOverlap(seed.keywords ?? [], c.keywords ?? [], stats.kwIdf).score)
    );

    const scored = candidates
        .map((c) => scoreCandidate(seed, c, (c.similarity - min) / span, kwMax, stats, config))
        .sort((a, b) => b.final - a.final);

    // Diversity: relevance sırasını bozmadan aynı yönetmen / aynı seriden en fazla N film
    const perDirector = new Map();
    const perCollection = new Map();
    const { maxPerDirector, maxPerCollection = Infinity } = config.diversity;
    const top = [];
    for (const s of scored) {
        if (top.length >= topN) break;
        const d = s.film.director;
        const c = s.film.collection?.id;
        if (d && (perDirector.get(d) ?? 0) >= maxPerDirector) continue;
        if (c && (perCollection.get(c) ?? 0) >= maxPerCollection) continue;
        if (d) perDirector.set(d, (perDirector.get(d) ?? 0) + 1);
        if (c) perCollection.set(c, (perCollection.get(c) ?? 0) + 1);
        top.push(s);
    }
    return { scored, top };
}
