// Katalogdaki TMDB keyword'lerini LLM ile Türkçeye çevirir ve "açıklamada gösterilir mi" diye işaretler.
// Sadece GÖSTERİM içindir: öneri motoru (embedding, IDF) İngilizce keyword'lerle çalışmaya devam eder.
//
// Kullanım:
//   node scripts/tmdb/translate_keywords.mjs --sample 100   # örnek çeviri, dosya yazmaz
//   node scripts/tmdb/translate_keywords.mjs --dry-run      # keyword sayısı + maliyet tahmini
//   node scripts/tmdb/translate_keywords.mjs                # hepsini çevir (önbellekli, kaldığı yerden devam eder)
//
// Dosyalar:
//   data/tmdb/keywords_tr.jsonl   önbellek: {en, tr, explain}
//   src/data/keywords_tr.json     uygulamanın okuduğu sözlük: { tr: {en: tr}, hidden: [en...] }

import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, requireEnv } from "../export/loadEnv.mjs";
import { loadCorpus } from "../rerank/data.mjs";

const args = process.argv.slice(2);
const opt = (n, def) => (args.includes(n) ? args[args.indexOf(n) + 1] : def);
const SAMPLE = args.includes("--sample") ? Number(opt("--sample", "100")) : 0;
const DRY_RUN = args.includes("--dry-run");
const MODEL = opt("--model", "gpt-4.1-mini");
const PRICES = { "gpt-4.1": [2, 8], "gpt-4.1-mini": [0.4, 1.6] };
const BATCH = 120;
const CONCURRENCY = 2;

const CACHE_PATH = resolve(ROOT, "data", "tmdb", "keywords_tr.jsonl");
const OUT_PATH = resolve(ROOT, "src", "data", "keywords_tr.json");

const SYSTEM_PROMPT = `You translate TMDB movie keywords into Turkish for a Turkish film recommendation site. The keywords are shown to users in sentences like "Ortak temalar: zaman döngüsü, seri katil, yapay zekâ".

For each keyword return:
1. "tr": natural, short Turkish a Turkish moviegoer would understand — how a Turkish film critic would phrase it, not a word-by-word translation. Avoid obscure loanwords when a plain Turkish phrase exists.
   Capitalization: common nouns lowercase; proper nouns (countries, cities, people, historical events, works, franchises) MUST be capitalized with Turkish rules, using the usual Turkish name.
   Examples: "japan" → "Japonya", "new york city" → "New York", "world war ii" → "II. Dünya Savaşı", "baghdad, iraq" → "Bağdat, Irak", "indian freedom struggle" → "Hindistan bağımsızlık mücadelesi", "coming of age" → "büyüme hikâyesi", "woman between two men" → "iki erkek arasında kalan kadın", "transgender" → "trans", "serial killer" → "seri katil", "time loop" → "zaman döngüsü".
2. "explain": 1 if two films SHARING this keyword says something meaningful about them being similar (a theme, subject, setting, character type, mood, plot device, subgenre, era, franchise/character name). 0 if it is production/meta information whose sharing does not make films similar (e.g. "woman director", "duringcreditsstinger", "aftercreditsstinger", "based on novel or book", "based on comic", "sequel", "remake", "3d", "imax", "independent film", "short film", "black and white"), or if it is too vague/meaningless to show (e.g. "key", "complex", "excited").

Respond with JSON only: {"r": [["<tr>", <0|1>], ...]} — exactly one entry per input keyword, in the SAME ORDER.`;

function readCache() {
    const map = new Map();
    for (const line of existsSync(CACHE_PATH) ? readFileSync(CACHE_PATH, "utf8").split("\n") : []) {
        if (!line.trim()) continue;
        const r = JSON.parse(line);
        map.set(r.en, r);
    }
    // Uygulamanın sözlüğü baskın: elle düzeltmeler ve haftalık işin (rebuild_static.mjs) eklediği çeviriler kaybolmasın
    if (existsSync(OUT_PATH)) {
        const dict = JSON.parse(readFileSync(OUT_PATH, "utf8"));
        const hidden = new Set(dict.hidden);
        for (const [en, tr] of Object.entries(dict.tr)) map.set(en, { en, tr, explain: hidden.has(en) ? 0 : 1 });
    }
    return map;
}

