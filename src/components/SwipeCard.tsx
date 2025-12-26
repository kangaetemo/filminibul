"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from "framer-motion";
import { Star, Calendar, Film, Tv, Loader2 } from "lucide-react";
import { Movie } from "@/data/mockData";
import {
    fetchWatchProviders,
    getProviderLogoUrl,
    WatchProvidersCountry,
} from "@/lib/tmdb";

interface SwipeCardProps {
    movie: Movie;
    onSwipe: (direction: "left" | "right") => void;
    isTop: boolean;
    index: number;
    isAnimating?: boolean;
}

export default function SwipeCard({ movie, onSwipe, isTop, index, isAnimating = false }: SwipeCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [providers, setProviders] = useState<WatchProvidersCountry | null>(null);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [hasLoadedProviders, setHasLoadedProviders] = useState(false);
    const [isSwiping, setIsSwiping] = useState(false);

    // Ref to track if this card has already triggered a swipe
    const hasSwipedRef = useRef(false);

    const controls = useAnimation();
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // All useTransform hooks at top level
    const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
    const rotateY = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
    const rotateX = useTransform(y, [-100, 0, 100], [5, 0, -5]);
    const scale = useTransform(x, [-300, -100, 0, 100, 300], [0.95, 1.05, 1, 1.05, 0.95]);

    const likeOpacity = useTransform(x, [0, 100, 200], [0, 0.6, 1]);
    const passOpacity = useTransform(x, [-200, -100, 0], [1, 0.6, 0]);
    const likeScale = useTransform(x, [0, 100, 200], [0.5, 1, 1.1]);
    const passScale = useTransform(x, [-200, -100, 0], [1.1, 1, 0.5]);

    useEffect(() => {
        if (isFlipped && !hasLoadedProviders && isTop) {
            setIsLoadingProviders(true);
            fetchWatchProviders(movie.id)
                .then((data) => {
                    setProviders(data);
                    setHasLoadedProviders(true);
                })
                .finally(() => setIsLoadingProviders(false));
        }
    }, [isFlipped, hasLoadedProviders, movie.id, isTop]);

    // Reset when movie changes
    useEffect(() => {
        hasSwipedRef.current = false;
        setIsSwiping(false);
    }, [movie.id]);

    const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Prevent multiple swipes
        if (hasSwipedRef.current || isSwiping || isAnimating) return;

        const threshold = 100;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            hasSwipedRef.current = true;
            setIsSwiping(true);
            await controls.start({
                x: 500, y: info.offset.y * 0.5, rotate: 30, scale: 0.8, opacity: 0,
                transition: { type: "spring", stiffness: 300, damping: 20, opacity: { duration: 0.2 } }
            });
            onSwipe("right");
        } else if (info.offset.x < -threshold || velocity < -500) {
            hasSwipedRef.current = true;
            setIsSwiping(true);
            await controls.start({
                x: -500, y: info.offset.y * 0.5, rotate: -30, scale: 0.8, opacity: 0,
                transition: { type: "spring", stiffness: 300, damping: 20, opacity: { duration: 0.2 } }
            });
            onSwipe("left");
        } else {
            controls.start({
                x: 0, y: 0, rotate: 0, scale: 1,
                transition: { type: "spring", stiffness: 500, damping: 25 }
            });
        }
    };

    const handleCardClick = () => {
        if (isTop && !isSwiping && !isAnimating) {
            setIsFlipped(!isFlipped);
        }
    };

    const stackOffset = index * 10;
    const stackScale = 1 - index * 0.05;
    const streamingProviders = providers?.flatrate || [];
    const hasStreamingInTR = streamingProviders.length > 0;

    // Disable drag when animating or already swiped
    const canDrag = isTop && !isFlipped && !isSwiping && !isAnimating;

    return (
        <motion.div
            className="absolute w-[320px] h-[480px] cursor-grab active:cursor-grabbing"
            style={{
                x: isTop ? x : 0,
                y: isTop ? y : 0,
                rotate: isTop ? rotate : 0,
                rotateY: isTop ? rotateY : 0,
                rotateX: isTop ? rotateX : 0,
                scale: isTop ? scale : stackScale,
                zIndex: 10 - index,
                top: isTop ? 0 : stackOffset,
                transformPerspective: 1200,
                pointerEvents: isSwiping ? "none" : "auto",
            }}
            animate={controls}
            drag={canDrag ? "x" : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            whileDrag={{ cursor: "grabbing" }}
            whileHover={canDrag ? { scale: 1.02 } : {}}
            whileTap={canDrag ? { scale: 0.98 } : {}}
            onClick={handleCardClick}
            initial={index === 0 ? { scale: 0.9, opacity: 0 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Like Indicator */}
            {isTop && (
                <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none z-20 border-4 border-like"
                    style={{ opacity: likeOpacity, boxShadow: "0 0 60px rgba(34, 197, 94, 0.8), inset 0 0 30px rgba(34, 197, 94, 0.3)" }}
                >
                    <motion.div className="absolute top-6 left-6 px-5 py-2 bg-like rounded-xl rotate-[-20deg]" style={{ scale: likeScale, opacity: likeOpacity }}>
                        <span className="text-white font-black text-3xl tracking-wider">LIKE</span>
                    </motion.div>
                </motion.div>
            )}

            {/* Pass Indicator */}
            {isTop && (
                <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none z-20 border-4 border-pass"
                    style={{ opacity: passOpacity, boxShadow: "0 0 60px rgba(239, 68, 68, 0.8), inset 0 0 30px rgba(239, 68, 68, 0.3)" }}
                >
                    <motion.div className="absolute top-6 right-6 px-5 py-2 bg-pass rounded-xl rotate-[20deg]" style={{ scale: passScale, opacity: passOpacity }}>
                        <span className="text-white font-black text-3xl tracking-wider">NOPE</span>
                    </motion.div>
                </motion.div>
            )}

            {/* Card Container with 3D Flip */}
            <div className="relative w-full h-full" style={{ perspective: "1000px", transformStyle: "preserve-3d" }}>
                <motion.div
                    className="w-full h-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Front Face */}
                    <div className="absolute w-full h-full rounded-3xl overflow-hidden shadow-glow-card" style={{ backfaceVisibility: "hidden" }}>
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${movie.posterUrl})` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h2 className="text-2xl font-bold text-white mb-2">{movie.title}</h2>
                                <div className="flex items-center gap-4 text-white/80 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        <span>{movie.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{movie.releaseYear}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {movie.genres.slice(0, 3).map((genre) => (
                                        <span key={genre} className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90">{genre}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back Face */}
                    <div className="absolute w-full h-full rounded-3xl overflow-hidden bg-card shadow-glow-card p-6" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-4">
                                <Film className="w-6 h-6 text-accent" />
                                <h2 className="text-xl font-bold text-white">{movie.title}</h2>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <span className="text-2xl font-bold text-white">{movie.rating}</span>
                                <span className="text-white/50 text-sm">/ 10</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4 text-white/70">
                                <Calendar className="w-4 h-4" />
                                <span>{movie.releaseYear}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {movie.genres.map((genre) => (
                                    <span key={genre} className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-xs text-accent">{genre}</span>
                                ))}
                            </div>

                            {/* Streaming Providers */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Tv className="w-4 h-4 text-white/60" />
                                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Stream in Turkey</h3>
                                </div>
                                {isLoadingProviders ? (
                                    <div className="flex items-center gap-2 text-white/50">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Loading...</span>
                                    </div>
                                ) : hasStreamingInTR ? (
                                    <div className="flex flex-wrap gap-2">
                                        {streamingProviders.slice(0, 5).map((provider) => (
                                            <div key={provider.provider_id} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg" title={provider.provider_name}>
                                                <img src={getProviderLogoUrl(provider.logo_path)} alt={provider.provider_name} className="w-6 h-6 rounded" />
                                                <span className="text-xs text-white/80">{provider.provider_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/40 text-sm italic">Not streaming in Turkey</p>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">Overview</h3>
                                <p className="text-white/80 text-sm leading-relaxed">{movie.overview}</p>
                            </div>
                            <p className="text-center text-white/40 text-xs mt-4">Tap to flip back</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
