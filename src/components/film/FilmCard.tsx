import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { FilmDTO } from "@/lib/recommend/types";

// Poster kartı: benzer filmler ve mod sayfalarında ortak.
// reasons verilirse "neden önerildi?" satırlarının ilk 2'si gösterilir, tamamı tooltip'te.
export default function FilmCard({ film, reasons }: { film: FilmDTO; reasons?: string[] }) {
    return (
        <li>
            <Link href={`/film/${film.id}`} className="group block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card">
                    {film.posterUrl ? (
                        <Image
                            src={film.posterUrl}
                            alt={film.title}
                            fill
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-white/40">{film.title}</div>
                    )}
                    {film.rating != null && film.rating > 0 && (
                        <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 text-xs text-white">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {film.rating.toFixed(1)}
                        </span>
                    )}
                </div>
                <h3 className="mt-2 font-semibold text-white leading-tight group-hover:text-accent-glow transition-colors">{film.title}</h3>
                <p className="text-xs text-white/40">{[film.year, film.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</p>
                {reasons && reasons.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-white/60" title={reasons.join("\n")}>
                        {reasons.slice(0, 2).map((r) => (
                            <li key={r} className="truncate">
                                {r}
                            </li>
                        ))}
                    </ul>
                )}
            </Link>
        </li>
    );
}
