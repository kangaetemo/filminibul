import { turkishOverview, cleanOverview } from "@/lib/filmContent.mjs";
import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/server/tmdbServer";
import { catalogIds, searchCatalog, toFilmDTO } from "@/lib/recommend/similar";

// GET /api/search-movie?q=matrix
// İki kaynak birleştirilir:
//   1. Katalog (Supabase): başlık "içinde geçer" araması → yazarken yarım kelimeyle de bulur ("ruhların kaç")
//   2. TMDB (sunucuda, anahtar tarayıcıya gitmez): katalogda olmayan filmler ve yazım farkları
// Katalogdaki filmler (öneri üretilebilenler) önce gelir.

interface SearchResult {
    id: number;
    title: string;
    originalTitle: string | null;
    year: number | null;
    overview: string | null;
    rating: number;
    posterUrl: string | null;
    inCatalog: boolean;
}

// Türkçe karakterleri sadeleştir: TMDB "ruhlarin kacisi" ile de buluyor
const foldTurkish = (s: string) =>
    s.replace(/ı/g, "i").replace(/İ/g, "I").replace(/ş/gi, "s").replace(/ç/gi, "c").replace(/ğ/gi, "g").replace(/ö/gi, "o").replace(/ü/gi, "u");

export async function GET(request: NextRequest) {
    const language = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "tr";
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    try {
        const [catalogRows, tmdbFirst] = await Promise.all([searchCatalog(q), searchMovies(q, language)]);
        const folded = foldTurkish(q);
        const tmdbResults = tmdbFirst.length === 0 && folded !== q ? await searchMovies(folded, language) : tmdbFirst;

        const inCatalog = await catalogIds(tmdbResults.map((m) => m.id));
        const fromCatalog: SearchResult[] = catalogRows.map((row) => {
            const f = toFilmDTO(row);
            return {
                id: f.id,
                title: language === "en" ? f.titleEn || f.title : f.title,
                originalTitle: f.originalTitle,
                year: f.year,
                overview: language === "en" ? f.overviewEn || null : f.overview,
                rating: f.rating ?? 0,
                posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w185${row.poster_path}` : null,
                inCatalog: true,
            };
        });
        const fromTmdb: SearchResult[] = tmdbResults.map((m) => ({
            id: m.id,
            title: m.title || m.original_title,
            originalTitle: m.original_title !== m.title ? m.original_title : null,
            year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
            overview: language === "en" ? cleanOverview(m.overview) : turkishOverview(m.overview, null, null),
            rating: m.vote_average,
            posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
            inCatalog: inCatalog.has(m.id),
        }));

        // TMDB sırası (alaka) önce, sonra katalogdan yarım kelime eşleşmeleri; tekrarları at; katalogdakiler öne
        const seen = new Set<number>();
        const catalogById = new Map(fromCatalog.map(f => [f.id, f]));
        const results = [...fromTmdb.map(f => catalogById.get(f.id) || f), ...fromCatalog]
            .filter((r) => !seen.has(r.id) && seen.add(r.id))
            .sort((a, b) => Number(b.inCatalog) - Number(a.inCatalog))
            .slice(0, 12);
        return NextResponse.json({ results });
    } catch (err) {
        console.error("search API hatası:", err);
        return NextResponse.json({ error: "Arama yapılamadı" }, { status: 500 });
    }
}
