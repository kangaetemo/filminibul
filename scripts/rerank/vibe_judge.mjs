// Tarife göre arama ("vibe", /ara) için LLM hakem değerlendirmesi.
// Her tarifin ilk 10 sonucunu bir LLM'e 0–3 arası puanlatır; puanlar önbelleğe alınır (aynı tarif + film
// çifti tekrar ödenmez). Film önerilerindeki llm_judge.mjs ile aynı ölçek ve metrikler.
//
// Sonuç kaynağı:
//   --source live   (varsayılan) canlı siteden alır: https://filminibul.com/api/vibe-search
//                   Sadece hakem için OPENAI_API_KEY gerekir. Site tarafında tarif başına ~$0,0002 harcanır.
//                   Sitenin IP başına dakikada 8 yeni arama sınırı için istekler aralıklı gönderilir.
//   --source local  sitenin arama kodunu (src/lib/recommend/vibe.ts) doğrudan çalıştırır: bir değişikliği
//                   yayına almadan ölçmek için. OPENAI_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY gerekir.
//
// Kullanım:
//   node scripts/rerank/vibe_judge.mjs --dry-run                    # sonuçları alır, hakem maliyetini tahmin eder, puanlamaz
//   node scripts/rerank/vibe_judge.mjs --label canli-0              # canlı sonuçları puanla, "canli-0" adıyla kaydet
//   node scripts/rerank/vibe_judge.mjs --source local --label filtre-v1
//   node scripts/rerank/vibe_judge.mjs --source local --label tema --weights 0,0.1,0.2,0.3   # aynı adaylar, 4 tema ağırlığı
//   node scripts/rerank/vibe_judge.mjs --source local --label sart --variants base,donem,ulke,oy30,hepsi,tema0
//   node scripts/rerank/vibe_judge.mjs --only ekonomik-buhran,70ler-mafya
//   node scripts/rerank/vibe_judge.mjs --report-only                # yalnız kayıtlı çalıştırmalar + önbellekle rapor
//   seçenekler: --model gpt-4.1 · --max-cost 0.5 · --base https://filminibul.com
//
// Dosyalar:
//   data/eval/vibe_queries.json      tarif listesi (elle düzenlenir; gerçek kullanıcı örnekleri en değerlisi)
//   data/eval/vibe_runs.json         çalıştırmalar: { label: { at, source, results: { tarifId: [film…] } } }
//   data/eval/vibe_judgments.jsonl   önbellek: {q, cand, score, model} (tarif metni değişirse yeniden puanlanır)
//   data/eval/vibe_report.md         rapor: çalıştırmaların karşılaştırması + son çalıştırmanın ilk 10'ları

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, loadEnv, requireEnv } from "../export/loadEnv.mjs";

loadEnv();

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, def) => (args.includes(n) ? args[args.indexOf(n) + 1] : def);
const SOURCE = opt("--source", "live");
const LABEL = opt("--label", `${SOURCE}-${new Date().toISOString().slice(0, 10)}`);
const MODEL = opt("--model", "gpt-4.1");
const MAX_COST = Number(opt("--max-cost", "0.5"));
const BASE = opt("--base", "https://filminibul.com").replace(/\/+$/, "");
const ONLY = opt("--only", "").split(",").filter(Boolean);
// Yalnız --source local: aynı adaylar bu tema ağırlıklarıyla ayrı ayrı sıralanır ("<etiket>-w<ağırlık>" çalıştırmaları)
const WEIGHTS = opt("--weights", "").split(",").filter(Boolean).map(Number).filter((w) => Number.isFinite(w) && w >= 0 && w <= 2);
// Yalnız --source local: hazır sıralama seçenekleri ("<etiket>-<ad>" çalıştırmaları). Hepsi aynı çeviriyle;
// oy sınırı farklı olanlar için yalnız Supabase sorgusu tekrarlanır. Tanımsız alanlar koddaki varsayılanı kullanır.
const VARIANT_PRESETS = {
    base: {}, // canlıdaki ayarlar
    donem: { eraWeight: 0.08 }, // tarifteki dönem şartı ("80'lerde")
    ulke: { countryWeight: 0.08 }, // tarifteki ülke / dil şartı ("Kore yapımı")
    oy30: { minVotes: 30 }, // 100 yerine en az 30 oy
    hepsi: { eraWeight: 0.08, countryWeight: 0.08, minVotes: 30 },
    tema0: { themeWeight: 0 }, // tema ağırlığının yan etkisi
};
const VARIANTS = opt("--variants", "").split(",").filter(Boolean);
for (const v of VARIANTS) if (!VARIANT_PRESETS[v]) { console.error(`❌ Bilinmeyen varyant: ${v} (seçenekler: ${Object.keys(VARIANT_PRESETS).join(", ")})`); process.exit(1); }
const DRY_RUN = flag("--dry-run");
const REPORT_ONLY = flag("--report-only");
const TOP = 10;
const LIVE_GAP_MS = 8000; // dakikada en fazla ~7 yeni arama (sitenin sınırı 8)

