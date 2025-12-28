// TMDB API Types and Service

export interface TMDBMovie {
    id: number;
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    vote_average: number;
    vote_count?: number;
    release_date: string;
    genre_ids: number[];
}

export interface TMDBMoviesResponse {
    page: number;
    results: TMDBMovie[];
    total_pages: number;
    total_results: number;
}

export interface WatchProvider {
    logo_path: string;
    provider_id: number;
    provider_name: string;
    display_priority: number;
}

export interface WatchProvidersCountry {
    link?: string;
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
}

export interface WatchProvidersResponse {
    id: number;
    results: {
        [countryCode: string]: WatchProvidersCountry;
    };
}

// Video/Trailer types
export interface TMDBVideo {
    iso_639_1: string;
    iso_3166_1: string;
    name: string;
    key: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    published_at: string;
    id: string;
}

export interface TMDBVideosResponse {
    id: number;
    results: TMDBVideo[];
}

// Genre mapping for TMDB genre_ids
export const GENRE_MAP: Record<number, string> = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
};

// TMDB Image base URLs
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const POSTER_SIZE = "w500";
export const LOGO_SIZE = "w92";

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// Detect if the key is a Bearer token (long JWT) or API key (short hex)
const isBearer = API_KEY && API_KEY.length > 40;

/**
 * Get fetch options with proper authentication
 */
function getAuthOptions(): RequestInit {
    if (isBearer) {
        return {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
        };
    }
    return {};
}

/**
 * Build URL with API key if not using Bearer token
 */
function buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(`${BASE_URL}${endpoint}`);

    if (!isBearer && API_KEY) {
        url.searchParams.set("api_key", API_KEY);
    }

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    return url.toString();
}

/**
 * Get language code for TMDB API
 */
export function getTMDBLanguage(lang: "tr" | "en"): string {
    return lang === "tr" ? "tr-TR" : "en-US";
}

/**
 * Fetch popular or now playing movies from TMDB
 */
export async function fetchMovies(
    type: "popular" | "now_playing" = "popular",
    page: number = 1,
    language: "tr" | "en" = "tr"
): Promise<TMDBMovie[]> {
    if (!API_KEY) {
        console.error("TMDB API key not found. Please set NEXT_PUBLIC_TMDB_API_KEY in .env.local");
        return [];
    }

    try {
        const url = buildUrl(`/movie/${type}`, {
            language: getTMDBLanguage(language),
            page: page.toString(),
        });

        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBMoviesResponse = await response.json();

        // Filter out movies without posters
        return data.results.filter((movie) => movie.poster_path !== null);
    } catch (error) {
        console.error("Error fetching movies:", error);
        return [];
    }
}

/**
 * Fetch watch providers for a specific movie in Turkey (TR)
 */
export async function fetchWatchProviders(
    movieId: number
): Promise<WatchProvidersCountry | null> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return null;
    }

    try {
        const url = buildUrl(`/movie/${movieId}/watch/providers`);
        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: WatchProvidersResponse = await response.json();

        // Get Turkey (TR) providers, prioritizing flatrate (streaming)
        const trProviders = data.results?.TR;

        if (!trProviders) {
            return null;
        }

        return trProviders;
    } catch (error) {
        console.error("Error fetching watch providers:", error);
        return null;
    }
}

/**
 * Fetch movie trailer with smart language fallback
 * Priority: Turkish trailer > English trailer
 * Filters: YouTube, type "Trailer"
 * Returns YouTube video key or null
 */
export async function fetchMovieTrailer(movieId: number): Promise<string | null> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return null;
    }

    try {
        const url = buildUrl(`/movie/${movieId}/videos`);
        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBVideosResponse = await response.json();
        const videos = data.results;

        // Filter for YouTube trailers only
        const youtubeTrailers = videos.filter(
            (v) => v.site === "YouTube" && v.type === "Trailer"
        );

        if (youtubeTrailers.length === 0) {
            // Fallback: try any YouTube video (teaser, clip, etc.)
            const anyYouTube = videos.filter((v) => v.site === "YouTube");
            if (anyYouTube.length > 0) {
                // Prefer official ones
                const official = anyYouTube.find((v) => v.official);
                return official?.key || anyYouTube[0].key;
            }
            return null;
        }

        // Priority 1: Turkish trailer
        const turkishTrailer = youtubeTrailers.find((v) => v.iso_639_1 === "tr");
        if (turkishTrailer) {
            return turkishTrailer.key;
        }

        // Priority 2: English trailer
        const englishTrailer = youtubeTrailers.find((v) => v.iso_639_1 === "en");
        if (englishTrailer) {
            return englishTrailer.key;
        }

        // Priority 3: Any available trailer (prefer official)
        const officialTrailer = youtubeTrailers.find((v) => v.official);
        return officialTrailer?.key || youtubeTrailers[0].key;
    } catch (error) {
        console.error("Error fetching movie trailer:", error);
        return null;
    }
}

/**
 * Convert TMDB movie to our app's Movie format
 */
export function convertTMDBMovie(tmdbMovie: TMDBMovie) {
    return {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        posterUrl: tmdbMovie.poster_path
            ? `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${tmdbMovie.poster_path}`
            : "/placeholder-poster.jpg",
        overview: tmdbMovie.overview || "No overview available.",
        rating: Math.round(tmdbMovie.vote_average * 10) / 10,
        releaseYear: tmdbMovie.release_date
            ? new Date(tmdbMovie.release_date).getFullYear()
            : 0,
        genres: tmdbMovie.genre_ids
            .slice(0, 3)
            .map((id) => GENRE_MAP[id] || "Unknown"),
    };
}

/**
 * Get provider logo URL
 */
