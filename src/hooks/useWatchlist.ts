"use client";

import { useState, useEffect, useCallback } from "react";
import { Movie } from "@/data/mockData";

const WATCHLIST_KEY = "filminibul_watchlist";

export function useWatchlist() {
    const [watchlist, setWatchlist] = useState<Movie[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load watchlist from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(WATCHLIST_KEY);
            if (stored) {
                setWatchlist(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Error loading watchlist:", error);
        }
        setIsLoaded(true);
    }, []);

    // Save watchlist to localStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
            } catch (error) {
                console.error("Error saving watchlist:", error);
            }
        }
    }, [watchlist, isLoaded]);

    const addToWatchlist = useCallback((movie: Movie) => {
        setWatchlist((prev) => {
            // Don't add duplicates
            if (prev.some((m) => m.id === movie.id)) {
                return prev;
            }
            return [...prev, movie];
        });
    }, []);

    const removeFromWatchlist = useCallback((movieId: number) => {
        setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
    }, []);

    const isInWatchlist = useCallback(
        (movieId: number) => {
            return watchlist.some((m) => m.id === movieId);
        },
        [watchlist]
    );

    const clearWatchlist = useCallback(() => {
        setWatchlist([]);
    }, []);

    return {
        watchlist,
        isLoaded,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        clearWatchlist,
    };
}
