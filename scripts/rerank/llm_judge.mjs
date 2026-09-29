// LLM-as-judge değerlendirmesi: her konfigürasyonun Top 10'unu bir LLM'e 0–3 arası puanlatır.
// İnsan eliyle hazırlanmış liste gerektirmez; puanlar önbelleğe alınır (aynı çift tekrar ödenmez).
//
// Kullanım:
//   node scripts/rerank/llm_judge.mjs --dry-run            # havuz boyutu + maliyet tahmini, API çağrısı yok
//   node scripts/rerank/llm_judge.mjs                      # gpt-4.1 ile puanla ve raporla
//   node scripts/rerank/llm_judge.mjs --model gpt-4.1-mini --max-cost 0.5
//   node scripts/rerank/llm_judge.mjs --report-only        # sadece önbellekteki puanlarla rapor
//
// Dosyalar:
//   data/eval/llm_seeds.json        seed listesi (ilk çalıştırmada üretilir, elle düzenlenebilir)
//   data/eval/llm_judgments.jsonl   önbellek: {seed, cand, score, model}
//   data/eval/llm_report.md         sonuç raporu

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, requireEnv } from "../export/loadEnv.mjs";
import { buildCorpusStats, rerank } from "./reranker.mjs";
import { CONFIGS } from "./configs.mjs";
import { loadCorpus, getCandidates, getCandidatesLocal, loadLocalEmbeddings } from "./data.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, def) => (args.includes(n) ? args[args.indexOf(n) + 1] : def);
const MODEL = opt("--model", "gpt-4.1");
const MAX_COST = Number(opt("--max-cost", "1.0"));
const EMB = opt("--emb", "v3");
const TOP = 10;
const DRY_RUN = flag("--dry-run");
const REPORT_ONLY = flag("--report-only");

// $ / 1M token (girdi, çıktı)
const PRICES = {
    "gpt-4.1": [2, 8],
    "gpt-4.1-mini": [0.4, 1.6],
    "gpt-4.1-nano": [0.1, 0.4],
    "gpt-4o": [2.5, 10],
    "gpt-4o-mini": [0.15, 0.6],
};

const EVAL_DIR = resolve(ROOT, "data", "eval");
const SEEDS_PATH = resolve(EVAL_DIR, "llm_seeds.json");
const CACHE_PATH = resolve(EVAL_DIR, "llm_judgments.jsonl");
const REPORT_PATH = resolve(EVAL_DIR, "llm_report.md");

const FIXED_SEEDS = [603, 26466, 220289, 129, 807, 310131, 157336, 2111];

// Deterministik rastgele (her çalıştırmada aynı seed seçimi)
function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function tierOf(f) {
    if (f.vote_count >= 3000) return "popüler";
    if (f.vote_count >= 300) return "orta";
    return "az bilinen";
}

// Popülerlik katmanı ve ana türe göre dengeli seed seçimi
function pickSeeds(corpus) {
    const rand = mulberry32(42);
    const quota = { popüler: 14, orta: 16, "az bilinen": 12 };
    const perGenre = new Map();
    const chosen = [...FIXED_SEEDS];
    const eligible = corpus
        .filter((f) => !FIXED_SEEDS.includes(f.movie_id))
        .filter((f) => f.overview && f.genres?.length && f.vote_count >= 30)
        .filter((f) => !(f.keywords ?? []).some((k) => ["softcore", "pink film", "erotic movie"].includes(k)))
        .map((f) => ({ f, r: rand() }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.f);
    for (const f of eligible) {
        const tier = tierOf(f);
        if (!quota[tier]) continue;
        const key = `${tier}:${f.genres[0].id}`;
        if ((perGenre.get(key) ?? 0) >= 2) continue; // aynı katmanda aynı ana türden en fazla 2
        perGenre.set(key, (perGenre.get(key) ?? 0) + 1);
        quota[tier]--;
        chosen.push(f.movie_id);
    }
    return chosen;
}

function readCache() {
    const cache = new Map();
    if (!existsSync(CACHE_PATH)) return cache;
    for (const line of readFileSync(CACHE_PATH, "utf8").split("\n")) {
        if (!line.trim()) continue;
        const r = JSON.parse(line);
        cache.set(`${r.seed}:${r.cand}`, r.score);
    }
    return cache;
}

const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s ?? "");
const genresOf = (f) => (f.genres ?? []).map((g) => g.name).join(", ");

