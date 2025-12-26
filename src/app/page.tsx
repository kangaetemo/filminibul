"use client";

import { useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Bookmark, Sparkles, ArrowLeft, BarChart3 } from "lucide-react";
import LandingScreen from "@/components/LandingScreen";
import CardStack from "@/components/CardStack";
import Watchlist from "@/components/Watchlist";
import StatsPanel from "@/components/StatsPanel";
import PageTransition from "@/components/PageTransition";
import UserMenu from "@/components/UserMenu";
import LanguageToggle from "@/components/LanguageToggle";
import AdBanner from "@/components/AdBanner";
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
    TMDB_IMAGE_BASE,
    POSTER_SIZE,
} from "@/lib/tmdb";

type AppView = "search" | "swipe";

export default function Home() {
    const [view, setView] = useState<AppView>("search");
    const [direction, setDirection] = useState(1);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [seedMovieTitle, setSeedMovieTitle] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const [swipeCount, setSwipeCount] = useState(0);

    // Use transition for non-blocking state updates
    const [isPending, startTransition] = useTransition();

    const { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
    const { recordLike, recordPass } = useUserStats();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { language } = useLanguage();

    // Current movie for background sync
    const currentMovie = movies[currentMovieIndex];
    const backgroundPoster = currentMovie?.posterUrl;

    // Core function to load recommendations based on a seed movie
    const loadMoviesBySeed = useCallback(async (seedMovie: { id: number; title: string }) => {
        setIsLoading(true);
        setSeedMovieTitle(seedMovie.title);

        try {
            const recommendations = await getRecommendations(seedMovie.id, language);

            if (recommendations.length === 0) {
                console.log("No recommendations found, trying discover...");
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
            setSwipeCount(0);
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
            setSwipeCount(0);
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
        setSwipeCount(0);
    }, []);

    const handleFindSimilar = useCallback(async (movie: Movie) => {
        await loadMoviesBySeed({ id: movie.id, title: movie.title });
    }, [loadMoviesBySeed]);

    const handleLike = useCallback((movie: Movie) => {
        addToWatchlist(movie);
        recordLike(movie);
        setSwipeCount((prev) => prev + 1);
    }, [addToWatchlist, recordLike]);

    const handlePass = useCallback((movie: Movie) => {
        recordPass(movie);
        setSwipeCount((prev) => prev + 1);
    }, [recordPass]);

    // Callback to sync current movie index from CardStack
    const handleCurrentMovieChange = useCallback((index: number) => {
        setCurrentMovieIndex(index);
    }, []);

    // Show interstitial ad every 10 swipes
    const showInterstitialAd = swipeCount > 0 && swipeCount % 10 === 0;

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
                    {/* Language Toggle */}
                    <LanguageToggle />

                    {/* Stats Button (only for logged in users) */}
                    {user && (
                        <button
                            onClick={() => setIsStatsOpen(true)}
                            className="w-10 h-10 rounded-full glass border border-white/10 hover:border-accent/50 flex items-center justify-center transition-all group"
                            title={t("header.stats")}
                        >
                            <BarChart3 className="w-4 h-4 text-white/70 group-hover:text-accent transition-colors" />
                        </button>
                    )}

                    {/* Watchlist button */}
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

                    {/* User Menu */}
                    <UserMenu />
                </motion.div>
            </header>

            {/* Main Content with Page Transitions */}
            <div className="relative z-10">
                <PageTransition viewKey={view} direction={direction}>
                    {view === "search" ? (
                        <LandingScreen
                            onMovieSelect={handleMovieSelect}
                            onSurpriseMe={handleSurpriseMe}
                            isLoading={isLoading || isPending}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-4">
                            <CardStack
                                movies={movies}
                                seedMovieTitle={seedMovieTitle}
                                onLike={handleLike}
                                onPass={handlePass}
                                onSearchAgain={handleSearchAgain}
                                onCurrentMovieChange={handleCurrentMovieChange}
                            />

                            {/* Interstitial Ad (every 10 swipes) */}
                            {showInterstitialAd && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-4"
                                >
                                    <AdBanner variant="interstitial" />
                                </motion.div>
                            )}

                            {/* Instructions */}
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

            {/* Bottom Ad Banner (swipe view only) */}
            {view === "swipe" && (
                <div className="fixed bottom-0 left-0 right-0 z-20 pb-2">
                    <AdBanner variant="banner" />
                </div>
            )}

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
