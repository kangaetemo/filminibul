// Doğal dil ("vibe") arama deneyi: Türkçe cümleyi film embedding uzayında nasıl arayacağız?
//   A) cümleyi olduğu gibi embed et
//   B) önce bir LLM ile film belgesi formatına (Genres/Themes/Setting/Story, İngilizce) çevir, sonra embed et
// Yerel v3 embedding'leriyle tam cosine; Supabase'e dokunmaz.
//
// Kullanım:
//   node scripts/rerank/vibe_try.mjs                      # yerleşik sorgu listesi
//   node scripts/rerank/vibe_try.mjs "sorgu 1" "sorgu 2"  # kendi sorguların
//   node scripts/rerank/vibe_try.mjs --show 15

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, requireEnv } from "../export/loadEnv.mjs";
import { loadCorpus, loadLocalEmbeddings } from "./data.mjs";

const argv = process.argv.slice(2);
const showIdx = argv.indexOf("--show");
const SHOW = showIdx >= 0 ? Number(argv[showIdx + 1]) : 10;
const custom = argv.filter((a, i) => !a.startsWith("--") && i !== showIdx + 1);

const DEFAULT_QUERIES = [
    "zaman döngüsünde sıkışıp kalmış bir karakter",
    "yağmurlu, melankolik, yalnızlık hissi veren bir film",
    "sonunda herkesi şaşırtan bir twist olan psikolojik gerilim",
    "küçük bir kasabada yaşanan gizemli kayboluşlar",
    "kıyamet sonrası dünyada bir baba ile oğlunun yolculuğu",
    "gerçeklik algını sorgulatan, kafa karıştıran film",
    "ağlatan ama sonunda umut veren bir aile hikâyesi",
    "uzayda mahsur kalan astronotun hayatta kalma mücadelesi",
];

const MIN_VOTES = 150;
const CACHE_PATH = resolve(ROOT, "data", "embeddings", "vibe_try_cache.json");
const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : { embed: {}, expand: {} };

const [apiKey] = requireEnv("OPENAI_API_KEY");

async function embed(text) {
    if (cache.embed[text]) return cache.embed[text];
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-large", input: text, dimensions: 1536 }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (cache.embed[text] = (await res.json()).data[0].embedding);
}

const EXPAND_SYSTEM = `You convert a movie-search request (usually Turkish) into a short document in the exact format used to index films, so it can be matched by semantic search. Output ONLY these lines, in English:
Genres: <1-3 genres>
Themes: <8-14 comma-separated themes/keywords: plot devices, motifs, mood, tone, setting>
Setting: <countries · language · decade, only if the request implies them, else omit this line>
Story: <1-2 sentences describing the kind of film wanted, in the style of a film synopsis, never naming a specific film>
Never include film titles. Capture mood and atmosphere, not just plot.`;

async function expand(query) {
    if (cache.expand[query]) return cache.expand[query];
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gpt-4.1-mini",
            temperature: 0,
            messages: [
                { role: "system", content: EXPAND_SYSTEM },
                { role: "user", content: query },
            ],
        }),
    });
    if (!res.ok) throw new Error(`OpenAI chat ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (cache.expand[query] = (await res.json()).choices[0].message.content.trim());
}

const normalize = (v) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
};

async function main() {
    const corpus = await loadCorpus();
    const byId = new Map(corpus.map((f) => [f.movie_id, f]));
    const emb = loadLocalEmbeddings("v3");

    const top = (vec) => {
        const q = normalize(vec);
        const scored = [];
        for (let r = 0; r < emb.count; r++) {
            const f = byId.get(emb.ids[r]);
            if (!f || (f.vote_count ?? 0) < MIN_VOTES) continue;
            let dot = 0;
            const o = r * emb.dims;
            for (let i = 0; i < emb.dims; i++) dot += q[i] * emb.matrix[o + i];
            scored.push([f, dot]);
        }
        return scored.sort((a, b) => b[1] - a[1]).slice(0, SHOW);
    };
    const fmt = (list) => list.map(([f, s]) => `${f.tr_title || f.title} (${f.year}) ${s.toFixed(2)}`).join(" | ");

    for (const query of custom.length ? custom : DEFAULT_QUERIES) {
        const doc = await expand(query);
        const [a, b] = [top(await embed(query)), top(await embed(doc))];
        console.log(`\n══ ${query}`);
        console.log(`-- LLM belgesi:\n${doc.split("\n").map((l) => "   " + l).join("\n")}`);
        console.log(`A) doğrudan : ${fmt(a)}`);
        console.log(`B) belgeye çevir: ${fmt(b)}`);
    }
    mkdirSync(resolve(ROOT, "data", "embeddings"), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
