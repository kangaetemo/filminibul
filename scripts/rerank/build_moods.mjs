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

const args = process.argv.slice(2);
const SHOW = args.includes("--show") ? Number(args[args.indexOf("--show") + 1]) : 15;
const LIST_SIZE = 120; // her mod için saklanan film sayısı (sayfa bunun başından rastgele seçer)

// Modların uygulamadaki id'leri src/lib/recommend/moods.ts ile aynı olmalı
const MOODS = {
    korku: {
        doc: `Genres: Horror
Themes: supernatural, ghost, demon, possession, haunted house, curse, evil spirit, exorcism, creature, slasher, dread, terror, jump scare, nightmare
Story: A terrifying horror film that builds unbearable dread and fear, with frightening supernatural or monstrous threats stalking its victims.`,
        excludeGenres: [16, 10751], // animasyon, aile
    },
    komedi: {
        doc: `Genres: Comedy
Themes: humor, slapstick, comedic misadventures, witty banter, satire, parody, absurd situations, buddy comedy, laugh out loud, feel-good
Story: A hilarious, light-hearted comedy full of funny situations, jokes and absurd misadventures that keeps you laughing.`,
    },
    duygusal: {
        doc: `Genres: Drama
Themes: grief, loss, death of a loved one, terminal illness, tragedy, sacrifice, heartbreak, tearjerker, family bond, farewell, redemption
Story: A deeply moving, emotional tearjerker about love, loss and sacrifice that leaves the audience in tears.`,
    },
    gerilim: {
        doc: `Genres: Thriller, Mystery
Themes: suspense, tension, cat and mouse, stalker, psychological thriller, conspiracy, paranoia, twist, hostage, ticking clock, danger, investigation
Story: A nail-biting, tense thriller full of suspense and danger where every moment keeps you on the edge of your seat.`,
        excludeGenres: [16, 10751],
    },
    macera: {
        doc: `Genres: Adventure, Science Fiction, Fantasy
Themes: epic journey, quest, exploration, space travel, treasure hunt, lost world, heroic adventure, expedition, spectacle, otherworldly creatures
Story: A grand, thrilling adventure that takes its heroes on an epic journey across spectacular, unknown worlds.`,
    },
    romantik: {
        doc: `Genres: Romance
Themes: love, falling in love, love story, romantic relationship, soulmates, first love, couple, chemistry, longing, romantic comedy
Story: A heartfelt romantic love story about two people falling for each other.`,
        excludeGenres: [16],
    },
    dusundurucu: {
        doc: `Genres: Mystery, Science Fiction, Drama
Themes: mind-bending, philosophy, existentialism, identity, memory, reality vs illusion, nonlinear timeline, moral dilemma, puzzle, twist ending, consciousness, time
Story: A thought-provoking, intelligent film that challenges the viewer with deep questions about reality, identity and morality.`,
    },
};

// Mod listeleri için kalite tabanı (çok az bilinen/zayıf filmler moda girmesin)
const MIN_VOTES = 300;
const MIN_RATING = 6.3;
const ADULT = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

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
