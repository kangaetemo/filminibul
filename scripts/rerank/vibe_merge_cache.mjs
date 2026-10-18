// İş akışında (verify-vibe-quality.yml) önceki puanları birleştirir: GitHub önbelleğinden gelen dosyalar
// depodaki data/eval dosyalarının üzerine yazmasın. Puanlar (tarif + film) birleşimi alınır, aynı çift için
// depodaki puan korunur; çalıştırmalar etikete göre birleşir, aynı etikette depodaki kayıt korunur.
//
// Kullanım: node scripts/rerank/vibe_merge_cache.mjs <önbellek klasörü>

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";

const cacheDir = process.argv[2];
const EVAL = resolve(ROOT, "data", "eval");
const lines = (path) => (existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim()) : []);

const judgments = new Map();
for (const path of [resolve(EVAL, "vibe_judgments.jsonl"), resolve(cacheDir, "vibe_judgments.jsonl")]) {
    for (const line of lines(path)) {
        const r = JSON.parse(line);
        const key = `${r.q}\u0000${r.cand}`;
        if (!judgments.has(key)) judgments.set(key, line);
    }
}
writeFileSync(resolve(EVAL, "vibe_judgments.jsonl"), [...judgments.values()].join("\n") + (judgments.size ? "\n" : ""));

const read = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
const runs = { ...read(resolve(cacheDir, "vibe_runs.json")), ...read(resolve(EVAL, "vibe_runs.json")) };
writeFileSync(resolve(EVAL, "vibe_runs.json"), JSON.stringify(runs, null, 1));
console.log(`birleştirildi: ${judgments.size} puan · ${Object.keys(runs).length} çalıştırma (${Object.keys(runs).join(", ")})`);
