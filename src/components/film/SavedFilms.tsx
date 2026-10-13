"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, RefreshCw } from "lucide-react";
import { T, useLanguage } from "@/components/preferences/Preferences";
import { useSavedFilms } from "@/lib/savedFilms";
import FilmCard from "./FilmCard";

export default function SavedFilms() {
    const { films, ready, member, phase, pendingIds, localCount, persistent, importing, importNotice, error, refresh, importLocal } = useSavedFilms();
    const { language, t } = useLanguage();
    const en = language === "en";
    useEffect(() => {
        if (!member) return;
        const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60000);
        return () => window.clearInterval(timer);
    }, [member, refresh]);
    if (!ready) return <p role="status" className="py-8 text-muted"><T text="Listen yükleniyor…" /></p>;
    return <>
        <div className="mb-6 space-y-3">
            {member ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 text-sm">
                <p role="status">{phase === "error" ? t(error === "watchlist_limit" ? "Listende en fazla 1.000 film olabilir." : "Buluta bağlanamadık. Değişikliklerin bu cihazda bekliyor; yeniden deneyebilirsin.") : phase === "syncing" || pendingIds.length ? t("Listen eşitleniyor…") : t("Listen hesabına kaydedildi. Aynı hesapla diğer cihazlarından da ulaşabilirsin.")}</p>
                <button type="button" className="button-secondary shrink-0" disabled={phase === "syncing" || importing} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" aria-hidden /><T text={phase === "error" ? "Tekrar dene" : "Listeyi yenile"} /></button>
            </div> : <div className="rounded-xl border border-line bg-card p-4 text-sm"><p><T text="Bu liste bu tarayıcıda saklanır. Diğer cihazlarından ulaşmak için giriş yapıp hesabına aktarabilirsin." /></p><Link href="/hesap" className="text-link mt-3 inline-flex min-h-11 items-center"><T text="Google ile giriş yap" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>}
            {!persistent && <p role="alert" className="text-sm text-muted"><T text="Tarayıcı depolaması kullanılamıyor. Henüz buluta ulaşmayan değişiklikler bu oturum kapandığında kaybolabilir." /></p>}
            {member && localCount > 0 && <section className="rounded-xl border border-accent-ink/30 bg-accent/10 p-4">
                <h2 className="font-bold"><T text="Bu tarayıcıdaki eski listen" /></h2>
                <p className="mt-2 text-sm text-muted">{en ? `${localCount} films can be merged into your account. Only successfully transferred films are removed from the browser list.` : `${localCount} filmi hesabına ekleyebilirsin. Yalnızca başarıyla aktarılan filmler tarayıcı listesinden kaldırılır.`}</p>
                <button type="button" disabled={importing || phase === "loading" || phase === "syncing"} className="button-secondary mt-3" onClick={() => void importLocal()}><T text={importing ? "Aktarılıyor…" : "Eski listemi hesabıma aktar"} /></button>
            </section>}
            {importNotice && <p role="status" className="text-sm text-muted">{en ? `${importNotice.imported} films transferred. ${importNotice.remaining} films remain in the browser list.` : `${importNotice.imported} film aktarıldı. Tarayıcı listesinde ${importNotice.remaining} film kaldı.`}</p>}
        </div>
        {!films.length ? (member && phase === "error" ? <p className="py-8 text-muted"><T text="Bulut listen henüz yüklenemedi. Bu cihazda gösterilecek kayıt bulunmuyor." /></p> : <div className="rounded-xl border border-dashed border-ink/25 px-6 py-16 text-center"><Bookmark className="mx-auto mb-5 h-9 w-9 text-muted" aria-hidden /><h2 className="text-xl font-extrabold"><T text="Burada güzel filmler birikecek." /></h2><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted"><T text="Bir afişin üzerindeki kaydet simgesine dokun. İzlemek istediğin filmler burada seni beklesin." /></p><Link href="/" className="button-primary mt-6"><T text="Bir film bul" /><ArrowRight className="h-4 w-4" aria-hidden /></Link></div>) : <><p className="mb-6 text-sm text-muted">{films.length} <T text="film · en son kaydettiğinden başlayarak" /></p><ul className="movie-grid">{films.map((film, i) => <FilmCard key={film.id} film={{ ...film, originalTitle: null, overview: null, voteCount: null, backdropUrl: null, director: null, cast: [], collectionName: null, inCatalog: false }} index={i} />)}</ul></>}
    </>;
}
