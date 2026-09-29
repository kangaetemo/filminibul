// Offline değerlendirme: data/eval/golden.json'daki beklenen filmlere göre
// farklı reranker konfigürasyonlarını (configs.mjs) ve saf semantic baseline'ı ölçer.
//
// Kullanım:
//   node scripts/rerank/eval.mjs
//   node scripts/rerank/eval.mjs --pool 200 --kw-pool 100
//
// Metrikler (seed başına, sonra ortalama):
//   havuz   : beklenen filmlerin kaçı aday havuzuna girdi (retrieval tavanı)
//   @10/@20 : kaçı Top 10 / Top 20'de (recall)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../export/loadEnv.mjs";
import { buildCorpusStats, rerank } from "./reranker.mjs";
import { CONFIGS } from "./configs.mjs";
import { loadCorpus, getCandidates, getCandidatesLocal, loadLocalEmbeddings } from "./data.mjs";

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : def);
const POOL = opt("--pool", 200);
const KW_POOL = opt("--kw-pool", 100);
// --emb v3: semantic kanal yerel embedding dosyasından (varsayılan: Supabase'teki v2)
const EMB = args.includes("--emb") ? args[args.indexOf("--emb") + 1] : "v2";


const norm = (s) =>
    s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

// Golden listedeki (başlık, yıl) çiftlerini veritabanı ID'lerine çevirir
function resolveTitles(corpus) {
    const byTitle = new Map();
    for (const f of corpus) {
        for (const t of new Set([f.title, f.original_title].filter(Boolean).map(norm))) {
            if (!byTitle.has(t)) byTitle.set(t, []);
            byTitle.get(t).push(f);
        }
    }
    return (title, year) => {
        const matches = (byTitle.get(norm(title)) ?? []).filter((f) => !year || !f.year || Math.abs(f.year - year) <= 1);
        return matches.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))[0] ?? null;
    };
}

const pct = (x) => `${Math.round(x * 100)}%`;

