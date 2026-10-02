// Film detayı + benzer film önerileri (sunucu tarafı).
// Akış: Supabase similar_movies_v3 (HNSW, 200 aday) → hybrid rerank → Top N + "neden önerildi".

import { supabaseRpc, supabaseSelect } from "@/lib/server/supabase";
import { getMovieDetails } from "@/lib/server/tmdbServer";
import { GENRE_MAP_TR } from "@/lib/tmdb";
import { rerank, explain, explainParts } from "./reranker";
import { getProvidersFor, platform, watchableIds } from "./providers";
import type { Candidate, FilmDTO, FilmRow, SimilarFilmDTO } from "./types";

const IMG = "https://image.tmdb.org/t/p";
const CANDIDATE_POOL = 200;

export const FILM_COLUMNS = [
    "movie_id", "title", "original_title", "tr_title", "overview", "tr_overview", "year", "genres", "keywords",
    "rating", "vote_count", "popularity", "language", "countries", "poster_path", "backdrop_path", "director",
    "cast_names", "collection_id", "collection_name",
].join(",");

const genreName = (g: { id: number; name: string }) => GENRE_MAP_TR[g.id] ?? g.name;

export function toFilmDTO(row: FilmRow): FilmDTO {
    const title = row.tr_title || row.title;
    return {
        id: row.movie_id,
        title,
        originalTitle: row.original_title && row.original_title !== title ? row.original_title : null,
        overview: row.tr_overview || row.overview,
        year: row.year,
        genres: (row.genres ?? []).map(genreName),
        rating: row.rating,
        voteCount: row.vote_count,
        posterUrl: row.poster_path ? `${IMG}/w500${row.poster_path}` : null,
        backdropUrl: row.backdrop_path ? `${IMG}/w1280${row.backdrop_path}` : null,
        director: row.director,
        cast: row.cast_names ?? [],
        collectionName: row.collection_name,
        inCatalog: true,
    };
}

export async function getFilmRow(id: number): Promise<FilmRow | null> {
    const rows = await supabaseSelect<FilmRow[]>(`film_embeddings_v3?select=${FILM_COLUMNS}&movie_id=eq.${id}`);
    return rows[0] ?? null;
}

/** Önce katalog (Supabase), yoksa TMDB. Hiçbirinde yoksa null. */
export async function getFilm(id: number): Promise<FilmDTO | null> {
    const row = await getFilmRow(id);
    if (row) return toFilmDTO(row);

    const d = await getMovieDetails(id);
    if (!d) return null;
    const title = d.title || d.original_title;
    return {
        id: d.id,
        title,
        originalTitle: d.original_title && d.original_title !== title ? d.original_title : null,
        overview: d.overview || null,
        year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
        genres: d.genres.map(genreName),
        rating: d.vote_average,
        voteCount: d.vote_count,
        posterUrl: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
        backdropUrl: d.backdrop_path ? `${IMG}/w1280${d.backdrop_path}` : null,
        director: d.credits?.crew.find((c) => c.job === "Director")?.name ?? null,
        cast: (d.credits?.cast ?? []).sort((a, b) => a.order - b.order).slice(0, 5).map((c) => c.name),
        collectionName: d.belongs_to_collection?.name ?? null,
        inCatalog: false,
    };
}

/**
 * 200 aday: önce önceden hesaplanmış listeden (film_neighbors, haftalık; birkaç yüz ms), yoksa canlı HNSW'den (1–5 sn).
 * Liste yoksa: film haftalık işten sonra eklenmiş, tablo yenileniyor ya da scripts/sql/neighbors.sql henüz çalıştırılmamış.
 */
async function getCandidates(id: number): Promise<Candidate[]> {
    const args = { seed_movie_id: id, match_limit: CANDIDATE_POOL };
    try {
        const precomputed = await supabaseRpc<Candidate[]>("similar_movies_v4", args);
        if (precomputed.length) return precomputed;
    } catch (err) {
        console.error("similar_movies_v4:", err);
    }
    return supabaseRpc<Candidate[]>("similar_movies_v3", args);
}

/**
 * Benzer filmler. `platforms` verilirse sadece bu platformlardan birinde (abonelik/ücretsiz) izlenebilenler:
 * önce 200 adayın tamamı sıralanır, sonra filtrelenir — böylece ilk 20 dışında kalan izlenebilir filmler de gelir.
 * Katalogda olmayan film için boş liste döner (embedding'i yok).
 */
export async function getSimilarFilms(id: number, limit = 20, debug = false, platforms: number[] = []): Promise<SimilarFilmDTO[]> {
    const [seed, candidates] = await Promise.all([getFilmRow(id), getCandidates(id)]);
    if (!seed || !candidates.length) return [];

    const ranked = rerank(seed, candidates, platforms.length ? candidates.length : limit);
    const providers = await getProvidersFor(ranked.map((s) => s.film.movie_id));
    const wanted = new Set(platforms);
    const top = platforms.length
        ? ranked.filter((s) => watchableIds(providers.get(s.film.movie_id)).some((p) => wanted.has(p))).slice(0, limit)
        : ranked;

    return top.map((s) => ({
        film: toFilmDTO(s.film),
        reason: explain(s),
        reasons: explainParts(s),
        score: Math.round(s.final * 1000) / 1000,
        platforms: watchableIds(providers.get(s.film.movie_id)).map(platform),
        ...(debug && {
            debug: { similarity: s.film.similarity, weighted: s.weighted, penalties: s.penalties },
        }),
    }));
}

/**
 * Katalogda başlık araması (Türkçe, İngilizce ve orijinal başlıkta "içinde geçer").
 * TMDB araması yarım kelimeyle eşleşmediği için ("ruhların kaçış") yazarken sonuç vermeyi bu sağlar.
 */
export async function searchCatalog(q: string, limit = 8): Promise<FilmRow[]> {
    // PostgREST filtre sözdizimini bozabilecek karakterleri at
    const term = q.replace(/[",()*\\]/g, " ").trim();
    if (term.length < 2) return [];
    const pattern = `"*${term}*"`;
    const filter = `(tr_title.ilike.${pattern},title.ilike.${pattern},original_title.ilike.${pattern})`;
    return supabaseSelect<FilmRow[]>(
        `film_embeddings_v3?select=${FILM_COLUMNS}&or=${encodeURIComponent(filter)}&order=vote_count.desc.nullslast&limit=${limit}`,
        600
    );
}

/** Arama sonuçlarından hangilerinin katalogda (öneri üretilebilir) olduğu */
export async function catalogIds(ids: number[]): Promise<Set<number>> {
    if (!ids.length) return new Set();
    const rows = await supabaseSelect<{ movie_id: number }[]>(`film_embeddings_v3?select=movie_id&movie_id=in.(${ids.join(",")})`);
    return new Set(rows.map((r) => r.movie_id));
}