function describeSeed(f) {
    return [
        `${f.title} (${f.year ?? "?"})${f.original_title && f.original_title !== f.title ? ` — original title: ${f.original_title}` : ""}`,
        `Genres: ${genresOf(f)}`,
        f.director ? `Director: ${f.director}` : null,
        f.keywords?.length ? `Keywords: ${f.keywords.slice(0, 15).join(", ")}` : null,
        f.overview ? `Overview: ${f.overview}` : null,
    ]
        .filter(Boolean)
        .join("\n");
}

function describeCandidate(f) {
    return `[${f.movie_id}] ${f.title} (${f.year ?? "?"}) | ${genresOf(f)}${f.director ? ` | dir. ${f.director}` : ""} | ${clip(f.overview, 220)}`;
}

const SYSTEM_PROMPT = `You are a film critic evaluating a "Similar Films" feature (like Letterboxd's). A user has just finished the SEED film and is looking for films that genuinely feel similar.

Rate EACH candidate against the seed:
3 = very similar: a fan of the seed would very likely want this next (strong match in themes, tone, subgenre, style; direct sequels/prequels count)
2 = clearly related: meaningful shared themes or subgenre, a reasonable recommendation
1 = weak: only superficial overlap (same broad genre, a shared setting or plot element)
0 = unrelated or a bad recommendation (different tone/audience, e.g. kids' film for adult horror)

Judge on what the films are actually like, using your own knowledge of them when you know them; the short descriptions are only hints. Do not reward shared surface words (e.g. both "at sea") if the films feel different.
Respond with JSON only: {"ratings": [{"id": <number>, "score": <0-3>}, ...]} containing every candidate id exactly once.`;

function buildMessages(seed, cands) {
    return [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `SEED:\n${describeSeed(seed)}\n\nCANDIDATES:\n${cands.map(describeCandidate).join("\n")}` },
    ];
}

