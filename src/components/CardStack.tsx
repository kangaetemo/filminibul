"use client";

import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo, useAnimation } from "framer-motion";
import { Heart, X, Search, Loader2 } from "lucide-react";
import SwipeCard from "./SwipeCard";
import { Movie } from "@/data/mockData";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";

interface CardStackProps {
    movies: Movie[];
    seedMovieTitle?: string;
    onLike: (movie: Movie) => void;
    onPass: (movie: Movie) => void;
    onSearchAgain: () => void;
    onCurrentMovieChange?: (index: number) => void;
    onPreFetchNeeded?: () => void; // Called when we need more movies
}

// Type for items in the deck (movie or ad)
type DeckItem =
    | { type: "movie"; movie: Movie }
    | { type: "ad"; id: string };

// Swipeable Ad Card Component - same size as movie cards
const SwipeableAdCard = memo(function SwipeableAdCard({
    onSwipe,
    isTop,
    index
}: {
    onSwipe: (direction: "left" | "right") => void;
    isTop: boolean;
    index: number;
}) {
    const { language } = useLanguage();
    const controls = useAnimation();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);

    const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
            onSwipe("right");
        } else if (info.offset.x < -threshold || velocity < -500) {
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
            onSwipe("left");
        } else {
            controls.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 500, damping: 25 } });
        }
    };

    const stackOffset = index * 10;
    const stackScale = 1 - index * 0.05;

    return (
        <motion.div
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            animate={controls}
            style={{
                x: isTop ? x : 0,
                y: isTop ? y : 0,
                rotate: isTop ? rotate : 0,
                scale: stackScale,
                zIndex: 10 - index,
                top: isTop ? 0 : stackOffset,
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: stackScale, opacity: 1 }}
            className="absolute w-[320px] h-[480px] rounded-3xl bg-gradient-to-br from-accent/30 via-card to-like/20 border-2 border-accent/40 flex flex-col items-center justify-center p-6 shadow-2xl cursor-grab active:cursor-grabbing"
        >
            {/* AD Content */}
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-accent/30 flex items-center justify-center mb-6 border-2 border-accent/50">
                    <span className="text-accent text-3xl font-bold">AD</span>
                </div>

                <h3 className="text-white text-2xl font-bold mb-3">
                    {language === "tr" ? "Sponsor" : "Sponsored"}
                </h3>

                <p className="text-white/60 text-sm text-center mb-6 max-w-[220px]">
                    {language === "tr"
                        ? "Bu alan sponsorlu içerik için ayrılmıştır"
                        : "This space is reserved for sponsored content"
                    }
                </p>

                <div className="w-[280px] h-[180px] bg-white/10 rounded-xl flex items-center justify-center border border-dashed border-white/30">
                    <span className="text-white/40 text-sm">300×250</span>
                </div>

                <p className="text-white/50 text-xs mt-6 animate-pulse">
                    {language === "tr" ? "← Geçmek için kaydır →" : "← Swipe to continue →"}
                </p>
            </div>
        </motion.div>
    );
});

