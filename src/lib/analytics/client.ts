"use client";
import { cleanPath, cleanQuery, type AnalyticsEvent, type EventData, type EventName } from "./schema";
let queue: AnalyticsEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let activeSession: { id: string; source: string; started: number; last: number } | undefined;
let navigation = "";
let visitId = "";
let installed = false;
const seen = new Set<string>();
export function analyticsEnabled() {
    return typeof window !== "undefined" && process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && !location.pathname.startsWith("/admin") && navigator.doNotTrack !== "1" && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl && !navigator.webdriver;
}
function source() {
    try {
        const host = new URL(document.referrer).hostname;
        if (host === location.hostname) return "direct";
        if (/(^|\.)google\./.test(host)) return "google";
        if (/(^|\.)bing\.com$/.test(host)) return "bing";
        if (/(^|\.)(instagram|facebook|tiktok|t|twitter|reddit)\.(com|co)$/.test(host)) return "social";
        return "referral";
    } catch { return "direct"; }
}
function session() {
    const now = Date.now();
    if (!activeSession) {
        try { activeSession = JSON.parse(sessionStorage.getItem("fb_analytics_session") || "null") ?? undefined; } catch { /* Memory fallback when storage is blocked. */ }
    }
    if (!activeSession || typeof activeSession.id !== "string" || !/^[0-9a-f-]{36}$/i.test(activeSession.id) || !Number.isFinite(activeSession.started) || !Number.isFinite(activeSession.last) || now - activeSession.last > 30 * 60000 || now - activeSession.started > 86400000) {
        // Do not attribute queued events from the old session to a new one.
        if (activeSession && queue.length) flush();
        navigation = "";
        activeSession = { id: crypto.randomUUID(), source: source(), started: now, last: now };
    }
    activeSession.last = now;
    try { sessionStorage.setItem("fb_analytics_session", JSON.stringify(activeSession)); } catch { /* No persistence. */ }
    return activeSession;
}
export function currentVisit() {
    const key = location.pathname + location.search;
    if (key !== navigation) { navigation = key; visitId = crypto.randomUUID(); seen.clear(); }
    return visitId;
}
export function flush() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!queue.length || !activeSession) return;
    const events = queue.splice(0, 20);
    const body = JSON.stringify({ session_id: activeSession.id, source: activeSession.source, events });
    // Same-origin only. No IP, referrer URL or user agent is included in the payload.
    try {
        if (!navigator.sendBeacon?.("/api/analytics/event", new Blob([body], { type: "application/json" }))) {
            void fetch("/api/analytics/event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
        }
    } catch { /* Analytics must never interrupt the product. */ }
    if (queue.length) timer = setTimeout(flush, 1000);
}
export function track(name: EventName, data: EventData = {}, unique?: string) {
    if (!analyticsEnabled()) return;
    const path = cleanPath(location.pathname);
    if (!path) return;
    try {
        session();
        const visit_id = currentVisit();
        if (unique && seen.has(unique)) return;
        if (unique) seen.add(unique);
        const query = cleanQuery(data.query);
        queue.push({ id: crypto.randomUUID(), visit_id, name, path, data: { ...data, query } });
        if (!installed) {
            installed = true;
            addEventListener("pagehide", flush);
            document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
        }
        if (queue.length >= 20) flush();
        else if (!timer) timer = setTimeout(flush, 1500);
    } catch { /* crypto/storage can be unavailable; the site still works. */ }
}
