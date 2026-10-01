"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Star, Loader2 } from "lucide-react";

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

export default function SearchBox() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const warmedRef = useRef<Set<number>>(new Set());

    // 300ms debounce; eski istek iptal edilir
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
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
                if ((err as Error).name !== "AbortError") setError("Arama yapılamadı, tekrar dene.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (results[0]) router.push(`/film/${results[0].id}`);
                }}
                className="relative"
            >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bir film ara… (ör. Matrix, Yedi, Ruhların Kaçışı)"
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-card border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60"
                />
                {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 animate-spin" />}
            </form>

            {error && <p className="mt-4 text-sm text-pass-glow">{error}</p>}

            {results.length > 0 && (
                <ul className="mt-4 divide-y divide-white/5 rounded-2xl bg-card border border-white/10 overflow-hidden">
                    {results.map((r) => (
                        <li key={r.id}>
                            <Link href={`/film/${r.id}`} className="flex gap-4 p-3 hover:bg-card-hover transition-colors">
                                <div className="relative w-12 h-[72px] shrink-0 rounded-md overflow-hidden bg-white/5">
                                    {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="48px" className="object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-white truncate">{r.title}</span>
                                        {r.year && <span className="text-sm text-white/40">{r.year}</span>}
                                        {r.rating > 0 && (
                                            <span className="ml-auto flex items-center gap-1 text-xs text-white/50">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
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
                    ))}
                </ul>
            )}

            {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
                <p className="mt-4 text-sm text-white/40">Sonuç bulunamadı.</p>
            )}
        </div>
    );
}
