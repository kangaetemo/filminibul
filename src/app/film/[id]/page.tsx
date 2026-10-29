import { T, FilmText, FilmVotes } from "@/components/preferences/Preferences";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowRight, Blend, Star, ChevronDown } from "lucide-react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { getFilm, getSimilarFilms } from "@/lib/recommend/similar";
import { Suspense } from "react";
import FilmCard from "@/components/film/FilmCard";
import WatchProviders from "@/components/film/WatchProviders";
import ShareButton from "@/components/film/ShareButton";
import FilmFeedback from "@/components/film/FilmFeedback";
import SaveButton from "@/components/film/SaveButton";
import FilmSynopsis from "@/components/film/FilmSynopsis";
import TrailerButton from "@/components/film/TrailerButton";
import { getTrailer } from "@/lib/recommend/trailer";
import PlatformFilter from "@/components/film/PlatformFilter";
import { FEATURED_PLATFORMS, getLiveProviders, platform, watchableIds } from "@/lib/recommend/providers";
import { buildFilmSnippet, snippetTitles } from "@/lib/filmSnippet.mjs";
import SimilarHeading from "@/components/film/SimilarHeading";
import { filmPath, parseFilmParam } from "@/lib/filmUrl";
import { OG_BASE } from "@/lib/seo";
import { ownImageAbsoluteUrl, ownImageUrl } from "@/lib/ownImage";
import { getFilmPeople } from "@/lib/catalog/people";
import { getPilotPerson, personPath } from "@/lib/catalog/peopleManifest";
import FilmPeopleLinks from "@/components/catalog/FilmPeopleLinks";
import { jsonLd } from "@/lib/catalog/pilot";

export const revalidate = 3600;

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
    Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

