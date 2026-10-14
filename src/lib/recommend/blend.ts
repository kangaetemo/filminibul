// "İki filmi karıştır" (/karistir): iki filme BİRLİKTE benzeyen filmler.
// Sıralama: ikisine de en az ne kadar benzediği (min). Orta nokta (ortalama) bir filmin devam filmlerine kayıyordu.
// Aday üretimi ve iki benzerlik: Supabase RPC blend_movies (scripts/sql/blend.sql).

import { supabaseRpc, supabaseSelect } from "@/lib/server/supabase";
import { sharedThemes } from "./reranker";
import { getFilmRow, toFilmDTO } from "./similar";
import type { FilmDTO, FilmRow } from "./types";

const RESULT_LIMIT = 24;
const ADULT = new Set(["softcore", "pink film", "erotic movie", "sexploitation", "roman porno"]);

type BlendRow = FilmRow & { sim_a: number; sim_b: number };

export interface BlendFilm {
    film: FilmDTO;
    reasons: string[];
    reasonsEn: string[];
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

// Timeout recovery uses the already deployed midpoint HNSW RPC with a
// bounded 300-candidate scan. Two-film similarity is still computed exactly;
// midpoint similarity itself never becomes the final ranking signal.
type VectorRow = { movie_id: number; embedding: string | number[] | null };
function vector(raw: VectorRow["embedding"]): number[] {
    const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(value) || value.length !== 1536 || !value.every(v => typeof v === "number" && Number.isFinite(v))) {
        throw new Error("Invalid blend embedding");
    }
    if (!value.some(v => v !== 0)) throw new Error("Empty blend embedding");
    return value;
}
function cosine(a: number[], b: number[]): number {
    let dot = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    return Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb)));
}
async function timeoutCandidates(idA: number, idB: number): Promise<BlendRow[]> {
    const seeds = await supabaseSelect<VectorRow[]>(`film_embeddings_v3?select=movie_id,embedding&movie_id=in.(${idA},${idB})`, 86400);
    const sourceA = seeds.find(r => r.movie_id === idA), sourceB = seeds.find(r => r.movie_id === idB);
    if (!sourceA || !sourceB || !sourceA.embedding || !sourceB.embedding) return [];
    const a = vector(sourceA.embedding), b = vector(sourceB.embedding);
    const midpoint = a.map((v, i) => v + b[i]);
    if (!midpoint.some(v => v !== 0)) return [];
    const nearest = await supabaseRpc<FilmRow[]>("vibe_search_v3", {
        query_embedding: midpoint, match_limit: 200, min_votes: 100,
    }, 86400);
    const rows = Array.from(new Map(nearest.filter(r => r.movie_id !== idA && r.movie_id !== idB && (r.vote_count ?? 0) >= 100).map(r => [r.movie_id, r])).values()).slice(0, 200);
    if (!rows.length) return [];
    const embeddings = new Map<number, number[]>();
    // At most two concurrent reads, 50 vectors per response. Embeddings remain
    // server-only and never appear in FilmDTO, HTML or the share URL.
    for (let offset = 0; offset < rows.length; offset += 100) {
        const batches = [rows.slice(offset, offset + 50), rows.slice(offset + 50, offset + 100)].filter(batch => batch.length);
        const values = await Promise.all(batches.map(batch => supabaseSelect<VectorRow[]>(`film_embeddings_v3?select=movie_id,embedding&movie_id=in.(${batch.map(r => r.movie_id).join(",")})`, 86400)));
        for (const row of values.flat()) embeddings.set(row.movie_id, vector(row.embedding));
    }
    return rows.map(row => {
        const embedding = embeddings.get(row.movie_id);
        if (!embedding) throw new Error("Missing blend candidate embedding");
        return { ...row, sim_a: cosine(embedding, a), sim_b: cosine(embedding, b) };
    });
}
async function blendCandidates(idA: number, idB: number): Promise<BlendRow[]> {
    try {
        return await supabaseRpc<BlendRow[]>("blend_movies", { movie_a: idA, movie_b: idB }, 86400);
    } catch (error) {
        // Only PostgreSQL statement timeouts qualify. Auth, missing RPC and
        // other failures must still reach the normal visible error state.
        if (!(error instanceof Error) || !/"code"\s*:\s*"57014"/.test(error.message)) throw error;
        console.warn("blend_movies timed out; using bounded midpoint candidates");
        return timeoutCandidates(idA, idB);
    }
}

/** null: filmlerden biri katalogda yok (embedding'i yok) ya da iki film aynı. */
export async function blendFilms(idA: number, idB: number): Promise<BlendResult | null> {
    if (idA === idB) return null;
    const [a, b] = await Promise.all([
        getFilmRow(idA),
        getFilmRow(idB),
    ]);
    if (!a || !b) return null;
    // Canonical seed order shares the database cache when users swap films.
    const rows = await blendCandidates(Math.min(idA, idB), Math.max(idA, idB));
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
            const enA = sharedThemes(r.keywords, a.keywords, 2, "en");
            const enB = sharedThemes(r.keywords, b.keywords, 2, "en");
            const reasonsEn = [enA.length ? `${a.title}: ${enA.join(", ")}` : null, enB.length ? `${b.title}: ${enB.join(", ")}` : null].filter((x): x is string => !!x);
            return { film: toFilmDTO(r), reasons, reasonsEn };
        });
    return { a: aDto, b: bDto, films };
}
