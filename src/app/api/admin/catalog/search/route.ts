import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/server/tmdbServer";
import { catalogIds } from "@/lib/recommend/similar";

// GET /api/admin/catalog/search?q=primer — TMDB araması + katalogda mı? (middleware: admin oturumu şart)
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });
    try {
        const found = await searchMovies(q);
        const inCatalog = await catalogIds(found.map((m) => m.id));
        return NextResponse.json({
            results: found.slice(0, 15).map((m) => ({
                id: m.id,
                title: m.title || m.original_title,
                originalTitle: m.original_title !== m.title ? m.original_title : null,
                year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
                voteCount: m.vote_count,
                rating: m.vote_average,
                posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : null,
                inCatalog: inCatalog.has(m.id),
            })),
        });
    } catch (err) {
        console.error("admin catalog search:", err);
        return NextResponse.json({ error: "Arama yapılamadı" }, { status: 500 });
    }
}
