"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Star, Calendar, Sparkles, Search, Loader2, Plus } from "lucide-react";
import { Movie } from "@/data/mockData";
import { useTranslation, useLanguage } from "@/contexts/LanguageContext";
import { searchMovie, TMDBMovie, TMDB_IMAGE_BASE, POSTER_SIZE, convertTMDBMovie, convertTMDBMovieTR } from "@/lib/tmdb";
import { useState, useRef, useEffect } from "react";

interface WatchlistProps {
    movies: Movie[];
    isOpen: boolean;
    onClose: () => void;
    onRemove: (movieId: number) => void;
    onClear: () => void;
    onFindSimilar: (movie: Movie) => void;
    onAddToWatchlist?: (movie: Movie) => void;
}

export default function Watchlist({
    movies,
    isOpen,
    onClose,
    onRemove,
    onClear,
    onFindSimilar,
    onAddToWatchlist,
}: WatchlistProps) {
    const { t } = useTranslation();
    const { language } = useLanguage();

    // Manual add state
    const [showAddSearch, setShowAddSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Search for movies to add
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchMovie(searchQuery, language);
                setSearchResults(results.slice(0, 5));
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery, language]);

    const handleAddMovie = (tmdbMovie: TMDBMovie) => {
        const converted = language === "tr" ? convertTMDBMovieTR(tmdbMovie) : convertTMDBMovie(tmdbMovie);
        // Check if already in watchlist
        if (!movies.find(m => m.id === converted.id) && onAddToWatchlist) {
            onAddToWatchlist(converted);
        }
        setSearchQuery("");
        setSearchResults([]);
        setShowAddSearch(false);
    };

    const handleFindSimilar = (movie: Movie) => {
        onFindSimilar(movie);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-white/10 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{t("watchlist.title")}</h2>
                                    <p className="text-white/50 text-sm">
                                        {movies.length} {t("watchlist.count")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowAddSearch(!showAddSearch)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showAddSearch ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
                                        title={language === "tr" ? "Film ekle" : "Add movie"}
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/70" />
                                    </button>
                                </div>
                            </div>

                            {/* Manual Add Search */}
                            <AnimatePresence>
                                {showAddSearch && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={language === "tr" ? "Film ara ve ekle..." : "Search and add movie..."}
                                                className="w-full px-4 py-3 pl-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent/50 transition-all"
                                                autoFocus
                                            />
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            {isSearching && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                                            )}
                                        </div>

                                        {/* Search Results */}
                                        {searchResults.length > 0 && (
                                            <div className="mt-2 bg-white/5 rounded-xl overflow-hidden">
                                                {searchResults.map((movie) => (
                                                    <button
                                                        key={movie.id}
                                                        onClick={() => handleAddMovie(movie)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <div
                                                            className="w-10 h-14 rounded bg-cover bg-center flex-shrink-0"
                                                            style={{
                                                                backgroundImage: movie.poster_path
                                                                    ? `url(${TMDB_IMAGE_BASE}/${POSTER_SIZE}${movie.poster_path})`
                                                                    : undefined,
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white font-medium truncate">{movie.title}</p>
                                                            <p className="text-white/50 text-sm">
                                                                {movie.release_date ? new Date(movie.release_date).getFullYear() : ""}
                                                            </p>
                                                        </div>
                                                        <Plus className="w-5 h-5 text-accent" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Movie List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {movies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Star className="w-10 h-10 text-white/20" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white/70 mb-2">{t("watchlist.empty")}</h3>
                                    <p className="text-white/40 text-sm">{t("watchlist.emptyHint")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {movies.map((movie, index) => (
                                        <motion.div
                                            key={movie.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                                        >
                                            {/* Poster Thumbnail */}
                                            <div
                                                className="w-16 h-24 rounded-lg bg-cover bg-center flex-shrink-0"
                                                style={{ backgroundImage: `url(${movie.posterUrl})` }}
                                            />

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate">{movie.title}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-white/50 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        <span>{movie.rating}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{movie.releaseYear}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {movie.genres.slice(0, 2).map((genre) => (
                                                        <span
                                                            key={genre}
                                                            className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full"
                                                        >
                                                            {genre}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2 self-center opacity-0 group-hover:opacity-100 transition-all">
                                                {/* More Like This Button */}
                                                <button
                                                    onClick={() => handleFindSimilar(movie)}
                                                    className="w-8 h-8 rounded-full bg-accent/20 hover:bg-accent/30 flex items-center justify-center transition-all group/btn"
                                                    title={t("watchlist.findSimilar")}
                                                >
                                                    <Sparkles className="w-4 h-4 text-accent group-hover/btn:scale-110 transition-transform" />
                                                </button>

                                                {/* Remove Button */}
                                                <button
                                                    onClick={() => onRemove(movie.id)}
                                                    className="w-8 h-8 rounded-full bg-pass/10 hover:bg-pass/20 flex items-center justify-center transition-all"
                                                    title="Remove"
                                                >
                                                    <X className="w-4 h-4 text-pass" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hint for new feature */}
                        {movies.length > 0 && (
                            <div className="px-4 py-3 bg-accent/5 border-t border-accent/10">
                                <p className="text-center text-white/50 text-xs flex items-center justify-center gap-2">
                                    <Sparkles className="w-3 h-3 text-accent" />
                                    {t("watchlist.hoverHint")}
                                </p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        {movies.length > 0 && (
                            <div className="p-4 border-t border-white/10">
                                <button
                                    onClick={onClear}
                                    className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-pass/10 hover:bg-pass/20 text-pass font-medium transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t("watchlist.clear")}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
