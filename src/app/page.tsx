"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Film, Bookmark, Sparkles, ArrowLeft, LogOut } from "lucide-react";
import LandingScreen from "@/components/LandingScreen";
import CardStack from "@/components/CardStack";
import Watchlist from "@/components/Watchlist";
import PageTransition from "@/components/PageTransition";
import { Movie } from "@/data/mockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/contexts/AuthContext";
import {
    TMDBMovie,
    getRecommendations,
    discoverHiddenGems,
    convertTMDBMovie,
} from "@/lib/tmdb";

type AppView = "search" | "swipe";

export default function Home() {
    const [view, setView] = useState<AppView>("search");
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
    const [movies, setMovies] = useState<Movie[]>([]);
    const [seedMovieTitle, setSeedMovieTitle] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);

    const { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
    const { user, logOut } = useAuth();

    // Core function to load recommendations based on a seed movie
    const loadMoviesBySeed = useCallback(async (seedMovie: { id: number; title: string }) => {
        setIsLoading(true);
        setSeedMovieTitle(seedMovie.title);

        try {
            const recommendations = await getRecommendations(seedMovie.id);

            if (recommendations.length === 0) {
                console.log("No recommendations found, trying discover...");
                const discoveredMovies = await discoverHiddenGems();
                const convertedMovies = discoveredMovies.map(convertTMDBMovie);
                setMovies(convertedMovies);
            } else {
                const convertedMovies = recommendations.map(convertTMDBMovie);
                setMovies(convertedMovies);
            }

            setDirection(1); // Forward transition
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleMovieSelect = useCallback(async (tmdbMovie: TMDBMovie) => {
        await loadMoviesBySeed({ id: tmdbMovie.id, title: tmdbMovie.title });
    }, [loadMoviesBySeed]);

    const handleSurpriseMe = useCallback(async () => {
        setIsLoading(true);
        setSeedMovieTitle(undefined);

        try {
            const hiddenGems = await discoverHiddenGems();
            const convertedMovies = hiddenGems.map(convertTMDBMovie);
            setMovies(convertedMovies);
            setDirection(1); // Forward transition
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSearchAgain = useCallback(() => {
        setDirection(-1); // Backward transition
        setView("search");
        setMovies([]);
        setSeedMovieTitle(undefined);
    }, []);

    const handleFindSimilar = useCallback(async (movie: Movie) => {
        await loadMoviesBySeed({ id: movie.id, title: movie.title });
    }, [loadMoviesBySeed]);

    const handleLike = (movie: Movie) => {
        addToWatchlist(movie);
    };

    const handlePass = (movie: Movie) => {
        console.log("Passed on:", movie.title);
    };

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Gradient Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-gentle-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-like/10 rounded-full blur-[100px] animate-gentle-pulse" style={{ animationDelay: "1.5s" }} />
            </div>

            {/* Header - Only show on swipe view */}
            {view === "swipe" && (
                <header className="relative z-10 flex items-center justify-between px-6 py-4">
                    {/* Left side - Back button */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <button
                            onClick={handleSearchAgain}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                            <span className="text-sm text-white/70 group-hover:text-white transition-colors">New Search</span>
                        </button>
                    </motion.div>

                    {/* Right side - User & Watchlist */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        {/* User Profile */}
                        {user && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-full glass border border-white/10">
                                {user.photoURL && (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || "User"}
                                        className="w-6 h-6 rounded-full"
                                    />
                                )}
                                <span className="text-xs text-white/70 max-w-[80px] truncate hidden sm:block">
                                    {user.displayName?.split(" ")[0]}
                                </span>
                                <button
                                    onClick={logOut}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut className="w-3 h-3 text-white/50" />
                                </button>
                            </div>
                        )}

                        {/* Watchlist button */}
                        <button
                            onClick={() => setIsWatchlistOpen(true)}
                            className="relative flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 hover:border-accent/50 transition-all duration-300 group"
                        >
                            <Bookmark className="w-4 h-4 text-white/70 group-hover:text-accent transition-colors" />
                            <span className="text-sm text-white/70 group-hover:text-white transition-colors">Watchlist</span>
                            {watchlist.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                                    {watchlist.length}
                                </span>
                            )}
                        </button>
                    </motion.div>
                </header>
            )}

            {/* Main Content with Page Transitions */}
            <div className="relative z-10">
                <PageTransition viewKey={view} direction={direction}>
                    {view === "search" ? (
                        <LandingScreen
                            onMovieSelect={handleMovieSelect}
                            onSurpriseMe={handleSurpriseMe}
                            isLoading={isLoading}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-4">
                            <CardStack
                                movies={movies}
                                seedMovieTitle={seedMovieTitle}
                                onLike={handleLike}
                                onPass={handlePass}
                                onSearchAgain={handleSearchAgain}
                            />

                            {/* Instructions */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 text-center"
                            >
                                <p className="text-white/40 text-sm">
                                    Swipe right to add to watchlist • Tap card to see details
                                </p>
                            </motion.div>
                        </div>
                    )}
                </PageTransition>
            </div>

            {/* Watchlist Panel */}
            <Watchlist
                movies={watchlist}
                isOpen={isWatchlistOpen}
                onClose={() => setIsWatchlistOpen(false)}
                onRemove={removeFromWatchlist}
                onClear={clearWatchlist}
                onFindSimilar={handleFindSimilar}
            />
        </main>
    );
}
