// Shared allowlist: never accept arbitrary event properties from the browser.
export const EVENT_NAMES = ["page_view", "film_opened", "search_performed", "film_clicked", "recommendation_impression", "recommendation_clicked", "blend_completed", "mood_selected", "trailer_clicked", "platform_clicked"] as const;
export type EventName = typeof EVENT_NAMES[number];
export type EventData = { film_id?: number; source_film_id?: number; second_film_id?: number; rank?: number; result_count?: number; query?: string; search_id?: string; context?: string; page?: number; mood?: string; platform?: string };
export type AnalyticsEvent = { id: string; visit_id: string; name: EventName; path: string; data: EventData };
export type EventBatch = { session_id: string; source: string; events: AnalyticsEvent[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contexts = new Set(["similar", "search", "vibe", "blend", "mood", "list", "person"]);
export function cleanQuery(value: unknown): string | undefined {
    if (typeof value !== "string") return;
    const q = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    // Best-effort redaction, not a guarantee: URLs, email, phone/long digit sequences.
    if (q.length < 2 || /@|https?:|www\.|(?:\d[\s()+.-]*){7,}/i.test(q)) return;
    return q;
}
export function cleanPath(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const p = value.split(/[?#]/)[0];
    if (p === "/" || p === "/ara" || p === "/karistir" || p === "/listeler") return p;
    if (/^\/listeler\/(?:19|20)\d{2}-(?:aksiyon|komedi|animasyon|korku|dram|bilim-kurgu|romantik)-filmleri$/.test(p)) return p;
    const person = p.match(/^\/(oyuncu|yonetmen|senarist)\/(\d+)(?:-[^/]*)?$/);
    if (person && Number.isSafeInteger(Number(person[2])) && Number(person[2]) > 0) return `/${person[1]}/${person[2]}`;
    const film = p.match(/^\/film\/(\d+)(?:-[^/]*)?$/);
    if (film && Number.isSafeInteger(Number(film[1])) && Number(film[1]) > 0) return `/film/${film[1]}`;
    if (/^\/mod\/(korku|komedi|duygusal|gerilim|macera|romantik|dusundurucu|nostalji)$/.test(p)) return p;
    return null;
}
export function parseBatch(input: unknown): EventBatch | null {
    if (!input || typeof input !== "object") return null;
    const b = input as Record<string, unknown>;
    if (typeof b.session_id !== "string" || !uuid.test(b.session_id) || !Array.isArray(b.events) || b.events.length < 1 || b.events.length > 20) return null;
    const events: AnalyticsEvent[] = [];
    for (const raw of b.events) {
        if (!raw || typeof raw !== "object") return null;
        const e = raw as Record<string, unknown>;
        const path = cleanPath(e.path);
        if (!path || typeof e.id !== "string" || !uuid.test(e.id) || typeof e.visit_id !== "string" || !uuid.test(e.visit_id) || !EVENT_NAMES.includes(e.name as EventName)) return null;
        if (!e.data || typeof e.data !== "object" || Array.isArray(e.data)) return null;
        const d = e.data as Record<string, unknown>;
        const data: EventData = {};
        for (const key of ["film_id", "source_film_id", "second_film_id", "rank", "result_count", "page"] as const) {
            if (d[key] === undefined) continue;
            const n = d[key];
            if (typeof n !== "number" || !Number.isSafeInteger(n) || n < (key === "result_count" ? 0 : 1) || n > (key === "rank" ? 100 : key === "page" ? 99999 : key === "result_count" ? 1000 : 2147483647)) return null;
            data[key] = n;
        }
        const query = cleanQuery(d.query);
        if (query) data.query = query;
        if (typeof d.search_id === "string" && uuid.test(d.search_id)) data.search_id = d.search_id;
        if (typeof d.context === "string" && contexts.has(d.context)) data.context = d.context;
        if (typeof d.mood === "string" && /^(korku|komedi|duygusal|gerilim|macera|romantik|dusundurucu|nostalji)$/.test(d.mood)) data.mood = d.mood.slice(0, 20);
        if (d.platform === "justwatch") data.platform = "justwatch";
        const name = e.name as EventName;
        if (["film_opened", "film_clicked", "recommendation_impression", "recommendation_clicked", "trailer_clicked", "platform_clicked"].includes(name) && !data.film_id) return null;
        if (name.startsWith("recommendation_") && (!data.source_film_id || !data.rank || data.context !== "similar")) return null;
        if (name === "search_performed" && (data.result_count === undefined || !data.search_id || !["search", "vibe", "blend"].includes(data.context ?? ""))) return null;
        if (name === "blend_completed" && (!data.source_film_id || !data.second_film_id || data.source_film_id === data.second_film_id || data.result_count === undefined)) return null;
        if (name === "mood_selected" && !data.mood) return null;
        if (name === "platform_clicked" && !data.platform) return null;
        events.push({ id: e.id, visit_id: e.visit_id, name, path, data });
    }
    const source = typeof b.source === "string" && ["google", "bing", "social", "referral", "direct"].includes(b.source) ? b.source : "direct";
    return { session_id: b.session_id, source, events };
}
