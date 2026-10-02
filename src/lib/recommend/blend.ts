// "İki filmi karıştır" (/karistir): iki filme BİRLİKTE benzeyen filmler.
// Sıralama: ikisine de en az ne kadar benzediği (min). Orta nokta (ortalama) bir filmin devam filmlerine kayıyordu.
// Aday üretimi ve iki benzerlik: Supabase RPC blend_movies (scripts/sql/blend.sql).

import { supabaseRpc } from "@/lib/server/supabase";
import { sharedThemes } from "./reranker";
import { getFilmRow, toFilmDTO } from "./similar";
import type { FilmDTO, FilmRow } from "./types";

const RESULT_LIMIT = 24;
const ADULT = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

type BlendRow = FilmRow & { sim_a: number; sim_b: number };

export interface BlendFilm {
    film: FilmDTO;
    reasons: string[];
}

export interface BlendResult {
    a: FilmDTO;
    b: FilmDTO;
    films: BlendFilm[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Benzerlik ana sinyal; oy/puan sadece eşitliği bozacak kadar (≤0.04), tarif aramasıyla aynı. */
function score(r: BlendRow): number {
    const quality = clamp01(((r.rating ?? 0) - 6) / 3) * 0.02 + clamp01((Math.log10(Math.max(r.vote_count ?? 1, 1)) - 2) / 3) * 0.02;
    return Math.min(r.sim_a, r.sim_b) + quality;
}

/** null: filmlerden biri katalogda yok (embedding'i yok) ya da iki film aynı. */
export async function blendFilms(idA: number, idB: number): Promise<BlendResult | null> {
    if (idA === idB) return null;
    const [a, b, rows] = await Promise.all([
        getFilmRow(idA),
        getFilmRow(idB),
        supabaseRpc<BlendRow[]>("blend_movies", { movie_a: idA, movie_b: idB }, 86400),
    ]);
    if (!a || !b) return null;
    const aDto = toFilmDTO(a);
    const bDto = toFilmDTO(b);

    const films = rows
        .filter((r) => r.poster_path && !(r.keywords ?? []).some((k) => ADULT.has(k)))
        .sort((x, y) => score(y) - score(x))
        .slice(0, RESULT_LIMIT)
        .map((r) => {
            const withA = sharedThemes(r.keywords, a.keywords);
            const withB = sharedThemes(r.keywords, b.keywords);
            const reasons = [withA.length ? `${aDto.title}: ${withA.join(", ")}` : null, withB.length ? `${bDto.title}: ${withB.join(", ")}` : null].filter(
                (x): x is string => !!x
            );
            return { film: toFilmDTO(r), reasons };
        });
    return { a: aDto, b: bDto, films };
}
