import { T } from "@/components/preferences/Preferences";
import type { Metadata } from "next";
import { OG_BASE } from "@/lib/seo";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ArrowRight, Plus, Shuffle } from "lucide-react";
import DiscoverySearch from "@/components/search/DiscoverySearch";
import MoodChips from "@/components/search/MoodChips";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import FilmCard from "@/components/film/FilmCard";
import PersonalFilms from "@/components/film/PersonalFilms";
import HeroFrames from "@/components/home/HeroFrames";
import { HERO_FRAMES, randomHeroFrameIndex } from "@/lib/heroFrames";
import { getFilm, getSimilarFilms } from "@/lib/recommend/similar";

// Her istekte çizilir: büyük film karesi her yenilemede rastgele seçilir (GR-03). Veritabanı okumaları
// (Matrix rafı) fetch önbelleğinde 1 gün kalır, yani istek başına yalnız sayfa çizimi yapılır.
// Not: middleware ile statik kopyalara yönlendirme denendi; sunucu "-H 127.0.0.1" ile çalışınca Next 14
// yönlendirmeyi dış adres sayıp kendine proxy'liyor (24 Ekim yayın hatası).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { ...OG_BASE, type: "website", url: "/" } };

export default function HomePage() {
    return (
        <>
            <SiteHeader search={false} />
            <main>
                <HeroFrames frames={HERO_FRAMES} initial={randomHeroFrameIndex()}>
                    <p className="eyebrow mb-4 text-white/80"><T text={"Film biter. Keşif devam eder."} /></p>
                    <h1 id="home-title" className="hero-title max-w-[790px]"><T text={"Bir filmi sevdin."} /><br /><T text={"Sırada ne var?"} /></h1>
                    <p className="mb-5 mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:mb-7 sm:mt-5 sm:text-lg"><T text={"Sevdiğin filme benzer filmler bul."} /><br className="sm:hidden" /> <T text={"Aynı his, bambaşka hikâyeler."} /></p>
                    <DiscoverySearch />
                </HeroFrames>

                <section id="modlar" className="page-width scroll-mt-6 pt-12 sm:pt-14" aria-labelledby="mood-heading">
                    <div className="section-top"><div><p className="eyebrow mb-2 text-muted"><T text={"Film adı aklında değilse"} /></p><h2 id="mood-heading" className="section-heading"><T text={"Bugün hangi moddasın?"} /></h2></div><p className="max-w-xs text-sm leading-relaxed text-muted"><T text={"Nasıl hissetmek istediğini seç."} /><br className="hidden sm:block" /> <T text={"O havaya birlikte girelim."} /></p></div>
                    <MoodChips tiles />
                </section>

                <section className="page-width pt-14 sm:pt-16" aria-labelledby="personal-heading">
                    <div className="section-top"><div><p className="eyebrow mb-2 text-muted"><T text="Listenden yola çıkarak" /></p><h2 id="personal-heading" className="section-heading"><T text="Senin için" /></h2><p className="mt-2 text-sm text-muted"><T text="Kaydettiklerinden yeni hikâyelere." /></p></div><Link href="/senin-icin" className="text-link"><T text="Tümünü gör" /><ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></div>
                    <Suspense fallback={<HomeShelfSkeleton />}><PersonalFilms preview /></Suspense>
                </section>

                <section className="page-width pt-14 sm:pt-16" aria-labelledby="matrix-heading">
                    <div className="section-top">
                        <div><p className="eyebrow mb-2 text-muted"><T text={"Bir filmden diğerine"} /></p><h2 id="matrix-heading" className="section-heading"><T text={"Matrix’i sevdiysen"} /></h2><p className="mt-2 text-sm text-muted sm:text-base"><T text={"Aynı sorular. Başka dünyalar."} /></p></div>
                        <Link href="/film/603-matrix#benzer-filmler" className="text-link"><T text={"Tümünü gör"} /> <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    </div>
                    <Suspense fallback={<HomeShelfSkeleton />}><HomeShelf /></Suspense>
                </section>

                <section className="page-width mt-14 sm:mt-16" aria-labelledby="blend-heading">
                    <div className="blend-banner relative grid items-center gap-6 overflow-hidden rounded-xl border border-line px-6 py-8 sm:px-8 lg:grid-cols-[270px_1fr_auto] lg:gap-8 lg:py-10">
                        <div className="relative flex h-40 items-center justify-center gap-4 lg:h-36" aria-hidden>
                            <Image src="https://image.tmdb.org/t/p/w342/p96dm7sCMn4VYAStA6siNz30G1r.jpg" alt="" width={110} height={165} sizes="110px" className="-rotate-[9deg] rounded shadow-glow-card" />
                            <Plus className="h-7 w-7 shrink-0" />
                            <Image src="https://image.tmdb.org/t/p/w342/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg" alt="" width={110} height={165} sizes="110px" className="rotate-[8deg] rounded shadow-glow-card" />
                        </div>
                        <div><p className="eyebrow mb-2"><T text={"İki ayrı zevk, aynı kanepe."} /></p><h2 id="blend-heading" className="font-display text-3xl leading-[1.1] sm:text-4xl"><T text={"İki filmi karıştır."} /><br /><T text={"Yeni bir şey bul."} /></h2><p className="mt-3 text-sm text-ink/80"><T text={"Birinin dünyası, diğerinin hissi."} /></p></div>
                        <Link href="/karistir" className="inline-flex min-h-12 items-center justify-center gap-3 button-primary"><Shuffle className="h-5 w-5" aria-hidden /><T text={"Karıştırmayı dene"} /><ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    </div>
                </section>

                <section className="page-width mt-14 sm:mt-16" aria-label="Nasıl çalışır">
                    <div className="grid gap-6 border-t border-line pt-8 sm:grid-cols-3 sm:gap-10">
                        {[["01", "Bir film söyle.", "Sevdiğin bir filmin adını yaz ya da aradığın hikâyeyi kendi cümlenle anlat."], ["02", "Bağlantıyı gör.", "Önerilerde ortak temaları, yönetmenleri ve hikâyeler arasındaki yakınlığı gör."], ["03", "Sıradakini seç.", "Fragmanına bak, nerede izleyebileceğini öğren. Sonraya bırakacaksan kaydet."]].map(([n, title, text]) => <div key={n}><span className="eyebrow text-muted">{n}</span><h3 className="mt-3 text-lg font-extrabold tracking-tight"><T text={title} /></h3><p className="mt-2 text-sm leading-relaxed text-muted"><T text={text} /></p></div>)}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

async function HomeShelf() {
    try {
        const [seed, results] = await Promise.all([getFilm(603), getSimilarFilms(603, 20)]);
        const films = results.filter(({ film }) => !seed?.collectionName || film.collectionName !== seed.collectionName).slice(0, 5);
        if (!films.length) return <p className="text-sm text-muted"><T text={"Matrix sayfasından benzer filmleri keşfet."} /></p>;
        return <ul className="movie-grid">{films.map((s, i) => <FilmCard key={s.film.id} film={s.film} reasons={s.reasons} reasonsEn={s.reasonsEn} index={i} context="similar" sourceFilmId={603} />)}</ul>;
    } catch {
        return <p className="rounded-lg border border-line p-5 text-sm text-muted"><T text={"Öneriler şu an yüklenemedi."} /> <Link href="/film/603-matrix" className="font-semibold text-ink underline"><T text={"Matrix sayfasından tekrar dene."} /></Link></p>;
    }
}

function HomeShelfSkeleton() {
    return <ul className="movie-grid" aria-busy="true" aria-label="Film önerileri yükleniyor">{Array.from({ length: 5 }, (_, i) => <li key={i}><div className="aspect-[2/3] animate-pulse rounded-lg bg-ink/10" /><div className="mt-3 h-4 w-3/4 rounded bg-ink/10" /></li>)}</ul>;
}
