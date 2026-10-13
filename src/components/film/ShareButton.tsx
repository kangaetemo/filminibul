"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Copy, Instagram, MessageCircle, Send, X, ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { shareUrl, socialShareUrls } from "@/lib/discoveryUrl.mjs";

type Result = { kind: "copied" | "instagram" | "failed" | "native" | "cancelled" | "native_failed"; url: string };
export default function ShareButton({ path, pair, title, titleEn }: { path: string; pair?: [number, number]; title: string; titleEn?: string }) {
    const { language, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [nativeSupported, setNativeSupported] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    const [busy, setBusy] = useState(false);
    const opener = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDivElement>(null);
    const heading = useId();
    const filmTitle = language === "en" ? titleEn || title : title;
    const links = socialShareUrls(url, filmTitle);
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        close.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key !== "Tab") return;
            const controls = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input");
            const first = controls?.[0], last = controls?.[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); opener.current?.focus(); };
    }, [open]);
    const copy = async (instagram = false) => {
        setBusy(true); setResult(null);
        try { await navigator.clipboard.writeText(url); setResult({ kind: instagram ? "instagram" : "copied", url }); }
        catch { setResult({ kind: "failed", url }); }
        finally { setBusy(false); }
    };
    const nativeShare = async () => {
        setBusy(true); setResult(null);
        try { await navigator.share({ title: filmTitle, url }); setResult({ kind: "native", url }); }
        catch (error) { setResult({ kind: error instanceof Error && error.name === "AbortError" ? "cancelled" : "native_failed", url }); }
        finally { setBusy(false); }
    };
    const row = "flex min-h-12 min-w-0 items-center gap-3 rounded-lg border border-line bg-background px-4 py-3 text-sm font-bold text-ink hover:border-accent-ink/50 disabled:opacity-50";
    const messages = {
        copied: "Bağlantı kopyalandı.",
        instagram: "Bağlantı kopyalandı. Instagram’da mesajına veya hikâyenin bağlantı alanına yapıştırabilirsin.",
        failed: "Bağlantıyı kopyalayamadık. Aşağıdaki adresi seçip kopyalayabilirsin.",
        native: "Paylaşım menüsü açıldı.",
        cancelled: "Paylaşım iptal edildi.",
        native_failed: "Uygulama paylaşımını açamadık. Bağlantıyı kopyalayabilirsin.",
    };
    return <>
        <button ref={opener} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
            setUrl(shareUrl(path, window.location.search, language, pair));
            setNativeSupported(typeof navigator.share === "function");
            setResult(null); setOpen(true);
        }} className="button-secondary w-full"><Share2 className="h-4 w-4 shrink-0" aria-hidden /><span>{t("Paylaş")}</span></button>
        {open && createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
            <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={heading} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-glow-card sm:p-6" onClick={event => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4"><div><h2 id={heading} className="text-xl font-extrabold"><span>{t("Nerede paylaşalım?")}</span></h2><p className="mt-2 break-words text-sm text-muted">{filmTitle}</p></div><button ref={close} type="button" onClick={() => setOpen(false)} aria-label={t("Paylaşım seçeneklerini kapat")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-card-hover"><X className="h-5 w-5" aria-hidden /></button></div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <a href={links.x} target="_blank" rel="noopener noreferrer" className={row}><span className="w-5 text-center text-lg" aria-hidden>𝕏</span><span>X</span></a>
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={row}><MessageCircle className="h-5 w-5 shrink-0" aria-hidden /><span>WhatsApp</span></a>
                    <a href={links.telegram} target="_blank" rel="noopener noreferrer" className={row}><Send className="h-5 w-5 shrink-0" aria-hidden /><span>Telegram</span></a>
                    <button type="button" disabled={busy} onClick={() => void copy(true)} className={row}><Instagram className="h-5 w-5 shrink-0" aria-hidden /><span>Instagram</span></button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted"><span>{t("Instagram için bağlantıyı kopyalayıp mesajına veya hikâyenin bağlantı alanına yapıştırabilirsin.")}</span></p>
                <div className="mt-4 grid gap-2"><button type="button" disabled={busy} onClick={() => void copy()} className={row}><Copy className="h-5 w-5 shrink-0" aria-hidden /><span>{t("Bağlantıyı kopyala")}</span></button>
                    {nativeSupported && <button type="button" disabled={busy} onClick={() => void nativeShare()} className={row}><Share2 className="h-5 w-5 shrink-0" aria-hidden /><span>{t("Diğer uygulamalar")}</span></button>}
                </div>
                {result && <div className="mt-4 rounded-lg border border-accent-ink/25 bg-accent/10 p-3 text-sm"><p role="status">{t(messages[result.kind])}</p>
                    {result.kind === "instagram" && <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold underline"><span>{t("Instagram’ı aç")}</span><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                    {result.kind === "failed" && <input readOnly value={result.url} aria-label={t("Paylaşılacak bağlantı")} onFocus={event => event.currentTarget.select()} className="mt-2 w-full min-w-0 rounded border border-line bg-background p-2 text-xs text-ink" />}
                </div>}
            </div>
        </div>, document.body)}
    </>;
}
