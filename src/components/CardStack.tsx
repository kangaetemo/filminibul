"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X, RotateCcw, Search } from "lucide-react";
import SwipeCard from "./SwipeCard";
import { Movie } from "@/data/mockData";
import { useTranslation } from "@/contexts/LanguageContext";

interface CardStackProps {
    movies: Movie[];
    seedMovieTitle?: string;
    onLike: (movie: Movie) => void;
    onPass: (movie: Movie) => void;
    onSearchAgain: () => void;
    onCurrentMovieChange?: (index: number) => void;
}

// Card-sized Ad Component
function CardAd({ onDismiss }: { onDismiss: () => void }) {
    const { t, language } = useTranslation();

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="absolute w-[320px] h-[480px] rounded-3xl bg-gradient-to-br from-card to-background border border-white/10 flex flex-col items-center justify-center p-6 shadow-2xl"
            style={{ perspective: 1000 }}
        >
            {/* Ad Content */}
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <span className="text-accent text-2xl font-bold">AD</span>
                </div>

                <h3 className="text-white/80 text-xl font-semibold mb-2">
                    {language === "tr" ? "Reklam Alanı" : "Advertisement"}
                </h3>

                <p className="text-white/40 text-sm text-center mb-6 max-w-[200px]">
                    {language === "tr"
                        ? "Bu alan sponsorlu içerik için ayrılmıştır"
                        : "This space is reserved for sponsored content"
                    }
                </p>

                <div className="w-[280px] h-[200px] bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-white/10">
                    <span className="text-white/20 text-xs">300×250</span>
                </div>
            </div>

            {/* Dismiss hint */}
            <button
                onClick={onDismiss}
                className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-sm hover:text-white/60 transition-colors"
            >
                {language === "tr" ? "Devam etmek için tıkla →" : "Click to continue →"}
            </button>
        </motion.div>
    );
}

export default function CardStack({
    movies,
    seedMovieTitle,
    onLike,
    onPass,
    onSearchAgain,
    onCurrentMovieChange
}: CardStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipedMovies, setSwipedMovies] = useState<{ movie: Movie; direction: "left" | "right" }[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showAd, setShowAd] = useState(false);
    const [adShownAt10, setAdShownAt10] = useState(false);
    const { t } = useTranslation();

    // Debounce ref to prevent spam clicks
    const lastSwipeTime = useRef(0);
    const DEBOUNCE_MS = 350;

    // Memoize current movies for performance
    const currentMovies = useMemo(() =>
        movies.slice(currentIndex, currentIndex + 3),
        [movies, currentIndex]
    );

    // Notify parent of current movie changes for background sync
    useEffect(() => {
        onCurrentMovieChange?.(currentIndex);
    }, [currentIndex, onCurrentMovieChange]);

    // Reset index when movies change (new recommendations)
    useEffect(() => {
        setCurrentIndex(0);
        setSwipedMovies([]);
        setAdShownAt10(false);
        setShowAd(false);
    }, [movies]);

    // Show ad after 10th movie (only once per session)
    useEffect(() => {
        if (currentIndex === 10 && !adShownAt10 && movies.length > 10) {
            setShowAd(true);
            setAdShownAt10(true);
        }
    }, [currentIndex, adShownAt10, movies.length]);

    const handleDismissAd = () => {
        setShowAd(false);
    };

    const handleSwipe = useCallback(
        (direction: "left" | "right") => {
            const now = Date.now();

            if (isAnimating || showAd || now - lastSwipeTime.current < DEBOUNCE_MS) {
                return;
            }

            const movie = movies[currentIndex];
            if (!movie) return;

            lastSwipeTime.current = now;
            setIsAnimating(true);

            setSwipedMovies((prev) => [...prev, { movie, direction }]);

            if (direction === "right") {
                onLike(movie);
            } else {
                onPass(movie);
            }

            requestAnimationFrame(() => {
                setTimeout(() => {
                    setCurrentIndex((prev) => prev + 1);
                    setIsAnimating(false);
                }, 250);
            });
        },
        [currentIndex, movies, onLike, onPass, isAnimating, showAd]
    );

    const handleUndo = useCallback(() => {
        if (swipedMovies.length === 0 || currentIndex === 0 || isAnimating || showAd) return;

        setSwipedMovies((prev) => prev.slice(0, -1));
        setCurrentIndex((prev) => prev - 1);
    }, [swipedMovies.length, currentIndex, isAnimating, showAd]);

    const handleButtonSwipe = (direction: "left" | "right") => {
        handleSwipe(direction);
    };

    const isFinished = currentIndex >= movies.length;

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Seed Movie Banner */}
            {seedMovieTitle && (
                <div className="text-center mb-2">
                    <p className="text-white font-semibold text-lg">&quot;{seedMovieTitle}&quot;</p>
                    <p className="text-white/50 text-sm">{t("cards.basedOn")}</p>
                </div>
            )}

            {/* Card Stack Area */}
            <div className="relative w-[320px] h-[480px] flex items-center justify-center">
                {isFinished ? (
                    <div className="text-center">
                        {/* End-of-stack Ad - Card sized */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-4"
                        >
                            <div className="w-[280px] h-[180px] mx-auto bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                                    <span className="text-accent text-sm font-bold">AD</span>
                                </div>
                                <p className="text-white/30 text-xs">{t("ad.placeholder")}</p>
                            </div>
                        </motion.div>

                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
                            <Heart className="w-10 h-10 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t("cards.allDone")}</h2>
                        <p className="text-white/60 mb-6">{t("cards.seenAll")}</p>
                        <button
                            onClick={onSearchAgain}
                            className="px-6 py-3 bg-accent hover:bg-accent-glow text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto"
                        >
                            <Search className="w-4 h-4" />
                            {t("cards.findMore")}
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {/* Show Ad Card when triggered */}
                        {showAd && (
                            <CardAd key="ad-card" onDismiss={handleDismissAd} />
                        )}

                        {/* Regular Movie Cards */}
                        {!showAd && currentMovies.map((movie, index) => (
                            <SwipeCard
                                key={movie.id}
                                movie={movie}
                                onSwipe={handleSwipe}
                                isTop={index === 0}
                                index={index}
                                isAnimating={isAnimating}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Action Buttons */}
            {!isFinished && !showAd && (
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => handleButtonSwipe("left")}
                        disabled={isAnimating}
                        className="w-16 h-16 rounded-full bg-card border-2 border-pass/30 flex items-center justify-center hover:border-pass hover:shadow-glow-pass transition-all duration-300 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <X className="w-8 h-8 text-pass group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                        onClick={handleUndo}
                        disabled={swipedMovies.length === 0 || isAnimating}
                        className="w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center hover:border-white/30 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                    >
                        <RotateCcw className="w-5 h-5 text-white/70" />
                    </button>

                    <button
                        onClick={() => handleButtonSwipe("right")}
                        disabled={isAnimating}
                        className="w-16 h-16 rounded-full bg-card border-2 border-like/30 flex items-center justify-center hover:border-like hover:shadow-glow-like transition-all duration-300 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <Heart className="w-8 h-8 text-like group-hover:scale-110 group-hover:fill-like transition-all" />
                    </button>
                </div>
            )}

            {/* Progress & Search Again */}
            {!isFinished && !showAd && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                        <span>{Math.min(currentIndex + 1, movies.length)}</span>
                        <span>/</span>
                        <span>{movies.length}</span>
                    </div>

                    <button
                        onClick={onSearchAgain}
                        className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        {t("cards.searchAgain")}
                    </button>
                </div>
            )}
        </div>
    );
}
