"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { T, useLanguage } from "@/components/preferences/Preferences";
import { useFilmSignals } from "@/lib/filmSignals";
import type { SavedFilm } from "@/lib/savedFilms";
export default function FilmFeedback({ film }: { film: SavedFilm }) {
    const router = useRouter();
    const { language, t } = useLanguage();
    const { records, member, ready, phase, pendingIds, persistent, error, set, refresh } = useFilmSignals();
    const login = `/hesap?lang=${language}`;
    const signal = member ? records.find(r => r.id === film.id) : undefined;
    const watched = !!signal?.watched, reaction = signal?.reaction || null;
    const pending = pendingIds.includes(film.id);
    const style = (active: boolean) => `button-secondary w-full disabled:opacity-50 ${active ? "border-accent-ink/40 bg-accent/20 text-ink" : "border-line text-muted hover:text-ink"}`;
    return <div className="mt-4">
        <div className="film-actions grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" aria-label={t("Filmle ilgili tercihlerin")}>
            <button type="button" disabled={!ready || phase === "loading"} aria-pressed={watched} className={style(watched)} onClick={() => { if (!ready) return; if (!member) { router.push(login); return; } set({ id: film.id, field: "watched", value: !watched }, film); }}><Eye className="h-4 w-4" aria-hidden /><T text="İzledim" /></button>
            <button type="button" disabled={!ready || phase === "loading"} aria-pressed={reaction === "liked"} className={style(reaction === "liked")} onClick={() => { if (!ready) return; if (!member) { router.push(login); return; } set({ id: film.id, field: "reaction", value: reaction === "liked" ? null : "liked" }, film); }}><ThumbsUp className="h-4 w-4" aria-hidden /><T text="Beğendim" /></button>
            <button type="button" disabled={!ready || phase === "loading"} aria-pressed={reaction === "disliked"} className={style(reaction === "disliked")} onClick={() => { if (!ready) return; if (!member) { router.push(login); return; } set({ id: film.id, field: "reaction", value: reaction === "disliked" ? null : "disliked" }, film); }}><ThumbsDown className="h-4 w-4" aria-hidden /><T text="Bana göre değil" /></button>
        </div>
        {!member && ready && <p className="mt-2 text-xs text-muted"><Link href={login} className="underline underline-offset-4"><T text="Tercihlerini kaydetmek için giriş yap." /></Link></p>}
        <p role="status" className="mt-2 text-xs text-muted">{!persistent ? t("Tercihlerin bu cihazda kalıcı olarak saklanamıyor; buluta ulaşmayan değişiklikler kaybolabilir.") : phase === "error" ? t(error === "signals_limit" ? "En fazla 1.000 film için tercih kaydedebilirsin." : "Tercihlerini eşitleyemedik. Değişikliklerin bu cihazda bekliyor.") : pending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden /><T text="Tercihlerin eşitleniyor…" /></span> : member && (watched || reaction) ? t("Tercihlerin hesabına kaydedildi. Seçili düğmeye tekrar basarak geri alabilirsin.") : ""}</p>
        {phase === "error" && <button type="button" className="min-h-11 text-xs text-muted underline" onClick={() => void refresh()}><T text="Tekrar dene" /></button>}
    </div>;
}
