import { savedFilm } from "@/lib/watchlistModel.mjs";
import { supabaseSelect } from "@/lib/server/supabase";
import { displayTitle } from "@/lib/recommend/similar";
import { GENRE_MAP_TR } from "@/lib/tmdb";
import type { FilmRow } from "@/lib/recommend/types";
export async function loadMemberFilms(ids: number[]) {
    const films = [];
    for (let offset = 0; offset < ids.length; offset += 200) {
        const chunk = ids.slice(offset, offset + 200);
        const rows = await supabaseSelect<FilmRow[]>(`film_embeddings_v3?select=movie_id,title,original_title,tr_title,language,year,genres,rating,poster_path&movie_id=in.(${chunk.join(",")})&limit=200`);
        for (const row of rows) {
            const film = savedFilm({ id: row.movie_id, title: displayTitle(row), titleEn: row.title, year: row.year, rating: row.rating, genres: (row.genres || []).map(g => GENRE_MAP_TR[g.id] || g.name), posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w500${row.poster_path}` : null });
            if (film) films.push(film);
        }
    }
    return films;
}
