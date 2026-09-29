// Uygulamanın reranker'ı için keyword/genre doküman frekanslarını src/data/idf.json'a yazar.
// Katalog değiştiğinde (yeni filmler, TMDB zenginleştirmesi) tekrar çalıştır.
//
// Kullanım:
//   node scripts/rerank/build_idf.mjs

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { loadCorpus } from "./data.mjs";

const corpus = await loadCorpus();
const keywords = {};
const genres = {};
for (const f of corpus) {
    for (const k of new Set(f.keywords ?? [])) keywords[k] = (keywords[k] ?? 0) + 1;
    for (const g of new Set((f.genres ?? []).map((x) => x.id))) genres[g] = (genres[g] ?? 0) + 1;
}

const outPath = resolve(ROOT, "src", "data", "idf.json");
writeFileSync(outPath, JSON.stringify({ n: corpus.length, keywords, genres }));
console.log(`✅ ${outPath} · ${corpus.length} film · ${Object.keys(keywords).length} keyword · ${Object.keys(genres).length} tür`);
