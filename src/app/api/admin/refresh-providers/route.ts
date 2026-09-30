import { NextResponse } from "next/server";
import { dispatchRefresh, githubConfigured, listRuns } from "@/lib/server/github";

// Middleware bu route'u admin oturumu olmadan geçirmez.

// GET: son çalıştırmalar (panel durum takibi için)
export async function GET() {
    if (!githubConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN tanımlı değil" }, { status: 503 });
    try {
        return NextResponse.json({ runs: await listRuns() });
    } catch (err) {
        console.error("GitHub runs hatası:", err);
        return NextResponse.json({ error: "GitHub'dan durum alınamadı" }, { status: 502 });
    }
}

// POST: yenilemeyi başlat
export async function POST() {
    if (!githubConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN tanımlı değil" }, { status: 503 });
    try {
        // Zaten çalışan bir yenileme varsa yenisini başlatma (workflow'da concurrency de var)
        const running = (await listRuns(3)).find((r) => r.status !== "completed");
        if (running) return NextResponse.json({ error: "Zaten çalışan bir yenileme var", run: running }, { status: 409 });
        await dispatchRefresh();
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("GitHub dispatch hatası:", err);
        return NextResponse.json({ error: "Yenileme başlatılamadı" }, { status: 502 });
    }
}
