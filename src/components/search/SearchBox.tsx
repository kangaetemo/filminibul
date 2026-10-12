"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, MessageSquareText, Star } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { useSearchAnalytics } from "@/lib/analytics/useSearchAnalytics";
import { filmPath } from "@/lib/filmUrl";

interface SearchResult {
    id: number;
    title: string;
    originalTitle: string | null;
    year: number | null;
    overview: string | null;
    rating: number;
    posterUrl: string | null;
    inCatalog: boolean;
}

const vibeHref = (q: string) => `/ara?q=${encodeURIComponent(q.trim())}`;

export default function SearchBox({ initialQuery = "", autoFocus = true, size = "lg", mode = "auto" }: {
    initialQuery?: string;
    autoFocus?: boolean;
    size?: "lg" | "md" | "sm";
    mode?: "auto" | "film" | "vibe";
}) {
    const router = useRouter();
    const listId = useId();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [active, setActive] = useState(-1);
    const [open, setOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const warmedRef = useRef<Set<number>>(new Set());
    const boxRef = useRef<HTMLDivElement>(null);
    const analytics = useSearchAnalytics(query, "search");
    const trimmed = query.trim();
    const canDescribe = trimmed.length >= 4;
    const hasVibeOption = mode === "auto" && canDescribe;
    const compact = size === "sm";

    useEffect(() => {
        if (trimmed.length < 2 || trimmed === initialQuery.trim() || mode === "vibe") {
            setResults([]);
            setError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const timer = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            try {
                const res = await fetch(`/api/search-movie?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Arama başarısız");
                if (controller.signal.aborted) return;
                setResults(data.results);
                analytics.ready(trimmed, data.results.length);
                setError(null);
                setActive(-1);
                (data.results as SearchResult[]).filter(r => r.inCatalog && !warmedRef.current.has(r.id)).slice(0, 2).forEach(r => {
                    warmedRef.current.add(r.id);
                    fetch(`/api/similar/${r.id}`).catch(() => {});
                });
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    setResults([]);
                    setError("Film adları şu an yüklenemedi. Biraz sonra tekrar dene ya da tarif ederek ara.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => { clearTimeout(timer); abortRef.current?.abort(); };
        // The analytics hook keeps the pending search in refs; only the query restarts the request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmed, mode, initialQuery]);

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);

    useEffect(() => {
        if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }, [active, listId]);

    const recordFilm = (r: SearchResult) => track("film_clicked", { film_id: r.id, context: "search", search_id: analytics.commit(), rank: results.findIndex(item => item.id === r.id) + 1 });
    const goFilm = (r: SearchResult) => { recordFilm(r); setOpen(false); router.push(filmPath(r.id, r.title)); };
    const itemCount = (hasVibeOption ? 1 : 0) + results.length;
    const activate = (index: number) => {
        if (hasVibeOption && index === 0) return router.push(vibeHref(trimmed));
        const r = results[index - (hasVibeOption ? 1 : 0)];
        if (r) goFilm(r);
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && itemCount) {
            e.preventDefault();
            setOpen(true);
            setActive(a => e.key === "ArrowDown" ? (a + 1) % itemCount : (a - 1 + itemCount) % itemCount);
        } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
        }
    };
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        if (open && active >= 0) return activate(active);
        if (mode === "vibe") { if (canDescribe) router.push(vibeHref(trimmed)); return; }
        if (mode === "film") { if (results[0]) goFilm(results[0]); else setOpen(true); return; }
        if (results[0] && trimmed.split(/\s+/).length < 4) return goFilm(results[0]);
        if (canDescribe) router.push(vibeHref(trimmed));
    };
    const showList = open && mode !== "vibe" && trimmed.length >= 2 && (hasVibeOption || results.length > 0);
    const buttonText = mode === "film" ? "Benzerlerini bul" : mode === "vibe" ? "Filmimi bul" : "Bul";
    const canSubmit = mode === "vibe" ? canDescribe : trimmed.length >= 2;

    return (
        <div ref={boxRef} className={`relative w-full text-ink ${compact ? "" : "mx-auto max-w-2xl"}`}>
            <form onSubmit={onSubmit} role="search">
                <div className={`flex items-center rounded-lg border border-line bg-card shadow-glow-card focus-within:border-accent-ink ${compact ? "" : "p-1.5"}`}>
                    <Search className={`shrink-0 text-muted ${compact ? "ml-3 h-4 w-4" : "ml-3 h-5 w-5"}`} aria-hidden />
                    <input
                        autoFocus={autoFocus}
                        value={query}
                        maxLength={240}
                        onChange={e => { setQuery(e.target.value); setResults([]); setOpen(true); setActive(-1); }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        role={mode === "vibe" ? undefined : "combobox"}
                        aria-expanded={mode === "vibe" ? undefined : showList}
                        aria-controls={mode === "vibe" ? undefined : listId}
                        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
                        aria-autocomplete={mode === "vibe" ? undefined : "list"}
                        aria-label={mode === "film" ? "Sevdiğin filmin adı" : mode === "vibe" ? "Nasıl bir film istediğini anlat" : "Film adı yaz ya da nasıl bir film istediğini anlat"}
                        placeholder={mode === "film" ? "Mesela Yıldızlararası…" : mode === "vibe" ? "Nasıl bir film izlemek istersin?" : "Film adı ya da tarif…"}
                        className={`min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-muted focus:outline-none ${compact ? "py-3 text-sm" : "py-3.5 text-base"}`}
                    />
                    {loading && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted" aria-label="Aranıyor" />}
                    <button type="submit" aria-label={buttonText} disabled={!canSubmit || loading} className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-accent text-sm font-extrabold text-ink transition-colors hover:bg-accent-glow disabled:cursor-not-allowed disabled:opacity-45 ${compact ? "m-1 px-3" : "px-3 sm:px-5"}`}>
                        {!compact && <span className="hidden sm:inline">{buttonText}</span>}<ArrowRight className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            </form>
            <div className={`absolute top-full z-40 mt-2 ${compact ? "right-0 w-[min(90vw,30rem)]" : "left-0 right-0"}`}>
                {open && error && <p role="alert" className="rounded-lg border border-line bg-card p-4 text-sm text-ink">{error} {canDescribe && <Link href={vibeHref(trimmed)} className="font-bold underline">Tarif olarak ara</Link>}</p>}
                {showList && !error && <ul id={listId} role="listbox" className="max-h-[min(65vh,32rem)] divide-y divide-line overflow-y-auto overscroll-contain rounded-lg border border-line bg-card shadow-glow-card">
                    {hasVibeOption && <li id={`${listId}-0`} role="option" aria-selected={active === 0}>
                        <Link href={vibeHref(trimmed)} className={`flex items-center gap-3 p-3.5 ${active === 0 ? "bg-card-hover" : "hover:bg-card-hover"}`}>
                            <MessageSquareText className="h-5 w-5 shrink-0 text-accent-ink" aria-hidden /><span className="min-w-0"><span className="block truncate text-sm font-bold">“{trimmed}” gibi bir film bul</span><span className="text-xs text-muted">Tema, atmosfer ya da hikâyeye göre ara</span></span><ArrowRight className="ml-auto h-4 w-4 shrink-0" aria-hidden />
                        </Link>
                    </li>}
                    {results.map((r, i) => {
                        const index = i + (hasVibeOption ? 1 : 0);
                        return <li key={r.id} id={`${listId}-${index}`} role="option" aria-selected={active === index}>
                            <Link href={filmPath(r.id, r.title)} onClick={() => { recordFilm(r); setOpen(false); }} className={`flex gap-3 p-3 ${active === index ? "bg-card-hover" : "hover:bg-card-hover"}`}>
                                <span className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded bg-ink/5">{r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="44px" className="object-cover" />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline gap-2"><span className="truncate text-sm font-extrabold">{r.title}</span>{r.rating > 0 && <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-muted" title="TMDB puanı"><Star className="h-3 w-3" aria-hidden />{r.rating.toFixed(1)}</span>}</span>
                                    <span className="mt-0.5 block truncate text-xs text-muted">{[r.year, r.originalTitle].filter(Boolean).join(" · ")}</span>
                                    {r.overview && <span className="mt-1 line-clamp-1 text-xs text-muted">{r.overview}</span>}
                                    {!r.inCatalog && <span className="mt-1 block text-[10px] text-muted">Henüz benzer film önerisi yok</span>}
                                </span>
                            </Link>
                        </li>;
                    })}
                </ul>}
                {open && mode === "film" && !loading && !error && trimmed.length >= 2 && results.length === 0 && <p role="status" className="rounded-lg border border-line bg-card p-4 text-sm text-muted">Bu adla film bulunamadı. Başka bir adla dene{canDescribe && <> ya da <Link href={vibeHref(trimmed)} className="font-bold text-ink underline">tarif ederek ara</Link></>}.</p>}
            </div>
        </div>
    );
}
