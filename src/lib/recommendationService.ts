/**
 * Advanced Recommendation Service
 * Combines genre preferences, TMDB recommendations, and discovery
 */

import { Movie } from "@/data/mockData";
import { GenreStats } from "@/hooks/useUserStats";
import {
    TMDBMovie,
    getRecommendations,
    GENRE_MAP,
    GENRE_MAP_TR,
    GENRE_EN_TO_TR,
    getTMDBLanguage,
    TMDB_IMAGE_BASE,
    POSTER_SIZE,
    fetchMovieDetails,
    fetchMovieKeywords,
    discoverByKeywords,
    getMovieKeywordIds,
    fetchMovieDNA,
    fetchMovieKeywordsWithNames,
    Keyword,
} from "./tmdb";

// Reverse genre map: name -> id
const GENRE_NAME_TO_ID: Record<string, number> = Object.entries(GENRE_MAP).reduce(
    (acc, [id, name]) => ({ ...acc, [name]: parseInt(id) }),
    {}
);

const GENRE_NAME_TO_ID_TR: Record<string, number> = Object.entries(GENRE_MAP_TR).reduce(
    (acc, [id, name]) => ({ ...acc, [name]: parseInt(id) }),
    {}
);

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const isBearer = API_KEY && API_KEY.length > 40;

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
 * Discover movies by specific genres (user preferences)
 */
