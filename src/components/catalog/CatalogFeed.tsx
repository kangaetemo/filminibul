"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FilmCard from "@/components/film/FilmCard";
import type { FilmDTO } from "@/lib/recommend/types";
import { filmPath } from "@/lib/filmUrl";
import { jsonLd, pagePath, PAGE_SIZE } from "@/lib/catalog/pilot";
import { pageAddress, pageAtViewport } from "@/lib/catalog/scrollPage.mjs";

export type CatalogChunk = { page: number; pages: number; total: number; films: FilmDTO[]; notes?: Record<number, string> };

export default function CatalogFeed({ initial, path, title, structuredData, context }: { initial: CatalogChunk; path: string; title: string; structuredData: Record<string, unknown>[]; context: "list" | "person" }) {
    const [chunks, setChunks] = useState([initial]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [currentPage, setCurrentPage] = useState(initial.page);
    const grid = useRef<HTMLUListElement>(null);
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

    useEffect(() => {
        const starts = Array.from(grid.current?.querySelectorAll<HTMLLIElement>("li[data-catalog-start]") ?? []);
        let frame = 0;
        const update = () => {
            frame = 0;
            setCurrentPage(pageAtViewport(starts.map(element => ({ page: Number(element.dataset.catalogStart), top: element.getBoundingClientRect().top })), window.innerHeight, initial.page));
        };
        const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.cancelAnimationFrame(frame); };
    }, [chunks, initial.page]);

    useEffect(() => {
        if (window.location.pathname !== path) return;
        const address = pageAddress(window.location.href, currentPage);
        if (address !== window.location.pathname + window.location.search + window.location.hash) {
            // Next's native History integration retains the loaded cards and scroll position.
            // Replace the current entry so ordinary scrolling does not fill browser history.
            window.history.replaceState(null, "", address);
        }
        const canonical = "https://filminibul.com" + pagePath(path, currentPage);
        const pageTitle = `${title}${currentPage > 1 ? ` · Sayfa ${currentPage}` : ""} · Filminibul`;
        document.title = pageTitle;
        document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
        document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);
        document.querySelector('meta[property="og:title"]')?.setAttribute("content", pageTitle);
    }, [currentPage, path, title]);

    const current = chunks.find(chunk => chunk.page === currentPage) ?? initial;
    const site = "https://filminibul.com";
    const url = site + pagePath(path, current.page);
    const structured = { "@context": "https://schema.org", "@graph": [
        ...structuredData,
        { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Filminibul", item: site },
            { "@type": "ListItem", position: 2, name: "Film listeleri", item: `${site}/listeler` },
            { "@type": "ListItem", position: 3, name: title, item: url },
        ] },
        { "@type": "ItemList", name: title, url, numberOfItems: current.films.length,
            itemListElement: current.films.map((film, i) => ({ "@type": "ListItem", position: (current.page - 1) * PAGE_SIZE + i + 1, name: film.title, url: site + filmPath(film.id, film.title) })) },
    ] };

    return <>
        <ul ref={grid} className="movie-grid" aria-label="Filmler" aria-busy={loading}>
            {chunks.flatMap(chunk => chunk.films.map((film, index) => <FilmCard key={film.id} film={film} index={index} page={chunk.page} context={context} creditLabel={chunk.notes?.[film.id]} priority={chunk.page === initial.page && index < 4} />))}
        </ul>
        <div ref={sentinel} className="mt-6 flex flex-col items-center gap-3 text-center">
            <p role="status" aria-live="polite" className="text-sm text-muted">{loading ? "Sıradaki filmler yükleniyor…" : error ? "Sıradaki filmler yüklenemedi. Yeniden deneyebilirsin." : hasMore ? `${shown} film gösteriliyor · Aşağı indikçe devamı yüklenir` : `${shown} film gösteriliyor · Seçkinin sonuna geldin.`}</p>
            {hasMore && <a href={pagePath(path, last.page + 1)} rel="next" aria-disabled={loading} onClick={event => { event.preventDefault(); if (!loading) void loadMore(); }} className={`button-secondary${loading ? " opacity-50" : ""}`}>{error ? "Yeniden dene" : "Daha fazla film"}</a>}
        </div>
        <noscript>{initial.page > 1 && <nav aria-label="Sayfalı gezinme" className="mt-5 flex justify-center gap-4 text-sm underline"><a href={path}>İlk sayfa</a><a href={pagePath(path, initial.page - 1)} rel="prev">Önceki sayfa</a></nav>}</noscript>
        <script id="catalog-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
    </>;
}
