"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { FilmDTO } from "@/lib/recommend/types";
import { createWatchlistStore, INITIAL_WATCHLIST } from "./watchlistStore.mjs";

export type SavedFilm = Pick<FilmDTO, "id" | "title" | "titleEn" | "year" | "posterUrl" | "rating" | "genres">;

async function cloud(uid: string, method: string, payload?: unknown) {
    const { memberAuth } = await import("./auth/firebase");
    const user = memberAuth().currentUser;
    if (!user || user.uid !== uid) throw Object.assign(new Error("account_changed"), { code: "account_changed" });
    for (let attempt = 0; attempt < 2; attempt++) {
        const token = await user.getIdToken(attempt === 1);
        if (memberAuth().currentUser?.uid !== uid) throw Object.assign(new Error("account_changed"), { code: "account_changed" });
        const response = await fetch(`/api/member/watchlist${method === "DELETE" ? `?id=${payload}` : ""}`, {
            method, cache: "no-store", signal: AbortSignal.timeout(30000),
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            ...(method === "PUT" && { body: JSON.stringify(payload) }),
            ...(method === "POST" && { body: JSON.stringify({ films: payload }) }),
        });
        if (response.status === 401 && attempt === 0) continue;
        const data = await response.json();
        if (!response.ok) throw Object.assign(new Error(data.error || "watchlist_unavailable"), { code: data.error || "watchlist_unavailable" });
        return data;
    }
}

export const watchlist = createWatchlistStore({ read: key => localStorage.getItem(key), write: (key, value) => localStorage.setItem(key, value), cloud });
let started = false;
async function start() {
    if (started) return;
    started = true;
    try {
        // One lazy auth subscription and cloud queue for all film cards.
        const [{ memberAuth }, { onAuthStateChanged }] = await Promise.all([import("./auth/firebase"), import("firebase/auth")]);
        onAuthStateChanged(memberAuth(), user => watchlist.setMember(user?.uid || null), () => watchlist.setMember(null));
    } catch { watchlist.setMember(null); }
    window.addEventListener("storage", event => watchlist.storageChanged(event.key));
    let refreshedAt = 0;
    const refresh = () => {
        if (document.visibilityState !== "visible" || Date.now() - refreshedAt < 10000) return;
        refreshedAt = Date.now(); void watchlist.refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
}

export function useSavedFilms() {
    const state = useSyncExternalStore(watchlist.subscribe, watchlist.getSnapshot, () => INITIAL_WATCHLIST);
    useEffect(() => { void start(); }, []);
    return { ...state, toggle: watchlist.toggle, refresh: watchlist.refresh, importLocal: watchlist.importLocal };
}
