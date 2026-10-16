import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Clapperboard, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { GENRES, PILOT_LISTS, type GenreId } from "@/lib/catalog/pilot";
import { PILOT_PEOPLE, personPath } from "@/lib/catalog/peopleManifest";
import { getCatalogArtwork } from "@/lib/catalog/artwork";

export const metadata: Metadata = { title: "Film listeleri · Yıla ve türe göre keşfet · Filminibul", description: "Bilim kurgu, aksiyon, dram, komedi ve daha fazlası: katalogumuzdaki filmleri yıl ve tür listeleriyle keşfet.", alternates: { canonical: "/listeler" }, robots: { index: process.env.VERCEL_ENV !== "preview", follow: true } };
export const revalidate = 86400;
const moods: Record<GenreId, { line: string; color: string }> = {
    878: { line: "Başka dünyalara doğru", color: "from-indigo-500/20" },
    28: { line: "Biraz adrenalin", color: "from-orange-500/20" },
    35: { line: "İyi gelecek bir kahkaha", color: "from-amber-500/20" },
    16: { line: "Hayal gücüne yer aç", color: "from-sky-500/20" },
    27: { line: "Işıkları açık bırak", color: "from-rose-500/20" },
    18: { line: "İz bırakan hikâyeler", color: "from-teal-500/20" },
    10749: { line: "Kalbinin sesini dinle", color: "from-pink-500/20" },
};

export default async function ListsPage() {
    const artwork = await getCatalogArtwork();
    const heroPosters = Array.from(new Set(Object.values(artwork.posters).flat())).slice(0, 2);
    return <><SiteHeader /><main className="page-width py-8 sm:py-12">
        <header className="relative isolate overflow-hidden rounded-3xl border border-line bg-card p-6 sm:p-10 lg:p-12">
            <div className="relative z-10 max-w-xl lg:max-w-[55%]">
                <p className="eyebrow flex items-center gap-2 text-accent-ink"><Sparkles className="h-4 w-4" aria-hidden />Kararsızlara küçük bir kıyak</p>
                <h1 className="section-heading mt-4">Film listeleri</h1>
                <p className="mt-4 text-xl font-semibold leading-snug sm:text-2xl">Bu akşam hangi dünyaya gidelim?</p>
                <p className="mt-3 max-w-lg leading-relaxed text-muted">Bir döneme dön, sevdiğin türe dal ya da tanıdık bir yüzün peşine takıl. Sıradaki filmin burada bir yerde.</p>
                <nav aria-label="Keşif bölümleri" className="mt-7 flex flex-wrap gap-3">
                    <a href="#seckiler" className="button-primary">Listelere dal <ArrowDown className="ml-2 h-4 w-4" aria-hidden /></a>
                    <a href="#actor" className="button-secondary">Oyuncular</a><a href="#director" className="button-secondary">Yönetmenler</a>
                </nav>
                <p className="mt-5 text-xs text-muted">30 yıl ve tür seçkisi · 50 oyuncu ve yönetmen</p>
            </div>
            <div aria-hidden className="pointer-events-none absolute -right-10 top-4 hidden h-full w-[40%] items-center justify-center gap-3 lg:flex">
                {heroPosters.length ? heroPosters.map((poster, i) => <div key={poster} className={`relative h-64 w-40 shrink-0 overflow-hidden rounded-xl border border-line shadow-xl ${i === 1 ? "-translate-y-5 rotate-3" : "translate-y-8 -rotate-6"}`}><Image src={"https://image.tmdb.org/t/p/w342" + poster} alt="" fill sizes="160px" className="object-cover" /></div>) : <Clapperboard className="h-48 w-48 text-accent/20" />}
            </div>
        </header>

        <section id="seckiler" aria-labelledby="lists-heading" className="scroll-mt-24 pt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow text-accent-ink">Zamanda küçük bir yolculuk</p><h2 id="lists-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Yılını seç, havasına gir.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted">Katalogumuzdan seçkiler. Her yılın bütün filmlerini kapsamaz; en çok oylananlardan başlar.</p></div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PILOT_LISTS.map(list => <li key={list.slug}>
                <Link href={`/listeler/${list.slug}`} className="group relative flex min-h-48 overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                    <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${moods[list.genreId].color} to-transparent`} />
                    <div className="relative z-10 flex min-w-0 flex-1 flex-col items-start p-5">
                        <span className="rounded-full border border-line bg-background/80 px-3 py-1 text-xs font-bold">{list.year}</span>
                        <h3 className="mt-4 text-xl font-extrabold">{GENRES[list.genreId].name}</h3>
                        <p className="mt-1 max-w-[11rem] text-xs text-muted">{moods[list.genreId].line}</p>
                        <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-ink">Filmleri keşfet <ArrowUpRight className="h-4 w-4" aria-hidden /></span>
                    </div>
                    <div aria-hidden className="relative my-4 mr-4 w-24 shrink-0 sm:w-28">{artwork.posters[list.slug].length ? artwork.posters[list.slug].slice().reverse().map((poster, i, posters) => <div key={poster} className="absolute inset-0 overflow-hidden rounded-lg border border-line bg-background shadow-md" style={{ transform: `translateX(${(i - posters.length + 1) * -10}px) rotate(${(i - posters.length + 1) * -5}deg)` }}><Image src={"https://image.tmdb.org/t/p/w185" + poster} alt="" fill sizes="112px" className="object-cover" /></div>) : <div className="flex h-full items-center justify-center rounded-lg border border-line bg-background/50"><Clapperboard className="h-10 w-10 text-accent-ink/40" /></div>}</div>
                </Link>
            </li>)}</ul>
        </section>

        {(["actor", "director"] as const).map(role => <section key={role} id={role} className="mt-12 scroll-mt-24 border-t border-line pt-8" aria-labelledby={role + "-heading"}>
            <p className="eyebrow text-accent-ink">{role === "actor" ? "Tanıdık yüzler, yeni hikâyeler" : "Kameranın arkasındaki imza"}</p>
            <h2 id={role + "-heading"} className="mt-2 text-2xl font-bold sm:text-3xl">{role === "actor" ? "Oyuncuların filmleri" : "Yönetmenlerin filmleri"}</h2>
            <p className="mt-3 text-sm text-muted">{role === "actor" ? "Favori oyuncunun henüz izlemediğin bir filmi olabilir." : "Sevdiğin bir yönetmenin dünyasında biraz daha kal."} Katalogumuzdaki 2025 ve öncesi yapımları keşfet.</p>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{PILOT_PEOPLE.filter(p => p.role === role).map(p => <li key={p.id}><Link href={personPath(p)} className="flex h-full flex-col items-center gap-3 rounded-2xl border border-line bg-card p-4 text-center transition-colors hover:border-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/5 text-lg font-bold text-muted" aria-hidden>{artwork.portraits[p.id] ? <Image src={"https://image.tmdb.org/t/p/w185" + artwork.portraits[p.id]} alt="" fill sizes="80px" className="object-cover object-top" /> : p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span>
                <span className="text-sm font-semibold">{p.name}</span><span className="mt-auto flex items-center gap-1 text-xs text-accent-ink">Filmografiyi keşfet <ArrowUpRight className="h-3 w-3" aria-hidden /></span>
            </Link></li>)}</ul>
        </section>)}
    </main><Footer /></>;
}
