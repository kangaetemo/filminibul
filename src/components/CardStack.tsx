"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Heart, X, RotateCcw, Search } from "lucide-react";
import SwipeCard from "./SwipeCard";
import { Movie } from "@/data/mockData";

interface CardStackProps {
    movies: Movie[];
    seedMovieTitle?: string;
    onLike: (movie: Movie) => void;
    onPass: (movie: Movie) => void;
    onSearchAgain: () => void;
}

export default function CardStack({ movies, seedMovieTitle, onLike, onPass, onSearchAgain }: CardStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipedMovies, setSwipedMovies] = useState<{ movie: Movie; direction: "left" | "right" }[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    // Debounce ref to prevent spam clicks
    const lastSwipeTime = useRef(0);
    const DEBOUNCE_MS = 400; // Minimum time between swipes

    const currentMovies = movies.slice(currentIndex, currentIndex + 3);

    const handleSwipe = useCallback(
        (direction: "left" | "right") => {
            const now = Date.now();

            // Prevent spam clicks
            if (isAnimating || now - lastSwipeTime.current < DEBOUNCE_MS) {
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

            // Delay index update to allow animation to complete
            setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
                setIsAnimating(false);
            }, 300);
        },
        [currentIndex, movies, onLike, onPass, isAnimating]
    );

    const handleUndo = useCallback(() => {
        if (swipedMovies.length === 0 || currentIndex === 0 || isAnimating) return;

        setSwipedMovies((prev) => prev.slice(0, -1));
        setCurrentIndex((prev) => prev - 1);
    }, [swipedMovies.length, currentIndex, isAnimating]);

    const handleButtonSwipe = (direction: "left" | "right") => {
        handleSwipe(direction);
    };

    const isFinished = currentIndex >= movies.length;

    return (
        <div className="flex flex-col items-center gap-8">
            {/* Seed Movie Banner */}
            {seedMovieTitle && (
                <div className="text-center mb-2">
                    <p className="text-white/50 text-sm">Based on your love for</p>
                    <p className="text-white font-semibold text-lg">&quot;{seedMovieTitle}&quot;</p>
                </div>
            )}

            {/* Card Stack Area */}
            <div className="relative w-[320px] h-[480px] flex items-center justify-center">
                {isFinished ? (
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
                            <Heart className="w-12 h-12 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
                        <p className="text-white/60 mb-6">You&apos;ve seen all recommendations</p>
                        <button
                            onClick={onSearchAgain}
                            className="px-6 py-3 bg-accent hover:bg-accent-glow text-white font-semibold rounded-full transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto"
                        >
                            <Search className="w-4 h-4" />
                            Find More Movies
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {currentMovies.map((movie, index) => (
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
            {!isFinished && (
                <div className="flex items-center gap-6">
                    {/* Pass Button */}
                    <button
                        onClick={() => handleButtonSwipe("left")}
                        disabled={isAnimating}
                        className="w-16 h-16 rounded-full bg-card border-2 border-pass/30 flex items-center justify-center hover:border-pass hover:shadow-glow-pass transition-all duration-300 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <X className="w-8 h-8 text-pass group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Undo Button */}
                    <button
                        onClick={handleUndo}
                        disabled={swipedMovies.length === 0 || isAnimating}
                        className="w-12 h-12 rounded-full bg-card border border-white/10 flex items-center justify-center hover:border-white/30 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                    >
                        <RotateCcw className="w-5 h-5 text-white/70" />
                    </button>

                    {/* Like Button */}
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
                        <span>{Math.min(currentIndex + 1, movies.length)}</span>
                        <span>/</span>
                        <span>{movies.length}</span>
                    </div>

                    <button
                        onClick={onSearchAgain}
                        className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        Search Again
                    </button>
                </div>
            )}
        </div>
    );
}
