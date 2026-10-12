// Katalogda eksik filmleri bulur ve ekler (haftalık iş; elle de çalıştırılabilir).
//
// Üç kanal, bu öncelik sırasıyla:
//   1. Türkiye'de son haftalarda vizyona girenler (TMDB discover, region=TR)
//   2. Türk filmleri: orijinal dili Türkçe, düşük oy eşiği (TMDB'de Türk filmleri az oy alıyor; yüksek eşikle
//      25 bin filmlik katalogda sadece 48 Türk filmi vardı)
//   3. TMDB'de çok oy almış ama katalogda olmayanlar (oy sayısına göre, en bilinenden başlayarak)
//
// Ekleme, admin panelindeki "Kataloğa ekle" ile aynı (src/lib/server/catalogAdd.ts):
// TMDB detay + TR çeviri → v3 belge (embeddingDoc.mjs) → OpenAI embedding → film_embeddings_v3 → film_providers.
//
// Kullanım:
//   node scripts/catalog/add_missing.mjs --dry-run        # sadece listele, hiçbir şey yazma (OpenAI'ye de gitmez)
//   node scripts/catalog/add_missing.mjs                  # en fazla 100 film ekle
//   node scripts/catalog/add_missing.mjs --max=300        # üst sınırı değiştir
//   node scripts/catalog/add_missing.mjs --ids=481084,123 # sadece bu TMDB id'lerini ekle
//
// Güvenlik: veritabanı DB_STOP_MB'ı geçtiyse ekleme yapmaz (Supabase ücretsiz plan 500 MB).

import { turkishOverview } from "../../src/lib/filmContent.mjs";
import { buildDoc } from "../../src/lib/recommend/embeddingDoc.mjs";
import { tmdb } from "../tmdb/tmdbClient.mjs";
import { arg, embedTexts, flag, pool, sb, sbAll, sbUpsert, summary } from "./lib.mjs";

const DRY = flag("dry-run");
const MAX_ADD = Number(arg("max", 100));
const ONLY_IDS = arg("ids", "")
    .split(",")
    .map(Number)
    .filter(Boolean);

const TR_WINDOW_DAYS = 60; // vizyon kanalı: son kaç günün filmleri
const TR_PAGES = 5;
const TR_MIN_VOTES = 10;
const TURKISH_MIN_VOTES = 5;
const TURKISH_PAGES = 150; // ≥5 oylu Türk filmi ~1.500 (2026-10), sayfa başı 20
const POPULAR_MIN_VOTES = 300;
const POPULAR_PAGES = 500; // TMDB discover en fazla 500 sayfa (10.000 film) verir
const DB_STOP_MB = 480;
const BYTES_PER_FILM = 17_000; // tablo + index, yaklaşık (admin panelindeki hesapla aynı)
const EMBED_BATCH = 50;

const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
// Özet şartı: embedding büyük ölçüde özetten çıkar. Türk filmlerinde İngilizce özet yoksa Türkçesi kullanılır (aşağıda).
const usable = (m, needOverview = true) => !m.adult && m.poster_path && (m.overview || !needOverview);

async function discover(params, pages) {
    const out = [];
    const first = await tmdb("/discover/movie", { ...params, include_adult: false, page: 1 });
    if (!first) return out;
    out.push(...first.results);
    const last = Math.min(pages, first.total_pages);
    const rest = await pool(
        Array.from({ length: Math.max(0, last - 1) }, (_, i) => i + 2),
        8,
        (page) => tmdb("/discover/movie", { ...params, include_adult: false, page })
    );
    for (const r of rest) if (r) out.push(...r.results);
    return out;
}

/** Aday listesi: öncelik sırasıyla, katalogda olmayanlar, tekrarsız. */
async function findCandidates(inCatalog) {
    const [tr, turkish, popular] = await Promise.all([
        discover(
            { region: "TR", with_release_type: "2|3", "release_date.gte": day(-TR_WINDOW_DAYS), "release_date.lte": day(), sort_by: "popularity.desc", "vote_count.gte": TR_MIN_VOTES },
            TR_PAGES
        ),
        discover({ with_original_language: "tr", sort_by: "vote_count.desc", "vote_count.gte": TURKISH_MIN_VOTES }, TURKISH_PAGES),
        discover({ sort_by: "vote_count.desc", "vote_count.gte": POPULAR_MIN_VOTES }, POPULAR_PAGES),
    ]);
    const seen = new Set();
    const pick = (list, source, needOverview = true) =>
        list
            .filter((m) => usable(m, needOverview) && !inCatalog.has(m.id) && !seen.has(m.id) && seen.add(m.id))
            .map((m) => ({ id: m.id, title: m.title, year: m.release_date?.slice(0, 4) ?? "?", votes: m.vote_count, source }));
    const trNew = pick(tr, "vizyon (TR)");
    const turkishMissing = pick(turkish, "Türk filmi", false).sort((a, b) => b.votes - a.votes);
    const popularMissing = pick(popular, "popüler").sort((a, b) => b.votes - a.votes);
    return { trNew, turkishMissing, popularMissing, scanned: { tr: tr.length, turkish: turkish.length, popular: popular.length } };
}

