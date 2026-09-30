// data/tmdb/providers_tr.jsonl'ı Supabase film_providers tablosuna yükler.
// Tam yenileme: tüm satırlar upsert edilir, bu çalıştırmada görülmeyen (artık TR'de olmayan) satırlar silinir.
// Önce scripts/sql/film_providers.sql çalıştırılmış olmalı.
//
// Kullanım:
//   node scripts/tmdb/fetch_providers.mjs && node scripts/tmdb/upload_providers.mjs

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
console.log(`📦 ${rows.length} film yükleniyor`);

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
