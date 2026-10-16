import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { PILOT_LISTS } from "@/lib/catalog/pilot";
import { PILOT_PEOPLE, personPath } from "@/lib/catalog/peopleManifest";

export const metadata: Metadata = { title: "Film listeleri · Yıla ve türe göre keşfet · Filminibul", description: "Bilim kurgu, aksiyon, dram, komedi ve daha fazlası: katalogumuzdaki filmleri yıl ve tür listeleriyle keşfet.", alternates: { canonical: "/listeler" }, robots: { index: process.env.VERCEL_ENV !== "preview", follow: true } };
export default function ListsPage() {
    return <><SiteHeader /><main className="page-width py-10"><header className="mb-8 max-w-2xl"><p className="eyebrow text-accent-ink">Yeni bir hikâye bul</p><h1 className="section-heading mt-3">Film listeleri</h1><p className="mt-4 leading-relaxed text-muted">Bir döneme dön, sevdiğin türe göz at. Bu listeler katalogumuzdaki filmleri bir araya getirir; her yılın bütün filmlerini kapsamaz. Listelerde sıralama TMDB oy sayısına göredir.</p></header>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PILOT_LISTS.map(list => <li key={list.slug}><Link href={`/listeler/${list.slug}`} className="block rounded-xl border border-line bg-card p-5 transition-colors hover:border-accent/60"><span className="text-sm text-muted">{list.year}</span><h2 className="mt-2 text-lg font-bold">{list.title}</h2><span className="mt-3 inline-block text-sm text-accent-ink">Filmleri keşfet →</span></Link></li>)}</ul>
        {(["actor","director"] as const).map(role=><section key={role} className="mt-12 border-t border-line pt-8" aria-labelledby={role+"-heading"}><h2 id={role+"-heading"} className="section-heading">{role==="actor"?"Oyuncuların filmleri":"Yönetmenlerin filmleri"}</h2><p className="mt-3 text-sm text-muted">2025 ve öncesinde katalogumuzda bulunan filmler; TMDB kişi kimliğiyle doğrulanan krediler.</p><ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PILOT_PEOPLE.filter(p=>p.role===role).map(p=><li key={p.id}><Link href={personPath(p)} className="flex min-h-11 items-center rounded-lg border border-line bg-card px-4 py-3 font-semibold hover:border-accent/60">{p.name}</Link></li>)}</ul></section>)}
    </main><Footer /></>;
}