// src/lib/server/catalogAdd.ts → toRow ile aynı alanlar
function toRow(d) {
    const tr = d.translations?.translations.find((t) => t.iso_639_1 === "tr")?.data ?? {};
    return {
        movie_id: d.id,
        title: d.title || d.original_title,
        original_title: d.original_title,
        tr_title: tr.title || null,
        overview: d.overview || null,
        tr_overview: turkishOverview(tr.overview, d.overview, d.original_language),
        year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
        genres: d.genres,
        keywords: (d.keywords?.keywords ?? []).map((k) => k.name),
        rating: d.vote_average,
        vote_count: d.vote_count,
        popularity: d.popularity,
        language: d.original_language,
        countries: d.production_countries.map((c) => c.iso_3166_1),
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
        director: d.credits?.crew.find((c) => c.job === "Director")?.name ?? null,
        cast_names: (d.credits?.cast ?? [])
            .sort((a, b) => a.order - b.order)
            .slice(0, 5)
            .map((c) => c.name),
        collection_id: d.belongs_to_collection?.id ?? null,
        collection_name: d.belongs_to_collection?.name ?? null,
    };
}

// src/lib/recommend/providers.ts → fetchLiveProviders ile aynı
function toProviders(id, data) {
    const tr = data?.results?.TR;
    if (!tr) return null;
    const ids = (arr) => (arr ?? []).map((p) => p.provider_id);
    return {
        movie_id: id,
        flatrate: ids(tr.flatrate),
        free: [...new Set([...ids(tr.free), ...ids(tr.ads)])],
        rent: ids(tr.rent),
        buy: ids(tr.buy),
        link: tr.link ?? null,
        updated_at: new Date().toISOString(),
    };
}

async function main() {
    const inCatalog = new Set((await sbAll("film_embeddings_v3?select=movie_id")).map((r) => r.movie_id));
    console.log(`📚 Katalog: ${inCatalog.size} film`);

    let queue;
    if (ONLY_IDS.length) {
        queue = ONLY_IDS.filter((id) => !inCatalog.has(id)).map((id) => ({ id, source: "elle" }));
    } else {
        const { trNew, turkishMissing, popularMissing, scanned } = await findCandidates(inCatalog);
        console.log(
            `🔎 Tarandı: vizyon ${scanned.tr}, Türk filmi ${scanned.turkish}, popüler ${scanned.popular} · eksik: vizyon ${trNew.length}, Türk filmi ${turkishMissing.length}, popüler ${popularMissing.length}`
        );
        console.log("   eksik popülerler (oy eşiğine göre): " + [5000, 2000, 1000, 500, 300].map((t) => `≥${t}: ${popularMissing.filter((c) => c.votes >= t).length}`).join(" · "));
        queue = [...trNew, ...turkishMissing, ...popularMissing];
    }

    // Veritabanı doluluğu: sınırı aşacak kadar ekleme
    let limit = MAX_ADD;
    try {
        const [u] = await (await sb("rpc/admin_db_usage", { method: "POST", body: "{}" })).json();
        const roomFilms = Math.floor((DB_STOP_MB * 1024 * 1024 - u.db_bytes) / BYTES_PER_FILM);
        console.log(`💾 Veritabanı ${Math.round(u.db_bytes / 1024 / 1024)} MB · ${DB_STOP_MB} MB sınırına kadar ~${Math.max(0, roomFilms)} film`);
        limit = Math.max(0, Math.min(limit, roomFilms));
    } catch (err) {
        console.warn(`⚠️  Veritabanı doluluğu okunamadı (${err.message}); üst sınır ${MAX_ADD} ile devam`);
    }

    const batch = queue.slice(0, limit);
    if (DRY) {
        for (const c of batch) console.log(`  + ${c.title} (${c.year}) · ${c.votes} oy · ${c.source} · #${c.id}`);
        summary(`\n**Deneme (yazılmadı):** ${queue.length} eksik film bulundu, bu çalıştırmada ${batch.length} tanesi eklenirdi (üst sınır ${limit}).`);
        return;
    }
    if (!batch.length) {
        summary(queue.length ? `\n⚠️ ${queue.length} eksik film var ama veritabanı sınırı nedeniyle eklenmedi.` : "\nEklenecek eksik film yok.");
        return;
    }

    // 1) TMDB detay → satır + belge
    const prepared = (
        await pool(batch, 8, async (c) => {
            const d = await tmdb(`/movie/${c.id}`, { language: "en-US", append_to_response: "keywords,credits,translations,watch/providers" });
            if (!d || d.adult) return null;
            const row = toRow(d);
            // İngilizce özet yoksa Türkçesi (sadece belge için; overview sütunu TMDB'deki gibi kalır)
            const doc = buildDoc({ ...row, overview: row.overview || row.tr_overview });
            if (!doc.trim()) return null;
            return { row, doc, providers: toProviders(d.id, d["watch/providers"]), source: c.source };
        })
    ).filter(Boolean);

    // 2) Embedding + yazma (parça parça: bir parça başarısız olursa öncekiler kalır)
    const added = [];
    for (let i = 0; i < prepared.length; i += EMBED_BATCH) {
        const part = prepared.slice(i, i + EMBED_BATCH);
        const vectors = await embedTexts(part.map((p) => p.doc));
        await sbUpsert(
            "film_embeddings_v3",
            part.map((p, j) => ({ ...p.row, embedding: `[${vectors[j].join(",")}]` }))
        );
        const providers = part.map((p) => p.providers).filter(Boolean);
        if (providers.length) await sbUpsert("film_providers", providers);
        added.push(...part);
        console.log(`  ${added.length}/${prepared.length} eklendi`);
    }

    summary(
        [
            `\n### Kataloğa eklenen filmler (${added.length})`,
            `Eksik bulunan: ${queue.length} · kalan: ${queue.length - batch.length}`,
            "",
            ...added.map((p) => `- ${p.row.tr_title || p.row.title} (${p.row.year ?? "?"}) · ${p.row.vote_count} oy · ${p.source}`),
        ].join("\n")
    );
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
