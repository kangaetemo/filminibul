// Her film için tam (kesin) en yakın 200 komşuyu hesaplar ve Supabase film_neighbors tablosuna yazar (haftalık iş).
// Film sayfası benzer filmleri bu tablodan okur (similar_movies_v4): istek anında HNSW taranmaz.
// Önce scripts/sql/neighbors.sql çalıştırılmış olmalı.
//
// Kullanım:
//   node scripts/catalog/build_neighbors.mjs                # hepsini hesapla ve yükle
//   node scripts/catalog/build_neighbors.mjs --dry-run      # sadece hesapla (süre + yer tahmini), yazma
//   node scripts/catalog/build_neighbors.mjs --limit=500    # ilk N film (deneme; --dry-run ile)
//
// Yükleme: tablo önce boşaltılır (TRUNCATE: yer hemen geri verilir, güncelleme şişmesi olmaz), sonra parça parça doldurulur.
// Bu sırada (~1–2 dk) listesi olmayan filmler için site canlı HNSW sorgusuna (similar_movies_v3) düşer.

import { cpus } from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

export const NEIGHBORS = 200; // reranker'ın aday havuzu (src/lib/recommend/similar.ts → CANDIDATE_POOL ile aynı)
const SIM_SCALE = 10000; // benzerlik smallint olarak saklanır: 0.8123 → 8123
const UPLOAD_BATCH = 500;

// ---------- Worker: satır aralığı için top-K ----------
function topK(matrix, dims, count, row, k, outIds, outSims, base, ids) {
    const heapIdx = new Int32Array(k);
    const heapVal = new Float32Array(k);
    let size = 0;
    const so = row * dims;
    // Min-heap: kökte en küçük; dolunca sadece kökten büyükler girer
    for (let r = 0; r < count; r++) {
        if (r === row) continue;
        let dot = 0;
        const ro = r * dims;
        for (let i = 0; i < dims; i++) dot += matrix[so + i] * matrix[ro + i];
        if (size < k) {
            let c = size++;
            heapIdx[c] = r;
            heapVal[c] = dot;
            while (c > 0) {
                const p = (c - 1) >> 1;
                if (heapVal[p] <= heapVal[c]) break;
                [heapVal[p], heapVal[c]] = [heapVal[c], heapVal[p]];
                [heapIdx[p], heapIdx[c]] = [heapIdx[c], heapIdx[p]];
                c = p;
            }
        } else if (dot > heapVal[0]) {
            heapIdx[0] = r;
            heapVal[0] = dot;
            let c = 0;
            for (;;) {
                const l = 2 * c + 1;
                const rr = l + 1;
                let m = c;
                if (l < k && heapVal[l] < heapVal[m]) m = l;
                if (rr < k && heapVal[rr] < heapVal[m]) m = rr;
                if (m === c) break;
                [heapVal[m], heapVal[c]] = [heapVal[c], heapVal[m]];
                [heapIdx[m], heapIdx[c]] = [heapIdx[c], heapIdx[m]];
                c = m;
            }
        }
    }
    const order = Array.from({ length: size }, (_, i) => i).sort((a, b) => heapVal[b] - heapVal[a]);
    order.forEach((h, j) => {
        outIds[base + j] = ids[heapIdx[h]];
        outSims[base + j] = Math.round(heapVal[h] * SIM_SCALE);
    });
}

if (!isMainThread) {
    const { matrix, ids, dims, count, from, to, k } = workerData;
    const m = new Float32Array(matrix);
    const idArr = new Int32Array(ids);
    const outIds = new Int32Array((to - from) * k);
    const outSims = new Int16Array((to - from) * k);
    for (let row = from; row < to; row++) {
        topK(m, dims, count, row, k, outIds, outSims, (row - from) * k, idArr);
        if ((row - from) % 500 === 499) parentPort.postMessage({ progress: 500 });
    }
    parentPort.postMessage({ done: true, outIds, outSims }, [outIds.buffer, outSims.buffer]);
}

