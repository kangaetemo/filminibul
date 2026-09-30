import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { AddFilmError, addFilmToCatalog } from "@/lib/server/catalogAdd";
import { CATALOG_TAG } from "@/lib/server/supabase";

// POST /api/admin/catalog/add  { id } — (middleware: admin oturumu şart)
export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Geçersiz film id" }, { status: 400 });

    try {
        const result = await addFilmToCatalog(id);
        // Önbellekteki katalog verisini tazele: film sayfası "katalogda yok" hâliyle, diğer filmlerin benzer
        // listeleri de yeni film olmadan önbellekte olabilir
        revalidateTag(CATALOG_TAG);
        revalidatePath(`/film/${id}`);
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        if (err instanceof AddFilmError) return NextResponse.json({ error: err.message }, { status: 422 });
        console.error("catalog add:", err);
        return NextResponse.json({ error: "Film eklenemedi" }, { status: 500 });
    }
}
