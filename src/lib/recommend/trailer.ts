// Film fragmanı: TMDB /movie/{id}/videos (YouTube anahtarları). Sunucu tarafı, günlük önbellekli.

import { tmdbGet } from "@/lib/server/tmdbServer";

export interface Trailer {
    /** YouTube video kimliği */
    key: string;
    name: string;
    /** "tr" (Türkçe altyazılı/dublajlı) ya da "en" */
    language: string;
}

interface TmdbVideo {
    key: string;
    name: string;
    site: string;
    type: string;
    official: boolean;
    iso_639_1: string;
    published_at: string;
}

// Düşük puan = daha iyi. Fragman > teaser; resmî olan; Türkçe varsa Türkçe, yoksa İngilizce; en yenisi.
function rank(v: TmdbVideo): number {
    return (v.type === "Trailer" ? 0 : 10) + (v.official ? 0 : 5) + (v.iso_639_1 === "tr" ? 0 : 2);
}

export function pickTrailer(videos: TmdbVideo[]): Trailer | null {
    const candidates = videos.filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser") && /^[\w-]{6,20}$/.test(v.key));
    if (!candidates.length) return null;
    candidates.sort((a, b) => rank(a) - rank(b) || b.published_at.localeCompare(a.published_at));
    const best = candidates[0];
    return { key: best.key, name: best.name, language: best.iso_639_1 };
}

/** Hata olursa null: fragman olmasa da film sayfası açılır. */
export async function getTrailer(id: number): Promise<Trailer | null> {
    try {
        // Türkçe ve İngilizce videolar birlikte gelsin (include_video_language olmadan sadece language=tr gelir)
        const data = await tmdbGet<{ results: TmdbVideo[] }>(`/movie/${id}/videos`, { language: "tr-TR", include_video_language: "tr,en" }, 86400);
        return pickTrailer(data?.results ?? []);
    } catch (err) {
        console.error("fragman alınamadı:", err);
        return null;
    }
}
