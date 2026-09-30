// Katalogdaki her film için Türkiye'deki yayın platformlarını TMDB'den çeker (veri kaynağı: JustWatch).
// Yayın durumu zamanla değişir: bu script'i periyodik çalıştırıp upload_providers.mjs ile Supabase'e yükle.
//
// Kullanım:
//   node scripts/tmdb/fetch_providers.mjs              # tüm katalog (her çalıştırmada baştan, güncel veri için)
//   node scripts/tmdb/fetch_providers.mjs --limit 200  # deneme
//
// Çıktı:
//   data/tmdb/providers_tr.jsonl     {movie_id, flatrate, free, rent, buy, link} (sadece TR verisi olan filmler)
//   src/data/providers_tr.json       platform kataloğu {id: {name, logo, count}} (UI'daki logo/isimler için)

import { mkdirSync, writeFileSync, appendFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { tmdb } from "./tmdbClient.mjs";

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const CONCURRENCY = 12;
const REGION = "TR";

const OUT_PATH = resolve(ROOT, "data", "tmdb", "providers_tr.jsonl");
const CATALOG_PATH = resolve(ROOT, "src", "data", "providers_tr.json");

async function loadIds() {
    const ids = [];
    const rl = createInterface({
        input: createReadStream(resolve(ROOT, "data", "export", "supabase", "film_embeddings_v2.jsonl"), "utf8"),
        crlfDelay: Infinity,
    });
    for await (const line of rl) if (line.trim()) ids.push(JSON.parse(line).movie_id);
    return ids;
}

async function main() {
    const ids = (await loadIds()).slice(0, LIMIT);
    mkdirSync(resolve(ROOT, "data", "tmdb"), { recursive: true });
    writeFileSync(OUT_PATH, "");

    // Platform kataloğu: isim + logo (TMDB listesi) ve katalogdaki film sayısı
    const list = await tmdb("/watch/providers/movie", { watch_region: REGION, language: "tr-TR" });
    const catalog = {};
    for (const p of list?.results ?? []) {
        catalog[p.provider_id] = { name: p.provider_name, logo: p.logo_path, priority: p.display_priorities?.[REGION] ?? 999, count: 0 };
    }

    console.log(`🎬 ${ids.length} film · ${Object.keys(catalog).length} platform (${REGION})`);
    let next = 0;
    let done = 0;
    let withData = 0;
    let failed = 0;
    const buffer = [];
    const t0 = Date.now();
    const flush = () => buffer.length && appendFileSync(OUT_PATH, buffer.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
    const pick = (arr) => (arr ?? []).map((p) => p.provider_id);

    async function worker() {
        while (next < ids.length) {
            const id = ids[next++];
            try {
                const d = await tmdb(`/movie/${id}/watch/providers`);
                const tr = d?.results?.[REGION];
                if (tr) {
                    const row = {
                        movie_id: id,
                        flatrate: pick(tr.flatrate),
                        // Reklamlı ücretsiz platformlar (ör. puhutv) de "izlenebilir" sayılır
                        free: [...new Set([...pick(tr.free), ...pick(tr.ads)])],
                        rent: pick(tr.rent),
                        buy: pick(tr.buy),
                        link: tr.link ?? null,
                    };
                    for (const p of [...(tr.flatrate ?? []), ...(tr.free ?? []), ...(tr.ads ?? [])]) {
                        catalog[p.provider_id] ??= { name: p.provider_name, logo: p.logo_path, priority: 999, count: 0 };
                        catalog[p.provider_id].count++;
                    }
                    for (const p of [...(tr.rent ?? []), ...(tr.buy ?? [])]) {
                        catalog[p.provider_id] ??= { name: p.provider_name, logo: p.logo_path, priority: 999, count: 0 };
                    }
                    buffer.push(row);
                    withData++;
                }
            } catch (err) {
                failed++;
                if (failed <= 5) console.error(`\n  ⚠️ ${id}: ${err.message}`);
            }
            done++;
            if (buffer.length >= 200) flush();
            if (done % 200 === 0 || done === ids.length) {
                const rate = done / ((Date.now() - t0) / 1000);
                process.stdout.write(`\r  ${done}/${ids.length} · TR verisi ${withData} · hata ${failed} · ~${Math.round((ids.length - done) / rate)}sn   `);
            }
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    flush();

    writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
    const top = Object.entries(catalog)
        .filter(([, p]) => p.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15);
    console.log(`\n✅ ${OUT_PATH} · ${withData} filmde TR verisi`);
    console.log(`   En çok film (abonelik/ücretsiz): ${top.map(([id, p]) => `${p.name} [${id}] ${p.count}`).join(" | ")}`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
