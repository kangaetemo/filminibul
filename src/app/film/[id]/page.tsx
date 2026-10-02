import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { getFilm, getSimilarFilms } from "@/lib/recommend/similar";
import { Suspense } from "react";
import FilmCard from "@/components/film/FilmCard";
import WatchProviders from "@/components/film/WatchProviders";
import TrailerButton from "@/components/film/TrailerButton";
import { getTrailer } from "@/lib/recommend/trailer";
import PlatformFilter from "@/components/film/PlatformFilter";
import { FEATURED_PLATFORMS, getLiveProviders } from "@/lib/recommend/providers";

export const revalidate = 3600;

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string }; searchParams?: { p?: string } };

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

export default async function FilmPage({ params, searchParams }: Props) {
    const id = parseId(params.id);
    if (!id) notFound();

    // ?p=8,119 → sadece bu platformlarda izlenebilen benzer filmler
    const platforms = (searchParams?.p ?? "").split(",").map(Number).filter((x) => Number.isInteger(x) && x > 0);

    // Film bilgisi hızlı gelir; benzer filmler (HNSW sorgusu, soğukken 1–4 sn) aşağıda Suspense ile akışla yüklenir.
    const [film, providers, trailer] = await Promise.all([getFilm(id), getLiveProviders(id), getTrailer(id)]);
    if (!film) notFound();

    return (
        <main className="relative min-h-screen bg-background">
            {/* Üst çubuk kapağın dışında: içinde olursa overflow-hidden arama sonuç listesini keser */}
            <SiteHeader overlay />
            {/* Kapak: backdrop + yumuşak karartma, üst çubuk görselin üstünde */}
            <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden">
                {film.backdropUrl && <Image src={film.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover opacity-45" />}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
            </div>

            {/* Film bilgisi */}
            <section className="relative -mt-56 mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:-mt-64 sm:flex-row sm:gap-10 sm:px-8">
                {/* self-start: flex satırında afiş metin sütunu kadar uzamasın, 2:3 oranını korusun */}
                <div className="relative aspect-[2/3] w-40 shrink-0 self-start overflow-hidden rounded-xl bg-card shadow-glow-card ring-1 ring-white/15 sm:w-60 lg:w-72">
                    {film.posterUrl && <Image src={film.posterUrl} alt={film.title} fill priority sizes="(min-width: 1024px) 288px, (min-width: 640px) 240px, 160px" className="object-cover" />}
                </div>
                <div className="min-w-0 sm:pt-28">
                    <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl">{film.title}</h1>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/50">
                        {film.year && <span className="tabular-nums">{film.year}</span>}
                        {film.originalTitle && (
                            <>
                                <span aria-hidden>·</span>
                                <span className="italic">{film.originalTitle}</span>
                            </>
                        )}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                        {film.rating != null && film.rating > 0 && (
                            <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-accent-glow">
                                <Star className="h-3.5 w-3.5 fill-accent-glow" aria-hidden />
                                {film.rating.toFixed(1)}
                                {film.voteCount != null && <span className="text-white/40">({film.voteCount.toLocaleString("tr-TR")})</span>}
                            </span>
                        )}
                        {film.genres.map((g) => (
                            <span key={g} className="rounded-full border border-white/10 px-3 py-1 text-white/65">
                                {g}
                            </span>
                        ))}
                    </div>

                    {film.overview && <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-white/70">{film.overview}</p>}

                    {trailer && (
                        <div className="mt-6">
                            <TrailerButton videoKey={trailer.key} filmTitle={film.title} />
                        </div>
                    )}

                    <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                        {film.director && (
                            <>
                                <dt className="text-white/35">Yönetmen</dt>
                                <dd className="text-white/85">{film.director}</dd>
                            </>
                        )}
                        {film.cast.length > 0 && (
                            <>
                                <dt className="text-white/35">Oyuncular</dt>
                                <dd className="text-white/85">{film.cast.slice(0, 5).join(", ")}</dd>
                            </>
                        )}
                        {film.collectionName && (
                            <>
                                <dt className="text-white/35">Seri</dt>
                                <dd className="text-white/85">{film.collectionName}</dd>
                            </>
                        )}
                    </dl>

                    <WatchProviders providers={providers} />
                </div>
            </section>

            {/* Benzer filmler */}
            <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-accent-glow/80">Tema · atmosfer · hikâye</p>
                        <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">Benzer filmler</h2>
                    </div>
                </div>
                {film.inCatalog && (
                    <div className="mt-5">
                        <Suspense>
                            <PlatformFilter platforms={FEATURED_PLATFORMS} selected={platforms} />
                        </Suspense>
                    </div>
                )}
                {!film.inCatalog ? (
                    <p className="mt-6 text-white/50">Bu film henüz öneri kataloğumuzda yok, bu yüzden benzer film öneremiyoruz.</p>
                ) : (
                    <Suspense key={`${id}:${platforms.join(",")}`} fallback={<SimilarSkeleton />}>
                        <SimilarList id={id} platforms={platforms} />
                    </Suspense>
                )}
            </section>

            <Footer />
        </main>
    );
}

async function SimilarList({ id, platforms }: { id: number; platforms: number[] }) {
    const similar = await getSimilarFilms(id, 20, false, platforms);
    if (similar.length === 0) {
        return (
            <p className="mt-6 text-white/50">
                {platforms.length ? "Seçtiğin platformlarda bu filme benzer bir film bulamadık. Platform ekle ya da tümünü göster." : "Bu film için öneri bulunamadı."}
            </p>
        );
    }
    return (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {similar.map((s, i) => (
                <FilmCard key={s.film.id} film={s.film} reasons={s.reasons} platforms={s.platforms} index={i} />
            ))}
        </ul>
    );
}

function SimilarSkeleton() {
    return (
        <div aria-busy="true" aria-label="Benzer filmler yükleniyor">
            <p className="mt-6 text-sm text-white/40">Benzer filmler aranıyor…</p>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }, (_, i) => (
                    <li key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5" />
                ))}
            </ul>
        </div>
    );
}
