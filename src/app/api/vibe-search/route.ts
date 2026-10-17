import { NextRequest, NextResponse } from "next/server";
import { VibeError } from "@/lib/recommend/vibe";
import { cachedVibeSearch, serverTimingHeader } from "@/lib/recommend/vibeCached";

// GET /api/vibe-search?q=zaman döngüsünde sıkışmış bir karakter
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const started = Date.now();
    try {
        const { result, timing, cached } = await cachedVibeSearch(q, ip);
        return NextResponse.json(result, { headers: { "Server-Timing": serverTimingHeader(timing, cached, Date.now() - started) } });
    } catch (err) {
        if (err instanceof VibeError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status, headers: { "Cache-Control": "no-store", ...(err.retryAfter && { "Retry-After": String(err.retryAfter) }) } });
        console.error("vibe-search hatası:", err);
        return NextResponse.json({ error: "Arama yapılamadı, biraz sonra tekrar dene." }, { status: 500 });
    }
}
