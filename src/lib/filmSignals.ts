"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useSavedFilms, type SavedFilm } from "./savedFilms";
import { createFilmSignalsStore, INITIAL_SIGNALS, type SignalOperation } from "./filmSignalsStore.mjs";
async function cloud(uid: string, method: string, payload?: unknown) {
    const { memberAuth } = await import("./auth/firebase");
    const user = memberAuth().currentUser;
    if (!user || user.uid !== uid) throw Object.assign(new Error("account_changed"), { code: "account_changed" });
    for (let attempt = 0; attempt < 2; attempt++) {
        const token = await user.getIdToken(attempt === 1);
        if (memberAuth().currentUser?.uid !== uid) throw Object.assign(new Error("account_changed"), { code: "account_changed" });
        const response = await fetch("/api/member/film-signals", { method, cache: "no-store", signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(method === "PUT" && { body: JSON.stringify(payload) }) });
        if (response.status === 401 && attempt === 0) continue;
        const data = await response.json();
        if (memberAuth().currentUser?.uid !== uid) throw Object.assign(new Error("account_changed"), { code: "account_changed" });
        if (!response.ok) throw Object.assign(new Error(data.error || "signals_unavailable"), { code: data.error || "signals_unavailable" });
        return data;
    }
}
export const filmSignals = createFilmSignalsStore({ read: key => localStorage.getItem(key), write: (key, value) => localStorage.setItem(key, value), cloud });
let started = false;
function start() {
    if (started) return; started = true;
    window.addEventListener("storage", event => filmSignals.storageChanged(event.key));
    let refreshedAt = 0;
    const refresh = () => { if (document.visibilityState !== "visible" || Date.now() - refreshedAt < 10000) return; refreshedAt = Date.now(); void filmSignals.refresh(); };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
}
export function useFilmSignals() {
    const account = useSavedFilms();
    const state = useSyncExternalStore(filmSignals.subscribe, filmSignals.getSnapshot, () => INITIAL_SIGNALS);
    useEffect(() => { start(); if (account.ready) filmSignals.setMember(account.member); }, [account.ready, account.member]);
    // Do not expose the previous user's records even for a single render.
    const current = account.ready && state.member === account.member ? state : INITIAL_SIGNALS;
    return { ...current, set: (op: SignalOperation, film?: SavedFilm) => { if (account.member !== filmSignals.getSnapshot().member) return false; return filmSignals.set(op, film); }, refresh: filmSignals.refresh };
}
