// data/tmdb/providers_tr.jsonl'ı Supabase film_providers tablosuna yükler.
// Tam yenileme: tüm satırlar upsert edilir, bu çalıştırmada görülmeyen (artık TR'de olmayan) satırlar silinir.
// Önce scripts/sql/film_providers.sql çalıştırılmış olmalı.
//
// Kullanım:
//   node scripts/tmdb/fetch_providers.mjs && node scripts/tmdb/upload_providers.mjs
//   node scripts/tmdb/upload_providers.mjs --force   # yeni veri çok az olsa da yükle (güvenlik kontrolünü atla)
//
// Otomatik: .github/workflows/refresh-providers.yml her pazartesi çalıştırır.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "../export/loadEnv.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const BATCH = 1000;

async function request(path, init) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...HEADERS, ...init.headers } });
    if (!res.ok) throw new Error(`${res.status} ${path.slice(0, 60)}: ${(await res.text()).slice(0, 300)}`);
    return res;
}

const rows = readFileSync(resolve(ROOT, "data", "tmdb", "providers_tr.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
const runStart = new Date().toISOString();

// Güvenlik: yeni veri mevcut tablonun belirgin şekilde altındaysa (TMDB/JustWatch arızası vb.) silme yapma
const FORCE = process.argv.includes("--force");
const countRes = await request("film_providers?select=movie_id&limit=1", { method: "GET", headers: { Prefer: "count=exact" } });
const existing = Number(countRes.headers.get("content-range")?.split("/")[1] ?? 0);
if (!FORCE && existing > 0 && rows.length < existing * 0.7) {
    console.error(`❌ Yeni veri ${rows.length} film, tabloda ${existing} var (%70 altı). Muhtemelen tarama eksik; hiçbir şey değiştirilmedi. Eminsen --force ile çalıştır.`);
    process.exit(1);
}
console.log(`📦 ${rows.length} film yükleniyor (tabloda şu an ${existing})`);

for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    await request("film_providers?on_conflict=movie_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(batch),
    });
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

// Bu çalıştırmada güncellenmeyenler artık TR'de yayında değil
const res = await request(`film_providers?updated_at=lt.${encodeURIComponent(runStart)}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
});
console.log(`\n🧹 ${(await res.json()).length} eski satır silindi\n✅ Tamamlandı`);
