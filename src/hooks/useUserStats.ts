"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Movie } from "@/data/mockData";

export interface GenreStats {
    genre: string;
    liked: number;
    passed: number;
}

export interface UserStats {
    totalLiked: number;
    totalPassed: number;
    genreStats: GenreStats[];
    lastUpdated: string;
}

const STORAGE_KEY = "filminibul_user_stats";

const defaultStats: UserStats = {
    totalLiked: 0,
    totalPassed: 0,
    genreStats: [],
    lastUpdated: new Date().toISOString(),
};

export function useUserStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStats>(defaultStats);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load stats from localStorage on mount
    useEffect(() => {
        const storageKey = user ? `${STORAGE_KEY}_${user.uid}` : STORAGE_KEY;
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                setStats(JSON.parse(stored));
            } catch {
                setStats(defaultStats);
            }
        } else {
            setStats(defaultStats);
        }
        setIsLoaded(true);
    }, [user]);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        if (!isLoaded) return;

        const storageKey = user ? `${STORAGE_KEY}_${user.uid}` : STORAGE_KEY;
        localStorage.setItem(storageKey, JSON.stringify(stats));
    }, [stats, user, isLoaded]);

    const updateGenreStats = useCallback((genres: string[], action: "liked" | "passed") => {
        setStats((prev) => {
            const newGenreStats = [...prev.genreStats];

            genres.forEach((genre) => {
                const existing = newGenreStats.find((g) => g.genre === genre);

                if (existing) {
                    if (action === "liked") {
                        existing.liked += 1;
                    } else {
                        existing.passed += 1;
                    }
                } else {
                    newGenreStats.push({
                        genre,
                        liked: action === "liked" ? 1 : 0,
                        passed: action === "passed" ? 1 : 0,
                    });
                }
            });

            // Sort by total interactions
            newGenreStats.sort((a, b) => (b.liked + b.passed) - (a.liked + a.passed));

            return {
                ...prev,
                totalLiked: action === "liked" ? prev.totalLiked + 1 : prev.totalLiked,
                totalPassed: action === "passed" ? prev.totalPassed + 1 : prev.totalPassed,
                genreStats: newGenreStats,
                lastUpdated: new Date().toISOString(),
            };
        });
    }, []);

    const recordLike = useCallback((movie: Movie) => {
        updateGenreStats(movie.genres, "liked");
    }, [updateGenreStats]);

    const recordPass = useCallback((movie: Movie) => {
        updateGenreStats(movie.genres, "passed");
    }, [updateGenreStats]);

    const clearStats = useCallback(() => {
        setStats(defaultStats);
    }, []);

    // Get top liked genres (sorted by like ratio)
    const getTopLikedGenres = useCallback((limit: number = 5): GenreStats[] => {
        return stats.genreStats
            .filter((g) => g.liked > 0)
            .sort((a, b) => {
                const ratioA = a.liked / (a.liked + a.passed);
                const ratioB = b.liked / (b.liked + b.passed);
                return ratioB - ratioA;
            })
            .slice(0, limit);
    }, [stats.genreStats]);

    // Get top passed genres
    const getTopPassedGenres = useCallback((limit: number = 5): GenreStats[] => {
        return stats.genreStats
            .filter((g) => g.passed > 0)
            .sort((a, b) => {
                const ratioA = a.passed / (a.liked + a.passed);
                const ratioB = b.passed / (b.liked + b.passed);
                return ratioB - ratioA;
            })
            .slice(0, limit);
    }, [stats.genreStats]);

    return {
        stats,
        isLoaded,
        recordLike,
        recordPass,
        clearStats,
        getTopLikedGenres,
        getTopPassedGenres,
    };
}
