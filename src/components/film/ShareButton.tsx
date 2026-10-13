"use client";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { shareUrl } from "@/lib/discoveryUrl.mjs";
export default function ShareButton({ path, pair }: { path: string; pair?: [number, number] }) {
    const { language, t } = useLanguage();
    const [result, setResult] = useState<{ kind: "copied" | "failed"; url: string } | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (result?.kind !== "copied") return;
        const timer = window.setTimeout(() => setResult(null), 4000);
        return () => window.clearTimeout(timer);
    }, [result]);
    const copy = async () => {
        const url = shareUrl(path, window.location.search, language, pair);
        setBusy(true); setResult(null);
        try {
            await navigator.clipboard.writeText(url);
            setResult({ kind: "copied", url });
        } catch { setResult({ kind: "failed", url }); }
        finally { setBusy(false); }
    };
    return <div className="relative inline-flex min-w-0 max-w-full items-start">
        <button type="button" disabled={busy} onClick={() => void copy()} className="button-secondary w-full disabled:opacity-50"><Share2 className="h-4 w-4 shrink-0" aria-hidden /><span>{t("Paylaş")}</span></button>
        {result && <div role="status" className="fixed bottom-6 left-1/2 z-50 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-lg border border-line bg-card p-3 text-xs leading-relaxed text-ink shadow-glow-card">
            {t(result.kind === "copied" ? "Bağlantı kopyalandı." : "Bağlantıyı kopyalayamadık. Aşağıdaki adresi seçip kopyalayabilirsin.")}
            {result.kind === "failed" && <input readOnly value={result.url} aria-label={t("Paylaşılacak bağlantı")} onFocus={event => event.currentTarget.select()} className="mt-2 w-full min-w-0 rounded border border-line bg-background p-2 text-xs text-ink" />}
            <button type="button" aria-label={t("Bildirimi kapat")} onClick={() => setResult(null)} className="mt-2 block min-h-11 text-xs text-muted underline"><span>{t("Tamam")}</span></button>
        </div>}
    </div>;
}
