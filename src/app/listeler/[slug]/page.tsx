import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import CatalogList from "@/components/catalog/CatalogList";
import { getListSnapshot } from "@/lib/catalog/lists";
import { GENRES, getPilotList, pagePath, parsePage, PAGE_SIZE } from "@/lib/catalog/pilot";
import { OG_BASE } from "@/lib/seo";

export const revalidate = 86400;
type Props = { params: { slug: string }; searchParams?: Record<string, string | string[] | undefined> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const page = parsePage(searchParams?.page);
    if (!page || !getPilotList(params.slug)) return { title: "Liste bulunamadı", robots: { index: false, follow: false } };
    const snapshot = await getListSnapshot(params.slug);
    if (!snapshot || !page || page > snapshot.pages) return { title: "Liste bulunamadı", robots: { index: false, follow: false } };
    const { list } = snapshot;
    const title = `${list.title}${page > 1 ? ` · Sayfa ${page}` : ""} · Filminibul`;
    const description = `${list.year} yılına ait ${GENRES[list.genreId].name.toLocaleLowerCase("tr")} filmlerini katalogumuzdan keşfet. ${snapshot.total} film, TMDB oy sayısına göre sıralı.`;
    const path = pagePath(`/listeler/${list.slug}`, page);
    return { title, description, alternates: { canonical: path },
        robots: { index: process.env.VERCEL_ENV !== "preview" && Object.keys(searchParams ?? {}).every(k => k === "page"), follow: true },
        openGraph: { ...OG_BASE, type: "website", title, description, url: path } };
}
export default async function ListPage({ params, searchParams }: Props) {
    if (!getPilotList(params.slug)) notFound();
    const page = parsePage(searchParams?.page);
    if (!page) notFound();
    const path = `/listeler/${params.slug}`;
    if (searchParams?.page === "1") permanentRedirect(path);
    const snapshot = await getListSnapshot(params.slug);
    if (!snapshot || !snapshot.total || page > snapshot.pages) notFound();
    return <CatalogList title={snapshot.list.title} path={path} page={page} pages={snapshot.pages} total={snapshot.total}
        description={`${GENRES[snapshot.list.genreId].description} Buradaki yıl, TMDB kaynaklı çıkış yılıdır; Türkiye vizyon tarihi anlamına gelmez.`}
        films={snapshot.films.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} />;
}
