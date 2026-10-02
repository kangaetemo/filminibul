// Semantic modlar: her mod için bir tanım metni embed edilir, katalogda en yakın filmler
// (yerel v3 embedding'leriyle, tam cosine) bulunur ve src/data/moods.json'a yazılır.
// Tanım metinleri film belgeleriyle (scripts/embed/embed_v3.mjs → buildDoc) aynı formatta,
// böylece aynı embedding uzayında karşılaştırılabilir.
//
// Kullanım:
//   node scripts/rerank/build_moods.mjs            # hesapla, her mod için ilk 15'i göster, dosyayı yaz
//   node scripts/rerank/build_moods.mjs --show 30  # daha fazla örnek göster
//
// Mod metnini değiştirince tekrar çalıştır (sadece değişen metin yeniden embed edilir).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, requireEnv } from "../export/loadEnv.mjs";
import { loadCorpus, loadLocalEmbeddings } from "./data.mjs";
import { ADULT, LIST_SIZE, MIN_RATING, MIN_VOTES, MOODS } from "./moodDefs.mjs";

const args = process.argv.slice(2);
const SHOW = args.includes("--show") ? Number(args[args.indexOf("--show") + 1]) : 15;
const CACHE_PATH = resolve(ROOT, "data", "embeddings", "moods.json");
const OUT_PATH = resolve(ROOT, "src", "data", "moods.json");

async function embed(apiKey, texts) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-large", input: texts, dimensions: 1536 }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()).data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

const normalize = (v) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
};

async function main() {
    const corpus = await loadCorpus();
    const byId = new Map(corpus.map((f) => [f.movie_id, f]));
    const emb = loadLocalEmbeddings("v3");

    // Mod embedding önbelleği: metin değişmediyse tekrar ödeme yok
    const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
    const missing = Object.entries(MOODS).filter(([id, m]) => cache[id]?.doc !== m.doc);
    if (missing.length) {
        const vectors = await embed(requireEnv("OPENAI_API_KEY")[0], missing.map(([, m]) => m.doc));
        missing.forEach(([id, m], i) => (cache[id] = { doc: m.doc, vector: vectors[i] }));
        mkdirSync(resolve(ROOT, "data", "embeddings"), { recursive: true });
        writeFileSync(CACHE_PATH, JSON.stringify(cache));
        console.log(`🧠 ${missing.length} mod metni embed edildi`);
    }

    const out = {};
    for (const [id, m] of Object.entries(MOODS)) {
        const q = normalize(cache[id].vector);
        const scored = [];
        for (let r = 0; r < emb.count; r++) {
            const f = byId.get(emb.ids[r]);
            if (!f || !f.poster_path || (f.vote_count ?? 0) < MIN_VOTES || (f.rating ?? 0) < MIN_RATING) continue;
            if ((f.keywords ?? []).some((k) => ADULT.has(k))) continue;
            const genres = (f.genres ?? []).map((g) => g.id);
            if (m.excludeGenres?.some((g) => genres.includes(g))) continue;
            let dot = 0;
            const o = r * emb.dims;
            for (let i = 0; i < emb.dims; i++) dot += q[i] * emb.matrix[o + i];
            scored.push([f.movie_id, dot]);
        }
        scored.sort((a, b) => b[1] - a[1]);
        out[id] = scored.slice(0, LIST_SIZE).map(([mid]) => mid);

        console.log(`\n${id} (${scored.length} uygun film)`);
        console.log(
            "  " +
                scored
                    .slice(0, SHOW)
                    .map(([mid, s]) => `${byId.get(mid).tr_title || byId.get(mid).title} (${byId.get(mid).year}) ${s.toFixed(2)}`)
                    .join(" | ")
        );
    }

    writeFileSync(OUT_PATH, JSON.stringify(out));
    console.log(`\n✅ ${OUT_PATH}`);
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
