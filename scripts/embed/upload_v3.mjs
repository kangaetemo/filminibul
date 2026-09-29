// v3 embedding'leri + TMDB zenginleştirmesini Supabase'teki film_embeddings_v3 tablosuna yükler (upsert).
// Önce scripts/sql/v3_setup.sql çalıştırılmış olmalı. Tekrar çalıştırmak güvenli (aynı satırlar güncellenir).
//
// Kullanım:
//   node scripts/embed/upload_v3.mjs
//   node scripts/embed/upload_v3.mjs --start 12000   # belirli bir sıradan devam

import { loadEnv, requireEnv } from "../export/loadEnv.mjs";
import { loadCorpus, loadLocalEmbeddings } from "../rerank/data.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

const args = process.argv.slice(2);
const START = args.includes("--start") ? Number(args[args.indexOf("--start") + 1]) : 0;
const BATCH = 200;

async function upsert(rows, attempt = 1) {
    let res;
    try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/film_embeddings_v3?on_conflict=movie_id`, {
            method: "POST",
            headers: {
                apikey: KEY,
                Authorization: `Bearer ${KEY}`,
                "Content-Type": "application/json",
                Prefer: "resolution=merge-duplicates,return=minimal",
            },
            body: JSON.stringify(rows),
        });
    } catch (err) {
        if (attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return upsert(rows, attempt + 1);
    }
    if (!res.ok) {
        const body = await res.text();
        if (attempt < 5 && (res.status >= 500 || res.status === 429)) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
            return upsert(rows, attempt + 1);
        }
        throw new Error(`${res.status}: ${body.slice(0, 400)}`);
    }
}

async function main() {
    const corpus = await loadCorpus();
    const emb = loadLocalEmbeddings("v3");

    const rows = [];
    for (const f of corpus) {
        const r = emb.index.get(f.movie_id);
        if (r === undefined) continue;
        // Birim uzunluğa normalize edilmiş vektör (cosine için fark etmez); 7 hane yeterli
        const vec = Array.from(emb.matrix.subarray(r * emb.dims, (r + 1) * emb.dims), (x) => +x.toFixed(7));
        rows.push({
            movie_id: f.movie_id,
            title: f.title,
            original_title: f.original_title,
            tr_title: f.tr_title ?? null,
            overview: f.overview,
            tr_overview: f.tr_overview ?? null,
            year: f.year,
            genres: f.genres,
            keywords: f.keywords,
            rating: f.rating,
            vote_count: f.vote_count,
            popularity: f.popularity,
            language: f.language,
            countries: f.countries,
            poster_path: f.poster_path,
            backdrop_path: f.backdrop_path,
            director: f.director,
            cast_names: f.cast_names,
            collection_id: f.collection?.id ?? null,
            collection_name: f.collection?.name ?? null,
            embedding: `[${vec.join(",")}]`,
        });
    }
    console.log(`📦 ${rows.length} satır hazır, ${START}. satırdan başlanıyor`);

    const t0 = Date.now();
    for (let i = START; i < rows.length; i += BATCH) {
        try {
            await upsert(rows.slice(i, i + BATCH));
        } catch (err) {
            console.error(`\n❌ ${i}. satırda hata: ${err.message}\n   Devam etmek için: node scripts/embed/upload_v3.mjs --start ${i}`);
            process.exit(1);
        }
        const done = Math.min(i + BATCH, rows.length);
        process.stdout.write(`\r  ${done}/${rows.length} · ${Math.round((Date.now() - t0) / 1000)}sn   `);
    }
    console.log(`\n✅ Yükleme tamamlandı`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
