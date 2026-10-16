import { NextRequest, NextResponse } from "next/server";
import { getListSnapshot } from "@/lib/catalog/lists";
import { getPersonSnapshot } from "@/lib/catalog/people";
import { getPilotPerson, personPath } from "@/lib/catalog/peopleManifest";
import { getPilotList, parsePage, PAGE_SIZE } from "@/lib/catalog/pilot";

// Only the published catalog routes are readable. Never accept table names or arbitrary filters.
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = parsePage(params.get("page") ?? "");
    const path = params.get("path") ?? "";
    const fail = (status: number) => NextResponse.json({ error: "Filmler yüklenemedi." }, { status, headers: { "Cache-Control": "no-store" } });
    if (!page || params.getAll("page").length !== 1 || params.getAll("path").length !== 1 || Array.from(params.keys()).some(key => key !== "path" && key !== "page")) return fail(400);
    const listSlug = /^\/listeler\/([^/]+)$/.exec(path)?.[1];
    const person = /^\/(oyuncu|yonetmen)\/([1-9]\d*)-[a-z0-9-]+$/.exec(path);
    const role = person?.[1] === "oyuncu" ? "actor" : "director";
    const entry = person ? getPilotPerson(Number(person[2]), role) : undefined;
    if (!(listSlug && getPilotList(listSlug)) && !(entry && personPath(entry) === path)) return fail(404);
    try {
        const snapshot = listSlug ? await getListSnapshot(listSlug) : await getPersonSnapshot(entry!.id, role);
        if (!snapshot || !snapshot.total || page > snapshot.pages) return fail(404);
        const films = snapshot.films.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        const notes: Record<number, string> = {};
        if ("notes" in snapshot) for (const film of films) notes[film.id] = snapshot.notes[film.id];
        return NextResponse.json({ films, notes, page, pages: snapshot.pages, total: snapshot.total }, {
            headers: { "Cache-Control": "public, max-age=0, s-maxage=3600", "X-Robots-Tag": "noindex" },
        });
    } catch {
        return fail(503);
    }
}
