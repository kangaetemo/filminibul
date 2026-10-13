"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { shareUrl } from "@/lib/discoveryUrl.mjs";
export default function ShareButton({ path, title, titleEn, pair }: { path: string; title: string; titleEn?: string; pair?: [number, number] }) {
    const { language, t } = useLanguage();
    const [message, setMessage] = useState("");
    const [fallback, setFallback] = useState("");
    const [busy, setBusy] = useState(false);
    const share = async () => {
        const url = shareUrl(path, window.location.search, language, pair);
        setBusy(true); setMessage(""); setFallback("");
        try {
            if (typeof navigator.share === "function") {
                try { await navigator.share({ title: language === "en" ? titleEn || title : title, url }); setMessage(t("Paylaşıldı.")); return; }
                catch (error) { if (error instanceof Error && error.name === "AbortError") { setMessage(t("Paylaşım iptal edildi.")); return; } }
            }
            try { await navigator.clipboard.writeText(url); setMessage(t("Bağlantı kopyalandı.")); }
            catch { setFallback(url); setMessage(t("Bağlantıyı kopyalayamadık. Aşağıdaki adresi seçip kopyalayabilirsin.")); }
        } finally { setBusy(false); }
    };
    return <div className="max-w-full">
        <button type="button" disabled={busy} onClick={() => void share()} className="button-secondary disabled:opacity-50"><Share2 className="h-4 w-4" aria-hidden /><span>{t("Paylaş")}</span></button>
        <span role="status" className="mt-2 block text-xs text-muted">{message}</span>
        {fallback && <input readOnly value={fallback} aria-label={t("Paylaşılacak bağlantı")} onFocus={event => event.currentTarget.select()} className="mt-2 w-full min-w-0 rounded border border-line bg-background p-2 text-xs text-ink" />}
    </div>;
}
