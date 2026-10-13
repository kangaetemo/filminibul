import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import PersonalFilms from "@/components/film/PersonalFilms";
import { T } from "@/components/preferences/Preferences";

export const metadata: Metadata = { title: "Senin için · Filminibul", robots: { index: false, follow: true } };

export default function PersonalPage() {
    return <><SiteHeader /><main className="page-width pt-12"><p className="eyebrow mb-3 text-muted"><T text="Listenden yola çıkarak" /></p><h1 className="font-display text-4xl sm:text-5xl"><T text="Senin için" /></h1><p className="mb-10 mt-4 max-w-xl text-sm leading-relaxed text-muted"><T text="Kaydettiğin filmlerin ortak dünyalarından yeni öneriler. Her kartta, hangi filmden yola çıktığımızı görebilirsin." /></p><Suspense fallback={<p role="status" className="text-muted"><T text="Önerilerin hazırlanıyor…" /></p>}><PersonalFilms /></Suspense></main><Footer /></>;
}
