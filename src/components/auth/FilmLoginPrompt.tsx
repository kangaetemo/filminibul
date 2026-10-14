"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { Bookmark, Loader2, X } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { googleProvider, memberAuth } from "@/lib/auth/firebase";
import { createPendingFilmAction, type PendingFilmAction, type FilmActionKind, type ActionStatus } from "@/lib/auth/pendingFilmAction.mjs";
import { watchlist, useSavedFilms, type SavedFilm } from "@/lib/savedFilms";
import { filmSignals, useFilmSignals } from "@/lib/filmSignals";

const PromptContext = createContext<(film: SavedFilm, kind: FilmActionKind) => void>(() => {});
export const useFilmLoginPrompt = () => useContext(PromptContext);

export function FilmLoginPromptProvider({ children }: { children: React.ReactNode }) {
    const { language, t } = useLanguage();
    const saved = useSavedFilms(), signals = useFilmSignals();
    const coordinator = useRef(createPendingFilmAction());
    const [request, setRequest] = useState<PendingFilmAction | null>(null);
    const [status, setStatus] = useState<ActionStatus>("login");
    const [signingIn, setSigningIn] = useState(false);
    const [failure, setFailure] = useState("");
    const [notice, setNotice] = useState("");
    const popupBusy = useRef(false);
    const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
    const google = useRef<HTMLButtonElement>(null);
    const titleId = useId(), descriptionId = useId();
    const pathname = usePathname();
    const dismiss = () => { coordinator.current.cancel(); setRequest(null); setFailure(""); setSigningIn(false); };
    useEffect(() => { coordinator.current.cancel(); setRequest(null); setFailure(""); }, [pathname]);
    useEffect(() => () => coordinator.current.cancel(), []);
    useEffect(() => {
        if (!request) return;
        const element = dialog.current;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        element?.showModal(); google.current?.focus();
        return () => { element?.close(); document.body.style.overflow = previous; if (opener.current?.isConnected) opener.current.focus(); };
    }, [request]);
    useEffect(() => {
        if (!request) return;
        const next = coordinator.current.advance(request, watchlist.getSnapshot(), filmSignals.getSnapshot(), { save: saved.toggle, signal: signals.set });
        setStatus(next);
        if (next === "done") {
            setNotice(request.kind === "save" ? "Film hesabına kaydedildi." : "Tercihin hesabına kaydedildi.");
            coordinator.current.cancel(); setRequest(null);
        } else if (next === "account_changed") {
            coordinator.current.cancel(); setRequest(null); setNotice("Hesap değişti. İşlemi tekrar seçebilirsin.");
        }
    }, [request, saved, signals]);
    useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4500); return () => window.clearTimeout(timer); }, [notice]);
    const open = (film: SavedFilm, kind: FilmActionKind) => {
        if (request || popupBusy.current) return;
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setNotice(""); setFailure(""); setStatus("login"); setSigningIn(false);
        setRequest(coordinator.current.request(film, kind));
    };
    const login = async () => {
        if (!request || popupBusy.current) return;
        popupBusy.current = true; setSigningIn(true); setFailure("");
        try {
            // Called directly from the user gesture; no async import before popup.
            const result = await signInWithPopup(memberAuth(), googleProvider());
            if (coordinator.current.authenticate(request, result.user.uid)) setStatus("waiting");
        } catch (error) {
            const code = (error as { code?: string }).code;
            if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
                setFailure(code === "auth/popup-blocked" ? "Giriş penceresi engellendi. Tarayıcında açılır pencerelere izin verip yeniden dene." : "Giriş yapılamadı. Yeniden deneyebilirsin.");
            }
        } finally { popupBusy.current = false; setSigningIn(false); }
    };
    const heading = request?.kind === "save" ? "Filmi kaydetmek için giriş yap" : "Tercihini kaydetmek için giriş yap";
    const waiting = signingIn || status === "waiting";
    return <PromptContext.Provider value={open}>
        {children}
        {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink shadow-lg">{t(notice)}</div>}
        {request && createPortal(<dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} className="member-prompt fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-end justify-center border-0 bg-black/50 p-0 text-ink sm:items-center sm:p-5" onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
            <section className="member-prompt-panel max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-card p-5 shadow-glow-card sm:rounded-2xl sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><Bookmark className="h-6 w-6 text-accent-ink" aria-hidden /><h2 id={titleId} className="mt-3 text-xl font-extrabold">{t(heading)}</h2></div><button type="button" onClick={dismiss} aria-label={t("Giriş penceresini kapat")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-card-hover"><X className="h-5 w-5" aria-hidden /></button></div>
                <p className="mt-2 break-words text-sm font-bold">{language === "en" ? request.film.titleEn || request.film.title : request.film.title}</p>
                <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">{t("Kaydettiklerin ve tercihlerin cihazlarında eşitlensin, sana özel öneriler sunalım.")}</p>
                <button ref={google} type="button" disabled={waiting || !!request.uid} className="button-primary mt-5 w-full" onClick={() => void login()}>{waiting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <span className="text-lg font-extrabold" aria-hidden>G</span>}{t(signingIn ? "Giriş yapılıyor…" : status === "error" ? "Giriş tamamlandı" : request.uid ? "İşlemin tamamlanıyor…" : "Google ile devam et")}</button>
                {failure && <p role="alert" className="mt-3 text-sm text-muted">{t(failure)}</p>}
                {status === "error" && <div role="alert" className="mt-3 text-sm text-muted"><p>{t("Giriş tamamlandı ama hesabına ulaşamadık. İşlemini tamamlamak için yeniden dene.")}</p><button type="button" className="text-link mt-1" onClick={() => void (request.kind === "save" ? saved.refresh() : signals.refresh())}>{t("Tekrar dene")}</button></div>}
                <p className="mt-3 text-xs leading-relaxed text-muted">{t("Girişten sonra seçtiğin işlemi burada tamamlayacağız.")}</p>
            </section>
        </dialog>, document.body)}
    </PromptContext.Provider>;
}
