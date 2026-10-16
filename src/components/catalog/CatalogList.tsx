import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import CatalogFeed from "./CatalogFeed";
import type { FilmDTO } from "@/lib/recommend/types";

export default function CatalogList({ title, description, path, films, total, page, pages, context = "list", filmNotes, structuredData = [], children }: {
    title: string; description: string; path: string; films: FilmDTO[]; total: number; page: number; pages: number;
    context?: "list" | "person"; filmNotes?: Record<number,string>; structuredData?: Record<string,unknown>[]; children?: React.ReactNode;
}) {
    return <><SiteHeader /><main className="page-width pb-6 pt-8 sm:pt-12">
        <nav aria-label="İçerik yolu" className="text-sm text-muted"><Link href="/listeler" className="underline underline-offset-4">Film listeleri</Link><span aria-hidden> / </span><span>{title}</span></nav>
        <header className="mb-8 mt-6 max-w-3xl"><p className="eyebrow text-accent-ink">Katalogdan keşfet</p><h1 className="section-heading mt-3">{title}</h1>
            <p className="mt-4 leading-relaxed text-muted">{description}</p>
            <p className="mt-3 text-sm text-muted">Katalogumuzdan {total.toLocaleString("tr-TR")} film · En çok oylananlardan başlayarak</p>
            {children}
        </header>
        <CatalogFeed key={`${path}:${page}`} path={path} title={title} structuredData={structuredData} context={context} initial={{ films, page, pages, total, notes: Object.fromEntries(films.map(film => [film.id, filmNotes?.[film.id] ?? ""])) }} />
    </main><Footer /></>;
}
