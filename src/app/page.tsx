"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Bookmark, Sparkles, ArrowLeft, BarChart3 } from "lucide-react";
import LandingScreen from "@/components/LandingScreen";
import CardStack from "@/components/CardStack";
import MovieOfTheDay from "@/components/MovieOfTheDay";
import Watchlist from "@/components/Watchlist";
import StatsPanel from "@/components/StatsPanel";
import PageTransition from "@/components/PageTransition";
import UserMenu from "@/components/UserMenu";
import LanguageToggle from "@/components/LanguageToggle";
import Footer from "@/components/Footer";
import { Movie } from "@/data/mockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useUserStats } from "@/hooks/useUserStats";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";
import {
    TMDBMovie,
    getRecommendations,
    discoverHiddenGems,
    convertTMDBMovie,
} from "@/lib/tmdb";

type AppView = "search" | "swipe" | "motd";

export default function Home() {
    const [view, setView] = useState<AppView>("search");
    const [direction, setDirection] = useState(1);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [seedMovieTitle, setSeedMovieTitle] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);

    // Pre-fetch state
    const [preFetchedMovies, setPreFetchedMovies] = useState<Movie[]>([]);
    const isPreFetching = useRef(false);

    const [isPending, startTransition] = useTransition();

    const { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
    const { recordLike, recordPass } = useUserStats();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { language } = useLanguage();

    // Current movie for background sync
    const currentMovie = movies[currentMovieIndex];
    const backgroundPoster = currentMovie?.posterUrl;

    // Background pre-fetch function
    const handlePreFetchNeeded = useCallback(async () => {
        if (isPreFetching.current || preFetchedMovies.length > 0) return;

        isPreFetching.current = true;
        console.log("Pre-fetching more movies in background...");

        try {
            const newMovies = await discoverHiddenGems(language);
            const converted = newMovies.map(convertTMDBMovie);

            // Filter out duplicates
            const existingIds = new Set(movies.map(m => m.id));
            const uniqueNewMovies = converted.filter(m => !existingIds.has(m.id));

            setPreFetchedMovies(uniqueNewMovies);
            console.log(`Pre-fetched ${uniqueNewMovies.length} new movies`);
        } finally {
            isPreFetching.current = false;
        }
    }, [language, movies, preFetchedMovies.length]);

    // Append pre-fetched movies when current batch is done
    const appendPreFetchedMovies = useCallback(() => {
        if (preFetchedMovies.length > 0) {
            startTransition(() => {
                setMovies(prev => [...prev, ...preFetchedMovies]);
                setPreFetchedMovies([]);
            });
        }
    }, [preFetchedMovies]);

    // Core function to load recommendations
    const loadMoviesBySeed = useCallback(async (seedMovie: { id: number; title: string }) => {
        setIsLoading(true);
        setSeedMovieTitle(seedMovie.title);

        try {
            const recommendations = await getRecommendations(seedMovie.id, language);

            if (recommendations.length === 0) {
                const discoveredMovies = await discoverHiddenGems(language);
                startTransition(() => {
                    setMovies(discoveredMovies.map(convertTMDBMovie));
                });
            } else {
                startTransition(() => {
                    setMovies(recommendations.map(convertTMDBMovie));
                });
            }

            setCurrentMovieIndex(0);
            setPreFetchedMovies([]);
            setDirection(1);
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, [language]);

    const handleMovieSelect = useCallback(async (tmdbMovie: TMDBMovie) => {
        await loadMoviesBySeed({ id: tmdbMovie.id, title: tmdbMovie.title });
    }, [loadMoviesBySeed]);

    const handleSurpriseMe = useCallback(async () => {
        setIsLoading(true);
        setSeedMovieTitle(undefined);

        try {
            const hiddenGems = await discoverHiddenGems(language);
            startTransition(() => {
                setMovies(hiddenGems.map(convertTMDBMovie));
            });
            setCurrentMovieIndex(0);
            setPreFetchedMovies([]);
            setDirection(1);
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, [language]);

    const handleSearchAgain = useCallback(() => {
        setDirection(-1);
        setView("search");
        setMovies([]);
        setSeedMovieTitle(undefined);
        setCurrentMovieIndex(0);
        setPreFetchedMovies([]);
    }, []);

    const handleMovieOfTheDay = useCallback(() => {
        setDirection(1);
        setView("motd");
    }, []);

    const handleFindSimilar = useCallback(async (movie: Movie) => {
        await loadMoviesBySeed({ id: movie.id, title: movie.title });
    }, [loadMoviesBySeed]);

    const handleLike = useCallback((movie: Movie) => {
        addToWatchlist(movie);
        recordLike(movie);
    }, [addToWatchlist, recordLike]);

    const handlePass = useCallback((movie: Movie) => {
        recordPass(movie);
    }, [recordPass]);

    const handleCurrentMovieChange = useCallback((index: number) => {
        setCurrentMovieIndex(index);
    }, []);

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Gradient Effects - Synced with current movie */}
            <div className="fixed inset-0 pointer-events-none">
                <AnimatePresence mode="wait">
                    {backgroundPoster && view === "swipe" && (
                        <motion.div
                            key={backgroundPoster}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-cover bg-center blur-3xl scale-110"
                            style={{ backgroundImage: `url(${backgroundPoster})` }}
                        />
                    )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-background/80" />
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-gentle-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-like/10 rounded-full blur-[100px] animate-gentle-pulse" style={{ animationDelay: "1.5s" }} />
            </div>

            {/* Global Header */}
            <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
                {/* Left side */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    {view === "swipe" ? (
                        <button
                            onClick={handleSearchAgain}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                            <span className="text-sm text-white/70 group-hover:text-white transition-colors hidden sm:inline">
                                {t("header.newSearch")}
                            </span>
                        </button>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                                <Film className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    {t("app.name")}
                                    <Sparkles className="w-4 h-4 text-accent-glow" />
                                </h1>
                                <p className="text-xs text-white/40">{t("app.tagline")}</p>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Right side - Global controls */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 sm:gap-3"
                >
                    <LanguageToggle />

                    <button
                        onClick={() => setIsStatsOpen(true)}
                        className="w-10 h-10 rounded-full glass border border-white/10 hover:border-accent/50 flex items-center justify-center transition-all group"
                        title={t("header.stats")}
                    >
                        <BarChart3 className="w-4 h-4 text-white/70 group-hover:text-accent transition-colors" />
                    </button>

                    <button
                        onClick={() => setIsWatchlistOpen(true)}
                        className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full glass border border-white/10 hover:border-accent/50 transition-all group"
                    >
                        <Bookmark className="w-4 h-4 text-white/70 group-hover:text-accent transition-colors" />
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors hidden sm:inline">
                            {t("header.watchlist")}
                        </span>
                        {watchlist.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                                {watchlist.length}
                            </span>
                        )}
                    </button>

                    <UserMenu />
                </motion.div>
            </header>

            {/* Main Content with Page Transitions */}
            <div className="relative z-10 pb-12">
                <PageTransition viewKey={view} direction={direction}>
                    {view === "search" ? (
                        <LandingScreen
                            onMovieSelect={handleMovieSelect}
                            onSurpriseMe={handleSurpriseMe}
                            onMovieOfTheDay={handleMovieOfTheDay}
                            isLoading={isLoading || isPending}
                        />
                    ) : view === "motd" ? (
                        <div className="flex flex-col items-center justify-center px-4 py-4">
                            <MovieOfTheDay
                                onBack={handleSearchAgain}
                                onAddToWatchlist={addToWatchlist}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-4">
                            <CardStack
                                movies={movies}
                                seedMovieTitle={seedMovieTitle}
                                onLike={handleLike}
                                onPass={handlePass}
                                onSearchAgain={handleSearchAgain}
                                onCurrentMovieChange={handleCurrentMovieChange}
                                onPreFetchNeeded={handlePreFetchNeeded}
                            />

                            {/* Swipe Hint */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 text-center"
                            >
                                <p className="text-white/40 text-sm">{t("cards.swipeHint")}</p>
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

            {/* Stats Panel */}
            <StatsPanel
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
            />

            {/* Footer with Privacy Policy */}
            <Footer />
        </main>
    );
}
