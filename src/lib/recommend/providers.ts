// Türkiye yayın platformları ("Nerede izlenir?"). Veri kaynağı: JustWatch (TMDB üzerinden) — UI'da belirtilmeli.
//   - Seed film: TMDB'den canlı (günlük önbellek)
//   - Benzer filmler / filtre: Supabase film_providers (scripts/tmdb/fetch_providers.mjs ile periyodik yenilenir)

import catalogJson from "@/data/providers_tr.json";
import { supabaseSelect } from "@/lib/server/supabase";
import { tmdbGet } from "@/lib/server/tmdbServer";

export interface Platform {
    id: number;
    name: string;
    logoUrl: string | null;
}

export interface FilmProviders {
    flatrate: number[];
    free: number[];
    rent: number[];
    buy: number[];
    link: string | null;
}

const catalog = catalogJson as Record<string, { name: string; logo: string | null; priority: number; count: number }>;

export function platform(id: number): Platform {
    const p = catalog[String(id)];
    return { id, name: p?.name ?? `Platform ${id}`, logoUrl: p?.logo ? `https://image.tmdb.org/t/p/w92${p.logo}` : null };
}

/**
 * Filtre çiplerinde gösterilecek platformlar (Türkiye'de yaygın olanlar, katalogdaki film sayısıyla birlikte
 * seçildi — fetch_providers.mjs çıktısı: Netflix 706, TV+ 584, Disney+ 565, Prime 260, HBO Max 230, MUBI 173, TOD 145).
 */
export const FEATURED_PLATFORMS: Platform[] = [8, 337, 119, 1899, 1904, 1826, 11, 283].filter((id) => catalog[String(id)]).map(platform);

// Aynı servisin farklı kanalları: MUBI seçilince "MUBI Amazon Channel" da sayılır
const ALIASES: Record<number, number> = { 201: 11 };

/** Abonelik + ücretsiz: "hemen izlenebilir" platformlar (kanallar ana servise eşlenmiş), yaygınlığa göre sıralı */
export function watchableIds(p: FilmProviders | undefined): number[] {
    if (!p) return [];
    return Array.from(new Set([...p.flatrate, ...p.free].map((id) => ALIASES[id] ?? id))).sort(
        (a, b) => (catalog[String(b)]?.count ?? 0) - (catalog[String(a)]?.count ?? 0)
    );
}

export async function getProvidersFor(ids: number[]): Promise<Map<number, FilmProviders>> {
    if (!ids.length) return new Map();
    try {
        const rows = await supabaseSelect<(FilmProviders & { movie_id: number })[]>(
            `film_providers?select=movie_id,flatrate,free,rent,buy,link&movie_id=in.(${ids.join(",")})`,
            86400
        );
        return new Map(rows.map((r) => [r.movie_id, r]));
    } catch (err) {
        // Platform verisi yardımcı bilgi: tablo yoksa/erişilemezse öneriler yine gösterilir
        console.error("film_providers okunamadı:", err);
        return new Map();
    }
}

/** Tek film için güncel veri (TMDB, günlük önbellek). Hata olursa null (sayfa yine açılır). */
export async function getLiveProviders(id: number): Promise<FilmProviders | null> {
    try {
        return await fetchLiveProviders(id);
    } catch (err) {
        console.error("watch/providers alınamadı:", err);
        return null;
    }
}

async function fetchLiveProviders(id: number): Promise<FilmProviders | null> {
    type Entry = { provider_id: number };
    const data = await tmdbGet<{ results: Record<string, { link?: string; flatrate?: Entry[]; free?: Entry[]; ads?: Entry[]; rent?: Entry[]; buy?: Entry[] }> }>(
        `/movie/${id}/watch/providers`,
        {},
        86400
    );
    const tr = data?.results?.TR;
    if (!tr) return null;
    const ids = (arr?: Entry[]) => (arr ?? []).map((p) => p.provider_id);
    return {
        flatrate: ids(tr.flatrate),
        free: Array.from(new Set([...ids(tr.free), ...ids(tr.ads)])),
        rent: ids(tr.rent),
        buy: ids(tr.buy),
        link: tr.link ?? null,
    };
}
