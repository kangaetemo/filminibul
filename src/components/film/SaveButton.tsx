"use client";

import { useState } from "react";
import { Bookmark, Check, CloudOff, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { useSavedFilms, type SavedFilm } from "@/lib/savedFilms";

export default function SaveButton({ film, compact = false }: { film: SavedFilm; compact?: boolean }) {
    const { language, t } = useLanguage();
    const title = language === "en" ? film.titleEn || film.title : film.title;
    const { films, toggle, ready, member, phase, pendingIds, persistent } = useSavedFilms();
    const saved = films.some(item => item.id === film.id);
    const pending = pendingIds.includes(film.id);
    const [action, setAction] = useState<{ member: string | null; saved: boolean } | null>(null);
    const failed = pending && phase === "error";
    const label = pending ? t(failed ? "Eşitleme bekliyor" : "Eşitleniyor…") : t(saved ? "Kaydedildi" : "Kaydet");
    const message = action && action.member === member ? (!persistent ? t("Tarayıcı depolaması kullanılamıyor. Henüz buluta ulaşmayan değişiklikler bu oturum kapandığında kaybolabilir.") : pending ? t(failed ? "Buluta bağlanamadık. Değişikliklerin bu cihazda bekliyor; yeniden deneyebilirsin." : "Listen eşitleniyor…") : member ? t("Değişikliğin hesabına kaydedildi.") : t(action.saved ? "Film bu tarayıcıdaki listene kaydedildi." : "Film bu tarayıcıdaki listenden çıkarıldı.")) : "";
    return <>
        <button type="button" disabled={!ready} aria-pressed={saved} aria-label={`${title}: ${t(saved ? "Kaydedilenlerden çıkar" : "Kaydet")}${pending ? ` · ${label}` : ""}`} title={pending ? label : t(saved ? "Kaydedilenlerden çıkar" : "Kaydet")} onClick={() => {
            const result = toggle(film);
            if (!result.blocked) setAction({ member, saved: result.saved });
        }} className={compact ? `absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 shadow-sm transition-colors disabled:opacity-50 ${saved ? "bg-accent text-button-ink" : "bg-black/60 text-white hover:bg-black/80"}` : `button-secondary disabled:opacity-50 ${saved ? "border-accent-ink/40 bg-accent/30" : ""}`}>
            {failed ? <CloudOff className="h-5 w-5" aria-hidden /> : pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : saved ? <Check className="h-5 w-5" aria-hidden /> : <Bookmark className="h-5 w-5" aria-hidden />}{!compact && label}
        </button>
        <span role="status" className={!compact && failed ? "mt-2 block max-w-sm text-xs text-muted" : "saved-status"}>{message}</span>
    </>;
}
