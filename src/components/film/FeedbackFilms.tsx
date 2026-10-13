"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { T, useLanguage } from "@/components/preferences/Preferences";
import { useFilmSignals } from "@/lib/filmSignals";
import FilmFeedback from "./FilmFeedback";
import { filmPath } from "@/lib/filmUrl";
export default function FeedbackFilms() {
    const { records, member, refresh, phase } = useFilmSignals();
    const { language } = useLanguage();
    const [shown, setShown] = useState(20);
    useEffect(() => { setShown(20); }, [member]);
    useEffect(() => { if (!member) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60000); return () => window.clearInterval(timer); }, [member, refresh]);
    if (!member) return null;
    return <section className="mt-12 border-t border-line pt-8"><h2 className="section-heading"><T text="İzlediklerin ve film tercihlerin" /></h2><p className="mt-3 text-sm text-muted"><T text="Bu tercihler kaydetme listenden ayrıdır. Bir filmi listenden çıkarmak, izleme veya beğeni tercihini silmez." /></p>
        {!records.length && <p className="mt-5 text-sm text-muted"><T text={phase === "error" ? "Tercihlerini şu an yükleyemedik." : "Film sayfalarındaki düğmelerle izlediklerini ve beğenilerini işaretleyebilirsin."} /></p>}
        {phase === "error" && <button type="button" className="button-secondary mt-4" onClick={() => void refresh()}><T text="Tekrar dene" /></button>}
        <ul className="mt-6 space-y-4">{records.slice(0, shown).map(record => {
            const film = record.film || { id: record.id, title: `Film #${record.id}`, year: null, genres: [], posterUrl: null, rating: null };
            return <li key={record.id} className="rounded-xl border border-line bg-card p-4"><Link href={filmPath(film.id, film.title)} className="font-bold text-ink hover:underline">{language === "en" ? film.titleEn || film.title : film.title}</Link><FilmFeedback film={film} /></li>;
        })}</ul>
        {records.length > shown && <button type="button" className="button-secondary mt-5" onClick={() => setShown(value => value + 20)}><T text="Daha fazla göster" /></button>}
    </section>;
}
