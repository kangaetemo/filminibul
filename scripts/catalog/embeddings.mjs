// Katalogdaki tüm v3 embedding'lerini belleğe yükler; yerel önbellek dosyasıyla sadece eksikleri Supabase'ten çeker.
// Önbellek: data/embeddings/v3_live.bin (kayıt: int32 movie_id + 1536 × float32; scripts/embed/embed_v3.mjs'in v3.bin'iyle aynı biçim).
// Embedding'ler değişmez (embeddingDoc.mjs değişmedikçe), bu yüzden her çalıştırmada sadece yeni filmler indirilir;
// katalogdan çıkan filmler önbellekten atılır. GitHub Actions'ta dosya actions/cache ile haftadan haftaya taşınır.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { EMBEDDING_DIMS } from "../../src/lib/recommend/embeddingDoc.mjs";
import { pool, sb, sbAll } from "./lib.mjs";

export const CACHE_PATH = resolve(ROOT, "data", "embeddings", "v3_live.bin");
const RECORD = 4 + EMBEDDING_DIMS * 4;
const FETCH_BATCH = 100;

function readCache(path) {
    const map = new Map();
    if (!existsSync(path)) return map;
    const buf = readFileSync(path);
    for (let off = 0; off + RECORD <= buf.length; off += RECORD) {
        const id = buf.readInt32LE(off);
        map.set(id, new Float32Array(buf.buffer.slice(buf.byteOffset + off + 4, buf.byteOffset + off + RECORD)));
    }
    return map;
}

function writeCache(path, ids, vectors) {
    const buf = Buffer.alloc(ids.length * RECORD);
    ids.forEach((id, r) => {
        buf.writeInt32LE(id, r * RECORD);
        Buffer.from(vectors[r].buffer, vectors[r].byteOffset, EMBEDDING_DIMS * 4).copy(buf, r * RECORD + 4);
    });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buf);
}

/**
 * @returns {{ ids: Int32Array, matrix: Float32Array, index: Map<number, number>, dims: number, count: number }}
 *          Vektörler birim uzunluğa normalize: cosine = dot product.
 */
export async function loadAllEmbeddings({ cachePath = CACHE_PATH, log = console.log } = {}) {
    const catalog = (await sbAll("film_embeddings_v3?select=movie_id")).map((r) => r.movie_id).sort((a, b) => a - b);
    const cache = readCache(cachePath);
    const missing = catalog.filter((id) => !cache.has(id));
    log(`🧮 Embedding: katalog ${catalog.length} · önbellekte ${cache.size} · indirilecek ${missing.length}`);

    const batches = [];
    for (let i = 0; i < missing.length; i += FETCH_BATCH) batches.push(missing.slice(i, i + FETCH_BATCH));
    let done = 0;
    await pool(batches, 4, async (ids) => {
        const rows = await (await sb(`film_embeddings_v3?select=movie_id,embedding&movie_id=in.(${ids.join(",")})`)).json();
        for (const r of rows) cache.set(r.movie_id, Float32Array.from(JSON.parse(r.embedding)));
        done += ids.length;
        if (batches.length > 5 && done % 1000 < FETCH_BATCH) log(`   ${done}/${missing.length}`);
    });

    const ids = catalog.filter((id) => cache.has(id));
    const vectors = ids.map((id) => cache.get(id));
    if (missing.length || cache.size !== ids.length) writeCache(cachePath, ids, vectors);

    const dims = EMBEDDING_DIMS;
    const matrix = new Float32Array(ids.length * dims);
    const index = new Map();
    ids.forEach((id, r) => {
        const v = vectors[r];
        let norm = 0;
        for (let i = 0; i < dims; i++) norm += v[i] * v[i];
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < dims; i++) matrix[r * dims + i] = v[i] / norm;
        index.set(id, r);
    });
    return { ids: Int32Array.from(ids), matrix, index, dims, count: ids.length };
}

/** Tek seed için tüm katalogda tam (kesin) en yakın `k` komşu: [[movie_id, similarity], ...] azalan. */
export function exactNeighbors(emb, row, k) {
    const { matrix, dims, count, ids } = emb;
    const so = row * dims;
    // Sabit boyutlu min-heap yerine basit yaklaşım: eşik altını ele, taşınca sırala ve kırp
    let best = [];
    let floor = -Infinity;
    for (let r = 0; r < count; r++) {
        if (r === row) continue;
        let dot = 0;
        const ro = r * dims;
        for (let i = 0; i < dims; i++) dot += matrix[so + i] * matrix[ro + i];
        if (dot <= floor) continue;
        best.push([ids[r], dot]);
        if (best.length >= k * 2) {
            best.sort((a, b) => b[1] - a[1]);
            best.length = k;
            floor = best[k - 1][1];
        }
    }
    best.sort((a, b) => b[1] - a[1]);
    return best.slice(0, k);
}