async function main() {
    const golden = JSON.parse(readFileSync(resolve(ROOT, "data", "eval", "golden.json"), "utf8"));
    console.log("📚 Katalog yükleniyor...");
    const corpus = await loadCorpus();
    const stats = buildCorpusStats(corpus);
    const lookup = resolveTitles(corpus);
    const localEmb = EMB === "v2" ? null : loadLocalEmbeddings(EMB);
    console.log(`🧭 Embedding: ${EMB}${localEmb ? ` (yerel, ${localEmb.count} vektör)` : " (Supabase RPC)"}`);

    const names = ["semantic", ...Object.keys(CONFIGS)];
    const totals = Object.fromEntries(names.map((n) => [n, { r10: 0, r20: 0 }]));
    let poolTotal = 0;
    let seedCount = 0;
    const report = [
        `# Değerlendirme Raporu`,
        ``,
        `Oluşturulma: ${new Date().toISOString()} · embedding ${EMB} · semantic havuz ${POOL} + keyword havuz ${KW_POOL}`,
        ``,
        ...Object.entries(CONFIGS).map(([n, c]) => `- **${n}**: ${Object.entries(c.weights).map(([k, v]) => `${k}=${v}`).join(", ")}`),
        ``,
    ];
    const seedRows = [];

    for (const s of golden.seeds) {
        const expected = [];
        const missingInDb = [];
        for (const [title, year] of s.expected) {
            const f = lookup(title, year);
            if (f && f.movie_id !== s.id) expected.push(f);
            else missingInDb.push(`${title} (${year})`);
        }
        if (!expected.length) continue;
        const expectedIds = new Set(expected.map((f) => f.movie_id));

        const opts = { pool: POOL, kwPool: KW_POOL };
        const { seed, candidates } = localEmb
            ? getCandidatesLocal(s.id, corpus, stats, localEmb, opts)
            : await getCandidates(s.id, corpus, stats, opts);
        if (!seed) {
            console.log(`❌ ${s.title} (${s.id}) veritabanında yok`);
            continue;
        }
        seedCount++;

        const poolIds = new Set(candidates.map((c) => c.movie_id));
        const inPool = expected.filter((f) => poolIds.has(f.movie_id));
        poolTotal += inPool.length / expected.length;

        const rankings = {
            semantic: candidates
                .filter((c) => c.source === "semantic")
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 20)
                .map((c) => c.movie_id),
        };
        for (const [n, cfg] of Object.entries(CONFIGS)) {
            rankings[n] = rerank(seed, candidates, stats, cfg, 20).top.map((r) => r.film.movie_id);
        }

        const row = { title: s.title, n: expected.length, pool: inPool.length, scores: {} };
        for (const n of names) {
            const top = rankings[n];
            const h10 = top.slice(0, 10).filter((id) => expectedIds.has(id)).length;
            const h20 = top.filter((id) => expectedIds.has(id)).length;
            row.scores[n] = { h10, h20 };
            totals[n].r10 += h10 / expected.length;
            totals[n].r20 += h20 / expected.length;
        }
        seedRows.push(row);

        // Teşhis: hangi beklenen film nerede kaybolmuş
        const best = rankings.full;
        report.push(`## ${s.title}`, ``);
        if (missingInDb.length) report.push(`- Veritabanında yok (sayılmadı): ${missingInDb.join(", ")}`);
        report.push(
            `- Havuza hiç girmeyen (retrieval kaçırdı): ${expected.filter((f) => !poolIds.has(f.movie_id)).map((f) => f.title).join(", ") || "-"}`,
            `- Havuzda ama full'ün Top 20'sinde değil (ranking kaçırdı): ${inPool.filter((f) => !best.includes(f.movie_id)).map((f) => f.title).join(", ") || "-"}`,
            `- full Top 20'de bulunan: ${expected.filter((f) => best.includes(f.movie_id)).map((f) => `${f.title} (#${best.indexOf(f.movie_id) + 1})`).join(", ") || "-"}`,
            ``
        );
    }

    // Özet tablo
    const header = `| Seed | beklenen | havuz | ${names.map((n) => `${n} @10 | ${n} @20`).join(" | ")} |`;
    const sep = `|---|---|---|${names.map(() => "---|---").join("|")}|`;
    const rows = seedRows.map(
        (r) => `| ${r.title} | ${r.n} | ${r.pool} | ${names.map((n) => `${r.scores[n].h10} | ${r.scores[n].h20}`).join(" | ")} |`
    );
    const avg = `| **Ortalama recall** | | ${pct(poolTotal / seedCount)} | ${names
        .map((n) => `**${pct(totals[n].r10 / seedCount)}** | **${pct(totals[n].r20 / seedCount)}**`)
        .join(" | ")} |`;
    // Başlık (4 satır) + konfigürasyon satırları + boş satırdan sonra
    report.splice(5 + Object.keys(CONFIGS).length, 0, `## Özet`, ``, header, sep, ...rows, avg, ``);

    const outPath = resolve(ROOT, "data", "eval", `eval_report_${EMB}.md`);
    writeFileSync(outPath, report.join("\n"));

    console.log(`\n${"Seed".padEnd(42)} bekl havuz  ${names.map((n) => `${n}@10/@20`.padStart(14)).join("")}`);
    for (const r of seedRows) {
        console.log(
            `${r.title.slice(0, 41).padEnd(42)} ${String(r.n).padStart(4)} ${String(r.pool).padStart(5)}  ${names
                .map((n) => `${r.scores[n].h10}/${r.scores[n].h20}`.padStart(14))
                .join("")}`
        );
    }
    console.log(
        `${"ORTALAMA RECALL".padEnd(42)}      ${pct(poolTotal / seedCount).padStart(5)}  ${names
            .map((n) => `${pct(totals[n].r10 / seedCount)}/${pct(totals[n].r20 / seedCount)}`.padStart(14))
            .join("")}`
    );
    console.log(`\n✅ Detaylı rapor: ${outPath}`);
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
