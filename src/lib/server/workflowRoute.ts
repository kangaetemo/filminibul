import { NextResponse } from "next/server";
import { dispatchRefresh, githubConfigured, listRuns, type WorkflowName } from "./github";

// /api/admin altındaki workflow uç noktalarının ortak işleyicisi (middleware admin oturumu olmadan geçirmez).
// GET: son çalıştırmalar (panel durum takibi) · POST: workflow'u başlat
export function workflowHandlers(workflow: WorkflowName) {
    async function GET() {
        if (!githubConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN tanımlı değil" }, { status: 503 });
        try {
            return NextResponse.json({ runs: await listRuns(workflow) });
        } catch (err) {
            console.error("GitHub runs hatası:", err);
            return NextResponse.json({ error: "GitHub'dan durum alınamadı" }, { status: 502 });
        }
    }

    async function POST() {
        if (!githubConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN tanımlı değil" }, { status: 503 });
        try {
            // Zaten çalışan varsa yenisini başlatma (workflow'da concurrency de var)
            const running = (await listRuns(workflow, 3)).find((r) => r.status !== "completed");
            if (running) return NextResponse.json({ error: "Zaten çalışan bir iş var", run: running }, { status: 409 });
            await dispatchRefresh(workflow);
            return NextResponse.json({ ok: true });
        } catch (err) {
            console.error("GitHub dispatch hatası:", err);
            return NextResponse.json({ error: "Başlatılamadı" }, { status: 502 });
        }
    }

    return { GET, POST };
}
