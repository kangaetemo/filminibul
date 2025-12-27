"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Calendar, Clock, Sparkles, RotateCcw, Search } from "lucide-react";
import SwipeCard from "./SwipeCard";
import CardStack from "./CardStack";
import { Movie } from "@/data/mockData";
import {
    fetchMovieOfTheDay,
    getRecommendations,
    convertTMDBMovieTR,
    convertTMDBMovie
} from "@/lib/tmdb";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface MovieOfTheDayState {
    date: string;
    movieId: number | null;
    status: "pending" | "liked" | "passed";
    movieData?: Movie;
}

const STORAGE_KEY = "filminibul_motd";

function getToday(): string {
    return new Date().toISOString().split("T")[0];
}

function getTimeUntilMidnight(): { hours: number; minutes: number } {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
}

interface MovieOfTheDayProps {
    onBack: () => void;
    onAddToWatchlist: (movie: Movie) => void;
}

export default function MovieOfTheDay({ onBack, onAddToWatchlist }: MovieOfTheDayProps) {
    const [state, setState] = useState<MovieOfTheDayState | null>(null);
    const [movie, setMovie] = useState<Movie | null>(null);
    const [recommendations, setRecommendations] = useState<Movie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState(getTimeUntilMidnight());

    const { t } = useTranslation();
    const { language } = useLanguage();
    const { user } = useAuth();

    // Get storage key (user-specific if logged in)
    const getStorageKey = useCallback(() => {
        return user ? `${STORAGE_KEY}_${user.uid}` : STORAGE_KEY;
    }, [user]);

    // Load state from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as MovieOfTheDayState;
                // Check if it's still today
                if (parsed.date === getToday()) {
                    setState(parsed);
                    if (parsed.movieData) {
                        setMovie(parsed.movieData);
                    }
                } else {
                    // New day, reset
                    setState(null);
                }
            } catch {
                setState(null);
            }
        }
        setIsLoading(false);
    }, [getStorageKey]);

    // Fetch movie if no state exists
    useEffect(() => {
        if (!isLoading && !state) {
            fetchNewMovie();
        }
    }, [isLoading, state]);

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(getTimeUntilMidnight());
        }, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const fetchNewMovie = async () => {
        setIsLoading(true);
        const tmdbMovie = await fetchMovieOfTheDay(language);

        if (tmdbMovie) {
            const converted = language === "tr"
                ? convertTMDBMovieTR(tmdbMovie)
                : convertTMDBMovie(tmdbMovie);

            const newState: MovieOfTheDayState = {
                date: getToday(),
                movieId: tmdbMovie.id,
                status: "pending",
                movieData: converted,
            };

            setState(newState);
            setMovie(converted);
            localStorage.setItem(getStorageKey(), JSON.stringify(newState));
        }
        setIsLoading(false);
    };

    const handleSwipe = async (direction: "left" | "right") => {
        if (!state || !movie) return;

        if (direction === "right") {
            // Liked - fetch recommendations
            const newState: MovieOfTheDayState = {
                ...state,
                status: "liked",
            };
            setState(newState);
            localStorage.setItem(getStorageKey(), JSON.stringify(newState));

            // Add to watchlist
            onAddToWatchlist(movie);

            // Fetch recommendations
            setIsLoading(true);
            const recs = await getRecommendations(movie.id, language);
            const convertedRecs = recs.map(m =>
                language === "tr" ? convertTMDBMovieTR(m) : convertTMDBMovie(m)
            );
            setRecommendations(convertedRecs);
            setIsLoading(false);
        } else {
            // Passed - show comeback screen
            const newState: MovieOfTheDayState = {
                ...state,
                status: "passed",
            };
            setState(newState);
            localStorage.setItem(getStorageKey(), JSON.stringify(newState));
        }
    };

    const handleLikeFromRecommendations = (movie: Movie) => {
        onAddToWatchlist(movie);
    };

    const handlePassFromRecommendations = () => {
        // Just for stats, no action needed
    };

    // Loading state - wait for BOTH state AND movie data to be ready
    if (isLoading || !state || (state.status === "pending" && !movie)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full border-4 border-accent/30 border-t-accent"
                />
                <p className="mt-4 text-white/60">{t("general.loading")}</p>
            </div>
        );
    }

    // Already swiped today - passed
    if (state.status === "passed") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 rounded-full bg-pass/20 flex items-center justify-center mb-6"
                >
                    <Calendar className="w-12 h-12 text-pass" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("motd.passed")}</h2>
                <p className="text-white/60 mb-6">{t("motd.passedHint")}</p>

                <div className="flex items-center gap-2 text-white/40 mb-8">
                    <Clock className="w-4 h-4" />
                    <span>{t("motd.nextReset")} {countdown.hours}h {countdown.minutes}m</span>
                </div>

                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-glow text-white font-semibold rounded-full transition-all"
                >
                    <Search className="w-4 h-4" />
                    {t("cards.searchAgain")}
                </button>
            </div>
        );
    }

    // Liked - show recommendations
    if (state.status === "liked" && recommendations.length > 0) {
        return (
            <div className="flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        <span className="text-white/60">{t("motd.recommendations")}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">&quot;{movie?.title}&quot;</h2>
                </motion.div>

                <CardStack
                    movies={recommendations}
                    seedMovieTitle={movie?.title}
                    onLike={handleLikeFromRecommendations}
                    onPass={handlePassFromRecommendations}
                    onSearchAgain={onBack}
                />
            </div>
        );
    }

    // Pending - show movie card
    if (state.status === "pending" && movie) {
        return (
            <div className="flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        <span className="text-lg font-bold text-white">{t("motd.title")}</span>
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-white/50 text-sm">{getToday()}</p>
                </motion.div>

                {/* Single card display */}
                <div className="relative w-[320px] h-[480px]">
                    <SwipeCard
                        movie={movie}
                        onSwipe={handleSwipe}
                        isTop={true}
                        index={0}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-6 mt-6">
                    <button
                        onClick={() => handleSwipe("left")}
                        className="w-16 h-16 rounded-full bg-card border-2 border-pass/30 flex items-center justify-center hover:border-pass hover:shadow-glow-pass transition-all duration-300 hover:scale-110 group"
                    >
                        <X className="w-8 h-8 text-pass group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                        onClick={() => handleSwipe("right")}
                        className="w-16 h-16 rounded-full bg-card border-2 border-like/30 flex items-center justify-center hover:border-like hover:shadow-glow-like transition-all duration-300 hover:scale-110 group"
                    >
                        <Heart className="w-8 h-8 text-like group-hover:scale-110 group-hover:fill-like transition-all" />
                    </button>
                </div>

                <button
                    onClick={onBack}
                    className="mt-6 flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    {t("header.newSearch")}
                </button>
            </div>
        );
    }

    // Fallback
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <p className="text-white/60">{t("general.error")}</p>
            <button
                onClick={onBack}
                className="mt-4 px-6 py-3 bg-accent text-white rounded-full"
            >
                {t("header.newSearch")}
            </button>
        </div>
    );
}
