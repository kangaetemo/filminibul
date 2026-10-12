import { T, FilmText } from "@/components/preferences/Preferences";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowRight, ArrowUpRight, Blend, Star } from "lucide-react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { getFilm, getSimilarFilms } from "@/lib/recommend/similar";
import { Suspense } from "react";
import FilmCard from "@/components/film/FilmCard";
import WatchProviders from "@/components/film/WatchProviders";
import SaveButton from "@/components/film/SaveButton";
import TrailerButton from "@/components/film/TrailerButton";
import { getTrailer } from "@/lib/recommend/trailer";
import PlatformFilter from "@/components/film/PlatformFilter";
import { FEATURED_PLATFORMS, getLiveProviders } from "@/lib/recommend/providers";
import { filmPath, parseFilmParam } from "@/lib/filmUrl";
import { OG_BASE } from "@/lib/seo";

export const revalidate = 3600;

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string }; searchParams?: { p?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const id = parseFilmParam(params.id);
    const film = id ? await getFilm(id) : null;
    if (!film) return { title: "Film bulunamadı · Filminibul" };
    const name = `${film.title}${film.year ? ` (${film.year})` : ""}`;
    const url = filmPath(film.id, film.title);
    // Paylaşım önizlemesi (WhatsApp, X…): kısa açıklama + geniş kapak görseli, yoksa afiş
    const description = film.overview
        ? film.overview.length > 200
            ? film.overview.slice(0, 197).replace(/\s+\S*$/, "") + "…"
            : film.overview
        : `${film.title} filmine tema, atmosfer ve hikâyece benzeyen filmler.`;
    const image = film.backdropUrl ?? film.posterUrl;
    return {
        title: `${name} ve benzer filmler · Filminibul`,
        description,
        alternates: { canonical: url },
        openGraph: {
            ...OG_BASE,
            type: "video.movie",
            url,
            title: `${name} gibi filmler`,
            description,
            ...(image && { images: [{ url: image, alt: film.title }] }),
        },
        twitter: { card: image === film.backdropUrl ? "summary_large_image" : "summary" },
    };
}

