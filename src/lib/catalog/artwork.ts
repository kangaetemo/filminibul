import { cache } from "react";
import { supabaseSelect } from "@/lib/server/supabase";
import { PILOT_LISTS } from "./pilot";

type Cover = { movie_id: number; year: number; genres: { id: number }[] | null; poster_path: string };
type Portrait = { person_id: number; profile_path: string | null };

// Two bounded, cached metadata reads for the entire hub. Artwork failures must not remove links.
export const getCatalogArtwork = cache(async () => {
    const years = Array.from(new Set(PILOT_LISTS.map(list => list.year)));
    const query = new URLSearchParams({ select: "movie_id,year,genres,poster_path", year: `in.(${years.join(",")})`,
        poster_path: "not.is.null", order: "vote_count.desc.nullslast,movie_id.asc", limit: "1000" });
    const [covers, portraits] = await Promise.allSettled([
        supabaseSelect<Cover[]>("film_embeddings_v3?" + query, 86400),
        supabaseSelect<Portrait[]>("film_people?select=person_id,profile_path&published=eq.true&order=person_id.asc&limit=50", 86400),
    ]);
    const films = covers.status === "fulfilled" ? covers.value : [];
    const posters: Record<string, string[]> = {};
    for (const list of PILOT_LISTS) posters[list.slug] = films.filter(film => film.year === list.year && film.genres?.some(genre => genre.id === list.genreId) && film.poster_path).slice(0, 3).map(film => film.poster_path);
    return { posters, portraits: Object.fromEntries((portraits.status === "fulfilled" ? portraits.value : []).map(person => [person.person_id, person.profile_path])) as Record<number, string | null> };
});