export default function CardStack({
    movies,
    seedMovieTitle,
    onLike,
    onPass,
    onSearchAgain,
    onCurrentMovieChange,
    onPreFetchNeeded
}: CardStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const [isAnimating, setIsAnimating] = useState(false);
    const [preFetchTriggered, setPreFetchTriggered] = useState(false);
    const { t } = useTranslation();



    // Build deck with ads inserted after 10th movie and at end
    const deck = useMemo((): DeckItem[] => {
        const items: DeckItem[] = [];

        movies.forEach((movie, i) => {
            items.push({ type: "movie", movie });

            // Insert ad after 10th movie (index 9)
            if (i === 9 && movies.length > 10) {
                items.push({ type: "ad", id: "ad-after-10" });
            }
        });

        // Add ad at the very end
        if (movies.length > 0) {
            items.push({ type: "ad", id: "ad-end" });
        }

        return items;
    }, [movies]);

    // STRICT WINDOWING: Render ONLY current card + next card (2 max)
    const currentItems = useMemo(() =>
        deck.slice(currentIndex, currentIndex + 2),
        [deck, currentIndex]
    );

    // Get current movie for background sync (skip ads)
    const currentMovieForBackground = useMemo(() => {
        for (let i = currentIndex; i < deck.length; i++) {
            const item = deck[i];
            if (item.type === "movie") return item.movie;
        }
        return null;
    }, [deck, currentIndex]);

    // Notify parent of current movie changes
    useEffect(() => {
        if (currentMovieForBackground) {
            const movieIndex = movies.findIndex(m => m.id === currentMovieForBackground.id);
            onCurrentMovieChange?.(movieIndex);
        }
    }, [currentMovieForBackground, movies, onCurrentMovieChange]);

    // Pre-fetch when reaching 15th card (or 5 cards before end)
    useEffect(() => {
        const remainingCards = deck.length - currentIndex;
        if (remainingCards <= 5 && !preFetchTriggered && movies.length > 0) {
            setPreFetchTriggered(true);
            onPreFetchNeeded?.();
        }
    }, [currentIndex, deck.length, preFetchTriggered, onPreFetchNeeded, movies.length]);

    // Reset when movies change
    useEffect(() => {
        setCurrentIndex(0);
        setPreFetchTriggered(false);
    }, [movies]);

    const handleSwipe = useCallback(
        (direction: "left" | "right", itemId: string, isAd: boolean = false) => {
            if (isAnimating) return;

            setIsAnimating(true);

            // Only record stats for movies, not ads
            if (!isAd) {
                const currentItem = deck[currentIndex];
                if (currentItem?.type === "movie") {
                    if (direction === "right") {
                        onLike(currentItem.movie);
                    } else {
                        onPass(currentItem.movie);
                    }
                }
            }

            // Quick transition for smooth swiping
            setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
                setIsAnimating(false);
            }, 100);
        },
        [currentIndex, deck, onLike, onPass, isAnimating]
    );



    const handleButtonSwipe = useCallback((direction: "left" | "right") => {
        const currentItem = deck[currentIndex];
        if (!currentItem) return;

        const itemId = currentItem.type === "movie" ? `movie-${currentItem.movie.id}` : currentItem.id;
        handleSwipe(direction, itemId, currentItem.type === "ad");
    }, [deck, currentIndex, handleSwipe]);

    // Check if we've gone through all cards (including final ad)
    const isFinished = currentIndex >= deck.length;

    // Count actual movies swiped (not ads)
    const moviesSwiped = useMemo(() => {
        let count = 0;
        for (let i = 0; i < currentIndex && i < deck.length; i++) {
            if (deck[i].type === "movie") count++;
        }
        return count;
    }, [currentIndex, deck]);

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
                {/* Loading state - wait for data to be ready */}
                {movies.length === 0 || !deck[currentIndex] ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                        <p className="text-white/60">{t("general.loading")}</p>
                    </div>
                ) : isFinished ? (
                    <div className="text-center">
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
                        {currentItems.map((item, index) => {
                            if (item.type === "ad") {
                                return (
                                    <SwipeableAdCard
                                        key={item.id}
                                        onSwipe={(dir) => handleSwipe(dir, item.id, true)}
                                        isTop={index === 0}
                                        index={index}
                                    />
                                );
                            } else {
                                return (
                                    <SwipeCard
                                        key={item.movie.id}
                                        movie={item.movie}
                                        onSwipe={(dir) => handleSwipe(dir, `movie-${item.movie.id}`, false)}
                                        isTop={index === 0}
                                        index={index}
                                        isAnimating={isAnimating}
                                    />
                                );
                            }
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Action Buttons */}
            {!isFinished && (
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => handleButtonSwipe("left")}
                        disabled={isAnimating}
                        className="w-16 h-16 rounded-full bg-card border-2 border-pass/30 flex items-center justify-center hover:border-pass hover:shadow-glow-pass transition-all duration-300 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <X className="w-8 h-8 text-pass group-hover:scale-110 transition-transform" />
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
            {!isFinished && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                        <span>{Math.min(moviesSwiped + 1, movies.length)}</span>
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
