"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, RefreshCw } from "lucide-react";
import { T, useLanguage } from "@/components/preferences/Preferences";
import { useSavedFilms } from "@/lib/savedFilms";
import { useFilmSignals } from "@/lib/filmSignals";
import { signalKey } from "@/lib/filmSignalsModel.mjs";
import type { PersonalResponse } from "@/lib/recommend/personal";
import FilmCard from "./FilmCard";

type Result = { key: string; attempt: number; data?: PersonalResponse; error?: string };

export default function PersonalFilms({ preview = false }: { preview?: boolean }) {
    const { films, member, ready, phase, pendingIds, refresh } = useSavedFilms();
    const signals = useFilmSignals();
    const { t } = useLanguage();
    const hasInterests = films.length > 0 || signals.records.some(r => r.reaction === "liked");
    const [result, setResult] = useState<Result | null>(null);
    const [attempt, retry] = useState(0);
    const completed = useRef("");
    const key = member ? `${member}:${films.map(film => film.id).sort((a, b) => a - b).join(",")}:${signalKey(signals.records)}` : "";
    const waiting = !ready || !signals.ready || signals.phase === "loading" || signals.pendingIds.length > 0 || phase === "loading" || pendingIds.length > 0;
    const loadable = !!member && ready && phase === "synced" && signals.phase === "synced" && !pendingIds.length && !signals.pendingIds.length && hasInterests;
    const requestKey = `${key}:${attempt}`;

    useEffect(() => {
        if (!member) return;
        void refresh(); void signals.refresh();
        const timer = window.setInterval(() => { if (document.visibilityState === "visible") { void refresh(); void signals.refresh(); } }, 60000);
        return () => window.clearInterval(timer);
    }, [member, refresh, signals.refresh]);

    useEffect(() => {
        if (!member) { completed.current = ""; return; }
        if (!loadable || completed.current === requestKey) return;
        const controller = new AbortController();
        let active = true;
        const timer = window.setTimeout(async () => {
            const timeout = window.setTimeout(() => controller.abort(), 55000);
            try {
                const { memberAuth } = await import("@/lib/auth/firebase");
                const user = memberAuth().currentUser;
                if (!user || user.uid !== member) return;
                for (let round = 0; round < 2; round++) {
                    const token = await user.getIdToken(round === 1);
                    if (!active || memberAuth().currentUser?.uid !== member) return;
                    const response = await fetch("/api/member/recommendations", { cache: "no-store", signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
                    if (response.status === 401 && round === 0) continue;
                    const data = await response.json();
                    if (!active || memberAuth().currentUser?.uid !== member) return;
                    if (!response.ok) throw new Error(data.error || "recommendations_unavailable");
                    completed.current = requestKey;
                    setResult({ key, attempt, data });
                    break;
                }
            } catch (error) {
                if (active) setResult({ key, attempt, error: error instanceof Error ? error.message : "recommendations_unavailable" });
            } finally { window.clearTimeout(timeout); }
        }, 600);
        return () => { active = false; window.clearTimeout(timer); controller.abort(); };
    }, [key, member, loadable, attempt, requestKey]);

    // Results belong to one account and one list snapshot; never persist them.
    const current = result?.key === key && result.attempt === attempt ? result : null;
    const data = current?.data;
    const savedIds = new Set([...films.map(film => film.id), ...signals.records.filter(r => r.watched || r.reaction).map(r => r.id)]);
    const recommendations = data?.recommendations.filter(item => !savedIds.has(item.film.id)).slice(0, preview ? 5 : 20) || [];
    const retryRequest = async () => { completed.current = ""; retry(value => value + 1); await Promise.all([refresh(), signals.refresh()]); };
    const panel = "rounded-xl border border-line bg-card p-6 sm:p-8";

    if (!ready) return <p role="status" className="py-6 text-sm text-muted"><T text="Önerilerin hazırlanıyor…" /></p>;
    if (!member) return <div className={panel}><h3 className="text-lg font-bold"><T text="Listen, yeni filmlere kapı açsın." /></h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted"><T text="Giriş yapıp ilgini çeken filmleri kaydet. Onlardan yola çıkarak sana yeni filmler önerelim." /></p><Link href="/hesap" className="text-link mt-4 inline-flex min-h-11 items-center"><T text="Google ile giriş yap" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>;
    if (phase === "error" || signals.phase === "error" || current?.error) return <div className={panel}><p role="status" className="text-sm text-muted"><T text={phase === "error" || signals.phase === "error" ? "Bulut listeni şu an yükleyemedik. Listen eşitlendikten sonra önerilerini yeniden deneyebilirsin." : current?.error === "sign_in_required" ? "Oturumunu doğrulayamadık. Hesap sayfasından yeniden giriş yapabilirsin." : current?.error === "too_many_requests" ? "Biraz hızlı gittik. Bir dakika sonra yeniden dene." : "Önerilerine şu an ulaşamadık. Yeniden deneyebilirsin."} /></p><button type="button" className="button-secondary mt-4" onClick={() => void retryRequest()}><RefreshCw className="h-4 w-4" aria-hidden /><T text="Tekrar dene" /></button></div>;
    if (waiting) return <p role="status" className="py-6 text-sm text-muted"><T text="Listen eşitlendiğinde önerilerin güncellenecek." /></p>;
    if (!hasInterests) return <div className={panel}><Bookmark className="mb-3 h-6 w-6 text-accent-ink" aria-hidden /><h3 className="text-lg font-bold"><T text="İlk filmi sen seç." /></h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted"><T text="İlgini çeken bir filmi kaydet veya beğendiğin bir filmi işaretle; yeni öneriler için oradan başlayalım. Kaydetmek, filmi izlediğin veya beğendiğin anlamına gelmez." /></p><Link href="/" className="text-link mt-4 inline-flex min-h-11 items-center"><T text="Film keşfet" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>;
    if (!data) return <ul className="movie-grid" aria-busy="true" aria-label={t("Önerilerin hazırlanıyor…")}>{Array.from({ length: preview ? 5 : 10 }, (_, index) => <li key={index} aria-hidden><div className="aspect-[2/3] animate-pulse rounded-lg bg-ink/10" /><div className="mt-3 h-4 w-3/4 rounded bg-ink/10" /></li>)}</ul>;
    if (!recommendations.length) return <div className={panel}><p className="max-w-xl text-sm leading-relaxed text-muted"><T text={data.status === "uncatalogued" ? "Kaydettiğin filmler henüz öneri kataloğumuzda yok. Başka filmler ekleyerek yeniden deneyebilirsin." : "Bu liste için yeni bir öneri bulamadık. İlgini çeken başka filmleri kaydederek keşfi genişletebilirsin."} /></p><Link href="/" className="text-link mt-4 inline-flex min-h-11 items-center"><T text="Film keşfet" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>;
    return <>
        {data.partial && <p role="status" className="mb-5 text-sm text-muted"><T text="Listendeki bazı filmlerin önerilerine ulaşamadık. Ulaşabildiklerimizle başladık." /></p>}
        <ul className="movie-grid">{recommendations.map((item, index) => <FilmCard key={item.film.id} film={item.film} reasons={item.reasons} reasonsEn={item.reasonsEn} index={index} />)}</ul>
        {!preview && <div className="mt-8 flex flex-wrap items-center gap-4"><button type="button" className="button-secondary" onClick={() => void retryRequest()}><RefreshCw className="h-4 w-4" aria-hidden /><T text="Önerileri yenile" /></button><Link href="/kaydedilenler" className="text-link"><T text="Listemi düzenle" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>}
    </>;
}
