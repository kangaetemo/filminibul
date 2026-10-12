import type { Metadata } from "next";
import { OG_BASE } from "@/lib/seo";
import { notFound } from "next/navigation";
import { Shuffle } from "lucide-react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import FilmCard from "@/components/film/FilmCard";
import MoodChips from "@/components/search/MoodChips";
import { getMood, getMoodFilms } from "@/lib/recommend/moods";

// Her ziyarette farklı rastgele seçim
export const dynamic = "force-dynamic";

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
    const mood = getMood(params.id);
    if (!mood) return { title: "Filminibul" };
    const description = `"${mood.label}" diyenler için film önerileri: her açılışta farklı filmler.`;
    return {
        title: `${mood.label} · Filminibul`,
        description,
        alternates: { canonical: `/mod/${mood.id}` },
        openGraph: { ...OG_BASE, type: "website", url: `/mod/${mood.id}`, title: `${mood.emoji} ${mood.label} · Filminibul`, description },
    };
}

export default async function MoodPage({ params }: Props) {
    const mood = getMood(params.id);
    if (!mood) notFound();
    const films = await getMoodFilms(mood, 20);

    return (
        <main className="min-h-screen bg-background">
            <div className="spotlight">
                <SiteHeader />
                <section className="mx-auto max-w-[1280px] px-5 pb-10 pt-6 sm:px-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-accent-ink/80">Ruh hâline göre</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
                            <span className="mr-3" aria-hidden>
                                {mood.emoji}
                            </span>
                            {mood.label}
                        </h1>
                        {/* Düz <a>: aynı sayfayı yeniden yükler, sunucu yeni rastgele seçim yapar */}
                        <a
                            href={`/mod/${mood.id}`}
                            className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-accent/25"
                        >
                            <Shuffle className="h-4 w-4" aria-hidden />
                            Karıştır
                        </a>
                    </div>
                    <p className="mt-3 text-muted">Bir filme tıkla, ona benzeyen filmleri gör.</p>

                    <div className="mt-6">
                        <MoodChips activeId={mood.id} />
                    </div>
                </section>
            </div>

            <section className="mx-auto max-w-[1280px] px-5 sm:px-8">
                {films.length === 0 ? (
                    <p className="text-muted">Bu mod için film bulunamadı.</p>
                ) : (
                    <ul className="movie-grid">
                        {films.map((f, i) => (
                            <FilmCard key={f.id} film={f} index={i} context="mood" />
                        ))}
                    </ul>
                )}
            </section>

            <Footer />
        </main>
    );
}
