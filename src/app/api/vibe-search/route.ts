import { NextRequest, NextResponse } from "next/server";
import { VibeError, vibeSearch } from "@/lib/recommend/vibe";

// GET /api/vibe-search?q=zaman döngüsünde sıkışmış bir karakter
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    try {
        return NextResponse.json(await vibeSearch(q, ip));
    } catch (err) {
        if (err instanceof VibeError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status, headers: { "Cache-Control": "no-store", ...(err.retryAfter && { "Retry-After": String(err.retryAfter) }) } });
        console.error("vibe-search hatası:", err);
        return NextResponse.json({ error: "Arama yapılamadı, biraz sonra tekrar dene." }, { status: 500 });
    }
}
