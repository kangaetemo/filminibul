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
import {
    getHybridRecommendations,
    getDiscoveryRecommendations,
    getMoodRecommendations,
    MOODS,
} from "@/lib/recommendationService";

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
    const [currentMoodId, setCurrentMoodId] = useState<string | null>(null);

    // Upstash Vector için beğenilen film ID'leri
    const [likedIds, setLikedIds] = useState<number[]>([]);

    // Pre-fetch state
    const [preFetchedMovies, setPreFetchedMovies] = useState<Movie[]>([]);
    const isPreFetching = useRef(false);

    const [isPending, startTransition] = useTransition();

    const { watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();
    const { recordLike, recordPass, getTopLikedGenres, stats } = useUserStats();
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
            // Use discovery with user preferences
            const newMovies = await getDiscoveryRecommendations(
                stats.genreStats,
                language,
                15
            );

            // Filter out duplicates
            const existingIds = new Set(movies.map(m => m.id));
            const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.id));

            setPreFetchedMovies(uniqueNewMovies);
            console.log(`Pre-fetched ${uniqueNewMovies.length} new movies`);
        } finally {
            isPreFetching.current = false;
        }
    }, [language, movies, preFetchedMovies.length, stats.genreStats]);

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
            // Use hybrid recommendations with user preferences
            const recommendations = await getHybridRecommendations({
                seedMovie,
                genreStats: stats.genreStats,
                language,
                count: 20,
            });

            if (recommendations.length > 0) {
                startTransition(() => {
                    setMovies(recommendations);
                });
            } else {
                // Fallback to basic recommendations
                const basicRecs = await getRecommendations(seedMovie.id, language);
                startTransition(() => {
                    setMovies(basicRecs.map(convertTMDBMovie));
                });
            }

            setCurrentMovieIndex(0);
            setPreFetchedMovies([]);
            setDirection(1);
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, [language, stats.genreStats]);

    const handleMovieSelect = useCallback(async (tmdbMovie: TMDBMovie) => {
        await loadMoviesBySeed({ id: tmdbMovie.id, title: tmdbMovie.title });
    }, [loadMoviesBySeed]);

    const handleSurpriseMe = useCallback(async () => {
        setIsLoading(true);
        setSeedMovieTitle(undefined);

        try {
            // Use discovery with user preferences
            const recommendations = await getDiscoveryRecommendations(
                stats.genreStats,
                language,
                20
            );

            if (recommendations.length > 0) {
                startTransition(() => {
                    setMovies(recommendations);
                });
            } else {
                // Fallback
                const hiddenGems = await discoverHiddenGems(language);
                startTransition(() => {
                    setMovies(hiddenGems.map(convertTMDBMovie));
                });
            }

            setCurrentMovieIndex(0);
            setPreFetchedMovies([]);
            setDirection(1);
            setView("swipe");
        } finally {
            setIsLoading(false);
        }
    }, [language, stats.genreStats]);

    const handleSearchAgain = useCallback(() => {
        setDirection(-1);
        setView("search");
        setMovies([]);
        setSeedMovieTitle(undefined);
        setCurrentMovieIndex(0);
        setPreFetchedMovies([]);
        setCurrentMoodId(null); // Reset mood when returning to search
    }, []);

    const handleMovieOfTheDay = useCallback(() => {
        setDirection(1);
        setView("motd");
    }, []);

    // Handle mood-based selection
    const handleMoodSelect = useCallback(async (moodId: string) => {
        setIsLoading(true);
        setSeedMovieTitle(undefined);
        setCurrentMoodId(moodId); // Set current mood for background

        try {
            const recommendations = await getMoodRecommendations(moodId, language, 20);

            if (recommendations.length > 0) {
                startTransition(() => {
                    setMovies(recommendations);
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

    const handleFindSimilar = useCallback(async (movie: Movie) => {
        await loadMoviesBySeed({ id: movie.id, title: movie.title });
    }, [loadMoviesBySeed]);

    // Upstash Vector'dan öneri çek
    const fetchUpstashRecommendations = useCallback(async (newLikedIds: number[]) => {
        if (newLikedIds.length === 0) return;

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ likedIds: newLikedIds }),
            });

            if (!response.ok) return;

            const data = await response.json();
            const recommendations = data.recommendations || [];

            if (recommendations.length > 0) {
                // Movie arayüzüne dönüştür
                const newMovies: Movie[] = recommendations.map((rec: { id: number; baslik: string; yil: number; ozet: string }) => ({
                    id: rec.id,
                    title: rec.baslik,
                    year: rec.yil,
                    overview: rec.ozet,
                    posterUrl: `https://image.tmdb.org/t/p/w500/placeholder.jpg`, // Poster URL'i ayrıca çekilebilir
                    genres: [],
                    rating: 0,
                    recommendationReason: `🎯 ${data.basedOn?.baslik || 'Beğenin'} benzeri`,
                }));

                // Duplicate kontrolü yap ve deck'e ekle
                setMovies(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNewMovies];
                });

                console.log(`✅ Upstash'tan ${recommendations.length} öneri eklendi`);
            }
        } catch (error) {
            console.error('Upstash öneri hatası:', error);
        }
    }, []);

    const handleLike = useCallback((movie: Movie) => {
        addToWatchlist(movie);
        recordLike(movie);

        // likedIds'e ekle ve Upstash'tan öneri çek
        const newLikedIds = [...likedIds, movie.id];
        setLikedIds(newLikedIds);
        fetchUpstashRecommendations(newLikedIds);
    }, [addToWatchlist, recordLike, likedIds, fetchUpstashRecommendations]);

    const handlePass = useCallback((movie: Movie) => {
        recordPass(movie);
    }, [recordPass]);

    const handleCurrentMovieChange = useCallback((index: number) => {
        setCurrentMovieIndex(index);
    }, []);

    // Get current mood gradient
    const currentMood = currentMoodId ? MOODS.find(m => m.id === currentMoodId) : null;
    const moodGradient = currentMood?.gradient || null;

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Dynamic Mood Glow Background */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Base background */}
                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />

                {/* Dynamic Mood Glow - smooth transition */}
                <div
                    className="absolute inset-0 transition-all duration-[800ms] ease-in-out"
                    style={{
                        background: moodGradient || 'transparent',
                        opacity: moodGradient ? 0.6 : 0,
                    }}
                />

                {/* Film Grain Overlay for Nostalgia */}
                {currentMoodId === 'nostalgia' && (
                    <div
                        className="absolute inset-0 opacity-20 mix-blend-overlay transition-opacity duration-500"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        }}
                    />
                )}

                {/* Overlay to darken */}
                <div className="absolute inset-0 bg-background/60" />

                {/* Static accent glows */}
                <div
                    className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"
                    style={{ transform: "translate3d(0,0,0)" }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-like/10 rounded-full blur-[100px]"
                    style={{ transform: "translate3d(0,0,0)" }}
                />
            </div>

            {/* Global Header */}
            <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
                {/* Left side */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    {view === "swipe" || view === "motd" ? (
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
                        <button
                            onClick={handleSearchAgain}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                                <Film className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden sm:block text-left">
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    {t("app.name")}
                                    <Sparkles className="w-4 h-4 text-accent-glow" />
                                </h1>
                                <p className="text-xs text-white/40">{t("app.tagline")}</p>
                            </div>
                        </button>
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
                            onMoodSelect={handleMoodSelect}
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
                onAddToWatchlist={addToWatchlist}
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
