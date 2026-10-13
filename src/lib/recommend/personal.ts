import { supabaseSelect } from "@/lib/server/supabase";
import { FILM_COLUMNS, getCandidates, toFilmDTO, displayTitle } from "./similar";
import { rerank, explainParts } from "./reranker";
import { rankPersonalCandidates, selectPersonalSeeds } from "./personalModel.mjs";
import type { FilmRow, SimilarFilmDTO } from "./types";

export type PersonalResponse = {
    recommendations: SimilarFilmDTO[];
    savedCount: number;
    seedCount: number;
    status: "empty" | "uncatalogued" | "ready" | "no_matches";
    partial: boolean;
};

export async function getPersonalRecommendations(ids: number[]): Promise<PersonalResponse> {
    const base = { recommendations: [] as SimilarFilmDTO[], savedCount: ids.length, seedCount: 0, partial: false };
    if (!ids.length) return { ...base, status: "empty" };
    const rows: FilmRow[] = [];
    try {
        for (let offset = 0; offset < ids.length; offset += 200) {
            rows.push(...await supabaseSelect<FilmRow[]>(`film_embeddings_v3?select=${FILM_COLUMNS}&movie_id=in.(${ids.slice(offset, offset + 200).join(",")})&limit=200`));
        }
    } catch (error) { throw Object.assign(error instanceof Error ? error : new Error("recommendations_unavailable"), { stage: "catalog" }); }
    const seeds = selectPersonalSeeds(rows, ids) as FilmRow[];
    if (!seeds.length) return { ...base, status: "uncatalogued" };
    // Bound concurrent database work; use maintained neighbors + existing reranker.
    const pools: { seed: FilmRow; ranked: ReturnType<typeof rerank> }[] = [];
    let failures = 0;
    for (let offset = 0; offset < seeds.length; offset += 3) {
        const batch = await Promise.allSettled(seeds.slice(offset, offset + 3).map(async seed => {
            const candidates = await getCandidates(seed.movie_id);
            return { seed, ranked: rerank(seed, candidates, candidates.length) };
        }));
        for (const result of batch) {
            if (result.status === "fulfilled") pools.push(result.value); else failures++;
        }
    }
    if (!pools.length) throw new Error("recommendations_unavailable");
    const top = rankPersonalCandidates(pools, ids, 20);
    const recommendations: SimilarFilmDTO[] = top.map(entry => {
        const sources = entry.sources.slice(0, 2);
        const trNames = sources.map(source => displayTitle(source.seed));
        const enNames = sources.map(source => source.seed.title);
        const tr = `${trNames.join(" ve ")} ${sources.length > 1 ? "filmlerini" : "filmini"} kaydettiğin için`;
        const en = `Because you saved ${enNames.join(" and ")}`;
        const reasons = [tr, ...explainParts(sources[0].scored)];
        const reasonsEn = [en, ...explainParts(sources[0].scored, "en")];
        return { film: toFilmDTO(entry.film), reason: reasons.join(" · "), reasons, reasonsEn, score: Math.round(entry.score * 1000) / 1000, platforms: [] };
    });
    return { ...base, recommendations, seedCount: pools.length, partial: failures > 0, status: recommendations.length ? "ready" : "no_matches" };
}
