// Kataloğa bağlı statik dosyaları Supabase'teki güncel katalogdan yeniden üretir (haftalık iş).
// Yerel veri klasörleri (data/) gerekmez; GitHub Actions'ta çalışır, değişen dosyalar commit'lenir.
//
//   src/data/idf.json          keyword/tür doküman frekansları (reranker)
//   src/data/keywords_tr.json  yeni keyword'lerin Türkçe çevirisi (mevcut çevirilere dokunmaz)
//   src/data/moods.json        her mod için en yakın filmler (tam cosine, kalite tabanını geçenler arasında)
//   src/data/collections_tr.json  yeni serilerin Türkçe adları (TMDB; mevcutlara dokunmaz)
//
// Kullanım:
//   node scripts/catalog/rebuild_static.mjs             # üçünü de üret
//   node scripts/catalog/rebuild_static.mjs --dry-run   # dosya yazma, OpenAI'ye gitme; ne değişeceğini göster

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, requireEnv } from "../export/loadEnv.mjs";
import { ADULT, LIST_SIZE, MIN_RATING, MIN_VOTES, MOODS } from "../rerank/moodDefs.mjs";
import { translateBatch } from "../tmdb/translate_keywords.mjs";
import { updateCollections } from "./collections_tr.mjs";
import { embedTexts, flag, sb, sbAll, summary } from "./lib.mjs";

const DRY = flag("dry-run");
const DATA = (name) => resolve(ROOT, "src", "data", name);
const KEYWORD_BATCH = 120;
const MOOD_PAGE = 200; // embedding'li satırlar büyük (~19 KB), küçük sayfalarla çek

// ---------- IDF ----------
function buildIdf(films) {
    const keywords = {};
    const genres = {};
    for (const f of films) {
        for (const k of new Set(f.keywords ?? [])) keywords[k] = (keywords[k] ?? 0) + 1;
        for (const g of new Set((f.genres ?? []).map((x) => x.id))) genres[g] = (genres[g] ?? 0) + 1;
    }
    return { n: films.length, keywords, genres };
}

// ---------- Keyword çevirileri ----------
async function translateNew(films) {
    const dict = JSON.parse(readFileSync(DATA("keywords_tr.json"), "utf8"));
    const df = new Map();
    for (const f of films) for (const k of new Set(f.keywords ?? [])) df.set(k, (df.get(k) ?? 0) + 1);
    const todo = [...df.keys()].filter((k) => !(k in dict.tr)).sort((a, b) => df.get(b) - df.get(a));
    if (!todo.length || DRY) return { dict, added: 0, todo: todo.length };

    const [apiKey] = requireEnv("OPENAI_API_KEY");
    const hidden = new Set(dict.hidden);
    let added = 0;
    for (let i = 0; i < todo.length; i += KEYWORD_BATCH) {
        try {
            const { items } = await translateBatch(apiKey, todo.slice(i, i + KEYWORD_BATCH));
            for (const it of items) {
                dict.tr[it.en] = it.tr;
                if (!it.explain) hidden.add(it.en);
                added++;
            }
        } catch (err) {
            // Çevrilemeyen keyword İngilizce gösterilir; gelecek hafta yeniden denenir
            console.error(`  ⚠️  çeviri batch'i atlandı: ${err.message}`);
        }
    }
    dict.hidden = [...hidden];
    return { dict, added, todo: todo.length };
}

// ---------- Modlar ----------
const normalize = (v) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / n);
};

async function buildMoods() {
    const ids = Object.keys(MOODS);
    const moodVectors = (await embedTexts(ids.map((id) => MOODS[id].doc))).map(normalize);

    // Sadece kalite tabanını geçen filmler mod listesine girebilir: embedding'leri yalnız onlar için çek
    const filter = `film_embeddings_v3?select=movie_id,genres,keywords,embedding&vote_count=gte.${MIN_VOTES}&rating=gte.${MIN_RATING}&poster_path=not.is.null`;
    const scored = Object.fromEntries(ids.map((id) => [id, []]));
    let total = 0;
    for (let offset = 0; ; offset += MOOD_PAGE) {
        const page = await (await sb(`${filter}&order=movie_id&limit=${MOOD_PAGE}&offset=${offset}`)).json();
        for (const f of page) {
            if ((f.keywords ?? []).some((k) => ADULT.has(k))) continue;
            const genres = (f.genres ?? []).map((g) => g.id);
            const v = normalize(JSON.parse(f.embedding));
            ids.forEach((id, m) => {
                if (MOODS[id].excludeGenres?.some((g) => genres.includes(g))) return;
                const q = moodVectors[m];
                let dot = 0;
                for (let i = 0; i < v.length; i++) dot += q[i] * v[i];
                scored[id].push([f.movie_id, dot]);
            });
        }
        total += page.length;
        if (page.length < MOOD_PAGE) break;
    }
    const out = {};
    for (const id of ids) {
        out[id] = scored[id]
            .sort((a, b) => b[1] - a[1])
            .slice(0, LIST_SIZE)
            .map(([mid]) => mid);
    }
    return { out, total };
}

async function main() {
    const films = await sbAll("film_embeddings_v3?select=movie_id,keywords,genres");
    console.log(`📚 Katalog: ${films.length} film`);
    const lines = ["\n### Statik dosyalar"];

    const idf = buildIdf(films);
    const oldIdf = JSON.parse(readFileSync(DATA("idf.json"), "utf8"));
    lines.push(`- idf.json: ${oldIdf.n} → ${idf.n} film, ${Object.keys(idf.keywords).length} keyword`);
    if (!DRY) writeFileSync(DATA("idf.json"), JSON.stringify(idf));

    const { dict, added, todo } = await translateNew(films);
    lines.push(`- keywords_tr.json: ${todo} yeni keyword, ${added} çevrildi (toplam ${Object.keys(dict.tr).length})`);
    if (!DRY && added) writeFileSync(DATA("keywords_tr.json"), JSON.stringify(dict));

    if (!DRY) {
        const c = await updateCollections({ log: () => {} });
        lines.push(`- collections_tr.json: ${c.total} seri, ${c.turkish} Türkçe ad (${c.fetched} yeni seri soruldu)`);
    }

    if (DRY) {
        lines.push("- moods.json: deneme modunda hesaplanmadı");
    } else {
        const old = JSON.parse(readFileSync(DATA("moods.json"), "utf8"));
        const { out, total } = await buildMoods();
        const changes = Object.keys(out).map((id) => `${id} ${out[id].filter((m) => !(old[id] ?? []).includes(m)).length}`);
        lines.push(`- moods.json: ${total} uygun film tarandı · listeye yeni giren: ${changes.join(", ")}`);
        // Hesaplanmayan modlar (ör. filtreyle çalışan nostalji) dosyada varsa korunur
        writeFileSync(DATA("moods.json"), JSON.stringify({ ...old, ...out }));
    }
    summary(lines.join("\n"));
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
