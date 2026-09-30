// Admin paneli için platform verisi istatistikleri (önbelleksiz, her açılışta güncel).

import { supabaseCount, supabaseRpc, supabaseSelect } from "./supabase";
import { FEATURED_PLATFORMS, type Platform } from "@/lib/recommend/providers";

export interface ProviderStats {
    catalogFilms: number;
    filmsWithProviders: number;
    lastUpdated: string | null;
    oldestUpdated: string | null;
    perPlatform: { platform: Platform; films: number }[];
}

export interface DbUsage {
    usedBytes: number;
    limitBytes: number;
    films: number;
    // Film başına ortalama yer (tablo + index) → kalan alana sığacak tahmini film sayısı
    remainingFilms: number;
}

// Supabase ücretsiz plan veritabanı sınırı
const DB_LIMIT_BYTES = 500 * 1024 * 1024;

/** scripts/sql/admin_db_usage.sql çalıştırılmamışsa null (panel uyarı gösterir) */
export async function getDbUsage(): Promise<DbUsage | null> {
    try {
        const [u] = await supabaseRpc<{ db_bytes: number; films: number; films_bytes: number }[]>("admin_db_usage", {}, 0);
        const perFilm = u.films ? u.films_bytes / u.films : 17_000;
        return {
            usedBytes: u.db_bytes,
            limitBytes: DB_LIMIT_BYTES,
            films: u.films,
            remainingFilms: Math.max(0, Math.floor((DB_LIMIT_BYTES - u.db_bytes) / perFilm)),
        };
    } catch (err) {
        console.error("admin_db_usage:", err);
        return null;
    }
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
