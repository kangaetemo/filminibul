// Supabase'teki v2 ile yerel v3 embedding'lerinin saf semantic ilk N listesini yan yana gösterir.
//
// Kullanım:
//   node scripts/rerank/compare_emb.mjs 26466 603 --top 12

import { buildCorpusStats } from "./reranker.mjs";
import { loadCorpus, getCandidates, getCandidatesLocal, loadLocalEmbeddings } from "./data.mjs";

const args = process.argv.slice(2);
const TOP = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 12;
const seeds = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== "--top").map(Number);

const corpus = await loadCorpus();
const stats = buildCorpusStats(corpus);
const v3 = loadLocalEmbeddings("v3");
const opts = { pool: TOP, kwPool: 0 };

for (const id of seeds.length ? seeds : [603, 26466, 220289, 807]) {
    const a = await getCandidates(id, corpus, stats, opts);
    const b = getCandidatesLocal(id, corpus, stats, v3, opts);
    console.log(`\n🎬 ${a.seed.title} (${a.seed.year})`);
    console.log(`${"v2 (özet ağırlıklı, Supabase)".padEnd(48)}v3 (tema ağırlıklı, başlıksız)`);
    for (let i = 0; i < TOP; i++) {
        const l = a.candidates[i];
        const r = b.candidates[i];
        const cell = (c) => (c ? `${c.title.slice(0, 34)} (${c.year}) ${c.similarity.toFixed(2)}` : "");
        console.log(`${String(i + 1).padStart(2)}. ${cell(l).padEnd(44)}${cell(r)}`);
    }
}
