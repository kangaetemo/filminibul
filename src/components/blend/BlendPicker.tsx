"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchAnalytics } from "@/lib/analytics/useSearchAnalytics";
import { Loader2, Plus, Search, Shuffle, X } from "lucide-react";

export interface PickedFilm {
    id: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
}

interface SearchResult extends PickedFilm {
    inCatalog: boolean;
}

// İki film seçimi. İkisi de seçilince /karistir?a=..&b=.. adresine gider (sonuçları sunucu çizer).
// Sadece katalogdaki filmler seçilebilir: karıştırmak için iki filmin de embedding'i gerekir.
export default function BlendPicker({ initialA = null, initialB = null }: { initialA?: PickedFilm | null; initialB?: PickedFilm | null }) {
    const router = useRouter();
    const [a, setA] = useState<PickedFilm | null>(initialA);
    const [b, setB] = useState<PickedFilm | null>(initialB);

    const go = (x: PickedFilm | null, y: PickedFilm | null) => {
        if (x && y) router.push(`/karistir?a=${x.id}&b=${y.id}`);
    };

    return (
        <div className="blend-picker grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
            <Slot
                label="Birinci film"
                film={a}
                exclude={b?.id}
                onPick={(f) => {
                    setA(f);
                    go(f, b);
                }}
                onClear={() => setA(null)}
            />
            <div className="blend-plus mt-16 flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent-ink sm:mt-24" aria-hidden>
                <Plus className="h-5 w-5" />
            </div>
            <Slot
                label="İkinci film"
                film={b}
                exclude={a?.id}
                onPick={(f) => {
                    setB(f);
                    go(a, f);
                }}
                onClear={() => setB(null)}
            />
            {a && b && (
                <div className="blend-swap col-span-3 flex justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            setA(b);
                            setB(a);
                        }}
                        className="flex items-center gap-2 text-xs text-muted hover:text-ink"
                    >
                        <Shuffle className="h-3.5 w-3.5" aria-hidden /> Yerlerini değiştir
                    </button>
                </div>
            )}
        </div>
    );
}

function Slot({
    label,
    film,
    exclude,
    onPick,
    onClear,
}: {
    label: string;
    film: PickedFilm | null;
    exclude?: number;
    onPick: (f: PickedFilm) => void;
    onClear: () => void;
}) {
    if (film) {
        return (
            <div className="flex flex-col items-center text-center">
                <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-xl bg-card ring-1 ring-ink/10 shadow-glow-card sm:w-40">
                    {film.posterUrl && <Image src={film.posterUrl} alt={film.title} fill sizes="160px" className="object-cover" />}
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label={`${film.title} seçimini kaldır`}
                        className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white/80 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-3 font-display text-lg leading-tight text-ink">{film.title}</p>
                {film.year && <p className="text-sm text-muted">{film.year}</p>}
            </div>
        );
    }
    return (
        <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
            <FilmSearch exclude={exclude} onPick={onPick} />
        </div>
    );
}

function FilmSearch({ exclude, onPick }: { exclude?: number; onPick: (f: PickedFilm) => void }) {
    const listId = useId();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const abortRef = useRef<AbortController | null>(null);

    const analytics = useSearchAnalytics(query, "blend");
    const trimmed = query.trim();
    const pickable = results.filter((r) => r.inCatalog && r.id !== exclude);

    // 300ms debounce; eski istek iptal edilir
    useEffect(() => {
        if (trimmed.length < 2) {
            setResults([]);
            return;
        }
        abortRef.current?.abort();
        const timer = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            try {
                const res = await fetch(`/api/search-movie?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
                const data = await res.json();
                if (controller.signal.aborted) return;
                setResults(res.ok ? data.results : []);
                if (res.ok) analytics.ready(trimmed, data.results.filter((r: SearchResult) => r.inCatalog && r.id !== exclude).length);
                setActive(-1);
            } catch (err) {
                if ((err as Error).name !== "AbortError") setResults([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => { clearTimeout(timer); abortRef.current?.abort(); };
    }, [trimmed]);

    const pick = (r: SearchResult) => { analytics.commit(); onPick({ id: r.id, title: r.title, year: r.year, posterUrl: r.posterUrl }); };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!pickable.length) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (e.key === "ArrowDown" ? (i + 1) % pickable.length : (i - 1 + pickable.length) % pickable.length));
        } else if (e.key === "Enter") {
            e.preventDefault();
            pick(pickable[Math.max(active, 0)]);
        }
    };

    return (
        <div className="relative">
            <div className="flex items-center rounded-xl border border-line bg-card/90 focus-within:border-accent/50">
                <Search className="ml-3 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded={pickable.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    aria-label="Film adı yaz"
                    placeholder="Film adı…"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
                />
                {loading && <Loader2 className="mr-3 h-4 w-4 shrink-0 animate-spin text-muted" aria-label="Aranıyor" />}
            </div>
            {trimmed.length >= 2 && !loading && results.length > 0 && pickable.length === 0 && (
                <p className="mt-2 text-xs text-muted">Bu filmler henüz kataloğumuzda yok, karıştırılamıyor.</p>
            )}
            {pickable.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 divide-y divide-line overflow-y-auto overscroll-contain rounded-xl border border-line bg-card/95 shadow-glow-card "
                >
                    {pickable.map((r, i) => (
                        <li key={r.id} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                            <button
                                type="button"
                                onClick={() => pick(r)}
                                className={`flex w-full items-center gap-3 p-2.5 text-left transition-colors ${active === i ? "bg-card-hover" : "hover:bg-card-hover"}`}
                            >
                                <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-ink/5">
                                    {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="32px" className="object-cover" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                                    {r.year && <span className="text-xs text-muted">{r.year}</span>}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