const PRICES = { "gpt-4.1": [2, 8], "gpt-4.1-mini": [0.4, 1.6], "gpt-4o": [2.5, 10], "gpt-4o-mini": [0.15, 0.6] };

const EVAL_DIR = resolve(ROOT, "data", "eval");
const QUERIES_PATH = resolve(EVAL_DIR, "vibe_queries.json");
const RUNS_PATH = resolve(EVAL_DIR, "vibe_runs.json");
const CACHE_PATH = resolve(EVAL_DIR, "vibe_judgments.jsonl");
const REPORT_PATH = resolve(EVAL_DIR, "vibe_report.md");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s ?? "");

// ---------- Sonuçları almak ----------

/** Hakeme ve rapora gereken kadar film bilgisi (FilmDTO'dan). */
const slim = (f) => ({ id: f.id, title: f.titleEn || f.title, year: f.year, genres: f.genresEn ?? [], overview: clip(f.overviewEn || f.overview, 260) });

async function fetchLive(q) {
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(`${BASE}/api/vibe-search?q=${encodeURIComponent(q)}`);
        if (res.ok) return { films: ((await res.json()).films ?? []).slice(0, TOP).map((v) => slim(v.film)), timing: res.headers.get("server-timing") };
        if (res.status === 429 && attempt < 4) { await sleep(65000); continue; }
        throw new Error(`${res.status} ${clip(await res.text(), 160)}`);
    }
}

let vibe;
/**
 * Yerel kod: her tarif OpenAI'de bir kez çevrilir, aynı adaylar her tema ağırlığıyla ayrı sıralanır.
 * Böylece varyantlar arasındaki fark LLM çevirisinin değişkenliğinden değil, yalnız sıralamadan gelir.
 */
async function fetchLocal(q, i) {
    if (!vibe) {
        requireEnv("OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
        const { importSrc } = await import("./tsImport.mjs");
        vibe = await importSrc("lib/recommend/vibe.ts");
    }
    const timing = {};
    const { themes, conditions, vector, rows } = await vibe.vibeCandidates(q, `eval-${i}`, timing); // her tarif ayrı "IP": yerel hız sınırına takılmasın
    const variants = {};
    const rank = (pool, options) => vibe.rankVibe(pool, themes, { conditions, ...options }).slice(0, TOP).map((v) => slim(v.film));
    if (VARIANTS.length) {
        const pools = new Map([[vibe.VIBE_MIN_VOTES, rows]]);
        for (const name of VARIANTS) {
            const { minVotes = vibe.VIBE_MIN_VOTES, ...options } = VARIANT_PRESETS[name];
            if (!pools.has(minVotes)) pools.set(minVotes, await vibe.vibeRows(vector, minVotes));
            variants[`${LABEL}-${name}`] = rank(pools.get(minVotes), options);
        }
    } else {
        for (const w of WEIGHTS.length ? WEIGHTS : [undefined]) variants[w === undefined ? LABEL : `${LABEL}-w${w}`] = rank(rows, w === undefined ? {} : { themeWeight: w });
    }
    if (conditions.decades.length || conditions.countries.length) timing.conditions = conditions;
    return { variants, timing: JSON.stringify(timing) };
}

// ---------- Hakem ----------

const SYSTEM_PROMPT = `You are a film expert evaluating a "describe the film you want" search on a Turkish film site. The user typed a request (usually in Turkish) and the site returned films.

Rate EACH candidate against the REQUEST:
3 = excellent match: clearly what the user asked for (topic, tone and every explicit condition such as era, country, language, audience)
2 = good match: fits the main idea, minor mismatch in tone or one detail
1 = weak: only superficial overlap (a shared word, setting or broad genre) or it breaks an explicit condition (wrong decade, wrong country, wrong audience)
0 = unrelated or a bad recommendation for this request

Judge on what the films are actually like, using your own knowledge of them when you know them; the short descriptions are only hints. Do not reward shared surface words when the film is about something else.
Respond with JSON only: {"ratings": [{"id": <number>, "score": <0-3>}, ...]} containing every candidate id exactly once.`;

function buildMessages(q, cands) {
    const lines = cands.map((f) => `[${f.id}] ${f.title} (${f.year ?? "?"}) | ${f.genres.join(", ")} | ${f.overview}`);
    return [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `REQUEST: ${q}\n\nCANDIDATES:\n${lines.join("\n")}` },
    ];
}