/** Tüm satırlar için top-K, worker'larla paralel. Dönen: { neighborIds: Int32Array(rows*k), sims: Int16Array(rows*k) } */
export async function computeAll(emb, { rows = emb.count, k = NEIGHBORS, threads = cpus().length, log = console.log } = {}) {
    const shared = new SharedArrayBuffer(emb.matrix.byteLength);
    new Float32Array(shared).set(emb.matrix);
    const sharedIds = new SharedArrayBuffer(emb.ids.byteLength);
    new Int32Array(sharedIds).set(emb.ids);

    const neighborIds = new Int32Array(rows * k);
    const sims = new Int16Array(rows * k);
    const chunk = Math.ceil(rows / threads);
    let done = 0;
    let lastLog = Date.now();
    const t0 = Date.now();
    await Promise.all(
        Array.from({ length: threads }, (_, t) => {
            const from = t * chunk;
            const to = Math.min(rows, from + chunk);
            if (from >= to) return null;
            return new Promise((resolveP, reject) => {
                const w = new Worker(new URL(import.meta.url), {
                    workerData: { matrix: shared, ids: sharedIds, dims: emb.dims, count: emb.count, from, to, k },
                });
                w.on("message", (msg) => {
                    if (msg.progress) {
                        done += msg.progress;
                        if (Date.now() - lastLog > 15000) {
                            lastLog = Date.now();
                            const rate = done / ((Date.now() - t0) / 1000);
                            log(`   ${done}/${rows} · ~${Math.round((rows - done) / rate)} sn kaldı`);
                        }
                        return;
                    }
                    neighborIds.set(msg.outIds, from * k);
                    sims.set(msg.outSims, from * k);
                    resolveP();
                });
                w.on("error", reject);
                w.on("exit", (code) => code !== 0 && reject(new Error(`worker çıkış kodu ${code}`)));
            });
        })
    );
    return { neighborIds, sims, seconds: (Date.now() - t0) / 1000, threads };
}

async function main() {
    const { loadAllEmbeddings } = await import("./embeddings.mjs");
    const { arg, flag, sb, summary } = await import("./lib.mjs");
    const DRY = flag("dry-run");
    const LIMIT = Number(arg("limit", 0));

    const emb = await loadAllEmbeddings();
    const rows = LIMIT ? Math.min(LIMIT, emb.count) : emb.count;
    if (LIMIT && !DRY) throw new Error("--limit sadece --dry-run ile kullanılır (tablo boşaltılıp eksik doldurulmasın)");
    console.log(`🧭 ${rows} film için en yakın ${NEIGHBORS} komşu hesaplanıyor (${cpus().length} çekirdek)`);
    const { neighborIds, sims, seconds, threads } = await computeAll(emb, { rows });
    // Satır başına ~ (24 başlık + 4 id + 24+4K int[] + 24+2K smallint[]) bayt, 8 KB sayfaya sığan kadar
    const rowBytes = 76 + NEIGHBORS * 6;
    const estMb = (Math.ceil(emb.count / Math.floor(8160 / rowBytes)) * 8192) / 1024 / 1024;
    const lines = [`\n### Komşu tablosu`, `- ${rows} film × ${NEIGHBORS} komşu · ${Math.round(seconds)} sn (${threads} iş parçacığı) · tahmini yer ~${Math.round(estMb)} MB`];
    if (DRY) {
        const sample = emb.ids[0];
        lines.push(`- Deneme: yazılmadı. Örnek #${sample}: ${Array.from(neighborIds.slice(0, 5)).join(", ")} (benzerlik ${Array.from(sims.slice(0, 5)).map((s) => s / SIM_SCALE).join(", ")})`);
        return summary(lines.join("\n"));
    }

    const t0 = Date.now();
    try {
        await sb("rpc/truncate_film_neighbors", { method: "POST", body: "{}" });
    } catch (err) {
        // scripts/sql/neighbors.sql henüz çalıştırılmamış: haftalık işin geri kalanı durmasın
        if (/\b404\b|PGRST202/.test(err.message)) {
            lines.push("- ⚠️ Atlandı: `film_neighbors` tablosu yok. Supabase'te `scripts/sql/neighbors.sql` çalıştırılmalı.");
            return summary(lines.join("\n"));
        }
        throw err;
    }
    for (let start = 0; start < rows; start += UPLOAD_BATCH) {
        const body = [];
        for (let r = start; r < Math.min(rows, start + UPLOAD_BATCH); r++) {
            body.push({
                movie_id: emb.ids[r],
                neighbor_ids: `{${neighborIds.subarray(r * NEIGHBORS, (r + 1) * NEIGHBORS).join(",")}}`,
                sims: `{${sims.subarray(r * NEIGHBORS, (r + 1) * NEIGHBORS).join(",")}}`,
            });
        }
        await sb("film_neighbors", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });
        if ((start / UPLOAD_BATCH) % 10 === 9) console.log(`   yüklendi ${start + UPLOAD_BATCH}/${rows}`);
    }
    lines.push(`- Yüklendi: ${rows} satır · ${Math.round((Date.now() - t0) / 1000)} sn`);
    summary(lines.join("\n"));
}

if (isMainThread && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error("❌", err.message);
        process.exit(1);
    });
}
