import { T } from "@/components/preferences/Preferences";
import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import SavedFilms from "@/components/film/SavedFilms";

export const metadata: Metadata = { title: "Kaydettiklerim · Filminibul", robots: { index: false, follow: true } };

export default function SavedPage() {
    return <><SiteHeader /><main className="page-width pt-12"><p className="eyebrow mb-3 text-muted"><T text={"Bir sonraki film gecene"} /></p><h1 className="font-display text-4xl sm:text-5xl"><T text={"Kaydettiklerim"} /></h1><p className="mb-10 mt-4 max-w-xl text-sm leading-relaxed text-muted"><T text={"İzlemeye ayırdığın filmler, bir arada. Listen bu tarayıcıda saklanır; hesap açman gerekmez."} /></p><Suspense fallback={<p className="text-muted"><T text={"Listen yükleniyor…"} /></p>}><SavedFilms /></Suspense></main><Footer /></>;
}