export async function translateBatch(apiKey, keywords, attempt = 1) {
    let res;
    try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: keywords.map((k, i) => `${i + 1}. ${k}`).join("\n") },
                ],
            }),
        });
    } catch (err) {
        if (attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return translateBatch(apiKey, keywords, attempt + 1);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) throw new Error(`OpenAI kotası yetersiz: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
        return translateBatch(apiKey, keywords, attempt + 1);
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const rows = JSON.parse(data.choices[0].message.content).r ?? [];
    if (rows.length !== keywords.length) {
        // Sıra kaydıysa eşleştirme güvenilmez: bu batch'i bölüp tekrar dene
        if (keywords.length > 10 && attempt < 5) {
            const mid = Math.floor(keywords.length / 2);
            const [a, b] = await Promise.all([translateBatch(apiKey, keywords.slice(0, mid)), translateBatch(apiKey, keywords.slice(mid))]);
            return { items: [...a.items, ...b.items], usage: sumUsage(a.usage, b.usage, data.usage) };
        }
        throw new Error(`Beklenen ${keywords.length} çeviri, gelen ${rows.length}`);
    }
    return {
        items: keywords.map((en, i) => ({ en, tr: String(rows[i][0]).trim() || en, explain: rows[i][1] ? 1 : 0 })),
        usage: data.usage,
    };
}

function sumUsage(...us) {
    return us.reduce((s, u) => ({ prompt_tokens: s.prompt_tokens + (u?.prompt_tokens ?? 0), completion_tokens: s.completion_tokens + (u?.completion_tokens ?? 0) }), {
        prompt_tokens: 0,
        completion_tokens: 0,
    });
}

function writeDictionary(cache) {
    const tr = {};
    const hidden = [];
    for (const r of cache.values()) {
        tr[r.en] = r.tr;
        if (!r.explain) hidden.push(r.en);
    }
    writeFileSync(OUT_PATH, JSON.stringify({ tr, hidden }));
    console.log(`✅ ${OUT_PATH} · ${Object.keys(tr).length} çeviri · ${hidden.length} gizli`);
}

async function main() {
    const corpus = await loadCorpus();
    const df = new Map();
    for (const f of corpus) for (const k of new Set(f.keywords ?? [])) df.set(k, (df.get(k) ?? 0) + 1);
    // Sık kullanılanlar önce: yarıda kalırsa en görünür keyword'ler çevrilmiş olur
    const all = [...df.keys()].sort((a, b) => df.get(b) - df.get(a));
    const cache = readCache();
    const [pin, pout] = PRICES[MODEL] ?? [NaN, NaN];

    if (SAMPLE) {
        // Örnek: en sık 50 + rastgele görünen 50 (bilinen meta keyword'ler dahil)
        const meta = ["woman director", "duringcreditsstinger", "based on novel or book", "gnosticism", "time loop", "sequel", "key", "complex"];
        const step = Math.floor(all.length / (SAMPLE / 2));
        const sample = [...new Set([...meta, ...all.slice(0, SAMPLE / 2 - meta.length), ...all.filter((_, i) => i % step === 7).slice(0, SAMPLE / 2)])];
        const { items, usage } = await translateBatch(requireEnv("OPENAI_API_KEY")[0], sample);
        for (const it of items) console.log(`${it.explain ? "  " : "🚫"} ${it.en.padEnd(34)} → ${it.tr}`);
        console.log(`\n💰 $${((usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1e6).toFixed(4)} · 🚫 = açıklamada gösterilmez`);
        return;
    }

    const todo = all.filter((k) => !cache.has(k));
    const estIn = todo.length * 6 + Math.ceil(todo.length / BATCH) * 450;
    const estOut = todo.length * 11;
    console.log(`🔤 ${all.length} keyword · çevrilecek ${todo.length} · ~$${((estIn * pin + estOut * pout) / 1e6).toFixed(2)} (${MODEL})`);
    if (DRY_RUN) return;

    const apiKey = requireEnv("OPENAI_API_KEY")[0];
    const batches = [];
    for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
    let next = 0;
    let done = 0;
    let spent = 0;
    async function worker() {
        while (next < batches.length) {
            const batch = batches[next++];
            try {
                const { items, usage } = await translateBatch(apiKey, batch);
                appendFileSync(CACHE_PATH, items.map((x) => JSON.stringify(x)).join("\n") + "\n");
                for (const it of items) cache.set(it.en, it);
                spent += (usage.prompt_tokens * pin + usage.completion_tokens * pout) / 1e6;
            } catch (err) {
                console.error(`\n  ❌ batch: ${err.message}`);
            }
            done += batch.length;
            process.stdout.write(`\r  ${done}/${todo.length} · $${spent.toFixed(3)}   `);
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log();
    writeDictionary(cache);
}

// Başka script içe aktarınca (translateBatch için) çalışmasın
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error("\n❌", err.message);
        process.exit(1);
    });
}
