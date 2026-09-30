"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Plus, Loader2, Check, AlertTriangle } from "lucide-react";

interface Result {
    id: number;
    title: string;
    originalTitle: string | null;
    year: number | null;
    voteCount: number;
    rating: number;
    posterUrl: string | null;
    inCatalog: boolean;
}

type AddState = { status: "adding" } | { status: "done"; warnings: string[] } | { status: "error"; message: string };

// Admin: TMDB'de film ara, katalogda olmayanı tek tıkla ekle
export default function CatalogAdder() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [states, setStates] = useState<Record<number, AddState>>({});
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/catalog/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                if (res.ok) setResults((await res.json()).results);
            } catch {
                // iptal edilen istek
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    async function add(id: number) {
        setStates((s) => ({ ...s, [id]: { status: "adding" } }));
        const res = await fetch("/api/admin/catalog/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        const data = await res.json().catch(() => ({}));
        setStates((s) => ({
            ...s,
            [id]: res.ok ? { status: "done", warnings: data.warnings ?? [] } : { status: "error", message: data.error ?? "Eklenemedi" },
        }));
        if (res.ok) setResults((rs) => rs.map((r) => (r.id === id ? { ...r, inCatalog: true } : r)));
    }

    return (
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="TMDB'de film ara (ör. Primer, Enemy)…"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-background border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
            </div>

            {results.length > 0 && (
                <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/5 overflow-hidden">
                    {results.map((r) => {
                        const st = states[r.id];
                        return (
                            <li key={r.id} className="flex items-center gap-3 p-2.5 bg-background/40">
                                <div className="relative w-8 h-12 shrink-0 rounded bg-white/5 overflow-hidden">
                                    {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="32px" className="object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm text-white truncate">
                                        {r.title} <span className="text-white/40">{r.year ?? ""}</span>
                                    </div>
                                    <div className="text-xs text-white/40 truncate">
                                        {r.originalTitle ? `${r.originalTitle} · ` : ""}
                                        {r.voteCount.toLocaleString("tr-TR")} oy · TMDB #{r.id}
                                    </div>
                                    {st?.status === "done" && st.warnings.length > 0 && (
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-yellow-300">
                                            <AlertTriangle className="w-3 h-3" /> {st.warnings.join(" · ")}
                                        </div>
                                    )}
                                    {st?.status === "error" && <div className="mt-0.5 text-xs text-pass-glow">{st.message}</div>}
                                </div>
                                {r.inCatalog ? (
                                    <Link
                                        href={`/film/${r.id}`}
                                        target="_blank"
                                        className="flex items-center gap-1 text-xs text-like-glow hover:underline shrink-0"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {st?.status === "done" ? "Eklendi · gör" : "Katalogda"}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => add(r.id)}
                                        disabled={st?.status === "adding"}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-xs text-white disabled:opacity-50 shrink-0"
                                    >
                                        {st?.status === "adding" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        Kataloğa ekle
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
