// Katalogdaki her film için TMDB'den eksik alanları çeker (film başına TEK istek):
//   - recommendations (TMDB'nin davranışsal önerileri, ilk sayfa ~20 film)
//   - belongs_to_collection (franchise)
//   - keywords (güncel liste)
//   - Türkçe başlık / özet (translations içinden, sadece gerçekten varsa)
// Supabase'e dokunmaz; data/tmdb/enriched.jsonl dosyasına yazar. Yarıda kalırsa kaldığı yerden devam eder.
//
// Kullanım:
//   node scripts/tmdb/enrich.mjs               # tüm katalog
//   node scripts/tmdb/enrich.mjs --limit 100   # deneme

import { mkdirSync, existsSync, appendFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { tmdb } from "./tmdbClient.mjs";

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const CONCURRENCY = 12;

const OUT_DIR = resolve(ROOT, "data", "tmdb");
const OUT_PATH = resolve(OUT_DIR, "enriched.jsonl");

async function readJsonl(path) {
    const rows = [];
    if (!existsSync(path)) return rows;
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    for await (const line of rl) if (line.trim()) rows.push(JSON.parse(line));
    return rows;
}

async function enrichOne(movieId) {
    const d = await tmdb(`/movie/${movieId}`, {
        language: "en-US",
        append_to_response: "recommendations,keywords,translations",
    });
    if (!d) return { movie_id: movieId, status: "not_found" };

    const tr = (d.translations?.translations ?? []).find((t) => t.iso_639_1 === "tr")?.data ?? {};
    return {
        movie_id: movieId,
        status: "ok",
        collection: d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name } : null,
        keywords: (d.keywords?.keywords ?? []).map((k) => k.name),
        recommendations: (d.recommendations?.results ?? []).map((r) => r.id),
        tr_title: tr.title || null,
        tr_overview: tr.overview || null,
        imdb_id: d.imdb_id ?? null,
    };
}

async function main() {
    const catalog = await readJsonl(resolve(ROOT, "data", "export", "supabase", "film_embeddings_v2.jsonl"));
    const done = new Set((await readJsonl(OUT_PATH)).map((r) => r.movie_id));
    const todo = catalog
        .map((f) => f.movie_id)
        .filter((id) => !done.has(id))
        .slice(0, LIMIT);

    mkdirSync(OUT_DIR, { recursive: true });
    console.log(`🎬 Katalog ${catalog.length} · tamamlanmış ${done.size} · bu çalıştırmada ${todo.length}`);

    let next = 0;
    let finished = 0;
    let failed = 0;
    const t0 = Date.now();
    const buffer = [];
    const flush = () => {
        if (buffer.length) appendFileSync(OUT_PATH, buffer.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
    };

    async function worker() {
        while (next < todo.length) {
            const id = todo[next++];
            try {
                buffer.push(await enrichOne(id));
            } catch (err) {
                // Başarısız olanlar yazılmaz; bir sonraki çalıştırmada tekrar denenir
                failed++;
                if (failed <= 5) console.error(`\n  ⚠️ ${id}: ${err.message}`);
            }
            finished++;
            if (buffer.length >= 200) flush();
            if (finished % 100 === 0 || finished === todo.length) {
                const rate = finished / ((Date.now() - t0) / 1000);
                const eta = Math.round((todo.length - finished) / rate);
                process.stdout.write(`\r  ${finished}/${todo.length} · ${rate.toFixed(1)} film/sn · hata ${failed} · kalan ~${eta}sn   `);
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    flush();
    console.log(`\n✅ ${OUT_PATH}${failed ? ` (${failed} film başarısız, tekrar çalıştırınca denenecek)` : ""}`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
