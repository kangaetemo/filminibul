// v3 embedding'leri üretir: başlıksız, keyword/tür ağırlıklı yapılandırılmış belge.
// Sonuçlar önce YEREL diske yazılır (Supabase'e dokunmaz), eval ile eskiyle karşılaştırılır.
//
// Kullanım:
//   node scripts/embed/embed_v3.mjs --dry-run      # örnek belgeler + token/maliyet tahmini, API çağrısı yok
//   node scripts/embed/embed_v3.mjs                # gerçek çalıştırma (yarıda kalırsa kaldığı yerden devam)
//   node scripts/embed/embed_v3.mjs --limit 500    # sadece ilk N film (deneme için)
//
// Çıktı:
//   data/embeddings/v3.bin        her kayıt: int32 movie_id + 1536 x float32 (little-endian)
//   data/embeddings/v3_docs.jsonl embed edilen belgeler (inceleme için)

import { mkdirSync, existsSync, statSync, appendFileSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "../export/loadEnv.mjs";

loadEnv();

export const MODEL = "text-embedding-3-large";
export const DIMS = 1536;
export const RECORD_BYTES = 4 + DIMS * 4;
const PRICE_PER_M_TOKENS = 0.13;
const BATCH_SIZE = 200;
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

const OUT_DIR = resolve(ROOT, "data", "embeddings");
const BIN_PATH = resolve(OUT_DIR, "v3.bin");
const DOCS_PATH = resolve(OUT_DIR, "v3_docs.jsonl");

// Film hakkında bilgi taşımayan TMDB meta keyword'leri
const NOISE_KEYWORDS = new Set([
    "duringcreditsstinger",
    "aftercreditsstinger",
    "woman director",
    "3d",
    "imax",
    "short film",
    "live action remake",
]);

const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const languageName = new Intl.DisplayNames(["en"], { type: "language" });
const safe = (fn, code) => {
    try {
        return fn.of(code) ?? code;
    } catch {
        return code;
    }
};

/**
 * Embed edilecek belge. Başlık bilerek YOK: "Triangle" ↔ "Triangle of Sadness" gibi
 * isim benzerliğinin cosine'i şişirmesini engeller. Temalar özetten önce gelir.
 */
export function buildDoc(f) {
    const lines = [];
    const genres = (f.genres ?? []).map((g) => g.name);
    const keywords = (f.keywords ?? []).filter((k) => !NOISE_KEYWORDS.has(k));
    if (genres.length) lines.push(`Genres: ${genres.join(", ")}`);
    if (keywords.length) lines.push(`Themes: ${keywords.join(", ")}`);
    if (f.director) lines.push(`Director: ${f.director}`);

    const setting = [];
    if (f.countries?.length) setting.push(f.countries.map((c) => safe(regionName, c)).join(", "));
    if (f.language) setting.push(`${safe(languageName, f.language)}-language`);
    if (f.year) setting.push(`${Math.floor(f.year / 10) * 10}s`);
    if (setting.length) lines.push(`Setting: ${setting.join(" · ")}`);

    if (f.overview) lines.push(`Story: ${f.overview}`);
    return lines.join("\n");
}

async function loadFilms() {
    const path = resolve(ROOT, "data", "export", "supabase", "film_embeddings_v2.jsonl");
    const films = [];
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    for await (const line of rl) if (line.trim()) films.push(JSON.parse(line));
    return films;
}

async function embedBatch(apiKey, inputs, attempt = 1) {
    let res;
    try {
        res = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, input: inputs, dimensions: DIMS }),
        });
    } catch (err) {
        if (attempt >= 6) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return embedBatch(apiKey, inputs, attempt + 1);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        const body = await res.text();
        // Kota bittiyse beklemenin anlamı yok
        if (body.includes("insufficient_quota")) throw new Error(`OpenAI kotası yetersiz: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return embedBatch(apiKey, inputs, attempt + 1);
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return { vectors: data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding), tokens: data.usage.total_tokens };
}

function toRecord(movieId, vector) {
    const buf = Buffer.alloc(RECORD_BYTES);
    buf.writeInt32LE(movieId, 0);
    for (let i = 0; i < DIMS; i++) buf.writeFloatLE(vector[i], 4 + i * 4);
    return buf;
}

async function main() {
    const films = (await loadFilms()).sort((a, b) => a.movie_id - b.movie_id).slice(0, LIMIT);
    const docs = films.map((f) => ({ movie_id: f.movie_id, doc: buildDoc(f) }));

    // Kaba tahmin: İngilizce metinde ~4 karakter = 1 token
    const estTokens = Math.round(docs.reduce((s, d) => s + d.doc.length, 0) / 4);
    console.log(`🎬 ${docs.length} film · tahmini ${(estTokens / 1e6).toFixed(2)}M token · tahmini maliyet $${((estTokens / 1e6) * PRICE_PER_M_TOKENS).toFixed(2)}`);

    if (DRY_RUN) {
        for (const id of [26466, 603, 2]) {
            const d = docs.find((x) => x.movie_id === id);
            if (d) console.log(`\n--- ${id} ---\n${d.doc}`);
        }
        return;
    }

    const apiKey = requireEnv("OPENAI_API_KEY")[0];
    mkdirSync(OUT_DIR, { recursive: true });

    // Kaldığı yerden devam: bin dosyasındaki tam kayıt sayısı kadar filmi atla
    let done = existsSync(BIN_PATH) ? Math.floor(statSync(BIN_PATH).size / RECORD_BYTES) : 0;
    if (done === 0) {
        writeFileSync(BIN_PATH, "");
        writeFileSync(DOCS_PATH, "");
    } else {
        console.log(`↪ ${done} film zaten var, devam ediliyor`);
    }

    const batches = [];
    for (let i = done; i < docs.length; i += BATCH_SIZE) batches.push(docs.slice(i, i + BATCH_SIZE));

    let usedTokens = 0;
    const t0 = Date.now();
    // Sıra korunmalı (resume dosya boyutuna dayanıyor): CONCURRENCY'lik gruplar hâlinde paralel, sırayla yaz
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const group = batches.slice(i, i + CONCURRENCY);
        const results = await Promise.all(group.map((b) => embedBatch(apiKey, b.map((d) => d.doc || "Unknown film"))));
        results.forEach((r, j) => {
            const batch = group[j];
            appendFileSync(BIN_PATH, Buffer.concat(batch.map((d, k) => toRecord(d.movie_id, r.vectors[k]))));
            appendFileSync(DOCS_PATH, batch.map((d) => JSON.stringify(d)).join("\n") + "\n");
            usedTokens += r.tokens;
            done += batch.length;
        });
        const cost = (usedTokens / 1e6) * PRICE_PER_M_TOKENS;
        process.stdout.write(`\r  ${done}/${docs.length} · ${usedTokens} token · $${cost.toFixed(3)} · ${Math.round((Date.now() - t0) / 1000)}sn`);
    }
    console.log(`\n✅ ${BIN_PATH}`);
}

main().catch((err) => {
    console.error("\n❌", err.message);
    process.exit(1);
});