async function judge(apiKey, q, cands, attempt = 1) {
    let res;
    try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: "json_object" }, messages: buildMessages(q, cands) }),
        });
    } catch (err) {
        if (attempt >= 4) throw err;
        await sleep(1000 * 2 ** attempt);
        return judge(apiKey, q, cands, attempt + 1);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) throw new Error("OpenAI kotası yetersiz");
        await sleep(1000 * 2 ** attempt);
        return judge(apiKey, q, cands, attempt + 1);
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${clip(await res.text(), 200)}`);
    const data = await res.json();
    const valid = new Set(cands.map((c) => c.id));
    const ratings = (JSON.parse(data.choices[0].message.content).ratings ?? [])
        .map((r) => ({ id: Number(r.id), score: Number(r.score) }))
        .filter((r) => valid.has(r.id) && [0, 1, 2, 3].includes(r.score));
    return { ratings, usage: data.usage };
}

function readCache() {
    const cache = new Map();
    if (!existsSync(CACHE_PATH)) return cache;
    for (const line of readFileSync(CACHE_PATH, "utf8").split("\n")) {
        if (!line.trim()) continue;
        const r = JSON.parse(line);
        cache.set(`${r.q}\u0000${r.cand}`, r.score);
    }
    return cache;
}

// Deterministik karıştırma: hakem sıradan etkilenmesin
function shuffled(list, seed) {
    let a = seed;
    const rand = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return list.map((x) => ({ x, r: rand() })).sort((p, q) => p.r - q.r).map((p) => p.x);
}

const dcg = (rels) => rels.reduce((s, rel, i) => s + (2 ** rel - 1) / Math.log2(i + 2), 0);

// ---------- Ana akış ----------

async function main() {
    const queries = JSON.parse(readFileSync(QUERIES_PATH, "utf8")).filter((x) => !ONLY.length || ONLY.includes(x.id));
    const runs = existsSync(RUNS_PATH) ? JSON.parse(readFileSync(RUNS_PATH, "utf8")) : {};

    if (!REPORT_ONLY) {
        console.log(`🔎 ${queries.length} tarif · kaynak: ${SOURCE}${SOURCE === "live" ? ` (${BASE})` : ""} · etiket: ${LABEL}`);
        const results = {}; // etiket → { tarifId: { q, films } }
        const timings = {};
        for (const [i, item] of queries.entries()) {
            if (SOURCE === "live" && i > 0) await sleep(LIVE_GAP_MS);
            const started = Date.now();
            try {
                let byLabel, timing;
                if (SOURCE === "local") ({ variants: byLabel, timing } = await fetchLocal(item.q, i));
                else { const live = await fetchLive(item.q); byLabel = { [LABEL]: live.films }; timing = live.timing; }
                for (const [label, films] of Object.entries(byLabel)) {
                    results[label] ??= { ...(runs[label]?.results ?? {}) };
                    results[label][item.id] = { q: item.q, films };
                }
                timings[item.id] = { ms: Date.now() - started, timing };
                const first = Object.values(byLabel)[0];
                console.log(`  ${String(i + 1).padStart(2)}. ${item.id.padEnd(24)} ${String(Date.now() - started).padStart(6)} ms · ${first.slice(0, 3).map((f) => f.title).join(" | ")}`);
            } catch (err) {
                console.error(`  ❌ ${item.id}: ${err.message}`);
            }
        }
        for (const [label, res] of Object.entries(results)) runs[label] = { at: new Date().toISOString(), source: SOURCE, base: SOURCE === "live" ? BASE : null, results: res, timings };
        writeFileSync(RUNS_PATH, JSON.stringify(runs, null, 1));
    }

    // Puanlanmamış çiftler: bütün çalıştırmaların ilk 10'larının birleşimi (karşılaştırma adil olsun)
    const cache = readCache();
    const pool = new Map(); // q → Map(id → film)
    for (const run of Object.values(runs)) {
        for (const [id, r] of Object.entries(run.results)) {
            if (!queries.some((x) => x.id === id && x.q === r.q)) continue;
            const m = pool.get(r.q) ?? new Map();
            for (const f of r.films) m.set(f.id, f);
            pool.set(r.q, m);
        }
    }
    const jobs = [...pool.entries()]
        .map(([q, m], i) => ({ q, cands: shuffled([...m.values()].filter((f) => !cache.has(`${q}\u0000${f.id}`)), i + 7) }))
        .filter((j) => j.cands.length);

    const [pin, pout] = PRICES[MODEL] ?? [NaN, NaN];
    const estIn = jobs.reduce((s, j) => s + JSON.stringify(buildMessages(j.q, j.cands)).length / 3.5, 0);
    const estOut = jobs.reduce((s, j) => s + j.cands.length * 12, 0);
    const estCost = (estIn * pin + estOut * pout) / 1e6;
    console.log(`\n⚖️  Puanlanacak ${jobs.reduce((s, j) => s + j.cands.length, 0)} çift (önbellekte ${cache.size}) · hakem ${MODEL} · tahmini ~$${estCost.toFixed(3)}`);

    if (DRY_RUN) {
        if (jobs[0]) console.log(`\n--- Örnek istem ---\n${buildMessages(jobs[0].q, jobs[0].cands.slice(0, 4))[1].content}\n...`);
        console.log("\n(--dry-run: hakem çağrısı yapılmadı)");
        return;
    }

    if (!REPORT_ONLY && jobs.length) {
        if (!(estCost <= MAX_COST)) {
            console.error(`❌ Tahmini maliyet ($${estCost.toFixed(3)}) --max-cost ($${MAX_COST}) sınırını aşıyor (veya model fiyatı bilinmiyor).`);
            process.exit(1);
        }
        const [apiKey] = requireEnv("OPENAI_API_KEY");
        let spent = 0, done = 0, next = 0;
        async function worker() {
            while (next < jobs.length) {
                const job = jobs[next++];
                try {
                    const { ratings, usage } = await judge(apiKey, job.q, job.cands);
                    if (ratings.length) appendFileSync(CACHE_PATH, ratings.map((r) => JSON.stringify({ q: job.q, cand: r.id, score: r.score, model: MODEL })).join("\n") + "\n");
                    for (const r of ratings) cache.set(`${job.q}\u0000${r.id}`, r.score);
                    spent += (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1e6;
                    if (ratings.length < job.cands.length) console.warn(`\n  ⚠️ "${job.q}": ${job.cands.length - ratings.length} film puansız döndü`);
                } catch (err) {
                    console.error(`\n  ❌ "${job.q}": ${err.message}`);
                }
                process.stdout.write(`\r  ${++done}/${jobs.length} tarif · harcanan $${spent.toFixed(3)}   `);
            }
        }
        await Promise.all(Array.from({ length: 2 }, worker));
        console.log();
    }

    writeReport(queries, runs, cache);
}

function writeReport(queries, runs, cache) {
    const labels = Object.keys(runs);
    const f2 = (x) => x.toFixed(2);
    const pct = (x) => `${Math.round(x * 100)}%`;
    const score = (q, id) => cache.get(`${q}\u0000${id}`);

    // Tarif başına ideal sıralama: o tarif için puanlanan bütün filmlerin en iyileri
    const ideal = new Map();
    for (const item of queries) {
        const judged = [...cache.entries()].filter(([k]) => k.startsWith(`${item.q}\u0000`)).map(([, s]) => s);
        ideal.set(item.q, dcg(judged.sort((a, b) => b - a).slice(0, TOP)));
    }

    const metrics = (label) => {
        const run = runs[label];
        const rows = [];
        for (const item of queries) {
            const r = run.results[item.id];
            if (!r || r.q !== item.q || !r.films.length) continue;
            const rels = r.films.map((f) => score(item.q, f.id));
            if (rels.some((s) => s === undefined)) continue;
            const id = ideal.get(item.q);
            rows.push({ item, rels, nd: id > 0 ? dcg(rels) / id : 0, mean: rels.reduce((s, x) => s + x, 0) / rels.length, good: rels.filter((x) => x >= 2).length / rels.length, bad: rels.filter((x) => x === 0).length / rels.length });
        }
        const avg = (k, list = rows) => (list.length ? list.reduce((s, x) => s + x[k], 0) / list.length : NaN);
        const kinds = [...new Set(queries.map((x) => x.kind))];
        return { rows, count: rows.length, nd: avg("nd"), mean: avg("mean"), good: avg("good"), bad: avg("bad"), byKind: Object.fromEntries(kinds.map((k) => [k, avg("mean", rows.filter((r) => r.item.kind === k))])) };
    };

    const kinds = [...new Set(queries.map((x) => x.kind))];
    const all = Object.fromEntries(labels.map((l) => [l, metrics(l)]));
    const lines = [
        `# Tarif araması — LLM değerlendirme raporu`,
        ``,
        `Oluşturulma: ${new Date().toISOString()} · hakem: ${MODEL} · ${queries.length} tarif · Top ${TOP}`,
        ``,
        `- **ort. puan**: ilk 10'un ortalama 0–3 puanı (3 = tam istenen, 1 = yüzeysel / açık şartı bozuyor, 0 = alakasız)`,
        `- **iyi**: puanı ≥2 olanların oranı · **alakasız**: puanı 0 olanların oranı`,
        `- **nDCG@10**: bütün çalıştırmalarda puanlanan en iyi filmlere göre sıralama kalitesi`,
        ``,
        `| Çalıştırma | kaynak | tarif | ort. puan | iyi | alakasız | nDCG@10 | ${kinds.map((k) => `ort. ${k}`).join(" | ")} |`,
        `|---|---|---|---|---|---|---|${kinds.map(() => "---").join("|")}|`,
    ];
    console.log(`\n${"Çalıştırma".padEnd(22)} tarif  ort.puan  iyi   alakasız  nDCG@10`);
    for (const l of labels) {
        const m = all[l];
        if (!m.count) continue;
        lines.push(`| ${l} | ${runs[l].source} | ${m.count} | **${f2(m.mean)}** | ${pct(m.good)} | ${pct(m.bad)} | ${f2(m.nd)} | ${kinds.map((k) => (Number.isNaN(m.byKind[k]) ? "-" : f2(m.byKind[k]))).join(" | ")} |`);
        console.log(`${l.padEnd(22)} ${String(m.count).padStart(5)}  ${f2(m.mean).padStart(8)}  ${pct(m.good).padStart(4)}  ${pct(m.bad).padStart(8)}  ${f2(m.nd).padStart(7)}`);
    }

    const last = labels.at(-1);
    if (last && all[last].count) {
        const rows = [...all[last].rows].sort((a, b) => a.mean - b.mean);
        lines.push(``, `## "${last}" — tarif bazında (en zayıftan başlayarak)`, ``, `| Tarif | tür | ort. puan | alakasız | ilk 10 (puan) |`, `|---|---|---|---|---|`);
        for (const r of rows) {
            const films = runs[last].results[r.item.id].films.map((f, i) => `${f.title} (${f.year ?? "?"}) [${r.rels[i]}]`).join(", ");
            lines.push(`| ${r.item.q} | ${r.item.kind} | ${f2(r.mean)} | ${pct(r.bad)} | ${films} |`);
        }
    }
    writeFileSync(REPORT_PATH, lines.join("\n") + "\n");
    console.log(`\n✅ Rapor: ${REPORT_PATH}`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
