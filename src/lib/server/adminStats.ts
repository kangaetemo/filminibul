// Admin paneli için platform verisi istatistikleri (önbelleksiz, her açılışta güncel).

import { supabaseCount, supabaseSelect } from "./supabase";
import { FEATURED_PLATFORMS, type Platform } from "@/lib/recommend/providers";

export interface ProviderStats {
    catalogFilms: number;
    filmsWithProviders: number;
    lastUpdated: string | null;
    oldestUpdated: string | null;
    perPlatform: { platform: Platform; films: number }[];
}

export async function getProviderStats(): Promise<ProviderStats> {
    const [catalogFilms, filmsWithProviders, newest, oldest, perPlatform] = await Promise.all([
        supabaseCount("film_embeddings_v3?select=movie_id"),
        supabaseCount("film_providers?select=movie_id"),
        supabaseSelect<{ updated_at: string }[]>("film_providers?select=updated_at&order=updated_at.desc&limit=1", 0),
        supabaseSelect<{ updated_at: string }[]>("film_providers?select=updated_at&order=updated_at.asc&limit=1", 0),
        Promise.all(
            FEATURED_PLATFORMS.map(async (p) => ({
                platform: p,
                // Abonelik veya ücretsiz
                films: await supabaseCount(`film_providers?select=movie_id&or=(flatrate.cs.{${p.id}},free.cs.{${p.id}})`),
            }))
        ),
    ]);
    return {
        catalogFilms,
        filmsWithProviders,
        lastUpdated: newest[0]?.updated_at ?? null,
        oldestUpdated: oldest[0]?.updated_at ?? null,
        perPlatform: perPlatform.sort((a, b) => b.films - a.films),
    };
}
