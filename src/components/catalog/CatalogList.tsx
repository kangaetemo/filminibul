import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import CatalogFeed from "./CatalogFeed";
import { filmPath } from "@/lib/filmUrl";
import { jsonLd, pagePath, PAGE_SIZE } from "@/lib/catalog/pilot";
import type { FilmDTO } from "@/lib/recommend/types";

export default function CatalogList({ title, description, path, films, total, page, pages, context = "list", filmNotes, structuredData = [], children }: {
    title: string; description: string; path: string; films: FilmDTO[]; total: number; page: number; pages: number;
    context?: "list" | "person"; filmNotes?: Record<number,string>; structuredData?: Record<string,unknown>[]; children?: React.ReactNode;
}) {
    const site = "https://filminibul.com";
    const url = site + pagePath(path, page);
    const structured = { "@context": "https://schema.org", "@graph": [
        ...structuredData,
        { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Filminibul", item: site },
            { "@type": "ListItem", position: 2, name: "Film listeleri", item: `${site}/listeler` },
            { "@type": "ListItem", position: 3, name: title, item: url },
        ] },
        { "@type": "ItemList", name: title, url, numberOfItems: films.length,
            itemListElement: films.map((f, i) => ({ "@type": "ListItem", position: (page - 1) * PAGE_SIZE + i + 1, name: f.title, url: site + filmPath(f.id, f.title) })) },
    ] };
    return <><SiteHeader /><main className="page-width pb-6 pt-8 sm:pt-12">
        <nav aria-label="İçerik yolu" className="text-sm text-muted"><Link href="/listeler" className="underline underline-offset-4">Film listeleri</Link><span aria-hidden> / </span><span>{title}</span></nav>
        <header className="mb-8 mt-6 max-w-3xl"><p className="eyebrow text-accent-ink">Katalogdan keşfet</p><h1 className="section-heading mt-3">{title}</h1>
            <p className="mt-4 leading-relaxed text-muted">{description}</p>
            <p className="mt-3 text-sm text-muted">Katalogumuzdan {total.toLocaleString("tr-TR")} film · En çok oylananlardan başlayarak</p>
            {children}
        </header>
        <CatalogFeed key={`${path}:${page}`} path={path} context={context} initial={{ films, page, pages, total, notes: Object.fromEntries(films.map(film => [film.id, filmNotes?.[film.id] ?? ""])) }} />
        <nav aria-label="Sayfalar" className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {page > 1 && <Link href={pagePath(path, page - 1)} rel="prev" className="button-secondary">Önceki sayfa</Link>}
            <span className="text-sm text-muted">Başlangıç sayfası {page} / {pages}</span>
            {page < pages && <Link href={pagePath(path, page + 1)} rel="next" className="min-h-11 p-3 text-sm underline">Sonraki sayfayı ayrı aç</Link>}
            {page > 1 && <Link href={path} className="min-h-11 p-3 text-sm underline">İlk sayfa</Link>}
        </nav>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
    </main><Footer /></>;
}
