// Katalogdaki serilerin Türkçe adlarını TMDB'den çeker → src/data/collections_tr.json { "<collection_id>": "Matrix" | null }.
// Sadece TMDB'nin Türkçe olarak işaretlediği çeviri alınır (yoksa null: site İngilizce adı sadeleştirerek gösterir).
// Dosyada olan seriler (null dahil) tekrar sorulmaz; haftalık iş (rebuild_static.mjs) yeni serileri ekler.
//
// Kullanım:
//   node scripts/catalog/collections_tr.mjs           # eksikleri çek
//   node scripts/catalog/collections_tr.mjs --all     # hepsini baştan çek (TMDB çevirileri güncellendiyse)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../export/loadEnv.mjs";
import { cleanCollectionName, isUsableTurkishName } from "../../src/lib/recommend/collectionName.mjs";
import { tmdb } from "../tmdb/tmdbClient.mjs";
import { flag, pool, sbAll } from "./lib.mjs";

const OUT_PATH = resolve(ROOT, "src", "data", "collections_tr.json");

/** @returns {{ total: number, fetched: number, turkish: number }} */
export async function updateCollections({ all = false, log = console.log } = {}) {
    const rows = await sbAll("film_embeddings_v3?select=movie_id,collection_id&collection_id=not.is.null");
    const ids = [...new Set(rows.map((r) => r.collection_id))].sort((a, b) => a - b);
    const dict = !all && existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, "utf8")) : {};
    const todo = ids.filter((id) => !(String(id) in dict));
    log(`🎞️  Seri: katalogda ${ids.length} · çekilecek ${todo.length}`);

    await pool(todo, 8, async (id) => {
        const d = await tmdb(`/collection/${id}/translations`);
        const tr = d?.translations?.find((t) => t.iso_639_1 === "tr")?.data;
        const name = tr?.title || tr?.name;
        dict[id] = isUsableTurkishName(name) ? cleanCollectionName(name) : null;
    });

    // Katalogdan çıkan seriler dosyadan atılır; sıralı yazılır (diff okunur kalsın)
    const out = Object.fromEntries(ids.map((id) => [id, dict[id] ?? null]));
    writeFileSync(OUT_PATH, JSON.stringify(out, null, 0));
    const turkish = Object.values(out).filter(Boolean).length;
    return { total: ids.length, fetched: todo.length, turkish };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    updateCollections({ all: flag("all") })
        .then((r) => console.log(`✅ ${OUT_PATH} · ${r.total} seri, ${r.turkish} Türkçe ad (${r.fetched} çekildi)`))
        .catch((err) => {
            console.error("❌", err.message);
            process.exit(1);
        });
}
