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
 */
export async function discoverHiddenGems(language: "tr" | "en" = "tr"): Promise<TMDBMovie[]> {
    if (!API_KEY) {
        console.error("TMDB API key not found");
        return [];
    }

    const fetchPage = async (page: number): Promise<TMDBMoviesResponse> => {
        const url = buildUrl("/discover/movie", {
            language: getTMDBLanguage(language),
            page: page.toString(),
            "vote_average.gte": "7",
            "vote_count.gte": "100",
            sort_by: "vote_average.desc",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
    };

    try {
        // First, fetch page 1 to get total_pages
        const firstPageData = await fetchPage(1);
        const totalPages = Math.min(firstPageData.total_pages, 500); // TMDB max is 500

        let movies = firstPageData.results.filter((movie) => movie.poster_path !== null);

        // If we have enough pages, try a random one for variety
        if (totalPages > 1 && movies.length < 20) {
            const randomPage = Math.floor(Math.random() * Math.min(totalPages, 100)) + 1;
            if (randomPage !== 1) {
                try {
                    const randomPageData = await fetchPage(randomPage);
                    const randomMovies = randomPageData.results.filter((movie) => movie.poster_path !== null);
                    if (randomMovies.length > 0) {
                        movies = randomMovies;
                    }
                } catch {
                    // Fallback to page 1 results if random page fails
                }
            }
        }

        // Shuffle and return up to 20 movies
        return movies.sort(() => Math.random() - 0.5).slice(0, 20);
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
