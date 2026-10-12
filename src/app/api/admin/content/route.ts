import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { ADMIN_COOKIE, isValidSession } from "@/lib/server/adminAuth";
import { CATALOG_TAG } from "@/lib/server/supabase";
import { getFilmRow, searchCatalog } from "@/lib/recommend/similar";
import { getMovieDetails } from "@/lib/server/tmdbServer";
import { cleanOverview } from "@/lib/filmContent.mjs";

const authorized = () => isValidSession(cookies().get(ADMIN_COOKIE)?.value);
const validId = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const editable = (row: Awaited<ReturnType<typeof getFilmRow>>) => row && ({ id: row.movie_id, title: row.title, tr_title: row.tr_title, overview: row.overview, tr_overview: row.tr_overview, poster_path: row.poster_path });
export async function GET(request: NextRequest) {
    if (!await authorized()) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    try {
        const id = request.nextUrl.searchParams.get("id");
        if (id && validId(id)) return NextResponse.json({ film: editable(await getFilmRow(Number(id))) });
        const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) || "";
        return NextResponse.json({ results: q.length > 1 ? (await searchCatalog(q, 12)).map(editable) : [] });
    } catch { return NextResponse.json({ error: "Film okunamadı" }, { status: 502 }); }
}
export async function PATCH(request: NextRequest) {
    if (!await authorized()) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Geçersiz kaynak" }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!body || !validId(body.id) || typeof body.tr_title !== "string" || body.tr_title.length > 300 || typeof body.tr_overview !== "string" || body.tr_overview.length > 8000) return NextResponse.json({ error: "Geçersiz film veya metin" }, { status: 400 });
    try {
        if (!await getFilmRow(Number(body.id))) return NextResponse.json({ error: "Film katalogda yok" }, { status: 404 });
        const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const result = await fetch(`${url}/rest/v1/film_embeddings_v3?movie_id=eq.${Number(body.id)}`, {
            method: "PATCH", cache: "no-store", signal: AbortSignal.timeout(8000),
            headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ tr_title: body.tr_title.trim() || null, tr_overview: cleanOverview(body.tr_overview) }),
        });
        if (!result.ok) throw new Error("write failed");
        revalidateTag(CATALOG_TAG);
        return NextResponse.json({ ok: true });
    } catch { return NextResponse.json({ error: "Açıklama kaydedilemedi" }, { status: 502 }); }
}
export async function POST(request: NextRequest) {
    if (!await authorized()) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Geçersiz kaynak" }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!validId(body?.id)) return NextResponse.json({ error: "Geçersiz film" }, { status: 400 });
    try {
        const film = await getMovieDetails(Number(body.id));
        return NextResponse.json({ tr_title: film?.title || "", tr_overview: cleanOverview(film?.overview) || "" });
    } catch { return NextResponse.json({ error: "TMDB metni alınamadı" }, { status: 502 }); }
}
