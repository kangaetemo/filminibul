import { NextRequest, NextResponse } from "next/server";
import { parseBatch } from "@/lib/analytics/schema";
import { analyticsRpc } from "@/lib/server/analytics";
import { sameOrigin } from "@/lib/requestOrigin.mjs";
export const dynamic = "force-dynamic";
const ignoredAgent = /bot|crawler|spider|headless|lighthouse|vercel-screenshot/i;
export async function POST(request: NextRequest) {
    const empty = () => new NextResponse(null, { status: 204 });
    if (process.env.ANALYTICS_ENABLED !== "true") return empty();
    // Never collect signed-in admin activity (also excluded in the browser on /admin).
    if (request.cookies.has("fb_admin") || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1" || ignoredAgent.test(request.headers.get("user-agent") ?? "")) return empty();
    if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return new NextResponse(null, { status: 415 });
    // Bound the stream itself; Content-Length can be absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16384) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
        chunks.push(value);
    }
    let batch;
    try { batch = parseBatch(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { batch = null; }
    if (!batch) return new NextResponse(null, { status: 400 });
    try {
        const accepted = await analyticsRpc<number>("analytics_ingest", { p_session: batch.session_id, p_source: batch.source, p_events: batch.events });
        return accepted < 0 ? new NextResponse(null, { status: 429 }) : empty();
    } catch {
        console.error("Analytics ingestion unavailable"); // Do not log search text or payloads.
        return NextResponse.json({ error: "İstatistik kaydı kullanılamıyor" }, { status: 503 });
    }
}
