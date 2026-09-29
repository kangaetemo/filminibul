import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import Footer from "@/components/Footer";
import { getFilm, getSimilarFilms } from "@/lib/recommend/similar";
import FilmCard from "@/components/film/FilmCard";

export const revalidate = 3600;

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string } };

function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = parseId(params.id);
    const film = id ? await getFilm(id) : null;
    if (!film) return { title: "Film bulunamadı · Filminibul" };
    return {
        title: `${film.title}${film.year ? ` (${film.year})` : ""} ve benzer filmler · Filminibul`,
        description: film.overview ?? undefined,
    };
}

export default async function FilmPage({ params }: Props) {
    const id = parseId(params.id);
    if (!id) notFound();

    const [film, similar] = await Promise.all([getFilm(id), getSimilarFilms(id, 20)]);
    if (!film) notFound();

    return (
        <main className="min-h-screen bg-background pb-16">
            {/* Backdrop */}
            <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden">
                {film.backdropUrl && <Image src={film.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover opacity-40" />}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <Link
                    href="/"
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-sm text-white/80 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Yeni arama
                </Link>
            </div>

            {/* Film bilgisi */}
            <section className="relative -mt-40 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col sm:flex-row gap-6 sm:gap-8">
                <div className="relative w-40 sm:w-56 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-card shadow-glow-card">
                    {film.posterUrl && <Image src={film.posterUrl} alt={film.title} fill priority sizes="224px" className="object-cover" />}
                </div>
                <div className="min-w-0 sm:pt-24">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">
                        {film.title}
                        {film.year && <span className="ml-3 text-2xl font-normal text-white/40">{film.year}</span>}
                    </h1>
                    {film.originalTitle && <p className="mt-1 text-white/40">{film.originalTitle}</p>}

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                        {film.rating != null && film.rating > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-white/80">
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                {film.rating.toFixed(1)}
                                {film.voteCount != null && <span className="text-white/40">({film.voteCount.toLocaleString("tr-TR")})</span>}
                            </span>
                        )}
                        {film.genres.map((g) => (
                            <span key={g} className="px-2 py-1 rounded-lg bg-accent/15 text-accent-glow">
                                {g}
                            </span>
                        ))}
                    </div>

                    {film.overview && <p className="mt-4 max-w-3xl leading-relaxed text-white/70">{film.overview}</p>}

                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        {film.director && (
                            <>
                                <dt className="text-white/40">Yönetmen</dt>
                                <dd className="text-white/80">{film.director}</dd>
                            </>
                        )}
                        {film.cast.length > 0 && (
                            <>
                                <dt className="text-white/40">Oyuncular</dt>
                                <dd className="text-white/80">{film.cast.slice(0, 5).join(", ")}</dd>
                            </>
                        )}
                        {film.collectionName && (
                            <>
                                <dt className="text-white/40">Seri</dt>
                                <dd className="text-white/80">{film.collectionName}</dd>
                            </>
                        )}
                    </dl>
                </div>
            </section>

            {/* Benzer filmler */}
            <section className="mt-12 px-4 sm:px-8 max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold text-white">Benzer Filmler</h2>
                {!film.inCatalog ? (
                    <p className="mt-4 text-white/50">Bu film henüz öneri kataloğumuzda yok, bu yüzden benzer film öneremiyoruz.</p>
                ) : similar.length === 0 ? (
                    <p className="mt-4 text-white/50">Bu film için öneri bulunamadı.</p>
                ) : (
                    <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                        {similar.map((s) => (
                            <FilmCard key={s.film.id} film={s.film} reasons={s.reasons} />
                        ))}
                    </ul>
                )}
            </section>

            <Footer />
        </main>
    );
}