export default async function FilmPage({ params, searchParams }: Props) {
    const id = parseFilmParam(params.id);
    if (!id) notFound();

    // ?p=8,119 → sadece bu platformlarda izlenebilen benzer filmler
    const platforms = (searchParams?.p ?? "").split(",").map(Number).filter((x) => Number.isInteger(x) && x > 0);

    // Film bilgisi hızlı gelir; benzer filmler (HNSW sorgusu, soğukken 1–4 sn) aşağıda Suspense ile akışla yüklenir.
    const [film, providers, trailer] = await Promise.all([getFilm(id), getLiveProviders(id), getTrailer(id)]);
    if (!film) notFound();

    // Sadece id'li (/film/126986) ya da eski başlıklı adres → güncel adres (platform filtresi korunur)
    const canonical = filmPath(film.id, film.title);
    if (`/film/${params.id}` !== canonical) {
        permanentRedirect(searchParams?.p ? `${canonical}?p=${encodeURIComponent(searchParams.p)}` : canonical);
    }


    return (
        <>
            <SiteHeader />
            <main className="min-h-screen">
                <div className="film-backdrop relative h-52 w-full overflow-hidden sm:h-72 lg:h-80">
                    {film.backdropUrl && <Image src={film.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_35%]" />}
                    <div className="page-width relative z-10 pt-5"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-white hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /><T text={"Keşfe dön"} /></Link></div>
                </div>

                <section className="film-detail page-width grid gap-7 sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12" aria-labelledby="film-title">
                    <aside className="min-w-0">
                        <div className="relative aspect-[2/3] w-36 overflow-hidden rounded-lg bg-card shadow-glow-card ring-1 ring-ink/10 sm:w-full">
                            {film.posterUrl ? <Image src={film.posterUrl} alt={`${film.title} afişi`} fill priority sizes="(min-width: 1024px) 250px, (min-width: 640px) 210px, 144px" className="object-cover" /> : <span className="flex h-full items-center justify-center p-4 text-center font-bold text-muted">{film.title}</span>}
                        </div>
                        <div className="mt-5 hidden sm:block"><WatchProviders providers={providers} filmId={film.id} /></div>
                    </aside>
                    <div className="min-w-0 sm:pt-36">
                        <p className="eyebrow text-muted">{[film.year, ...film.genres.slice(0, 2)].filter(Boolean).join(" · ")}</p>
                        <h1 id="film-title" className="mt-3 font-display text-4xl leading-[1.06] text-ink sm:text-5xl lg:text-[56px]"><FilmText film={film} field="title" /></h1>
                        {film.originalTitle && <p className="mt-3 text-sm text-muted">{film.originalTitle}</p>}
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            {film.rating != null && film.rating > 0 && <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-2 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 text-accent-ink" aria-hidden />{film.rating.toFixed(1)} <span className="text-[10px] font-medium text-muted"><T text={"TMDB"} />{film.voteCount != null && ` · ${film.voteCount.toLocaleString("tr-TR")} oy`}</span></span>}
                            {film.genres.map(g => <span key={g} className="rounded-md border border-line px-3 py-2 text-xs text-muted"><T text={g} /></span>)}
                        </div>
                        {<p className="mt-6 max-w-3xl text-[15px] leading-[1.85] text-ink/85"><FilmText film={film} field="overview" /></p>}
                        <div className="mt-6 flex flex-wrap gap-3">
                            {trailer && <TrailerButton videoKey={trailer.key} filmTitle={film.title} filmId={film.id} />}
                            <SaveButton film={film} />
                            {film.inCatalog && <Link href="#benzer-filmler" className="button-secondary"><T text={"Benzer filmleri gör"} /> <ArrowDown className="h-4 w-4" aria-hidden /></Link>}
                        </div>
                        <dl className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 border-t border-line pt-6 text-sm leading-relaxed">
                            {film.director && <><dt className="text-muted"><T text={"Yönetmen"} /></dt><dd className="font-semibold text-ink">{film.director}</dd></>}
                            {film.cast.length > 0 && <><dt className="text-muted"><T text={"Oyuncular"} /></dt><dd className="text-ink">{film.cast.slice(0, 5).join(", ")}</dd></>}
                            {film.collectionName && <><dt className="text-muted"><T text={"Film serisi"} /></dt><dd className="text-ink">{film.collectionName}</dd></>}
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                            <a href={`https://www.themoviedb.org/movie/${film.id}`} target="_blank" rel="noopener noreferrer" className="text-link text-xs"><T text={"TMDB’de incele"} /> <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>
                            {film.inCatalog && <Link href={`/karistir?a=${film.id}`} className="text-link text-xs"><Blend className="h-4 w-4" aria-hidden /><T text={"Başka bir filmle karıştır"} /></Link>}
                        </div>
                        <div className="mt-5 sm:hidden"><WatchProviders providers={providers} filmId={film.id} /></div>
                    </div>
                </section>

                <section className="page-width mt-12 sm:mt-16" aria-labelledby="trailer-heading">
                    <div className="grid gap-6 rounded-xl border border-line bg-card p-5 sm:grid-cols-[1fr_1.15fr] sm:items-center sm:p-8">
                        <div><p className="eyebrow mb-2 text-muted"><T text={"Karar vermeden önce"} /></p><h2 id="trailer-heading" className="section-heading"><T text={"Bir sahne yeter."} /></h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{trailer ? <T text={"Hikâyenin havasına bir göz at. Fragman burada, tek dokunuş uzağında."} /> : <T text={"Bu film için şu an bir fragman bulunamadı. Aşağıdan benzer hikâyelere göz atabilirsin."} />}</p></div>
                        {trailer ? <TrailerButton videoKey={trailer.key} filmTitle={film.title} filmId={film.id} previewUrl={film.backdropUrl ?? film.posterUrl ?? undefined} /> : <Link href="#benzer-filmler" className="button-secondary justify-self-start"><T text={"Benzer filmlere geç"} /> <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
                    </div>
                </section>

                <section id="benzer-filmler" className="page-width mt-14 scroll-mt-8 sm:mt-16" aria-labelledby="similar-heading">
                    <div className="section-top border-b border-line pb-6">
                        <div><p className="eyebrow mb-2 text-muted"><T text={"Tema · Atmosfer · Hikâye"} /></p><h2 id="similar-heading" className="section-heading"><T text={"Bunu sevdiysen, bir de bunlara bak."} /></h2><p className="mt-3 text-sm text-muted">{film.title} <T text={"ile ortak bir şeyler taşıyan filmler."} /></p></div>
                    </div>
                    {film.inCatalog && <Suspense><PlatformFilter platforms={FEATURED_PLATFORMS} selected={platforms} /></Suspense>}
                    {!film.inCatalog ? <p className="mt-6 text-sm text-muted"><T text={"Bu film henüz öneri kataloğumuzda yok. Eklendiğinde benzer filmleri burada bulabileceksin."} /></p> : <Suspense key={`${id}:${platforms.join(",")}`} fallback={<SimilarSkeleton />}><SimilarList id={id} platforms={platforms} collection={film.collectionName} /></Suspense>}
                </section>
            </main>
            <Footer />
        </>
    );
}

async function SimilarList({ id, platforms, collection }: { id: number; platforms: number[]; collection: string | null }) {
    let similar;
    try { similar = await getSimilarFilms(id, 20, false, platforms); }
    catch { return <p role="alert" className="mt-6 rounded-lg border border-line p-5 text-sm text-muted"><T text={"Öneriler şu an yüklenemedi."} /> <a href={`/film/${id}${platforms.length ? `?p=${platforms.join(",")}` : ""}`} className="font-bold text-ink underline"><T text={"Tekrar dene"} /></a>.</p>; }
    if (!similar.length) return <p className="mt-6 text-sm text-muted">{platforms.length ? <T text={"Seçtiğin platformlarda benzer bir film bulamadık. Başka bir platform ekle ya da tümünü göster."} /> : <T text={"Bu film için henüz öneri bulunamadı."} />}</p>;
    const discoveries = similar.filter(s => !collection || s.film.collectionName !== collection);
    const sameSeries = collection ? similar.filter(s => s.film.collectionName === collection) : [];
    return <>
        {discoveries.length > 0 && <ul className="movie-grid mt-8">{discoveries.map(s => <FilmCard key={s.film.id} film={s.film} reasons={s.reasons} reasonsEn={s.reasonsEn} platforms={s.platforms} index={similar.indexOf(s)} context="similar" sourceFilmId={id} />)}</ul>}
        {sameSeries.length > 0 && <div className="mt-12 border-t border-line pt-8"><h3 className="font-display text-2xl"><T text={"Aynı evrende kalmak istersen"} /></h3><p className="mt-2 text-sm text-muted">{collection} <T text={"serisinden diğer filmler."} /></p><ul className="movie-grid mt-6">{sameSeries.map(s => <FilmCard key={s.film.id} film={s.film} reasons={s.reasons} reasonsEn={s.reasonsEn} platforms={s.platforms} index={similar.indexOf(s)} context="similar" sourceFilmId={id} />)}</ul></div>}
    </>;
}

function SimilarSkeleton() {
    return <div aria-busy="true" aria-label="Benzer filmler yükleniyor"><p className="mt-6 text-sm text-muted"><T text={"Benzer hikâyeler aranıyor…"} /></p><ul className="movie-grid mt-4">{Array.from({ length: 10 }, (_, i) => <li key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-ink/10" />)}</ul></div>;
}
