import type { Candidate, FilmRow } from "./types";
import type { ScoredFilm } from "./reranker";
export const MAX_PERSONAL_SEEDS: number;
export function selectPersonalSeeds(rows: FilmRow[], orderedIds: number[], limit?: number): FilmRow[];
export function rankPersonalCandidates(pools: { seed: FilmRow; ranked: ScoredFilm[] }[], savedIds: number[], limit?: number): {
    film: Candidate;
    sources: { seed: FilmRow; scored: ScoredFilm; strength: number }[];
    score: number;
}[];