async function discoverByGenres(
    genreIds: number[],
    language: "tr" | "en" = "tr",
    page: number = 1
): Promise<TMDBMovie[]> {
    if (!API_KEY || genreIds.length === 0) return [];

    try {
        const url = buildUrl("/discover/movie", {
            language: getTMDBLanguage(language),
            page: page.toString(),
            with_genres: genreIds.join(","),
            "vote_average.gte": "6.5",
            "vote_count.gte": "200",
            sort_by: "popularity.desc",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());
        if (!response.ok) return [];

        const data = await response.json();
        return data.results.filter((m: TMDBMovie) => m.poster_path !== null);
    } catch {
        return [];
    }
}

/**
 * Discover high-rated movies for variety
 */
async function discoverHighRated(
    language: "tr" | "en" = "tr"
): Promise<TMDBMovie[]> {
    if (!API_KEY) return [];

    const randomPage = Math.floor(Math.random() * 20) + 1;

    try {
        const url = buildUrl("/discover/movie", {
            language: getTMDBLanguage(language),
            page: randomPage.toString(),
            "vote_average.gte": "7.5",
            "vote_count.gte": "500",
            sort_by: "vote_average.desc",
            include_adult: "false",
        });

        const response = await fetch(url, getAuthOptions());
        if (!response.ok) return [];

        const data = await response.json();
        return data.results.filter((m: TMDBMovie) => m.poster_path !== null);
    } catch {
        return [];
    }
}

/**
 * Convert TMDB movie to our Movie format with recommendation reason
 */
function convertWithReason(
    tmdbMovie: TMDBMovie,
    reason: string,
    language: "tr" | "en"
): Movie {
    const genreMap = language === "tr" ? GENRE_MAP_TR : GENRE_MAP;
    return {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        posterUrl: tmdbMovie.poster_path
            ? `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${tmdbMovie.poster_path}`
            : "/placeholder-poster.jpg",
        overview: tmdbMovie.overview || (language === "tr" ? "Özet mevcut değil." : "No overview available."),
        rating: Math.round(tmdbMovie.vote_average * 10) / 10,
        releaseYear: tmdbMovie.release_date
            ? new Date(tmdbMovie.release_date).getFullYear()
            : 0,
        genres: tmdbMovie.genre_ids
            .slice(0, 3)
            .map((id) => genreMap[id] || GENRE_MAP[id] || "Unknown"),
        recommendationReason: reason,
    };
}

/**
 * Shuffle array using Fisher-Yates
 */
function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export interface RecommendationOptions {
    seedMovie?: { id: number; title: string };
    genreStats?: GenreStats[];
    language: "tr" | "en";
    count?: number;
}

/**
 * BESTSIMILAR-STYLE Weighted Keyword Intersection Algorithm
 * Calculates similarity score: +10 genre, +20 keyword, +5 era, -50 animation guard
 */
export async function getHybridRecommendations(
    options: RecommendationOptions
): Promise<Movie[]> {
    const { seedMovie, language, count = 20 } = options;

    const seenIds = new Set<number>();
    const results: Movie[] = [];

    if (!seedMovie) return results;

    // Exclude seed movie
    seenIds.add(seedMovie.id);

    // Step 1: Get Source DNA (genres, keywords, year)
    const sourceDNA = await fetchMovieDNA(seedMovie.id, language);
    if (!sourceDNA) return results;

    const sourceGenreIds = sourceDNA.genres;
    const sourceKeywordIds = sourceDNA.keywords.map(k => k.id);
    const sourceKeywordNames = new Map(sourceDNA.keywords.map(k => [k.id, k.name]));
    const sourceYear = sourceDNA.releaseYear;
    const sourceIsAnimation = sourceDNA.isAnimation;

    // Step 2: Fetch Candidates from TMDB recommendations
    let candidates = await getRecommendations(seedMovie.id, language);

    // Also try discover with genres for more variety
    if (sourceGenreIds.length > 0) {
        const discoverCandidates = await discoverByGenres(sourceGenreIds, language);
        // Merge and dedupe
        const existingIds = new Set(candidates.map(c => c.id));
        for (const movie of discoverCandidates) {
            if (!existingIds.has(movie.id)) {
                candidates.push(movie);
            }
        }
    }

    // Step 3: Calculate Similarity Score for each candidate
    type ScoredMovie = {
        movie: TMDBMovie;
        score: number;
        sharedGenres: number;
        sharedKeywords: string[];
        yearDiff: number;
    };

    const scoredMovies: ScoredMovie[] = await Promise.all(
        candidates.map(async (movie) => {
            if (movie.id === seedMovie.id || seenIds.has(movie.id)) {
                return null;
            }

            // Get candidate's keywords for comparison
            const candidateKeywords = await fetchMovieKeywordsWithNames(movie.id);
            const candidateKeywordIds = candidateKeywords.map(k => k.id);
            const candidateYear = movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : 0;
            const candidateIsAnimation = movie.genre_ids.includes(16);

            // Calculate score components
            let score = 0;
            const sharedKeywords: string[] = [];

            // +10 points per shared Genre
            const sharedGenreCount = movie.genre_ids.filter(g => sourceGenreIds.includes(g)).length;
            score += sharedGenreCount * 10;

            // +20 points per shared Keyword (Keywords are more specific!)
            for (const kwId of sourceKeywordIds) {
                if (candidateKeywordIds.includes(kwId)) {
                    score += 20;
                    const kwName = sourceKeywordNames.get(kwId);
                    if (kwName) sharedKeywords.push(kwName);
                }
            }

            // +5 points if release years within 10 years (Era match)
            const yearDiff = Math.abs(sourceYear - candidateYear);
            if (yearDiff <= 10) {
                score += 5;
            }

            // -50 points if candidate is Animation but source is NOT (Animation Guard)
            if (candidateIsAnimation && !sourceIsAnimation) {
                score -= 50;
            }

            // Quality floor
            if (movie.vote_average < 5.5) {
                score -= 20;
            }

            return {
                movie,
                score,
                sharedGenres: sharedGenreCount,
                sharedKeywords,
                yearDiff,
            };
        })
    ).then(results => results.filter((r): r is ScoredMovie => r !== null));

    // Step 4: Sort by score (highest first)
    scoredMovies.sort((a, b) => b.score - a.score);

    // Step 5: Add to results with dynamic reason
    for (const { movie, score, sharedKeywords, sharedGenres } of scoredMovies) {
        if (results.length >= count) break;
        if (seenIds.has(movie.id)) continue;
        if (score < 10) continue; // Minimum score threshold

        seenIds.add(movie.id);

        // Generate dynamic reason badge
        let reason: string;
        if (sharedKeywords.length >= 2) {
            // Show matching keywords
            const displayKeywords = sharedKeywords.slice(0, 2).join(", ");
            reason = language === "tr"
                ? `🎯 Eşleşen: ${displayKeywords}`
                : `🎯 Matches: ${displayKeywords}`;
        } else if (sharedKeywords.length === 1) {
            reason = language === "tr"
                ? `🎯 ${sharedKeywords[0]} ortak`
                : `🎯 ${sharedKeywords[0]} match`;
        } else if (sharedGenres >= 2) {
            reason = language === "tr"
                ? `🎭 Benzer türler`
                : `🎭 Similar genres`;
        } else {
            reason = language === "tr"
                ? `🎬 ${seedMovie.title} benzeri`
                : `🎬 Similar to ${seedMovie.title}`;
        }

        results.push(convertWithReason(movie, reason, language));
    }

    return results;
}

/**
 * Get discovery recommendations (for "Surprise Me")
 */
export async function getDiscoveryRecommendations(
    genreStats: GenreStats[],
    language: "tr" | "en",
    count: number = 20
): Promise<Movie[]> {
    return getHybridRecommendations({
        genreStats,
        language,
        count,
    });
}

// ============================================
// MOOD-BASED RECOMMENDATIONS
// ============================================

export interface Mood {
    id: string;
    emoji: string;
    labelTR: string;
    labelEN: string;
    genreIds: number[]; // TMDB genre IDs to include (empty for special moods like nostalgia)
    excludeGenreIds?: number[]; // TMDB genre IDs to exclude (e.g., Animation for Horror)
    customFilters?: Record<string, string>; // Custom TMDB API filters (e.g., date range)
    voteCountMin?: number; // Custom vote_count threshold (default 500)
    gradient: string; // CSS radial gradient for mood background
}

export const MOODS: Mood[] = [
    {
        id: "scared",
        emoji: "😱",
        labelTR: "Korkmak istiyorum",
        labelEN: "I want to be scared",
        genreIds: [27, 53], // Horror, Thriller
        excludeGenreIds: [16], // Exclude Animation
        gradient: "radial-gradient(circle at 50% 50%, #450a0a 0%, #000000 70%)",
    },
    {
        id: "laugh",
        emoji: "😂",
        labelTR: "Gülmek istiyorum",
        labelEN: "I want to laugh",
        genreIds: [35], // Comedy
        // Allow animation for comedy
        gradient: "radial-gradient(circle at 50% 50%, #facc15 0%, #78350f 70%)",
    },
    {
        id: "cry",
        emoji: "😢",
        labelTR: "Ağlamak istiyorum",
        labelEN: "I want to cry",
        genreIds: [18, 10749], // Drama, Romance
        excludeGenreIds: [16], // Exclude Animation
        gradient: "radial-gradient(circle at 50% 50%, #1e3a8a 0%, #020617 70%)",
    },
    {
        id: "thrilled",
        emoji: "🤯",
        labelTR: "Gerilmek istiyorum",
        labelEN: "I want to be thrilled",
        genreIds: [53, 28], // Thriller, Action
        excludeGenreIds: [16], // Exclude Animation
        gradient: "radial-gradient(circle at 50% 50%, #581c87 0%, #0f172a 70%)",
    },
    {
        id: "adventure",
        emoji: "🚀",
        labelTR: "Maceraya atılmak istiyorum",
        labelEN: "I want adventure",
        genreIds: [12, 878], // Adventure, Sci-Fi
        // Allow animation for adventure
        gradient: "radial-gradient(circle at 50% 50%, #065f46 0%, #020617 70%)",
    },
    {
        id: "romantic",
        emoji: "💕",
        labelTR: "Romantik olmak istiyorum",
        labelEN: "I want romance",
        genreIds: [10749, 18], // Romance, Drama
        excludeGenreIds: [16], // Exclude Animation
        gradient: "radial-gradient(circle at 50% 50%, #9d174d 0%, #1e1b4b 70%)",
    },
    {
        id: "think",
        emoji: "🔍",
        labelTR: "Düşünmek istiyorum",
        labelEN: "I want to think",
        genreIds: [9648, 99], // Mystery, Documentary
        excludeGenreIds: [16], // Exclude Animation
        voteCountMin: 200, // Lower threshold for niche genres
        gradient: "radial-gradient(circle at 50% 50%, #312e81 0%, #000000 70%)",
    },
    {
        id: "nostalgia",
        emoji: "📜",
        labelTR: "Nostalji / Eski Toprak",
        labelEN: "Nostalgia / Classics",
        genreIds: [], // No specific genre - classics from all genres
        customFilters: {
            "primary_release_date.lte": "1999-12-31",
            "vote_average.gte": "8.0",
            "vote_count.gte": "2000",
            sort_by: "vote_average.desc",
        },
        gradient: "radial-gradient(circle at 50% 50%, #78350f 0%, #0c0a09 70%)",
    },
];

/**
 * Strict mood-based discovery with genre exclusions and custom filters
 */
async function discoverByMoodGenres(
    genreIds: number[],
    excludeGenreIds: number[] = [],
    language: "tr" | "en" = "tr",
    page: number = 1,
    customFilters?: Record<string, string>,
    voteCountMin: number = 500
): Promise<TMDBMovie[]> {
    if (!API_KEY) return [];

    try {
        const params: Record<string, string> = {
            language: getTMDBLanguage(language),
            page: page.toString(),
            include_adult: "false",
        };

        // Apply custom filters if provided (for nostalgia, etc.)
        if (customFilters) {
            Object.assign(params, customFilters);
        } else {
            // Default filters for genre-based moods
            if (genreIds.length > 0) {
                // Use pipe (|) for OR logic - movie must have ANY of these genres
                params.with_genres = genreIds.join("|");
            }
            params["vote_average.gte"] = "6.5";
            params["vote_count.gte"] = voteCountMin.toString();
            params.sort_by = "popularity.desc";
        }

        // Add exclusion filter if specified
        if (excludeGenreIds.length > 0) {
            params.without_genres = excludeGenreIds.join(",");
        }

        const url = buildUrl("/discover/movie", params);
        const response = await fetch(url, getAuthOptions());
        if (!response.ok) return [];

        const data = await response.json();
        return data.results.filter((m: TMDBMovie) => m.poster_path !== null);
    } catch {
        return [];
    }
}

/**
 * Get mood-based recommendations with strict filtering
 */
export async function getMoodRecommendations(
    moodId: string,
    language: "tr" | "en",
    count: number = 20
): Promise<Movie[]> {
    const mood = MOODS.find((m) => m.id === moodId);
    if (!mood) return [];

    // Use strict mood discovery with exclusions and custom filters
    const movies = await discoverByMoodGenres(
        mood.genreIds,
        mood.excludeGenreIds || [],
        language,
        Math.floor(Math.random() * 5) + 1,
        mood.customFilters,
        mood.voteCountMin || 500
    );
    const shuffled = shuffle(movies);

    const moodLabel = language === "tr" ? mood.labelTR : mood.labelEN;
    const reason = `${mood.emoji} ${moodLabel}`;

    return shuffled.slice(0, count).map((movie) =>
        convertWithReason(movie, reason, language)
    );
}
