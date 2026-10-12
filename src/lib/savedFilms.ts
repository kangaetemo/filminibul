"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { FilmDTO } from "@/lib/recommend/types";

export type SavedFilm = Pick<FilmDTO, "id" | "title" | "titleEn" | "year" | "posterUrl" | "rating" | "genres">;
const KEY = "filminibul:saved:v1";
const EVENT = "filminibul:saved-changed";
let memory = "[]";
let memoryOnly = false;

function snapshot() {
    if (memoryOnly) return memory;
    try { return localStorage.getItem(KEY) ?? "[]"; } catch { return memory; }
}
function subscribe(callback: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) { memoryOnly = false; memory = event.newValue ?? "[]"; callback(); } };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, callback);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, callback); };
}
function parse(raw: string): SavedFilm[] {
    try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        return value.filter((item): item is SavedFilm => !!item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.title === "string" && (item.titleEn === undefined || typeof item.titleEn === "string") && (item.year === null || Number.isFinite(item.year)) && (item.rating === null || Number.isFinite(item.rating)) && (item.posterUrl === null || (typeof item.posterUrl === "string" && item.posterUrl.startsWith("https://image.tmdb.org/"))) && Array.isArray(item.genres) && item.genres.every((g: unknown) => typeof g === "string"));
    } catch { return []; }
}
const serverSnapshot = () => "[]";

export function useSavedFilms() {
    const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const films = useMemo(() => parse(raw), [raw]);
    const toggle = (film: SavedFilm) => {
        const current = parse(snapshot());
        const saved = !current.some(item => item.id === film.id);
        const next = saved ? [{ id: film.id, title: film.title, ...(typeof film.titleEn === "string" && { titleEn: film.titleEn }), year: film.year, posterUrl: film.posterUrl, rating: film.rating, genres: film.genres }, ...current] : current.filter(item => item.id !== film.id);
        const nextRaw = JSON.stringify(next);
        let persistent = true;
        try { localStorage.setItem(KEY, nextRaw); } catch { persistent = false; }
        memory = nextRaw;
        memoryOnly = !persistent;
        window.dispatchEvent(new Event(EVENT));
        return { saved, persistent };
    };
    return { films, toggle };
}
