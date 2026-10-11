"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsEnabled, currentVisit, track } from "@/lib/analytics/client";
import type { EventData } from "@/lib/analytics/schema";
import Image from "next/image";
import { Star } from "lucide-react";
import type { FilmDTO } from "@/lib/recommend/types";
import { filmPath } from "@/lib/filmUrl";
import type { Platform } from "@/lib/recommend/providers";

// Poster kartı: benzer filmler, mod ve tarif sonuçlarında ortak.
// reasons verilirse "neden önerildi?" satırlarının ilk 2'si gösterilir, tamamı tooltip'te.
// platforms verilirse Türkiye'de izlenebildiği platformların logoları (en fazla 3).
export default function FilmCard({ film, reasons, platforms, index = 0, context, sourceFilmId }: { film: FilmDTO; reasons?: string[]; platforms?: Platform[]; index?: number; context?: "similar" | "vibe" | "blend" | "mood"; sourceFilmId?: number }) {
    const ref = useRef<HTMLLIElement>(null);
    const pathname = usePathname();
    const params = useSearchParams();
    useEffect(() => {
        if (!analyticsEnabled() || context !== "similar" || !sourceFilmId || !ref.current || !("IntersectionObserver" in window)) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const data: EventData = { film_id: film.id, source_film_id: sourceFilmId, rank: index + 1, context };
        const visit = currentVisit();
        const observer = new IntersectionObserver(([entry]) => {
            if (timer) clearTimeout(timer);
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible") {
                timer = setTimeout(() => {
                    if (document.visibilityState === "visible" && currentVisit() === visit) track("recommendation_impression", data, `impression:${sourceFilmId}:${film.id}:${index}`);
                }, 1000);
            }
        }, { threshold: [0, 0.5] });
        const visibility = () => {
            if (timer) clearTimeout(timer);
            if (document.visibilityState === "visible" && ref.current) { observer.unobserve(ref.current); observer.observe(ref.current); }
        };
        observer.observe(ref.current);
        document.addEventListener("visibilitychange", visibility);
        return () => { observer.disconnect(); if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
    }, [film.id, sourceFilmId, index, context, pathname, params]);
    const onClick = () => track(context === "similar" && sourceFilmId ? "recommendation_clicked" : "film_clicked", { film_id: film.id, source_film_id: sourceFilmId, rank: index + 1, context });
    return (
        <li ref={ref} className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
            <Link href={filmPath(film.id, film.title)} className="group block" onClick={onClick}>
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-accent/50 group-hover:shadow-glow-accent">
                    {film.posterUrl ? (
                        <Image
                            src={film.posterUrl}
                            alt={film.title}
                            fill
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-3 text-center font-display text-white/40">{film.title}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                    {film.rating != null && film.rating > 0 && (
                        <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs text-white">
                            <Star className="w-3 h-3 fill-accent-glow text-accent-glow" aria-hidden />
                            {film.rating.toFixed(1)}
                        </span>
                    )}
                </div>
                <h3 className="mt-3 font-display text-[17px] leading-snug text-white transition-colors group-hover:text-accent-glow">{film.title}</h3>
                <p className="mt-0.5 text-xs text-white/40">{[film.year, film.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</p>
                {platforms && platforms.length > 0 && (
                    <div className="mt-2 flex items-center gap-1" title={platforms.map((p) => p.name).join(", ")}>
                        {platforms.slice(0, 3).map((p) =>
                            p.logoUrl ? (
                                <Image key={p.id} src={p.logoUrl} alt={p.name} width={20} height={20} className="rounded" />
                            ) : (
                                <span key={p.id} className="text-[10px] text-white/50">
                                    {p.name}
                                </span>
                            )
                        )}
                        {platforms.length > 3 && <span className="text-[10px] text-white/40">+{platforms.length - 3}</span>}
                    </div>
                )}
                {reasons && reasons.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-accent-glow/70" title={reasons.join("\n")}>
                        {reasons.slice(0, 2).map((r) => (
                            <li key={r} className="truncate before:content-['—_'] before:text-accent/50">
                                {r}
                            </li>
                        ))}
                    </ul>
                )}
            </Link>
        </li>
    );
}
