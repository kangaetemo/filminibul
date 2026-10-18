import "server-only";
// Server-only REST RPC: deliberately bypass the catalog cache and tags.
export async function analyticsRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Analytics database is not configured");
    const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Analytics RPC failed (${response.status})`);
    return response.json() as Promise<T>;
}

export const SEARCH_PAGE_SIZE = 50;

/**
 * Raporun ham veri başlangıcı → PostgREST filtresi. Gün raporunda "YYYY-MM-DD" (Türkiye gece yarısı),
 * 24 saat raporunda saat dilimli ISO zaman damgası gelir. Başka biçim kabul edilmez.
 */
export function rawStartFilter(rawStart: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) return `gte.${rawStart}T00:00:00+03:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)$/.test(rawStart) && !Number.isNaN(Date.parse(rawStart))) return `gte.${new Date(rawStart).toISOString()}`;
    return null;
}

/** Tarih aralığı seçimi: "24 saat" veya gün sayısı; bağlantılarda ve formlarda korunacak adres parametresi. */
export type AnalyticsRange = { hours: 24; days?: undefined } | { days: number; hours?: undefined };
export const RANGE_DAYS = [7, 30, 90, 365];
export function analyticsRange(params?: Record<string, string | string[] | undefined>): AnalyticsRange {
    if (params?.hours === "24") return { hours: 24 };
    const days = Number(params?.days);
    return { days: RANGE_DAYS.includes(days) ? days : 7 };
}
/** Ham veri başlangıcının okunur hâli: gün raporunda tarih, 24 saat raporunda Türkiye saatiyle tarih + saat. */
export function rawStartLabel(rawStart: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) return rawStart;
    const time = Date.parse(rawStart);
    return Number.isNaN(time) ? rawStart : new Date(time).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
}
export const rangeQuery =(range: AnalyticsRange): Record<string, string> => (range.hours ? { hours: String(range.hours) } : { days: String(range.days) });
export type SearchHistoryFilters = { page: number; term: string; context: string; emptyOnly: boolean };
export type SearchHistoryRow = { created_at: string; query: string | null; context: string; result_count: string };
export type SearchHistory = { rows: SearchHistoryRow[]; total: number; page: number };

export function searchHistoryFilters(params?: Record<string, string | string[] | undefined>): SearchHistoryFilters {
    const text = (key: string) => typeof params?.[key] === "string" ? params[key] as string : "";
    const page = Number(text("search_page"));
    return {
        page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 3000) : 1,
        term: text("search_term").trim().slice(0, 120),
        context: ["search", "vibe", "blend"].includes(text("search_context")) ? text("search_context") : "",
        emptyOnly: text("search_empty") === "1",
    };
}

// Called only after the admin session check. Fetch one page rather than loading
// the whole raw archive or changing the installed reporting RPC.
export async function analyticsSearchHistory(rawStart: string, filters: SearchHistoryFilters): Promise<SearchHistory> {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const since = rawStartFilter(rawStart);
    if (!url || !key || !since) throw new Error("Analytics database is not configured");
    const params = new URLSearchParams({
        select: "created_at,query:data->>query,context:data->>context,result_count:data->>result_count",
        name: "eq.search_performed",
        created_at: since,
        order: "created_at.desc,id.desc",
        limit: String(SEARCH_PAGE_SIZE),
    });
    if (filters.context) params.set("data->>context", `eq.${filters.context}`);
    if (filters.emptyOnly) params.set("data->>result_count", "eq.0");
    if (filters.term) {
        // Literal substring, including punctuation: never treat user input as a
        // regular expression or PostgREST filter syntax. Quoting handles commas.
        const literal = filters.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        params.set("data->>query", `imatch.${JSON.stringify(literal)}`);
    }
    const read = async (page: number): Promise<SearchHistory> => {
        params.set("offset", String((page - 1) * SEARCH_PAGE_SIZE));
        const response = await fetch(`${url}/rest/v1/analytics_events?${params}`, {
            cache: "no-store", signal: AbortSignal.timeout(8000),
            headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
        });
        const count = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
        if ((!response.ok && response.status !== 416) || count === undefined) throw new Error("Search history could not be read");
        return { rows: response.status === 416 ? [] : await response.json() as SearchHistoryRow[], total: Number(count), page };
    };
    const result = await read(filters.page);
    const lastPage = Math.max(1, Math.ceil(result.total / SEARCH_PAGE_SIZE));
    return result.page > lastPage ? read(lastPage) : result;
}

export type RecentFilmView = { created_at: string; film_id: string; path: string };
export async function recentFilmViews(rawStart: string, page = 1): Promise<{ rows: RecentFilmView[]; more: boolean }> {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const since = rawStartFilter(rawStart);
    if (!url || !key || !since) throw new Error("Analytics database is not configured");
    const params = new URLSearchParams({
        select: "created_at,film_id:data->>film_id,path", name: "eq.film_opened",
        created_at: since, order: "created_at.desc,id.desc",
        limit: "51", offset: String((page - 1) * 50),
    });
    const response = await fetch(`${url}/rest/v1/analytics_events?${params}`, {
        cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error("Recent film views could not be read");
    const rows = await response.json() as RecentFilmView[];
    return { rows: rows.slice(0, 50), more: rows.length > 50 };
}
