// TMDB erişimi — SADECE sunucu tarafı. TMDB_API_KEY (NEXT_PUBLIC değil) tarayıcıya gitmez.
// v3 anahtarı (kısa) veya v4 Read Access Token (uzun) desteklenir.

const API_KEY = process.env.TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export interface TmdbSearchResult {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    release_date?: string;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
    popularity: number;
}

export interface TmdbMovieDetails extends TmdbSearchResult {
    backdrop_path: string | null;
    genres: { id: number; name: string }[];
    runtime: number | null;
    belongs_to_collection: { id: number; name: string } | null;
    credits?: {
        cast: { name: string; order: number }[];
        crew: { name: string; job: string }[];
    };
}

/**
 * Geçici ağ hatalarında (ECONNRESET vb. "fetch failed") ve 429/5xx'te kısa beklemelerle tekrar dener.
 * TMDB/OpenAI bağlantısı ara sıra sıfırlanabiliyor; tek hata yüzünden istek başarısız olmasın.
 */
export async function fetchWithRetry(input: URL | string, init: RequestInit & { next?: { revalidate?: number } }, attempts = 3): Promise<Response> {
    for (let i = 1; ; i++) {
        try {
            const res = await fetch(input, init);
            if ((res.status === 429 || res.status >= 500) && i < attempts) {
                await new Promise((r) => setTimeout(r, 400 * 2 ** i));
                continue;
            }
            return res;
        } catch (err) {
            if (i >= attempts) throw err;
            await new Promise((r) => setTimeout(r, 400 * 2 ** i));
        }
    }
}

export async function tmdbGet<T>(path: string, params: Record<string, string> = {}, revalidateSeconds = 3600): Promise<T | null> {
    if (!API_KEY) throw new Error("TMDB_API_KEY tanımlı değil (.env.local)");
    const isBearer = API_KEY.length > 40;
    const url = new URL(`${BASE}${path}`);
    if (!isBearer) url.searchParams.set("api_key", API_KEY);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetchWithRetry(url, {
        headers: isBearer ? { Authorization: `Bearer ${API_KEY}` } : {},
        next: { revalidate: revalidateSeconds },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
    return res.json() as Promise<T>;
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
    const data = await tmdbGet<{ results: TmdbSearchResult[] }>(
        "/search/movie",
        { query, language: "tr-TR", include_adult: "false", page: "1" },
        600
    );
    return data?.results ?? [];
}

/** tr-TR ile detay; Türkçe özet boşsa İngilizce'ye düşer. */
export async function getMovieDetails(id: number): Promise<TmdbMovieDetails | null> {
    const tr = await tmdbGet<TmdbMovieDetails>(`/movie/${id}`, { language: "tr-TR", append_to_response: "credits" });
    if (!tr) return null;
    if (!tr.overview) {
        const en = await tmdbGet<TmdbMovieDetails>(`/movie/${id}`, { language: "en-US" });
        if (en?.overview) tr.overview = en.overview;
    }
    return tr;
}
