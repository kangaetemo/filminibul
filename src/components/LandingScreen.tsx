"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Film, Loader2, Star, Calendar } from "lucide-react";
import { searchMovie, TMDBMovie, TMDB_IMAGE_BASE, POSTER_SIZE } from "@/lib/tmdb";
import { MOODS } from "@/lib/recommendationService";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";

interface LandingScreenProps {
    onMovieSelect: (movie: TMDBMovie) => void;
    onSurpriseMe: () => void;
    onMovieOfTheDay?: () => void;
    onMoodSelect?: (moodId: string) => void;
    isLoading: boolean;
}

export default function LandingScreen({ onMovieSelect, onSurpriseMe, onMovieOfTheDay, onMoodSelect, isLoading }: LandingScreenProps) {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Refs for debouncing
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const { user } = useAuth();
    const { t } = useTranslation();
    const { language } = useLanguage();

    // Debounced autocomplete search
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Don't search if query is too short
        if (query.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        // Debounce search by 300ms
        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            setShowResults(true);

            try {
                const results = await searchMovie(query, language);

                // Sort by rating (higher first) to show popular movies first
                const sortedResults = results.sort((a, b) => {
                    // Weight by both rating and vote count for better relevance
                    const scoreA = a.vote_average * Math.log10(Math.max(a.vote_count || 1, 1));
                    const scoreB = b.vote_average * Math.log10(Math.max(b.vote_count || 1, 1));
                    return scoreB - scoreA;
                });

                setSearchResults(sortedResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [query, language]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && searchResults.length > 0) {
            // Select top result on Enter
            handleMovieClick(searchResults[0]);
        } else if (e.key === "Escape") {
            setShowResults(false);
        }
    };

    const handleMovieClick = (movie: TMDBMovie) => {
        setShowResults(false);
        setQuery("");
        setSearchResults([]);
        onMovieSelect(movie);
    };

    const handleInputFocus = () => {
        if (searchResults.length > 0) {
            setShowResults(true);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-12">
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-8"
            >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center shadow-lg shadow-accent/30">
                    <Film className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        {t("app.name")}
                        <Sparkles className="w-5 h-5 text-accent-glow" />
                    </h1>
                    <p className="text-sm text-white/50">{t("app.tagline")}</p>
                </div>
            </motion.div>

            {/* Welcome message for signed-in users */}
            {user && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/60 text-sm mb-4"
                >
                    {t("landing.welcome")}, {user.displayName?.split(" ")[0]}! 👋
                </motion.p>
            )}

            {/* Headline */}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-bold text-white text-center mb-8"
            >
                {t("landing.title")}
            </motion.h2>

            {/* Search Input with Autocomplete */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-md relative"
            >
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        placeholder={t("landing.placeholder")}
                        className="w-full px-5 py-4 pl-12 pr-12 bg-card border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-lg"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />

                    {/* Loading indicator */}
                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-accent animate-spin" />
                        </div>
                    )}
                </div>

                {/* Autocomplete Results Dropdown */}
                <AnimatePresence>
                    {showResults && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[400px] overflow-y-auto"
                        >
                            {searchResults.length === 0 && !isSearching ? (
                                <div className="py-8 text-center text-white/50">
                                    {query.length >= 2
                                        ? (language === "tr" ? "Film bulunamadı. Farklı bir arama deneyin." : "No movies found. Try a different search.")
                                        : (language === "tr" ? "Aramak için en az 2 karakter yazın..." : "Type at least 2 characters to search...")
                                    }
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {searchResults.map((movie, index) => (
                                        <button
                                            key={movie.id}
                                            onClick={() => handleMovieClick(movie)}
                                            className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left ${index === 0 ? 'bg-white/5' : ''}`}
                                        >
                                            {/* Poster thumbnail */}
                                            <div
                                                className="w-12 h-18 rounded-lg bg-cover bg-center flex-shrink-0"
                                                style={{
                                                    backgroundImage: movie.poster_path
                                                        ? `url(${TMDB_IMAGE_BASE}/${POSTER_SIZE}${movie.poster_path})`
                                                        : undefined,
                                                    height: "72px",
                                                }}
                                            />

                                            {/* Movie info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate">
                                                    {movie.title}
                                                    {index === 0 && <span className="ml-2 text-xs text-accent">⏎</span>}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1 text-white/50 text-sm">
                                                    {movie.vote_average > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                            <span>{movie.vote_average.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                    {movie.release_date && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{new Date(movie.release_date).getFullYear()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Divider */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 my-8 w-full max-w-md"
            >
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/40 text-sm">{t("landing.or")}</span>
                <div className="flex-1 h-px bg-white/10" />
            </motion.div>

            {/* Surprise Me Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={onSurpriseMe}
                disabled={isLoading}
                className="group relative z-40 px-8 py-4 bg-gradient-to-r from-like/20 to-accent/20 border border-white/10 rounded-2xl text-white font-semibold transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center gap-3">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5 text-accent group-hover:animate-pulse" />
                    )}
                    <span>{t("landing.surpriseMe")}</span>
                </div>
                <p className="text-xs text-white/50 mt-1">{t("landing.hiddenGems")}</p>
            </motion.button>

            {/* Mood Selector Section */}
            {onMoodSelect && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="mt-8 w-full max-w-lg relative z-40"
                >
                    <p className="text-center text-white/60 text-sm mb-4">
                        {language === "tr" ? "ya da ruh haline göre seç" : "or choose by mood"}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {MOODS.map((mood, index) => (
                            <motion.button
                                key={mood.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                onClick={() => onMoodSelect(mood.id)}
                                disabled={isLoading}
                                className="group flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                            >
                                <span className="text-2xl group-hover:scale-125 transition-transform">
                                    {mood.emoji}
                                </span>
                                <span className="text-xs text-white/70 text-center leading-tight">
                                    {language === "tr" ? mood.labelTR.split(" ").slice(0, 2).join(" ") : mood.labelEN.split(" ").slice(0, 3).join(" ")}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Movie of the Day Button */}
            {onMovieOfTheDay && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={onMovieOfTheDay}
                    disabled={isLoading}
                    className="group mt-4 relative z-40 px-8 py-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl text-white font-semibold transition-all hover:border-yellow-400/60 hover:shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🎬</span>
                        <span>{t("motd.title")}</span>
                        <span className="text-yellow-400 animate-pulse">✨</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                        {language === "tr" ? "Her gün yeni bir film önerisi!" : "A new movie recommendation every day!"}
                    </p>
                </motion.button>
            )}

            {/* Click outside to close dropdown - positioned below search but above nothing else */}
            {showResults && (
                <div
                    className="fixed inset-0 z-[35]"
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
}
