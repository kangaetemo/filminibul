"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Film, Loader2, Star, Calendar } from "lucide-react";
import { searchMovie, TMDBMovie, TMDB_IMAGE_BASE, POSTER_SIZE } from "@/lib/tmdb";
import { useAuth } from "@/contexts/AuthContext";

interface LandingScreenProps {
    onMovieSelect: (movie: TMDBMovie) => void;
    onSurpriseMe: () => void;
    isLoading: boolean;
}

export default function LandingScreen({ onMovieSelect, onSurpriseMe, isLoading }: LandingScreenProps) {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const { user, loading: authLoading, signIn, logOut } = useAuth();

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setShowResults(true);

        try {
            const results = await searchMovie(query);
            setSearchResults(results);
        } finally {
            setIsSearching(false);
        }
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleMovieClick = (movie: TMDBMovie) => {
        setShowResults(false);
        setQuery("");
        setSearchResults([]);
        onMovieSelect(movie);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            {/* User Auth Section - Top Right */}
            <div className="absolute top-4 right-4">
                {authLoading ? (
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                    </div>
                ) : user ? (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-full glass border border-white/10">
                            {user.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || "User"}
                                    className="w-7 h-7 rounded-full"
                                />
                            )}
                            <span className="text-sm text-white/80 max-w-[100px] truncate">
                                {user.displayName?.split(" ")[0]}
                            </span>
                        </div>
                        <button
                            onClick={logOut}
                            className="text-xs text-white/40 hover:text-white/70 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={signIn}
                        className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 hover:border-accent/50 transition-all group"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                            Sign in
                        </span>
                    </button>
                )}
            </div>

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
                        filminibul
                        <Sparkles className="w-5 h-5 text-accent-glow" />
                    </h1>
                    <p className="text-sm text-white/50">Discover your next favorite</p>
                </div>
            </motion.div>

            {/* Welcome message for signed-in users */}
            {user && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/60 text-sm mb-4"
                >
                    Welcome back, {user.displayName?.split(" ")[0]}! 👋
                </motion.p>
            )}

            {/* Headline */}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-bold text-white text-center mb-8"
            >
                Which movie did you like?
            </motion.h2>

            {/* Search Input */}
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
                        placeholder="e.g., Inception, The Matrix..."
                        className="w-full px-5 py-4 pl-12 bg-card border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-lg"
                        disabled={isLoading}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />

                    {/* Search button */}
                    <button
                        onClick={handleSearch}
                        disabled={!query.trim() || isSearching || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-accent hover:bg-accent-glow text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Search"
                        )}
                    </button>
                </div>

                {/* Search Results Dropdown */}
                <AnimatePresence>
                    {showResults && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[400px] overflow-y-auto"
                        >
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-8 text-center text-white/50">
                                    No movies found. Try a different search.
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {searchResults.map((movie) => (
                                        <button
                                            key={movie.id}
                                            onClick={() => handleMovieClick(movie)}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
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
                                                <h3 className="font-semibold text-white truncate">{movie.title}</h3>
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
                <span className="text-white/40 text-sm">or</span>
                <div className="flex-1 h-px bg-white/10" />
            </motion.div>

            {/* Surprise Me Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={onSurpriseMe}
                disabled={isLoading}
                className="group relative px-8 py-4 bg-gradient-to-r from-like/20 to-accent/20 border border-white/10 rounded-2xl text-white font-semibold transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center gap-3">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5 text-accent group-hover:animate-pulse" />
                    )}
                    <span>Surprise Me!</span>
                </div>
                <p className="text-xs text-white/50 mt-1">Discover hidden gems (IMDB 7+)</p>
            </motion.button>

            {/* Click outside to close dropdown */}
            {showResults && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
}
