// Rerank script'lerinin ortak veri katmanı: Supabase'ten aday toplama + yerel katalog.

import { createReadStream, readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "../export/loadEnv.mjs";
import { keywordCandidates } from "./reranker.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

const META_COLS =
    "movie_id,title,original_title,overview,year,genres,keywords,rating,vote_count,popularity,language,countries,poster_path,director,cast_names";

async function supabase(path, init = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
}

async function readJsonl(path) {
    const rows = [];
    if (!existsSync(path)) return rows;
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    for await (const line of rl) if (line.trim()) rows.push(JSON.parse(line));
    return rows;
}

/**
 * Tüm katalog (yerel Supabase export'u) + varsa TMDB zenginleştirmesi (data/tmdb/enriched.jsonl):
 * collection, tmdb_recs, tr_title, tr_overview eklenir; keyword'ler TMDB'de doluysa güncellenir.
 */
export async function loadCorpus({ enrich = true } = {}) {
    const films = await readJsonl(resolve(ROOT, "data", "export", "supabase", "film_embeddings_v2.jsonl"));
    if (!enrich) return films;
    const extra = new Map(
        (await readJsonl(resolve(ROOT, "data", "tmdb", "enriched.jsonl")))
            .filter((r) => r.status === "ok")
            .map((r) => [r.movie_id, r])
    );
    for (const f of films) {
        const e = extra.get(f.movie_id);
        if (!e) continue;
        f.collection = e.collection;
        f.tmdb_recs = e.recommendations;
        f.tr_title = e.tr_title;
        f.tr_overview = e.tr_overview;
        if (e.keywords?.length) f.keywords = e.keywords;
    }
    return films;
}

function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / Math.sqrt(na * nb);
}

async function fetchEmbeddings(ids) {
    const rows = await supabase(`film_embeddings_v2?select=movie_id,embedding&movie_id=in.(${ids.join(",")})`);
    return new Map(rows.map((r) => [r.movie_id, JSON.parse(r.embedding)]));
}

/**
 * Yerel embedding dosyasını (scripts/embed/embed_v3.mjs çıktısı) belleğe yükler.
 * Vektörler birim uzunluğa normalize edilir; cosine = dot product.
 */
export function loadLocalEmbeddings(version = "v3", dims = 1536) {
    const buf = readFileSync(resolve(ROOT, "data", "embeddings", `${version}.bin`));
    const recordBytes = 4 + dims * 4;
    const count = Math.floor(buf.length / recordBytes);
    const ids = new Int32Array(count);
    const matrix = new Float32Array(count * dims);
    const index = new Map();
    for (let r = 0; r < count; r++) {
        const off = r * recordBytes;
        ids[r] = buf.readInt32LE(off);
        let norm = 0;
        for (let i = 0; i < dims; i++) {
            const v = buf.readFloatLE(off + 4 + i * 4);
            matrix[r * dims + i] = v;
            norm += v * v;
        }
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < dims; i++) matrix[r * dims + i] /= norm;
        index.set(ids[r], r);
    }
    return { ids, matrix, index, dims, count };
}

// Seed'e göre tüm katalogda tam (exact) cosine; Map<movie_id, similarity>
function allSimilarities(emb, seedId) {
    const s = emb.index.get(seedId);
    if (s === undefined) return null;
    const { matrix, dims, ids } = emb;
    const sims = new Map();
    const so = s * dims;
    for (let r = 0; r < emb.count; r++) {
        if (r === s) continue;
        let dot = 0;
        const ro = r * dims;
        for (let i = 0; i < dims; i++) dot += matrix[so + i] * matrix[ro + i];
        sims.set(ids[r], dot);
    }
    return sims;
}

/**
 * getCandidates ile aynı iki kanallı havuz, ama semantic kanal yerel embedding'lerden (exact search).
 * Supabase'e ihtiyaç yok; yeni embedding sürümlerini veritabanına yüklemeden değerlendirmek için.
 */
export function getCandidatesLocal(seedId, corpus, stats, emb, { pool = 200, kwPool = 100 } = {}) {
    const t0 = Date.now();
    const byId = new Map(corpus.map((f) => [f.movie_id, f]));
    const seed = byId.get(seedId);
    const sims = allSimilarities(emb, seedId);
    if (!seed || !sims) return { seed: null, candidates: [], rpcMs: 0, kwAdded: 0, totalMs: 0 };

    const top = [...sims].sort((a, b) => b[1] - a[1]).slice(0, pool);
    const candidates = top.filter(([id]) => byId.has(id)).map(([id, sim]) => ({ ...byId.get(id), similarity: sim, source: "semantic" }));

    let kwAdded = 0;
    if (kwPool > 0) {
        const exclude = new Set([seedId, ...top.map(([id]) => id)]);
        for (const f of keywordCandidates(seed, corpus, stats, kwPool, exclude)) {
            if (!sims.has(f.movie_id)) continue;
            candidates.push({ ...f, similarity: sims.get(f.movie_id), source: "keyword" });
            kwAdded++;
        }
    }
    return { seed, candidates, rpcMs: 0, kwAdded, totalMs: Date.now() - t0 };
}

/**
 * İki kanallı aday havuzu:
 *   1. semantic: similar_movies RPC'si (pgvector HNSW), ilk `pool` film
 *   2. keyword: seed ile nadir keyword paylaşan ilk `kwPool` film (semantic'te olmayanlar)
 * Keyword adaylarının cosine'i embedding'lerden hesaplanır (prototip; üretimde RPC olacak).
 */
export async function getCandidates(seedId, corpus, stats, { pool = 200, kwPool = 100 } = {}) {
    const t0 = Date.now();
    const hits = await supabase("rpc/similar_movies", {
        method: "POST",
        body: JSON.stringify({ seed_movie_id: seedId, match_limit: pool }),
    });
    const rpcMs = Date.now() - t0;
    const ids = [seedId, ...hits.map((h) => h.result_id)];
    const meta = await supabase(`film_embeddings_v2?select=${META_COLS}&movie_id=in.(${ids.join(",")})`);
    // Supabase'te olmayan zenginleştirme alanlarını (collection, tmdb_recs…) yerel katalogdan ekle
    const local = new Map(corpus.map((f) => [f.movie_id, f]));
    const byId = new Map(meta.map((m) => [m.movie_id, { ...local.get(m.movie_id), ...m, keywords: local.get(m.movie_id)?.keywords ?? m.keywords }]));
    const seed = byId.get(seedId);
    const candidates = hits
        .map((h) => byId.get(h.result_id) && { ...byId.get(h.result_id), similarity: h.similarity, source: "semantic" })
        .filter(Boolean);

    let kwAdded = 0;
    if (seed && kwPool > 0) {
        const kwFilms = keywordCandidates(seed, corpus, stats, kwPool, new Set(ids));
        if (kwFilms.length) {
            const embs = await fetchEmbeddings([seedId, ...kwFilms.map((f) => f.movie_id)]);
            const seedEmb = embs.get(seedId);
            for (const f of kwFilms) {
                const emb = embs.get(f.movie_id);
                if (!emb || !seedEmb) continue;
                candidates.push({ ...f, similarity: cosine(seedEmb, emb), source: "keyword" });
                kwAdded++;
            }
        }
    }
    return { seed, candidates, rpcMs, kwAdded, totalMs: Date.now() - t0 };
}
