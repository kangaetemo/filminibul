import { supabaseSelect } from "@/lib/server/supabase";
import { FILM_COLUMNS, getCandidates, toFilmDTO, displayTitle } from "./similar";
import { rerank, explainParts } from "./reranker";
import { rankPersonalCandidates, selectPersonalSeeds } from "./personalModel.mjs";
import type { FilmSignal } from "@/lib/filmSignalsStore.mjs";
import type { FilmRow, SimilarFilmDTO } from "./types";

export type PersonalResponse = {
    recommendations: SimilarFilmDTO[];
    savedCount: number;
    seedCount: number;
    status: "empty" | "uncatalogued" | "ready" | "no_matches";
    partial: boolean;
};

export async function getPersonalRecommendations(ids: number[], signals: FilmSignal[] = []): Promise<PersonalResponse> {
    const base = { recommendations: [] as SimilarFilmDTO[], savedCount: ids.length, seedCount: 0, partial: false };
    const liked = new Set(signals.filter(r => r.reaction === "liked").map(r => r.id));
    const disliked = new Set(signals.filter(r => r.reaction === "disliked").map(r => r.id));
    const interests = Array.from(new Set([...Array.from(liked), ...ids])).filter(id => !disliked.has(id));
    const excluded = Array.from(new Set([...ids, ...signals.filter(r => r.watched || r.reaction).map(r => r.id)]));
    if (!interests.length) return { ...base, status: "empty" };
    const rows: FilmRow[] = [];
    try {
        for (let offset = 0; offset < interests.length; offset += 200) {
            rows.push(...await supabaseSelect<FilmRow[]>(`film_embeddings_v3?select=${FILM_COLUMNS}&movie_id=in.(${interests.slice(offset, offset + 200).join(",")})&limit=200`));
        }
    } catch (error) { throw Object.assign(error instanceof Error ? error : new Error("recommendations_unavailable"), { stage: "catalog" }); }
    const seeds = selectPersonalSeeds(rows, interests, 8, Array.from(liked)) as FilmRow[];
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
    const top = rankPersonalCandidates(pools, excluded, 20, Array.from(liked));
    const recommendations: SimilarFilmDTO[] = top.map(entry => {
        const sources = entry.sources.slice(0, 2);
        const trNames = sources.map(source => displayTitle(source.seed));
        const enNames = sources.map(source => source.seed.title);
        const allLiked = sources.every(source => liked.has(source.seed.movie_id));
        const noneLiked = sources.every(source => !liked.has(source.seed.movie_id));
        const tr = allLiked ? `${trNames.join(" ve ")} ${sources.length > 1 ? "filmlerini" : "filmini"} beğendiğin için`
            : noneLiked ? `${trNames.join(" ve ")} ${sources.length > 1 ? "filmlerini" : "filmini"} kaydettiğin için`
            : sources.map(source => `${displayTitle(source.seed)} filmini ${liked.has(source.seed.movie_id) ? "beğendiğin" : "kaydettiğin"} için`).join("; ");
        const en = allLiked ? `Because you liked ${enNames.join(" and ")}` : noneLiked ? `Because you saved ${enNames.join(" and ")}`
            : sources.map(source => `Because you ${liked.has(source.seed.movie_id) ? "liked" : "saved"} ${source.seed.title}`).join("; ");
        const reasons = [tr, ...explainParts(sources[0].scored)];
        const reasonsEn = [en, ...explainParts(sources[0].scored, "en")];
        return { film: toFilmDTO(entry.film), reason: reasons.join(" · "), reasons, reasonsEn, score: Math.round(entry.score * 1000) / 1000, platforms: [] };
    });
    return { ...base, recommendations, seedCount: pools.length, partial: failures > 0, status: recommendations.length ? "ready" : "no_matches" };
}
