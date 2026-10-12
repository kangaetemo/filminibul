"use client";
import { T } from "@/components/preferences/Preferences";

import Link from "next/link";
import { ArrowRight, Bookmark } from "lucide-react";
import { useSavedFilms } from "@/lib/savedFilms";
import FilmCard from "./FilmCard";

export default function SavedFilms() {
    const { films } = useSavedFilms();
    if (!films.length) return <div className="rounded-xl border border-dashed border-ink/25 px-6 py-16 text-center"><Bookmark className="mx-auto mb-5 h-9 w-9 text-muted" aria-hidden /><h2 className="text-xl font-extrabold"><T text={"Burada güzel filmler birikecek."} /></h2><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted"><T text={"Bir afişin üzerindeki kaydet simgesine dokun. İzlemek istediğin filmler burada seni beklesin."} /></p><Link href="/" className="button-primary mt-6"><T text={"Bir film bul"} /> <ArrowRight className="h-4 w-4" aria-hidden /></Link></div>;
    return <><p className="mb-6 text-sm text-muted">{films.length} <T text={"film · en son kaydettiğinden başlayarak"} /></p><ul className="movie-grid">{films.map((film, i) => <FilmCard key={film.id} film={{ ...film, originalTitle: null, overview: null, voteCount: null, backdropUrl: null, director: null, cast: [], collectionName: null, inCatalog: false }} index={i} />)}</ul></>;
}
