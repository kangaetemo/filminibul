// Moda göre film seçimi (sunucu tarafı), kendi kataloğumuzdan: seçilen her filmin benzer önerileri var.
//
// İki tür mod:
//   - semantic: mod tanım metninin embedding'ine en yakın filmler, offline hesaplanıp src/data/moods.json'a
//     yazılır (scripts/rerank/build_moods.mjs). Tür etiketi yerine atmosfere göre seçer
//     (eski tür filtresi "korku"ya Die Hard gibi gerilim/aksiyon filmleri sokuyordu).
//   - filtre: nostalji gibi dönem tanımları; tür/yıl/puan filtresiyle.

import { supabaseSelect } from "@/lib/server/supabase";
import semanticLists from "@/data/moods.json";
import { FILM_COLUMNS, toFilmDTO } from "./similar";
import type { FilmDTO, FilmRow } from "./types";

export interface Mood {
    id: string;
    emoji: string;
    label: string;
    // Filtre modları için (semantic modlarda kullanılmaz)
    filter?: {
        genreIds: number[]; // bu türlerden EN AZ BİRİ (boşsa tür şartı yok)
        excludeGenreIds?: number[];
        minRating?: number;
        minVotes?: number;
        maxYear?: number;
    };
}

export const MOODS: Mood[] = [
    { id: "korku", emoji: "😱", label: "Korkmak istiyorum" },
    { id: "komedi", emoji: "😂", label: "Gülmek istiyorum" },
    { id: "duygusal", emoji: "😢", label: "Ağlamak istiyorum" },
    { id: "gerilim", emoji: "🤯", label: "Gerilmek istiyorum" },
    { id: "macera", emoji: "🚀", label: "Maceraya atılmak istiyorum" },
    { id: "romantik", emoji: "💕", label: "Romantik filmler", filter: { genreIds: [10749], excludeGenreIds: [27, 99], minRating: 6.5, minVotes: 500 } },
    { id: "dusundurucu", emoji: "🔍", label: "Düşünmek istiyorum" },
    { id: "nostalji", emoji: "📜", label: "Nostalji / Eski toprak", filter: { genreIds: [], maxYear: 1999, minRating: 8, minVotes: 2000 } },
];

// Semantic listede ilk kaç film arasından rastgele seçilir (büyüdükçe çeşitlilik artar, isabet düşer)
const SEMANTIC_POOL = 60;
const semantic = semanticLists as Record<string, number[]>;

export const getMood = (id: string) => MOODS.find((m) => m.id === id) ?? null;

// Aday havuzu: filtreye uyan en çok oy almış filmler; her ziyarette bunların içinden rastgele seçilir
const POOL_SIZE = 300;

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const hasGenre = (id: number) => `genres.cs.${JSON.stringify([{ id }])}`;

export async function getMoodFilms(mood: Mood, count = 20): Promise<FilmDTO[]> {
    if (!mood.filter) {
        const ids = shuffle((semantic[mood.id] ?? []).slice(0, SEMANTIC_POOL)).slice(0, count);
        if (!ids.length) return [];
        const rows = await supabaseSelect<FilmRow[]>(`film_embeddings_v3?select=${FILM_COLUMNS}&movie_id=in.(${ids.join(",")})`);
        const byId = new Map(rows.map((r) => [r.movie_id, r]));
        return ids.flatMap((id) => (byId.has(id) ? [toFilmDTO(byId.get(id)!)] : []));
    }

    const f = mood.filter;
    const filters = [`rating=gte.${f.minRating ?? 6.5}`, `vote_count=gte.${f.minVotes ?? 500}`, "poster_path=not.is.null"];
    if (f.maxYear) filters.push(`year=lte.${f.maxYear}`);
    if (f.genreIds.length) filters.push(`or=${encodeURIComponent(`(${f.genreIds.map(hasGenre).join(",")})`)}`);
    if (f.excludeGenreIds?.length) {
        filters.push(`and=${encodeURIComponent(`(${f.excludeGenreIds.map((id) => `genres.not.cs.${JSON.stringify([{ id }])}`).join(",")})`)}`);
    }

    const rows = await supabaseSelect<FilmRow[]>(
        `film_embeddings_v3?select=${FILM_COLUMNS}&${filters.join("&")}&order=vote_count.desc&limit=${POOL_SIZE}`
    );
    return shuffle(rows).slice(0, count).map(toFilmDTO);
}