async function judge(apiKey, seed, cands, attempt = 1) {
    let res;
    try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: buildMessages(seed, cands),
            }),
        });
    } catch (err) {
        if (attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return judge(apiKey, seed, cands, attempt + 1);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) throw new Error(`OpenAI kotası yetersiz: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return judge(apiKey, seed, cands, attempt + 1);
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const valid = new Set(cands.map((c) => c.movie_id));
    const ratings = (parsed.ratings ?? [])
        .map((r) => ({ id: Number(r.id), score: Number(r.score) }))
        .filter((r) => valid.has(r.id) && [0, 1, 2, 3].includes(r.score));
    return { ratings, usage: data.usage };
}

function dcg(scores) {
    return scores.reduce((s, rel, i) => s + (2 ** rel - 1) / Math.log2(i + 2), 0);
}

async function main() {
    const corpus = await loadCorpus();
    const stats = buildCorpusStats(corpus);
    const byId = new Map(corpus.map((f) => [f.movie_id, f]));

    if (!existsSync(SEEDS_PATH)) {
        writeFileSync(SEEDS_PATH, JSON.stringify(pickSeeds(corpus), null, 0));
        console.log(`🎲 Seed listesi oluşturuldu: ${SEEDS_PATH}`);
    }
    const seedIds = JSON.parse(readFileSync(SEEDS_PATH, "utf8")).filter((id) => byId.has(id));

    const localEmb = EMB === "v2" ? null : loadLocalEmbeddings(EMB);
    const names = ["semantic", ...Object.keys(CONFIGS)];

    // Her seed için tüm konfigürasyonların Top 10'u
    const runs = [];
    for (const id of seedIds) {
        const opts = { pool: 200, kwPool: 100 };
        const { seed, candidates } = localEmb
            ? getCandidatesLocal(id, corpus, stats, localEmb, opts)
            : await getCandidates(id, corpus, stats, opts);
        if (!seed || !candidates.length) continue;
        const rankings = {
            semantic: candidates
                .filter((c) => c.source === "semantic")
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, TOP)
                .map((c) => c.movie_id),
        };
        for (const [n, cfg] of Object.entries(CONFIGS)) rankings[n] = rerank(seed, candidates, stats, cfg, TOP).top.map((r) => r.film.movie_id);
        runs.push({ seed, rankings });
    }

    // Puanlanmamış (seed, aday) çiftleri
    const cache = readCache();
    const rand = mulberry32(7);
    const jobs = runs
        .map(({ seed, rankings }) => {
            const pool = [...new Set(Object.values(rankings).flat())].filter((c) => !cache.has(`${seed.movie_id}:${c}`));
            // Sıra bilgisi sızmasın diye karıştır
            const cands = pool
                .map((c) => ({ f: byId.get(c), r: rand() }))
                .sort((a, b) => a.r - b.r)
                .map((x) => x.f);
            return { seed, cands };
        })
        .filter((j) => j.cands.length);

    const [pin, pout] = PRICES[MODEL] ?? [NaN, NaN];
    const estIn = jobs.reduce((s, j) => s + JSON.stringify(buildMessages(j.seed, j.cands)).length / 4, 0);
    const estOut = jobs.reduce((s, j) => s + j.cands.length * 12, 0);
    const estCost = (estIn * pin + estOut * pout) / 1e6;
    console.log(
        `🎬 ${runs.length} seed · ${names.length} sıralama · puanlanacak ${jobs.reduce((s, j) => s + j.cands.length, 0)} çift (önbellekte ${cache.size})`
    );
    console.log(`💰 Model ${MODEL} · tahmini ~${Math.round(estIn / 1000)}K girdi + ~${Math.round(estOut / 1000)}K çıktı token · ~$${estCost.toFixed(3)}`);

    if (DRY_RUN) {
        if (jobs[0]) console.log(`\n--- Örnek istem ---\n${buildMessages(jobs[0].seed, jobs[0].cands.slice(0, 5))[1].content}\n...`);
        return;
    }

    if (!REPORT_ONLY && jobs.length) {
        if (!(estCost <= MAX_COST)) {
            console.error(`❌ Tahmini maliyet ($${estCost.toFixed(3)}) --max-cost ($${MAX_COST}) sınırını aşıyor (veya model fiyatı bilinmiyor).`);
            process.exit(1);
        }
        const apiKey = requireEnv("OPENAI_API_KEY")[0];
        let spent = 0;
        let doneJobs = 0;
        let next = 0;
        async function worker() {
            while (next < jobs.length) {
                const job = jobs[next++];
                try {
                    const { ratings, usage } = await judge(apiKey, job.seed, job.cands);
                    appendFileSync(
                        CACHE_PATH,
                        ratings.map((r) => JSON.stringify({ seed: job.seed.movie_id, cand: r.id, score: r.score, model: MODEL })).join("\n") + "\n"
                    );
                    for (const r of ratings) cache.set(`${job.seed.movie_id}:${r.id}`, r.score);
                    spent += (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1e6;
                    if (ratings.length < job.cands.length) console.warn(`\n  ⚠️ ${job.seed.title}: ${job.cands.length - ratings.length} aday puansız döndü`);
                } catch (err) {
                    console.error(`\n  ❌ ${job.seed.title}: ${err.message}`);
                }
                doneJobs++;
                process.stdout.write(`\r  ${doneJobs}/${jobs.length} seed · harcanan $${spent.toFixed(3)}   `);
            }
        }
        await Promise.all(Array.from({ length: 2 }, worker));
        console.log();
    }

    // ---------- Metrikler ----------
    const tiers = ["popüler", "orta", "az bilinen"];
    const agg = Object.fromEntries(names.map((n) => [n, { ndcg: 0, mean: 0, good: 0, bad: 0, count: 0, tiers: {} }]));
    const perSeed = [];
    for (const { seed, rankings } of runs) {
        const judged = [...new Set(Object.values(rankings).flat())].map((c) => cache.get(`${seed.movie_id}:${c}`)).filter((s) => s !== undefined);
        const ideal = dcg([...judged].sort((a, b) => b - a).slice(0, TOP));
        const row = { seed, scores: {} };
        for (const n of names) {
            const rels = rankings[n].map((c) => cache.get(`${seed.movie_id}:${c}`));
            if (rels.some((s) => s === undefined)) continue; // puanı eksik seed'i sayma
            const nd = ideal > 0 ? dcg(rels) / ideal : 0;
            const a = agg[n];
            a.ndcg += nd;
            a.mean += rels.reduce((s, x) => s + x, 0) / rels.length;
            a.good += rels.filter((x) => x >= 2).length / rels.length;
            a.bad += rels.filter((x) => x === 0).length / rels.length;
            a.count++;
            const t = (a.tiers[tierOf(seed)] ??= { ndcg: 0, count: 0 });
            t.ndcg += nd;
            t.count++;
            row.scores[n] = { nd, rels };
        }
        perSeed.push(row);
    }

    const f2 = (x) => x.toFixed(2);
    const pct = (x) => `${Math.round(x * 100)}%`;
    const lines = [
        `# LLM Değerlendirme Raporu`,
        ``,
        `Oluşturulma: ${new Date().toISOString()} · hakem: ${MODEL} · embedding: ${EMB} · ${runs.length} seed · Top ${TOP}`,
        ``,
        `- **nDCG@10**: sıralama kalitesi (1.00 = puanlanan en iyi filmler en üstte)`,
        `- **ort. puan**: Top 10'un ortalama 0–3 puanı`,
        `- **iyi**: puanı ≥2 olanların oranı · **alakasız**: puanı 0 olanların oranı`,
        ``,
        `| Sıralama | nDCG@10 | ort. puan | iyi | alakasız | ${tiers.map((t) => `nDCG ${t}`).join(" | ")} |`,
        `|---|---|---|---|---|${tiers.map(() => "---").join("|")}|`,
    ];
    console.log(`\n${"Sıralama".padEnd(12)} nDCG@10  ort.puan  iyi   alakasız  ${tiers.map((t) => t.padStart(11)).join("")}`);
    for (const n of names) {
        const a = agg[n];
        if (!a.count) continue;
        const tierVals = tiers.map((t) => (a.tiers[t] ? f2(a.tiers[t].ndcg / a.tiers[t].count) : "-"));
        lines.push(`| ${n} | **${f2(a.ndcg / a.count)}** | ${f2(a.mean / a.count)} | ${pct(a.good / a.count)} | ${pct(a.bad / a.count)} | ${tierVals.join(" | ")} |`);
        console.log(
            `${n.padEnd(12)} ${f2(a.ndcg / a.count).padStart(7)}  ${f2(a.mean / a.count).padStart(8)}  ${pct(a.good / a.count).padStart(4)}  ${pct(a.bad / a.count).padStart(8)}  ${tierVals.map((v) => v.padStart(11)).join("")}`
        );
    }

    lines.push(``, `## Seed bazında nDCG@10`, ``, `| Seed | katman | ${names.join(" | ")} |`, `|---|---|${names.map(() => "---").join("|")}|`);
    for (const r of perSeed) {
        lines.push(`| ${r.seed.title} (${r.seed.year}) | ${tierOf(r.seed)} | ${names.map((n) => (r.scores[n] ? f2(r.scores[n].nd) : "-")).join(" | ")} |`);
    }

    // Varsayılan konfigürasyonun Top 10'u puanlarıyla (gözle kontrol için)
    lines.push(``, `## "full" Top 10 (LLM puanlarıyla)`, ``);
    for (const { seed, rankings } of runs) {
        const items = rankings.full.map((c) => `${byId.get(c)?.title} [${cache.get(`${seed.movie_id}:${c}`) ?? "?"}]`);
        lines.push(`- **${seed.title} (${seed.year})**: ${items.join(", ")}`);
    }

    writeFileSync(REPORT_PATH, lines.join("\n"));
    console.log(`\n✅ Rapor: ${REPORT_PATH}`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
