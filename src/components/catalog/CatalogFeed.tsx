"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FilmCard from "@/components/film/FilmCard";
import type { FilmDTO } from "@/lib/recommend/types";

export type CatalogChunk = { page: number; pages: number; total: number; films: FilmDTO[]; notes?: Record<number, string> };

export default function CatalogFeed({ initial, path, context }: { initial: CatalogChunk; path: string; context: "list" | "person" }) {
    const [chunks, setChunks] = useState([initial]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);
    const request = useRef<AbortController | null>(null);
    const mounted = useRef(false);
    const last = chunks[chunks.length - 1];
    const hasMore = last.page < last.pages;
    const shown = chunks.reduce((sum, chunk) => sum + chunk.films.length, 0);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; request.current?.abort(); };
    }, []);

    const loadMore = useCallback(async () => {
        if (request.current || !hasMore) return;
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        setError(false);
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
            const query = new URLSearchParams({ path, page: String(last.page + 1) });
            const response = await fetch(`/api/catalog/page?${query}`, { signal: controller.signal });
            if (!response.ok) throw new Error("Catalog unavailable");
            const next: CatalogChunk = await response.json();
            if (next.page !== last.page + 1 || !Array.isArray(next.films) || !next.films.length) throw new Error("Invalid page");
            if (mounted.current) setChunks(current => {
                const ids = new Set(current.flatMap(chunk => chunk.films.map(film => film.id)));
                return [...current, { ...next, films: next.films.filter(film => !ids.has(film.id)) }];
            });
        } catch {
            if (mounted.current) setError(true);
        } finally {
            clearTimeout(timeout);
            request.current = null;
            if (mounted.current) setLoading(false);
        }
    }, [hasMore, last.page, path]);

    useEffect(() => {
        if (!hasMore || loading || error || !sentinel.current || !("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) void loadMore();
        }, { rootMargin: "600px 0px" });
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [hasMore, loading, error, loadMore]);

    return <>
        <ul className="movie-grid" aria-label="Filmler" aria-busy={loading}>
            {chunks.flatMap(chunk => chunk.films.map((film, index) => <FilmCard key={film.id} film={film} index={index} page={chunk.page} context={context} creditLabel={chunk.notes?.[film.id]} />))}
        </ul>
        <div ref={sentinel} className="mt-8 flex min-h-16 flex-col items-center gap-3 text-center">
            <p role="status" aria-live="polite" className="text-sm text-muted">{loading ? "Sıradaki filmler yükleniyor…" : error ? "Sıradaki filmler yüklenemedi. Yeniden deneyebilirsin." : hasMore ? `${shown} film gösteriliyor · Aşağı indikçe devamı yüklenir` : "Bu seçkinin sonuna geldin. Yeni bir hikâye keşfet!"}</p>
            {hasMore && <button type="button" onClick={() => void loadMore()} disabled={loading} className="button-secondary disabled:opacity-50">{error ? "Yeniden dene" : "Daha fazla film"}</button>}
        </div>
    </>;
}
