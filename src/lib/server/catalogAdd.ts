// Kataloğa tek film ekleme (admin) — SADECE sunucu.
// Akış: TMDB detay (+ Türkçe çeviri, keyword, ekip) → v3 belge (embeddingDoc.mjs, mevcut filmlerle aynı format)
//       → OpenAI embedding → film_embeddings_v3 upsert → film_providers (TR) upsert.
// Eklenen film anında aranabilir, kendi benzer filmleri çıkar ve diğer filmlerin önerilerine girer
// (HNSW index kendiliğinden güncellenir). Mod listeleri/keyword çevirileri/IDF statik dosya: ayrıca yenilenir.

import { buildDoc, EMBEDDING_DIMS, EMBEDDING_MODEL } from "@/lib/recommend/embeddingDoc.mjs";
import { displayTitle } from "@/lib/recommend/similar";
import { getLiveProviders } from "@/lib/recommend/providers";
import type { FilmRow } from "@/lib/recommend/types";
import { supabaseUpsert } from "./supabase";
import { fetchWithRetry, tmdbGet } from "./tmdbServer";

interface TmdbFull {
    id: number;
    adult: boolean;
    title: string;
    original_title: string;
    overview: string;
    release_date?: string;
    genres: { id: number; name: string }[];
    vote_average: number;
    vote_count: number;
    popularity: number;
    original_language: string;
    production_countries: { iso_3166_1: string }[];
    poster_path: string | null;
    backdrop_path: string | null;
    belongs_to_collection: { id: number; name: string } | null;
    keywords?: { keywords: { name: string }[] };
    credits?: { cast: { name: string; order: number }[]; crew: { name: string; job: string }[] };
    translations?: { translations: { iso_639_1: string; data: { title?: string; overview?: string } }[] };
}

export interface AddResult {
    id: number;
    title: string;
    year: number | null;
    warnings: string[];
    hasProviders: boolean;
}

/** TMDB detayını katalog satırına çevirir (alanlar mevcut filmlerle aynı kaynaktan/aynı dilde). */
function toRow(d: TmdbFull): FilmRow {
    const tr = d.translations?.translations.find((t) => t.iso_639_1 === "tr")?.data ?? {};
    return {
        movie_id: d.id,
        title: d.title || d.original_title,
        original_title: d.original_title,
        tr_title: tr.title || null,
        overview: d.overview || null,
        tr_overview: tr.overview || null,
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
        cast_names: (d.credits?.cast ?? []).sort((a, b) => a.order - b.order).slice(0, 5).map((c) => c.name),
        collection_id: d.belongs_to_collection?.id ?? null,
        collection_name: d.belongs_to_collection?.name ?? null,
    };
}

async function embed(text: string): Promise<number[]> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY tanımlı değil");
    const res = await fetchWithRetry("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMS }),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).data[0].embedding;
}

export class AddFilmError extends Error {}

export async function addFilmToCatalog(id: number): Promise<AddResult> {
    // Önbelleksiz: admin eklerken güncel veri
    const d = await tmdbGet<TmdbFull>(`/movie/${id}`, { language: "en-US", append_to_response: "keywords,credits,translations" }, 0);
    if (!d) throw new AddFilmError("TMDB'de böyle bir film yok");
    if (d.adult) throw new AddFilmError("Yetişkin içerik kataloğa eklenmez");

    const row = toRow(d);
    // İngilizce özet yoksa Türkçesi (sadece belge için; Türk filmlerinde sık); scripts/catalog/add_missing.mjs ile aynı
    const doc = buildDoc({ ...row, overview: row.overview || row.tr_overview });
    if (!doc.trim()) throw new AddFilmError("Filmin tür/keyword/özet bilgisi yok, embedding üretilemez");

    const warnings: string[] = [];
    if (!row.overview) warnings.push("İngilizce özeti yok");
    if (!row.keywords?.length) warnings.push("TMDB'de keyword'ü yok, benzerlik sadece tür/özetten");
    if (!row.poster_path) warnings.push("Posteri yok");
    if ((row.vote_count ?? 0) < 20) warnings.push(`Az oy almış (${row.vote_count}); önerilerde geri planda kalır`);

    const vector = await embed(doc);
    await supabaseUpsert("film_embeddings_v3", [{ ...row, embedding: `[${vector.join(",")}]` }], "movie_id");

    const providers = await getLiveProviders(id);
    if (providers) {
        await supabaseUpsert("film_providers", [{ movie_id: id, ...providers, updated_at: new Date().toISOString() }], "movie_id");
    }

    return { id, title: displayTitle(row), year: row.year, warnings, hasProviders: !!providers };
}