export function getProviderLogoUrl(logoPath: string): string {
    return `${TMDB_IMAGE_BASE}/${LOGO_SIZE}${logoPath}`;
}

/**
 * Search for movies by query
 */
export async function searchMovie(query: string, language: "tr" | "en" = "tr"): Promise<TMDBMovie[]> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return [];
    }

    if (!query.trim()) {
        return [];
    }

    try {
        const url = buildUrl("/search/movie", {
            query: query.trim(),
            language: getTMDBLanguage(language),
            page: "1",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBMoviesResponse = await response.json();

        // Filter out movies without posters and sort by popularity
        return data.results
            .filter((movie) => movie.poster_path !== null)
            .slice(0, 10);
    } catch (error) {
        console.error("Error searching movies:", error);
        return [];
    }
}

/**
 * Get movie recommendations based on a seed movie ID
 */
export async function getRecommendations(movieId: number, language: "tr" | "en" = "tr"): Promise<TMDBMovie[]> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return [];
    }

    try {
        const url = buildUrl(`/movie/${movieId}/recommendations`, {
            language: getTMDBLanguage(language),
            page: "1",
        });

        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBMoviesResponse = await response.json();

        // Filter out movies without posters
        return data.results.filter((movie) => movie.poster_path !== null).slice(0, 20);
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        return [];
    }
}

/**
 * Discover hidden gems - random high-rated movies (7+)
 * Uses /discover/movie with random page selection for true variety
 */
export async function discoverHiddenGems(language: "tr" | "en" = "tr"): Promise<TMDBMovie[]> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return [];
    }

    // Maximum page limit for randomness (TMDB has many pages, but we limit for consistency)
    const MAX_PAGE = 50;

    // Generate a truly random page number
    const randomPage = Math.floor(Math.random() * MAX_PAGE) + 1;

    try {
        const url = buildUrl("/discover/movie", {
            language: getTMDBLanguage(language),
            page: randomPage.toString(),
            "vote_average.gte": "7",
            "vote_count.gte": "300", // Higher threshold for quality assurance
            sort_by: "vote_average.desc",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBMoviesResponse = await response.json();

        // Filter out movies without posters
        let movies = data.results.filter((movie) => movie.poster_path !== null);

        // If random page returned empty (edge case), fallback to page 1
        if (movies.length === 0) {
            const fallbackUrl = buildUrl("/discover/movie", {
                language: getTMDBLanguage(language),
                page: "1",
                "vote_average.gte": "7",
                "vote_count.gte": "300",
                sort_by: "vote_average.desc",
                include_adult: "false",
            });
            const fallbackResponse = await fetch(fallbackUrl, getAuthOptions());
            if (fallbackResponse.ok) {
                const fallbackData: TMDBMoviesResponse = await fallbackResponse.json();
                movies = fallbackData.results.filter((movie) => movie.poster_path !== null);
            }
        }

        // Shuffle the results locally using Fisher-Yates algorithm for true randomness
        for (let i = movies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [movies[i], movies[j]] = [movies[j], movies[i]];
        }

        // Return up to 20 movies
        return movies.slice(0, 20);
    } catch (error) {
        console.error("Error discovering hidden gems:", error);
        return [];
    }
}

/**
 * Fetch a random Movie of the Day (vote_average > 7.5)
 * Uses random page from top-rated movies for true randomness
 */
export async function fetchMovieOfTheDay(language: "tr" | "en" = "tr"): Promise<TMDBMovie | null> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return null;
    }

    try {
        // Generate random page between 1 and 50 from top rated movies
        const randomPage = Math.floor(Math.random() * 50) + 1;

        const url = buildUrl("/discover/movie", {
            language: getTMDBLanguage(language),
            page: randomPage.toString(),
            "vote_average.gte": "7.5",
            "vote_count.gte": "500", // Ensure reliability with enough votes
            sort_by: "vote_average.desc",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBMoviesResponse = await response.json();

        // Filter movies with posters
        const validMovies = data.results.filter((movie) => movie.poster_path !== null);

        if (validMovies.length === 0) {
            return null;
        }

        // Pick a random movie from the page
        const randomIndex = Math.floor(Math.random() * validMovies.length);
        return validMovies[randomIndex];
    } catch (error) {
        console.error("Error fetching movie of the day:", error);
        return null;
    }
}

/**
 * Turkish genre names from TMDB
 */
export const GENRE_MAP_TR: Record<number, string> = {
    28: "Aksiyon",
    12: "Macera",
    16: "Animasyon",
    35: "Komedi",
    80: "Suç",
    99: "Belgesel",
    18: "Dram",
    10751: "Aile",
    14: "Fantastik",
    36: "Tarih",
    27: "Korku",
    10402: "Müzik",
    9648: "Gizem",
    10749: "Romantik",
    878: "Bilim Kurgu",
    10770: "TV Filmi",
    53: "Gerilim",
    10752: "Savaş",
    37: "Western",
};

/**
 * Convert TMDB movie to our app's Movie format with Turkish genres
 */
export function convertTMDBMovieTR(tmdbMovie: TMDBMovie) {
    return {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        posterUrl: tmdbMovie.poster_path
            ? `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${tmdbMovie.poster_path}`
            : "/placeholder-poster.jpg",
        overview: tmdbMovie.overview || "Özet mevcut değil.",
        rating: Math.round(tmdbMovie.vote_average * 10) / 10,
        releaseYear: tmdbMovie.release_date
            ? new Date(tmdbMovie.release_date).getFullYear()
            : 0,
        genres: tmdbMovie.genre_ids
            .slice(0, 3)
            .map((id) => GENRE_MAP_TR[id] || GENRE_MAP[id] || "Diğer"),
    };
}
