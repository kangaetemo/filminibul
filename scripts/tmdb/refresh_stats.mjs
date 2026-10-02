// Katalogdaki yeni filmlerin oy sayısı / puan / popülerlik değerlerini TMDB'den tazeler.
// Neden: filmler vizyona girmeden eklendiğinde vote_count=0 kalıyor; reranker bunları "az oylu" sayıp
// cezalandırıyor ve kalite puanını 0 veriyor (ör. Project Hail Mary: katalogta 0 oy, TMDB'de 8000+).
//
// Kullanım:
//   node scripts/tmdb/refresh_stats.mjs                 # year >= 2021 (varsayılan)
//   node scripts/tmdb/refresh_stats.mjs --from=2015     # daha geniş
//   node scripts/tmdb/refresh_stats.mjs --dry-run       # yazmadan ne değişeceğini göster
//
// Eski değerler data/tmdb/stats_backup_<tarih>.json dosyasına yedeklenir.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "../export/loadEnv.mjs";
import { tmdb } from "./tmdbClient.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const FROM_YEAR = Number(arg("from", 2021));
const DRY = process.argv.includes("--dry-run");
const CONCURRENCY = 8;

async function sb(path, init = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...HEADERS, ...init.headers } });
    if (!res.ok) throw new Error(`${res.status} ${path.slice(0, 80)}: ${(await res.text()).slice(0, 300)}`);
    return res;
}

// Sayfalayarak tüm adayları al
const films = [];
for (let from = 0; ; from += 1000) {
    const res = await sb(`film_embeddings_v3?select=movie_id,vote_count,rating,popularity&year=gte.${FROM_YEAR}&order=movie_id&limit=1000&offset=${from}`);
    const page = await res.json();
    films.push(...page);
    if (page.length < 1000) break;
}
console.log(`📦 ${films.length} film (year >= ${FROM_YEAR}) kontrol edilecek${DRY ? " [dry-run]" : ""}`);

const changed = [];
let done = 0;
let missing = 0;

async function work(f) {
    const d = await tmdb(`/movie/${f.movie_id}`);
    if (!d) {
        missing++;
        return;
    }
    const next = { vote_count: d.vote_count, rating: d.vote_average, popularity: d.popularity };
    // Küçük dalgalanmaları yazma: oy sayısı değişmediyse atla
    if (next.vote_count === f.vote_count && next.rating === f.rating) return;
    changed.push({ movie_id: f.movie_id, old: { vote_count: f.vote_count, rating: f.rating, popularity: f.popularity }, next });
    if (!DRY) await sb(`film_embeddings_v3?movie_id=eq.${f.movie_id}`, { method: "PATCH", body: JSON.stringify(next), headers: { Prefer: "return=minimal" } });
}

const queue = [...films];
await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) {
            const f = queue.shift();
            try {
                await work(f);
            } catch (err) {
                console.error(`⚠️  ${f.movie_id}: ${err.message}`);
            }
            if (++done % 250 === 0) console.log(`  ${done}/${films.length} (değişen: ${changed.length})`);
        }
    })
);

mkdirSync(resolve(ROOT, "data", "tmdb"), { recursive: true });
const backup = resolve(ROOT, "data", "tmdb", `stats_backup_${new Date().toISOString().slice(0, 10)}${DRY ? "_dry" : ""}.json`);
writeFileSync(backup, JSON.stringify(changed));
console.log(`✅ ${changed.length} film ${DRY ? "güncellenecekti" : "güncellendi"}, TMDB'de bulunamayan: ${missing}. Yedek: ${backup}`);
