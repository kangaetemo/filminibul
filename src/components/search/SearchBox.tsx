"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, Sparkles, Star } from "lucide-react";

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

const VIBE_MIN_CHARS = 4;
const VIBE_MAX_CHARS = 240;
// Bu kadar ya da daha fazla kelime yazıldıysa kullanıcı büyük ihtimalle film adı değil, tarif yazıyor
const DESCRIBING_WORDS = 4;

const vibeHref = (q: string) => `/ara?q=${encodeURIComponent(q.trim())}`;

// Tek kutu iki iş yapar: film adı yazınca katalog/TMDB önerileri, tarif yazınca (ya da ilk satırı seçince) /ara.
// `sm`: üst çubuk için kompakt hâl; öneri listesi sayfayı itmeden kutunun altına biner.
export default function SearchBox({ initialQuery = "", autoFocus = true, size = "lg" }: { initialQuery?: string; autoFocus?: boolean; size?: "lg" | "md" | "sm" }) {
    const router = useRouter();
    const listId = useId();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [active, setActive] = useState(-1); // 0 = "tarif et" satırı, 1.. = film sonuçları
    const [open, setOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const warmedRef = useRef<Set<number>>(new Set());
    const boxRef = useRef<HTMLDivElement>(null);

    const trimmed = query.trim();
    const canDescribe = trimmed.length >= VIBE_MIN_CHARS;
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    // 300ms debounce; eski istek iptal edilir
    useEffect(() => {
        const q = trimmed;
        if (q.length < 2 || q === initialQuery.trim()) {
            setResults([]);
            setError(null);
            return;
        }
        const timer = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            try {
                const res = await fetch(`/api/search-movie?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Arama başarısız");
                setResults(data.results);
                setError(null);
                setActive(-1);
                // İlk katalog sonuçlarının benzer film sorgusunu önceden ısıt (soğuk HNSW sorgusu 1–4 sn sürüyor);
                // kullanıcı tıkladığında sunucu önbelleğinden anında gelir. Sonuç kullanılmaz.
                (data.results as SearchResult[])
                    .filter((r) => r.inCatalog && !warmedRef.current.has(r.id))
                    .slice(0, 2)
                    .forEach((r) => {
                        warmedRef.current.add(r.id);
                        fetch(`/api/similar/${r.id}`).catch(() => {});
                    });
            } catch (err) {
                if ((err as Error).name !== "AbortError") setError("Film önerileri alınamadı, ama tarif ederek arayabilirsin.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmed]);

    // Kutunun dışına tıklayınca öneri listesini kapat
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const itemCount = (canDescribe ? 1 : 0) + results.length;
    const goVibe = () => router.push(vibeHref(trimmed));
    const goFilm = (id: number) => router.push(`/film/${id}`);

    const activate = (index: number) => {
        if (canDescribe && index === 0) return goVibe();
        const r = results[index - (canDescribe ? 1 : 0)];
        if (r) goFilm(r.id);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!itemCount) return;
            e.preventDefault();
            setOpen(true);
            setActive((a) => (e.key === "ArrowDown" ? (a + 1) % itemCount : (a - 1 + itemCount) % itemCount));
        } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
        }
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (active >= 0) return activate(active);
        if (!canDescribe) return;
        // Çok kelimeli yazıldıysa ya da film sonucu çıkmadıysa tarif; kısa ve eşleşen bir ad ise ilk film
        if (wordCount >= DESCRIBING_WORDS || results.length === 0) return goVibe();
        goFilm(results[0].id);
    };

    const showList = open && trimmed.length >= 2 && (canDescribe || results.length > 0);
    const pad = size === "lg" ? "py-5 text-lg" : size === "md" ? "py-3.5 text-base" : "py-2 text-sm";
    const compact = size === "sm";

    return (
        <div ref={boxRef} className={`relative w-full ${compact ? "" : "max-w-2xl mx-auto"}`}>
            <form onSubmit={onSubmit} className="relative group" role="search">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-accent/0 via-accent/40 to-ember/0 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity" aria-hidden />
                <div className="relative flex items-center rounded-2xl bg-card/90 border border-white/10 group-focus-within:border-accent/50 shadow-glow-card transition-colors">
                    <Search className={`shrink-0 text-white/40 ${compact ? "ml-3.5 w-4 h-4" : "ml-5 w-5 h-5"}`} aria-hidden />
                    <input
                        autoFocus={autoFocus}
                        value={query}
                        maxLength={VIBE_MAX_CHARS}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                            setActive(-1);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        role="combobox"
                        aria-expanded={showList}
                        aria-controls={listId}
                        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                        aria-autocomplete="list"
                        aria-label="Film adı yaz ya da nasıl bir film istediğini anlat"
                        placeholder="Film adı ya da tarif…"
                        className={`min-w-0 flex-1 bg-transparent ${compact ? "px-3" : "px-4"} text-white placeholder:text-white/30 focus:outline-none ${pad}`}
                    />
                    {loading && <Loader2 className="mr-2 w-5 h-5 shrink-0 text-white/40 animate-spin" aria-label="Aranıyor" />}
                    <button
                        type="submit"
                        disabled={!canDescribe}
                        className={`flex shrink-0 items-center gap-2 rounded-xl bg-accent text-sm font-semibold text-black transition hover:bg-accent-glow disabled:cursor-not-allowed disabled:opacity-30 ${compact ? "m-1 px-3 py-1.5" : "m-2 px-4 py-2.5"}`}
                    >
                        {!compact && <span className="hidden sm:inline">Bul</span>}
                        <ArrowRight className="w-4 h-4" aria-hidden />
                    </button>
                </div>
            </form>

            <div className={compact ? "absolute right-0 top-full z-30 w-[min(92vw,30rem)]" : ""}>
            {error && <p className="mt-3 text-sm text-pass-glow">{error}</p>}

            {showList && (
                <ul
                    id={listId}
                    role="listbox"
                    className="mt-3 divide-y divide-white/5 rounded-2xl bg-card/95 backdrop-blur border border-white/10 overflow-hidden shadow-glow-card animate-fade-up"
                >
                    {canDescribe && (
                        <li id={`${listId}-0`} role="option" aria-selected={active === 0}>
                            <Link
                                href={vibeHref(trimmed)}
                                className={`flex items-center gap-4 p-3.5 transition-colors ${active === 0 ? "bg-card-hover" : "hover:bg-card-hover"}`}
                            >
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-glow">
                                    <Sparkles className="w-5 h-5" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-white truncate">&ldquo;{trimmed}&rdquo; gibi bir film bul</span>
                                    <span className="block text-sm text-white/45">Tema, atmosfer ya da hikâyeye göre ara</span>
                                </span>
                                <ArrowRight className="w-4 h-4 shrink-0 text-white/30" aria-hidden />
                            </Link>
                        </li>
                    )}
                    {results.map((r, i) => {
                        const index = i + (canDescribe ? 1 : 0);
                        return (
                            <li key={r.id} id={`${listId}-${index}`} role="option" aria-selected={active === index}>
                                <Link href={`/film/${r.id}`} className={`flex gap-4 p-3 transition-colors ${active === index ? "bg-card-hover" : "hover:bg-card-hover"}`}>
                                    <div className="relative w-12 h-[72px] shrink-0 rounded-md overflow-hidden bg-white/5">
                                        {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="48px" className="object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-white truncate">{r.title}</span>
                                            {r.year && <span className="text-sm text-white/40">{r.year}</span>}
                                            {r.rating > 0 && (
                                                <span className="ml-auto flex items-center gap-1 text-xs text-white/50">
                                                    <Star className="w-3 h-3 fill-accent-glow text-accent-glow" aria-hidden />
                                                    {r.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        {r.originalTitle && <div className="text-xs text-white/40 truncate">{r.originalTitle}</div>}
                                        {r.overview && <p className="mt-1 text-sm text-white/50 line-clamp-2">{r.overview}</p>}
                                        {!r.inCatalog && <span className="mt-1 inline-block text-[11px] text-white/30">Benzer film önerisi yok</span>}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {open && !loading && !error && trimmed.length >= 2 && !canDescribe && results.length === 0 && (
                <p className="mt-3 text-sm text-white/40">Sonuç bulunamadı.</p>
            )}
            </div>
        </div>
    );
}
