// Seed filmler için saf semantic Top 20 ile hybrid rerank Top 20'yi karşılaştırır.
// Adaylar canlı Supabase RPC'sinden (similar_movies), IDF istatistikleri yerel export'tan gelir.
//
// Kullanım:
//   node scripts/rerank/test_rerank.mjs                 # varsayılan test seti
//   node scripts/rerank/test_rerank.mjs 603 26466       # belirli filmler
//   node scripts/rerank/test_rerank.mjs --pool 200 --top 20
//
// Çıktı: konsolda özet + data/eval/rerank_report.md (bileşen bazlı debug tablosu)

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { buildCorpusStats, rerank, explain, DEFAULT_CONFIG } from "./reranker.mjs";
import { loadCorpus, getCandidates } from "./data.mjs";

const DEFAULT_SEEDS = [
    603, // The Matrix — franchise
    26466, // Triangle — psikolojik / belirsiz
    220289, // Coherence — psikolojik
    129, // Spirited Away — animasyon
    807, // Se7en — suç
    310131, // The Witch — korku
    157336, // Interstellar — blockbuster
    2111, // Balzac and the Little Chinese Seamstress — az bilinen
];

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : def);
const POOL = opt("--pool", 200);
const KW_POOL = opt("--kw-pool", 100); // 0 = keyword kanalı kapalı
const TOP = opt("--top", 20);
const seedArgs = args
    .filter((a, i) => /^\d+$/.test(a) && !["--pool", "--top", "--kw-pool"].includes(args[i - 1]))
    .map(Number);
const SEEDS = seedArgs.length ? seedArgs : DEFAULT_SEEDS;

const fmt = (x) => x.toFixed(2);
const label = (f) => `${f.title} (${f.year ?? "?"})`;
// 🔑 = sadece keyword kanalından gelen aday (semantic ilk N'de yoktu)
const rlabel = (r) => `${r.source === "keyword" ? "🔑 " : ""}${label(r.film)}`;

function seedReport(seed, candidates, result) {
    const semanticTop = [...candidates].sort((a, b) => b.similarity - a.similarity).slice(0, TOP);
    const lines = [];
    lines.push(`## ${label(seed)} — ${seed.movie_id}`, ``);
    lines.push(
        `Yönetmen: ${seed.director ?? "-"} · Türler: ${(seed.genres ?? []).map((g) => g.name).join(", ")} · Oy: ${seed.vote_count}`,
        ``,
        `Keywords: ${(seed.keywords ?? []).join(", ") || "(yok)"}`,
        ``
    );

    lines.push(`| # | Saf semantic | cos | Hybrid rerank | final | neden |`, `|---|---|---|---|---|---|`);
    for (let i = 0; i < TOP; i++) {
        const s = semanticTop[i];
        const r = result.top[i];
        lines.push(
            `| ${i + 1} | ${s ? label(s) : ""} | ${s ? fmt(s.similarity) : ""} | ${r ? rlabel(r) : ""} | ${r ? fmt(r.final) : ""} | ${r ? explain(r) : ""} |`
        );
    }
    lines.push(``);

    const cols = Object.keys(DEFAULT_CONFIG.weights);
    lines.push(
        `<details><summary>Bileşen debug (ağırlıklı katkılar)</summary>`,
        ``,
        `| # | Film | cos | ${cols.join(" | ")} | ceza | FINAL |`,
        `|---|---|---|${cols.map(() => "---").join("|")}|---|---|`
    );
    result.top.forEach((r, i) => {
        const pen = Object.entries(r.penalties)
            .map(([k, v]) => `${k} −${fmt(v)}`)
            .join(", ");
        lines.push(
            `| ${i + 1} | ${rlabel(r)} | ${fmt(r.similarity)} | ${cols.map((c) => fmt(r.weighted[c])).join(" | ")} | ${pen || "-"} | **${fmt(r.final)}** |`
        );
    });
    lines.push(``, `</details>`, ``);
    return { lines, semanticTop };
}

async function main() {
    console.log("📚 Katalog istatistikleri yükleniyor...");
    const corpus = await loadCorpus();
    const stats = buildCorpusStats(corpus);
    console.log(`   ${stats.n} film`);

    const report = [
        `# Rerank Raporu`,
        ``,
        `Oluşturulma: ${new Date().toISOString()} · Aday havuzu: ${POOL} · Top: ${TOP}`,
        ``,
        `Ağırlıklar: ${Object.entries(DEFAULT_CONFIG.weights).map(([k, v]) => `${k}=${v}`).join(", ")}`,
        ``,
    ];

    for (const seedId of SEEDS) {
        const { seed, candidates, rpcMs, kwAdded, totalMs } = await getCandidates(seedId, corpus, stats, { pool: POOL, kwPool: KW_POOL });
        if (!seed) {
            console.log(`\n❌ ${seedId} veritabanında yok`);
            continue;
        }
        const result = rerank(seed, candidates, stats, DEFAULT_CONFIG, TOP);
        const { lines, semanticTop } = seedReport(seed, candidates, result);
        report.push(...lines);

        console.log(`\n🎬 ${label(seed)}  [rpc ${rpcMs}ms, toplam ${totalMs}ms, ${candidates.length} aday (${kwAdded} keyword kanalından)]`);
        console.log(`   Semantic : ${semanticTop.slice(0, 8).map((f) => f.title).join(" | ")}`);
        console.log(`   Rerank   : ${result.top.slice(0, 10).map((r) => (r.source === "keyword" ? "🔑" : "") + r.film.title).join(" | ")}`);
    }

    const outDir = resolve(ROOT, "data", "eval");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "rerank_report.md");
    writeFileSync(outPath, report.join("\n"));
    console.log(`\n✅ Detaylı rapor: ${outPath}`);
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
