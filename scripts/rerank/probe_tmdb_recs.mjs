// TMDB recommendations sinyalini test filmlerinde inceler:
// kaç öneri veritabanımızda var, kaçı semantic havuzla örtüşüyor, havuza neyi yeni getiriyor.
//
// Kullanım:
//   node scripts/rerank/probe_tmdb_recs.mjs
//   node scripts/rerank/probe_tmdb_recs.mjs 26466 220289

import { buildCorpusStats } from "./reranker.mjs";
import { loadCorpus, getCandidates } from "./data.mjs";
import { recommendations } from "../tmdb/tmdbClient.mjs";

const DEFAULT_SEEDS = [603, 26466, 220289, 129, 807, 310131, 157336, 2111];
const seedArgs = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const SEEDS = seedArgs.length ? seedArgs : DEFAULT_SEEDS;

const corpus = await loadCorpus();
const stats = buildCorpusStats(corpus);
const byId = new Map(corpus.map((f) => [f.movie_id, f]));

for (const seedId of SEEDS) {
    const recIds = await recommendations(seedId, 2);
    const inDb = recIds.filter((id) => byId.has(id));
    const { seed, candidates } = await getCandidates(seedId, corpus, stats, { pool: 200, kwPool: 0 });
    const semRank = new Map(
        candidates
            .sort((a, b) => b.similarity - a.similarity)
            .map((c, i) => [c.movie_id, i + 1])
    );
    const overlap = inDb.filter((id) => semRank.has(id));
    const fresh = inDb.filter((id) => !semRank.has(id));

    console.log(`\n🎬 ${seed.title} (${seed.year})`);
    console.log(`   TMDB öneri: ${recIds.length} · veritabanında: ${inDb.length} · semantic ilk 200 ile örtüşen: ${overlap.length}`);
    console.log(`   Örtüşenler (TMDB sırası → semantic sırası):`);
    console.log(
        "     " +
            overlap
                .slice(0, 12)
                .map((id) => `${byId.get(id).title} [#${recIds.indexOf(id) + 1}→#${semRank.get(id)}]`)
                .join(" | ")
    );
    console.log(`   Semantic'in hiç bulmadığı (yeni aday):`);
    console.log("     " + fresh.slice(0, 12).map((id) => byId.get(id).title).join(" | "));
}
