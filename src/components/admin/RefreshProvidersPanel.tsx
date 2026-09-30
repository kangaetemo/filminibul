"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";
import type { WorkflowRun } from "@/lib/server/github";

const STATUS_TEXT: Record<string, string> = {
    queued: "Sırada",
    in_progress: "Çalışıyor",
    success: "Başarılı",
    failure: "Başarısız",
    cancelled: "İptal edildi",
    timed_out: "Zaman aşımı",
};

const statusOf = (r: WorkflowRun) => (r.status === "completed" ? r.conclusion ?? "completed" : r.status);
const colorOf = (s: string) =>
    s === "success" ? "text-like-glow" : s === "failure" || s === "timed_out" ? "text-pass-glow" : s === "cancelled" ? "text-white/40" : "text-yellow-300";

const fmt = (iso: string) => new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

function duration(r: WorkflowRun) {
    const sec = Math.round((new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 1000);
    return sec < 60 ? `${sec} sn` : `${Math.round(sec / 60)} dk`;
}

export default function RefreshProvidersPanel({ initialRuns, configured }: { initialRuns: WorkflowRun[]; configured: boolean }) {
    const router = useRouter();
    const [runs, setRuns] = useState(initialRuns);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const active = runs.some((r) => r.status !== "completed");

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/refresh-providers", { cache: "no-store" });
        if (res.ok) setRuns((await res.json()).runs);
    }, []);

    // Çalışan bir yenileme varken 15 sn'de bir durumu yenile; bitince istatistikleri de tazele
    useEffect(() => {
        if (!active) return;
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, [active, load]);

    // Sadece "çalışıyor → bitti" geçişinde istatistikleri tazele (ilk açılışta değil)
    const wasActive = useRef(active);
    useEffect(() => {
        if (wasActive.current && !active) router.refresh();
        wasActive.current = active;
    }, [active, router]);

    async function start() {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/refresh-providers", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data.error ?? "Başlatılamadı");
            } else {
                setMessage("Başlatıldı. GitHub'ın işi sıraya alması birkaç saniye sürer; tüm tarama ~15 dakika.");
                // GitHub yeni çalıştırmayı listeye biraz gecikmeyle ekliyor
                setTimeout(load, 4000);
                setTimeout(load, 10000);
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={start}
                    disabled={!configured || busy || active}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-glow disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                    {busy || active ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {active ? "Yenileme çalışıyor…" : "Şimdi güncelle"}
                </button>
                {!configured && <span className="text-sm text-pass-glow">GITHUB_TOKEN tanımlı değil — buton ve geçmiş kapalı.</span>}
                {message && <span className="text-sm text-white/60">{message}</span>}
            </div>

            {configured && (
                <table className="mt-4 w-full text-sm">
                    <thead className="text-left text-white/40">
                        <tr>
                            <th className="py-2 font-normal">Başlangıç</th>
                            <th className="py-2 font-normal">Tetikleyen</th>
                            <th className="py-2 font-normal">Durum</th>
                            <th className="py-2 font-normal">Süre</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {runs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-3 text-white/40">
                                    Henüz çalıştırma yok.
                                </td>
                            </tr>
                        )}
                        {runs.map((r) => {
                            const s = statusOf(r);
                            return (
                                <tr key={r.id} className="text-white/80">
                                    <td className="py-2">{fmt(r.createdAt)}</td>
                                    <td className="py-2">{r.event === "schedule" ? "Zamanlanmış" : r.event === "workflow_dispatch" ? "Elle" : r.event}</td>
                                    <td className={`py-2 ${colorOf(s)}`}>{STATUS_TEXT[s] ?? s}</td>
                                    <td className="py-2 text-white/50">{r.status === "completed" ? duration(r) : "—"}</td>
                                    <td className="py-2 text-right">
                                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-white/40 hover:text-white">
                                            Log <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
