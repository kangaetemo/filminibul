import { PILOT_LISTS } from "@/lib/catalog/pilot";
import { PILOT_PEOPLE, personPath } from "@/lib/catalog/peopleManifest";
import type { MetadataRoute } from "next";
import { filmPath } from "@/lib/filmUrl";
import { MOODS } from "@/lib/recommend/moods";
import { displayTitle } from "@/lib/recommend/similar";
import type { FilmRow } from "@/lib/recommend/types";
import { supabaseSelect } from "@/lib/server/supabase";

// /sitemap.xml: ana sayfa, /karistir, mod sayfaları ve katalogdaki tüm filmler (~26 bin; Google sınırı 50 bin adres).
// Günde bir yeniden üretilir; haftalık katalog işi yeni filmleri ekler.
export const revalidate = 86400;

const SITE = "https://filminibul.com";
const PAGE = 1000;

type Row = Pick<FilmRow, "movie_id" | "title" | "tr_title" | "original_title" | "language">;

async function allFilms(): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += PAGE) {
        const page = await supabaseSelect<Row[]>(
            `film_embeddings_v3?select=movie_id,title,tr_title,original_title,language&order=movie_id&limit=${PAGE}&offset=${offset}`,
            86400
        );
        rows.push(...page);
        if (page.length < PAGE) return rows;
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // PR previews do not publish the production catalog to search engines.
    // They may have no database credentials; do not query Supabase during their build.
    if (process.env.VERCEL_ENV === "preview") return [];

    const films = await allFilms();
    return [
        { url: SITE, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE}/karistir`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${SITE}/listeler`, changeFrequency: "weekly", priority: 0.7 },
        ...PILOT_LISTS.map(list => ({ url: `${SITE}/listeler/${list.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
        ...PILOT_PEOPLE.map(person => ({ url: SITE + personPath(person), changeFrequency: "weekly" as const, priority: 0.6 })),
        ...MOODS.map((m) => ({ url: `${SITE}/mod/${m.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
        ...films.map((f) => ({ url: SITE + filmPath(f.movie_id, displayTitle(f)), changeFrequency: "monthly" as const, priority: 0.5 })),
    ];
}
