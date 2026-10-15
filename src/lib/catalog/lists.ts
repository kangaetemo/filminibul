import { cache } from "react";
import { supabaseSelect } from "@/lib/server/supabase";
import { displayTitle } from "@/lib/recommend/similar";
import { GENRE_MAP_TR } from "@/lib/tmdb";
import type { FilmDTO, FilmRow } from "@/lib/recommend/types";
import { getPilotList, listQuery, PAGE_SIZE } from "./pilot";

export type CardRow = Pick<FilmRow, "movie_id" | "title" | "tr_title" | "original_title" | "language" | "year" | "genres" | "rating" | "vote_count" | "poster_path">;
export function catalogCard(row: CardRow): FilmDTO {
    const title = displayTitle(row);
    return { id: row.movie_id, title, titleEn: row.title, originalTitle: row.original_title,
        year: row.year, genres: (row.genres ?? []).map(g => GENRE_MAP_TR[g.id] ?? g.name),
        genresEn: (row.genres ?? []).map(g => g.name), rating: row.rating, voteCount: row.vote_count,
        posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w500${row.poster_path}` : null,
        overview: null, overviewEn: null, backdropUrl: null, director: null, cast: [], collectionName: null, inCatalog: true };
}
// A page's count and cards use one cached membership snapshot, avoiding separate count/list races.
export const getListSnapshot = cache(async (slug: string) => {
    const list = getPilotList(slug);
    if (!list) return null;
    const rows: CardRow[] = [];
    for (let offset = 0; ; offset += 1000) {
        const batch = await supabaseSelect<CardRow[]>(listQuery(list, offset), 86400);
        rows.push(...batch);
        if (batch.length < 1000) break;
    }
    return { list, films: rows.map(catalogCard), total: rows.length, pages: Math.ceil(rows.length / PAGE_SIZE) };
});
