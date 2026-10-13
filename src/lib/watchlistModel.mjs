export const GUEST_KEY = "filminibul:saved:v1";
export const MAX_SAVED_FILMS = 1000;

export function savedFilm(value) {
    if (!value || typeof value !== "object" || !Number.isSafeInteger(value.id) || value.id <= 0
        || typeof value.title !== "string" || !value.title.trim() || value.title.length > 400
        || (value.titleEn !== undefined && (typeof value.titleEn !== "string" || value.titleEn.length > 400))
        || (value.year !== null && (!Number.isInteger(value.year) || value.year < 1800 || value.year > 2200))
        || (value.rating !== null && (!Number.isFinite(value.rating) || value.rating < 0 || value.rating > 10))
        || !Array.isArray(value.genres) || value.genres.length > 20
        || value.genres.some(g => typeof g !== "string" || g.length > 80)) return null;
    if (value.posterUrl !== null) {
        try {
            const url = new URL(value.posterUrl);
            if (typeof value.posterUrl !== "string" || value.posterUrl.length > 500 || url.protocol !== "https:"
                || url.hostname !== "image.tmdb.org" || url.port || url.username || url.password
                || !url.pathname.startsWith("/t/p/") || url.search || url.hash) return null;
        } catch { return null; }
    }
    const film = { id: value.id, title: value.title.trim(), ...(value.titleEn !== undefined && { titleEn: value.titleEn }), year: value.year, rating: value.rating, genres: [...value.genres], posterUrl: value.posterUrl };
    return new TextEncoder().encode(JSON.stringify(film)).length <= 4096 ? film : null;
}

export function parseSavedFilms(raw) {
    try {
        const values = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(values)) return [];
        const seen = new Set();
        return values.map(savedFilm).filter(film => film && !seen.has(film.id) && seen.add(film.id));
    } catch { return []; }
}

export const accountKey = uid => `filminibul:watchlist:v2:${uid}`;
export const pendingKey = uid => `filminibul:watchlist-pending:v2:${uid}`;
