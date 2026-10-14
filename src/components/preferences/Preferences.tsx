"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createThemeTransition } from "@/lib/themeTransition.mjs";
import Link from "next/link";
import { Moon, Sun, Languages, UserRound } from "lucide-react";
import english from "@/lib/i18n/en.json";
import type { FilmDTO } from "@/lib/recommend/types";

type Language = "tr" | "en";
type Theme = "light" | "dark";
const dictionary: Record<string, string> = english;
const Preferences = createContext({ language: "tr" as Language, theme: "light" as Theme, setLanguage: (_: Language) => {}, setTheme: (_: Theme) => {} });

export function translate(text: string, language: Language): string {
    if (language === "tr") return text;
    if (dictionary[text]) return dictionary[text];
    return text;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [language, updateLanguage] = useState<Language>("tr");
    const [theme, updateTheme] = useState<Theme>("light");
    const transition = useRef<ReturnType<typeof createThemeTransition> | null>(null);
    useEffect(() => {
        updateTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
        try {
            const lang = new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("fb_language");
            if (lang === "en") { updateLanguage("en"); document.documentElement.lang = "en"; }
        } catch { /* Preferences still work for this visit if storage is blocked. */ }
    }, []);
    useEffect(() => () => transition.current?.dispose(), []);
    const setLanguage = (value: Language) => {
        updateLanguage(value); document.documentElement.lang = value;
        try { localStorage.setItem("fb_language", value); } catch {}
        const url = new URL(window.location.href);
        if (value === "en") url.searchParams.set("lang", "en"); else url.searchParams.delete("lang");
        window.history.replaceState(window.history.state, "", url);
    };
    const setTheme = (value: Theme) => {
        transition.current ??= createThemeTransition(document, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        // Update the button immediately so rapid opposite clicks use the latest intent.
        flushSync(() => updateTheme(value));
        transition.current.change(() => {
            document.documentElement.dataset.theme = value;
        });
        try { localStorage.setItem("fb_theme", value); } catch {}
    };
    return <Preferences.Provider value={{ language, theme, setLanguage, setTheme }}>{children}</Preferences.Provider>;
}

export function useLanguage() {
    const prefs = useContext(Preferences);
    return { ...prefs, t: (text: string) => translate(text, prefs.language) };
}

export function T({ text }: { text: string }) { const { t } = useLanguage(); return <>{t(text)}</>; }

export function FilmText({ film, field }: { film: FilmDTO; field: "title" | "overview" | "genres" | "genresShort" }) {
    const { language, t } = useLanguage();
    const text = field === "title" ? (language === "en" ? film.titleEn || film.title : film.title)
        : field === "overview" ? (language === "en" ? film.overviewEn || null : film.overview)
        : (field === "genresShort" ? film.genres.slice(0, 2) : film.genres).map(t).join(" · ");
    if (!text && field === "overview") return <span className="text-muted">{language === "en" ? "A synopsis isn't available yet." : "Türkçe özet henüz bulunmuyor."}</span>;
    return <>{text}</>;
}

export default function PreferenceControls() {
    const { language, theme, setLanguage, setTheme } = useLanguage();
    return <div className="flex items-center gap-1">
        <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink hover:bg-card-hover" aria-label={language === "en" ? (theme === "dark" ? "Switch to light theme" : "Switch to dark theme") : (theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç")}>
            {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>
        <button type="button" onClick={() => setLanguage(language === "tr" ? "en" : "tr")} className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-ink hover:bg-card-hover" aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}>
            <Languages className="hidden sm:block h-4 w-4" aria-hidden /><span>{language.toUpperCase()}</span>
        </button>
        <Link href="/hesap" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink hover:bg-card-hover" aria-label={language === "en" ? "My account" : "Hesabım"}><UserRound className="h-5 w-5" aria-hidden /></Link>
    </div>;
}

export function FilmVotes({ count }: { count: number }) {
    const { language } = useLanguage();
    return <> · {count.toLocaleString(language === "en" ? "en-US" : "tr-TR")} {language === "en" ? "votes" : "oy"}</>;
}
