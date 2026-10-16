"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsEnabled, currentVisit, track } from "@/lib/analytics/client";
import type { EventData } from "@/lib/analytics/schema";
import Image from "next/image";
import { Star } from "lucide-react";
import SaveButton from "./SaveButton";
import type { FilmDTO } from "@/lib/recommend/types";
import { filmPath } from "@/lib/filmUrl";
import type { Platform } from "@/lib/recommend/providers";

// Poster kartı: benzer filmler, mod ve tarif sonuçlarında ortak.
// reasons verilirse "neden önerildi?" satırlarının ilk 2'si gösterilir, tamamı tooltip'te.
// platforms verilirse Türkiye'de izlenebildiği platformların logoları (en fazla 3).
export default function FilmCard({ film, reasons, reasonsEn, platforms, index = 0, context, sourceFilmId, page, creditLabel }: { film: FilmDTO; reasons?: string[]; reasonsEn?: string[]; platforms?: Platform[]; index?: number; context?: "similar" | "vibe" | "blend" | "mood" | "list" | "person"; sourceFilmId?: number; page?: number; creditLabel?: string }) {
    const { language, t } = useLanguage();
    const title = language === "en" ? film.titleEn || film.title : film.title;
    const displayedReasons = language === "en" ? reasonsEn || reasons : reasons;
    const ref = useRef<HTMLLIElement>(null);
    const [failedPoster, setFailedPoster] = useState(false);
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
    const onClick = () => track(context === "similar" && sourceFilmId ? "recommendation_clicked" : "film_clicked", { film_id: film.id, source_film_id: sourceFilmId, rank: index + 1, context, page });
    return (
        <li ref={ref} className="min-w-0" data-catalog-start={page && index === 0 ? page : undefined}>
            <div className="group relative">
                <Link href={filmPath(film.id, film.title)} onClick={onClick} className="relative block aspect-[2/3] overflow-hidden rounded-lg bg-ink/5 ring-1 ring-ink/10 transition-shadow hover:shadow-glow-card" aria-label={`${title} ${language === "en" ? "film details" : "film ayrıntıları"}`}>
                    {film.posterUrl && !failedPoster ? <Image src={film.posterUrl} alt={`${title} ${language === "en" ? "poster" : "afişi"}`} fill sizes="(min-width: 1280px) 218px, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" onError={() => setFailedPoster(true)} /> : <span className="absolute inset-0 flex items-center justify-center p-5 text-center text-lg font-bold text-muted">{title}</span>}
                </Link>
                <SaveButton film={film} compact />
            </div>
            <Link href={filmPath(film.id, film.title)} onClick={onClick} className="mt-3 block text-ink hover:underline underline-offset-4"><h3 className="text-[15px] font-extrabold leading-snug tracking-tight sm:text-base">{title}</h3></Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                {film.year && <span>{film.year}</span>}
                {film.rating != null && film.rating > 0 && <span className="inline-flex items-center gap-1" title={language === "en" ? "TMDB rating" : "TMDB puanı"} aria-label={`${language === "en" ? "TMDB rating" : "TMDB puanı"} ${film.rating.toFixed(1)}`}><Star className="h-3 w-3 text-accent-ink" aria-hidden />{film.rating.toFixed(1)}</span>}
            </div>
            {film.genres.length > 0 && <p className="mt-1 text-[11px] leading-relaxed text-muted">{film.genres.slice(0, 2).map(t).join(" · ")}</p>}
            {platforms && platforms.length > 0 && <div className="mt-2 flex items-center gap-1" title={platforms.map(p => p.name).join(", ")}>{platforms.slice(0, 3).map(p => p.logoUrl ? <Image key={p.id} src={p.logoUrl} alt={p.name} width={20} height={20} className="rounded" /> : <span key={p.id} className="text-[10px] text-muted">{p.name}</span>)}{platforms.length > 3 && <span className="text-[10px] text-muted">+{platforms.length - 3}</span>}</div>}
            {displayedReasons && displayedReasons.length > 0 && <div className="mt-3 border-t border-line pt-2.5"><p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-accent-ink"><T text={"Neden bu film?"} /></p><ul className="space-y-1 text-[11px] leading-relaxed text-muted">{displayedReasons.slice(0, 2).map(r => <li key={r}><T text={r} /></li>)}</ul></div>}
            {creditLabel && <p className="mt-2 text-xs leading-relaxed text-muted">{creditLabel}</p>}
        </li>
    );
}
