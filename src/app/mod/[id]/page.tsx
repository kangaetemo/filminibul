import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shuffle } from "lucide-react";
import Footer from "@/components/Footer";
import FilmCard from "@/components/film/FilmCard";
import MoodChips from "@/components/search/MoodChips";
import { getMood, getMoodFilms } from "@/lib/recommend/moods";

// Her ziyarette farklı rastgele seçim
export const dynamic = "force-dynamic";

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
    const mood = getMood(params.id);
    return { title: mood ? `${mood.label} · Filminibul` : "Filminibul" };
}

export default async function MoodPage({ params }: Props) {
    const mood = getMood(params.id);
    if (!mood) notFound();
    const films = await getMoodFilms(mood, 20);

    return (
        <main className="min-h-screen bg-background pb-16">
            <header className="px-4 sm:px-8 pt-4 max-w-6xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/80 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ana sayfa
                </Link>
            </header>

            <section className="px-4 sm:px-8 max-w-6xl mx-auto mt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold text-white">
                        <span className="mr-3">{mood.emoji}</span>
                        {mood.label}
                    </h1>
                    {/* Düz <a>: aynı sayfayı yeniden yükler, sunucu yeni rastgele seçim yapar */}
                    <a
                        href={`/mod/${mood.id}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-sm text-white transition-colors"
                    >
                        <Shuffle className="w-4 h-4" />
                        Karıştır
                    </a>
                </div>
                <p className="mt-2 text-white/50">Bir filme tıkla, ona benzeyen filmleri gör.</p>

                <div className="mt-6">
                    <MoodChips activeId={mood.id} />
                </div>

                {films.length === 0 ? (
                    <p className="mt-8 text-white/50">Bu mod için film bulunamadı.</p>
                ) : (
                    <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                        {films.map((f) => (
                            <FilmCard key={f.id} film={f} />
                        ))}
                    </ul>
                )}
            </section>

            <Footer />
        </main>
    );
}
