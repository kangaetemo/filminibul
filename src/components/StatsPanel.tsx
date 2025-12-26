"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, Heart, ThumbsDown, Trash2 } from "lucide-react";
import { useUserStats, GenreStats } from "@/hooks/useUserStats";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface StatsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

function GenreBar({ genre, value, max, color }: { genre: string; value: number; max: number; color: string }) {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 w-24 truncate" title={genre}>{genre}</span>
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${color}`}
                />
            </div>
            <span className="text-xs text-white/50 w-8 text-right">{value}</span>
        </div>
    );
}

export default function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
    const { stats, getTopLikedGenres, getTopPassedGenres, clearStats } = useUserStats();
    const { t } = useTranslation();
    const { user } = useAuth();

    const topLiked = getTopLikedGenres(5);
    const topPassed = getTopPassedGenres(5);
    const maxLiked = topLiked.length > 0 ? Math.max(...topLiked.map((g) => g.liked)) : 0;
    const maxPassed = topPassed.length > 0 ? Math.max(...topPassed.map((g) => g.passed)) : 0;

    const hasData = stats.totalLiked > 0 || stats.totalPassed > 0;

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
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-6 h-6 text-accent" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">{t("stats.title")}</h2>
                                    {user && (
                                        <p className="text-white/50 text-sm">{user.displayName}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {!hasData ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <BarChart3 className="w-10 h-10 text-white/20" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white/70 mb-2">{t("stats.noData")}</h3>
                                    <p className="text-white/40 text-sm">{t("stats.startSwiping")}</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-like/10 border border-like/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Heart className="w-5 h-5 text-like" />
                                                <span className="text-sm text-white/60">{t("stats.totalLiked")}</span>
                                            </div>
                                            <p className="text-3xl font-bold text-like">{stats.totalLiked}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-pass/10 border border-pass/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ThumbsDown className="w-5 h-5 text-pass" />
                                                <span className="text-sm text-white/60">{t("stats.totalPassed")}</span>
                                            </div>
                                            <p className="text-3xl font-bold text-pass">{stats.totalPassed}</p>
                                        </div>
                                    </div>

                                    {/* Top Liked Genres */}
                                    {topLiked.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-like" />
                                                {t("stats.likedGenres")}
                                            </h3>
                                            <div className="space-y-3">
                                                {topLiked.map((genre) => (
                                                    <GenreBar
                                                        key={genre.genre}
                                                        genre={genre.genre}
                                                        value={genre.liked}
                                                        max={maxLiked}
                                                        color="bg-gradient-to-r from-like to-green-400"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Passed Genres */}
                                    {topPassed.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <ThumbsDown className="w-4 h-4 text-pass" />
                                                {t("stats.passedGenres")}
                                            </h3>
                                            <div className="space-y-3">
                                                {topPassed.map((genre) => (
                                                    <GenreBar
                                                        key={genre.genre}
                                                        genre={genre.genre}
                                                        value={genre.passed}
                                                        max={maxPassed}
                                                        color="bg-gradient-to-r from-pass to-red-400"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {hasData && (
                            <div className="p-4 border-t border-white/10">
                                <button
                                    onClick={clearStats}
                                    className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-medium transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear Stats
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