// Next 14: params senkron nesne (Next 15+'da Promise olur ve await gerekir)
type Props = { params: { id: string }; searchParams?: { p?: string; lang?: string } };

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
    // Arama sonucu metni (SEO-03): benzer filmler + yayın platformu + konu. Sayfa açılışını bekletmemek için
    // benzer filmler 1,5 sn'de gelmezse yalnız konu kullanılır (veriler önbellekli; çoğu istekte anında gelir).
    const [similar, providers] = await Promise.all([
        film.inCatalog ? withTimeout(getSimilarFilms(film.id, 20), 1500).catch(() => null) : null,
        getLiveProviders(film.id),
    ]);
    const snippet = buildFilmSnippet({
        title: film.title,
        year: film.year,
        overview: film.overview,
        similarTitles: snippetTitles((similar ?? []).map((s) => s.film), film.collectionName),
        platforms: watchableIds(providers ?? undefined).map((p) => platform(p).name),
    });
    const image = film.backdropUrl ?? film.posterUrl;
    return {
        title: snippet.title,
        description: snippet.description,
        alternates: { canonical: url },
        openGraph: {
            ...OG_BASE,
            type: "video.movie",
            url,
            title: `${name} gibi filmler`,
            description,
            ...(image && { images: [{ url: ownImageUrl(image), alt: film.title }] }),
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
    const [film, providers, trailer, identifiedCredits] = await Promise.all([getFilm(id), getLiveProviders(id), getTrailer(id), getFilmPeople(id)]);
    if (!film) notFound();

    // Sadece id'li (/film/126986) ya da eski başlıklı adres → güncel adres (platform filtresi korunur)
    const canonical = filmPath(film.id, film.title);
    if (`/film/${params.id}` !== canonical) {
        const query = new URLSearchParams();
        if (searchParams?.p !== undefined) query.set("p", searchParams.p);
        if (searchParams?.lang === "en" || searchParams?.lang === "tr") query.set("lang", searchParams.lang);
        permanentRedirect(query.size ? `${canonical}?${query}` : canonical);
    }


    const linkedDirectors = Array.from(new Set(identifiedCredits.filter(c => c.kind === "crew" && c.job === "Director").map(c => c.person_id))).flatMap(personId => {
        const person = getPilotPerson(personId, "director");
        return person ? [{ "@type": "Person", name: person.name, url: "https://filminibul.com" + personPath(person) }] : [];
    });
    const movieStructuredData = {
        "@context": "https://schema.org", "@type": "Movie", name: film.title, url: "https://filminibul.com" + canonical,
        ...(film.posterUrl ? { image: ownImageAbsoluteUrl(film.posterUrl) } : {}), ...(film.overview ? { description: film.overview } : {}),
        genre: film.genres, ...(linkedDirectors.length ? { director: linkedDirectors } : {}),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(movieStructuredData) }} />
            <SiteHeader />
            <main className="min-h-screen">
                <div className="film-backdrop relative h-20 w-full overflow-hidden sm:h-72 lg:h-80">
                    {film.backdropUrl && <Image src={film.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_35%]" />}
                    <div className="page-width relative z-10 pt-5"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-white hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /><T text={"Keşfe dön"} /></Link></div>
                </div>

                <section className="film-detail page-width grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-5 pt-5 sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-8 sm:pt-0 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12" aria-labelledby="film-title">
                    <aside className="min-w-0 sm:row-span-2">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-card shadow-glow-card ring-1 ring-ink/10 sm:w-full">
                            {film.posterUrl ? <Image src={film.posterUrl} alt={`${film.title} afişi`} fill priority sizes="(min-width: 1024px) 250px, (min-width: 640px) 210px, 96px" className="object-cover" /> : <span className="flex h-full items-center justify-center p-4 text-center font-bold text-muted">{film.title}</span>}
                        </div>
                        <div className="mt-5 hidden sm:block"><WatchProviders providers={providers} filmId={film.id} /></div>
                    </aside>
                    <div className="min-w-0 sm:pt-36">
                        <p className="eyebrow text-muted">{film.year && <>{film.year} · </>}<FilmText film={film} field="genresShort" /></p>
                        <h1 id="film-title" className="mt-2 break-words font-display text-[26px] leading-[1.06] text-ink sm:text-5xl lg:text-[56px]"><FilmText film={film} field="title" /></h1>
                        {film.originalTitle && <p className="mt-2 line-clamp-2 text-xs text-muted sm:line-clamp-none sm:text-sm">{film.originalTitle}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {film.rating != null && film.rating > 0 && <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-2 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 text-accent-ink" aria-hidden />{film.rating.toFixed(1)} <span className="text-[10px] font-medium text-muted"><T text={"TMDB"} />{film.voteCount != null && <FilmVotes count={film.voteCount} />}</span></span>}
                            {film.genres.map(g => <span key={g} className="hidden rounded-md border border-line px-3 py-2 text-xs text-muted sm:inline"><T text={g} /></span>)}
                        </div>
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                        <FilmSynopsis overview={film.overview} overviewEn={film.overviewEn} />
                        <div className="film-actions mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
                            {trailer && <TrailerButton videoKey={trailer.key} filmTitle={film.title} filmId={film.id} />}
                            <SaveButton film={film} />
                            <ShareButton key={canonical} path={canonical} title={film.title} titleEn={film.titleEn} />
                            {film.inCatalog && <Link href="#benzer-filmler" className="button-secondary"><T text={"Benzer filmleri gör"} /> <ArrowDown className="h-4 w-4" aria-hidden /></Link>}
                        </div>
                        <FilmFeedback film={film} />
                        <p className="mt-2 max-w-md text-xs leading-relaxed text-muted"><T text="Kaydettiğin ve beğendiğin filmler sana yapılan önerileri etkiler." /></p>
                    </div>
                    <details className="group col-span-2 -mt-1 border-t border-line sm:hidden">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-bold [&::-webkit-details-marker]:hidden"><T text={"Nerede izlenir?"} /><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden /></summary>
                        <div className="pb-3"><WatchProviders providers={providers} filmId={film.id} showHeading={false} /></div>
                    </details>
                </section>

                <section id="benzer-filmler" className="page-width mt-8 scroll-mt-6 sm:mt-16" aria-labelledby="similar-heading">
                    <div className="section-top mb-5 border-b border-line pb-4 sm:mb-7 sm:pb-6">
                        <div><p className="eyebrow mb-2 hidden text-muted sm:block"><T text={"Tema · Atmosfer · Hikâye"} /></p><SimilarHeading film={film} /></div>
                    </div>
                    {film.inCatalog && <Suspense><PlatformFilter platforms={FEATURED_PLATFORMS} selected={platforms} /></Suspense>}
                    {!film.inCatalog ? <p className="mt-6 text-sm text-muted"><T text={"Bu film henüz öneri kataloğumuzda yok. Eklendiğinde benzer filmleri burada bulabileceksin."} /></p> : <Suspense key={`${id}:${platforms.join(",")}`} fallback={<SimilarSkeleton />}><SimilarList id={id} platforms={platforms} collection={film.collectionName} /></Suspense>}
                </section>
                <section id="film-ayrintilari" className="page-width mt-10 scroll-mt-6 sm:mt-14" aria-label="Film ayrıntıları">
                    <details className="group rounded-xl border border-line bg-card px-5 sm:px-8">
                        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 py-4 text-base font-bold [&::-webkit-details-marker]:hidden"><T text={"Oyuncular ve film ayrıntıları"} /><ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden /></summary>
                        <div className="pb-6">
                        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 border-t border-line pt-5 text-sm leading-relaxed">
                            <FilmPeopleLinks film={film} credits={identifiedCredits} />
                            {film.collectionName && <><dt className="text-muted"><T text={"Film serisi"} /></dt><dd className="text-ink">{film.collectionName}</dd></>}
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                            {film.inCatalog && <Link href={`/karistir?a=${film.id}`} className="text-link text-xs"><Blend className="h-4 w-4" aria-hidden /><T text={"Başka bir filmle karıştır"} /></Link>}
                        </div>
                        </div>
                    </details>
                </section>

                <section className="page-width mt-12 sm:mt-16" aria-labelledby="trailer-heading">
                    <div className="grid gap-6 rounded-xl border border-line bg-card p-5 sm:grid-cols-[1fr_1.15fr] sm:items-center sm:p-8">
                        <div><p className="eyebrow mb-2 text-muted"><T text={"Karar vermeden önce"} /></p><h2 id="trailer-heading" className="section-heading"><T text={"Önce fragmana bak."} /></h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{trailer ? <T text={"Filmin havasını fragmandan görebilirsin."} /> : <T text={"Bu film için şu an bir fragman bulunamadı. Yukarıdaki benzer hikâyelere göz atabilirsin."} />}</p></div>
                        {trailer ? <TrailerButton videoKey={trailer.key} filmTitle={film.title} filmId={film.id} previewUrl={film.backdropUrl ?? film.posterUrl ?? undefined} /> : <Link href="#benzer-filmler" className="button-secondary justify-self-start"><T text={"Benzer filmlere geç"} /> <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
                    </div>
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
