"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";

import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { useSavedFilms, type SavedFilm } from "@/lib/savedFilms";

export default function SaveButton({ film, compact = false }: { film: SavedFilm; compact?: boolean }) {
    const { language, t } = useLanguage();
    const title = language === "en" ? film.titleEn || film.title : film.title;
    const { films, toggle } = useSavedFilms();
    const saved = films.some(item => item.id === film.id);
    const [message, setMessage] = useState("");
    return <>
        <button type="button" aria-pressed={saved} aria-label={`${title}: ${t(saved ? "Kaydedilenlerden çıkar" : "Sonra izlemek için kaydet")}`} title={t(saved ? "Kaydedilenlerden çıkar" : "Sonra izlemek için kaydet")} onClick={() => {
            const result = toggle(film);
            setMessage(result.persistent ? `${title} ${language === "en" ? (result.saved ? "saved" : "removed from your list") : (result.saved ? "kaydedildi" : "listenden çıkarıldı")}.` : (language === "en" ? "Browser storage is unavailable; this choice will only last for this session." : "Tarayıcı depolaması kullanılamıyor; seçimin yalnızca bu oturumda tutulacak."));
        }} className={compact ? `absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 shadow-sm transition-colors ${saved ? "bg-accent text-button-ink" : "bg-black/60 text-white hover:bg-black/80"}` : `button-secondary ${saved ? "border-accent-ink/40 bg-accent/30" : ""}`}>
            {saved ? <Check className="h-5 w-5" aria-hidden /> : <Bookmark className="h-5 w-5" aria-hidden />}{!compact && (saved ? t("Kaydedildi") : t("Sonra izle"))}
        </button>
        <span role="status" className="saved-status"><T text={message} /></span>
    </>;
}
