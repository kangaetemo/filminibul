import { NextRequest, NextResponse } from "next/server";
import { getSimilarFilms } from "@/lib/recommend/similar";

// GET /api/similar/603?limit=20&debug=1
// Next 14: params senkron nesne (Next 15+'da Promise olur)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "Geçersiz film id" }, { status: 400 });
    }
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 20, 1), 50);
    const debug = request.nextUrl.searchParams.get("debug") === "1";

    try {
        const results = await getSimilarFilms(id, limit, debug);
        return NextResponse.json({ id, count: results.length, results });
    } catch (err) {
        console.error("similar API hatası:", err);
        return NextResponse.json({ error: "Öneriler alınamadı" }, { status: 500 });
    }
}
