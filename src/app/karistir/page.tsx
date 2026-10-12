import { T, FilmText } from "@/components/preferences/Preferences";
import ResultEvent from "@/components/analytics/ResultEvent";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import FilmCard from "@/components/film/FilmCard";
import BlendPicker, { type PickedFilm } from "@/components/blend/BlendPicker";
import { blendFilms } from "@/lib/recommend/blend";
import { getFilm } from "@/lib/recommend/similar";
import type { FilmDTO } from "@/lib/recommend/types";
import { OG_BASE } from "@/lib/seo";

// Next 14: searchParams senkron nesne (Next 15+'da Promise olur)
type Props = { searchParams?: { a?: string; b?: string } };

const parseId = (raw?: string) => {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** a ve b; aynı film iki kez seçildiyse ikincisi yok sayılır */
function parsePair(sp: Props["searchParams"]): [number | null, number | null] {
    const a = parseId(sp?.a);
    const b = parseId(sp?.b);
    return [a, b === a ? null : b];
}

const EXAMPLES: [number, number, string][] = [
    [603, 194, "Matrix + Amelie"],
    [862, 348, "Oyuncak Hikayesi + Yaratık"],
    [27205, 11036, "Başlangıç + Not Defteri"],
    [129, 120, "Ruhların Kaçışı + Yüzüklerin Efendisi"],
];

async function loadPicked(id: number | null): Promise<FilmDTO | null> {
    const film = id ? await getFilm(id) : null;
    return film?.inCatalog ? film : null;
}

const toPicked = (f: FilmDTO | null): PickedFilm | null => (f ? { id: f.id, title: f.title, titleEn: f.titleEn, year: f.year, posterUrl: f.posterUrl } : null);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const [idA, idB] = parsePair(searchParams);
    const [a, b] = await Promise.all([loadPicked(idA), loadPicked(idB)]);
    const base = { robots: { index: false, follow: true } }; // sonsuz çift: arama motoruna sadece ana /karistir
    if (!a || !b) {
        return {
            title: "İki filmi karıştır · Filminibul",
            description: "İki film seç, ikisine birden benzeyen filmleri bul.",
            alternates: { canonical: "/karistir" },
        };
    }
    const title = `${a.title} + ${b.title} karışımı filmler`;
    const description = `${a.title} ve ${b.title} filmlerine birlikte benzeyen filmler.`;
    return {
        ...base,
        title: `${title} · Filminibul`,
        description,
        openGraph: { ...OG_BASE, type: "website", title, description, ...(a.backdropUrl && { images: [{ url: a.backdropUrl, alt: a.title }] }) },
        twitter: { card: a.backdropUrl ? "summary_large_image" : "summary" },
    };
}

export default async function BlendPage({ searchParams }: Props) {
    const [idA, idB] = parsePair(searchParams);
    const [a, b] = await Promise.all([loadPicked(idA), loadPicked(idB)]);

    return (
        <main className="min-h-screen bg-background">
            <div className="spotlight">
                <SiteHeader />
                <section className="mx-auto max-w-4xl px-5 pb-10 pt-6 sm:px-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-accent-ink/80"><T text={"İki filmi karıştır"} /></p>
                    <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-5xl">
                        {a && b ? (
                            <>
                                <FilmText film={a} field="title" /> <span className="text-accent-ink">+</span> <FilmText film={b} field="title" />
                            </>
                        ) : (
                            <T text={"İkisine birden benzeyen filmler"} />
                        )}
                    </h1>
                    {!(a && b) && <p className="mt-3 max-w-2xl text-muted"><T text={"İki film seç; ikisinin de havasını taşıyan, ikisinin arasında kalan filmleri bulalım."} /></p>}
                    <div className="mt-8">
                        {/* key: adres değişince seçim baştan kurulsun (örnek bağlantılar, geri tuşu) */}
                        <BlendPicker key={`${a?.id}-${b?.id}`} initialA={toPicked(a)} initialB={toPicked(b)} />
                    </div>
                </section>
            </div>

            <section className="mx-auto max-w-[1280px] px-5 pb-8 sm:px-8">
                {a && b ? (
                    <Suspense key={`${a.id}-${b.id}`} fallback={<Skeleton />}>
                        <Results a={a.id} b={b.id} />
                    </Suspense>
                ) : (
                    <div className="mx-auto max-w-4xl">
                        <p className="text-muted"><T text={"Ya da bir örnekle başla:"} /></p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {EXAMPLES.map(([x, y, label]) => (
                                <Link
                                    key={label}
                                    href={`/karistir?a=${x}&b=${y}`}
                                    className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
                                >
                                    <T text={label} />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}

async function Results({ a, b }: { a: number; b: number }) {
    let result;
    try {
        result = await blendFilms(a, b);
    } catch (err) {
        console.error("karıştır hatası:", err);
        return (
            <div role="alert" className="rounded-2xl border border-line bg-card p-6 text-ink/80"> <T text={"Şu an karıştıramadık. Biraz sonra tekrar dene."} /> </div>
        );
    }
    if (!result || result.films.length === 0) {
        return <><ResultEvent name="blend_completed" data={{ source_film_id: a, second_film_id: b, result_count: 0 }} /><p className="text-muted"><T text={"Bu iki filme birlikte benzeyen bir film bulamadık. Başka bir ikili dene."} /></p></>;
    }
    return (
        <>
            <ResultEvent name="blend_completed" data={{ source_film_id: a, second_film_id: b, result_count: result.films.length }} />
            <p className="text-sm text-muted">{result.films.length} <T text={"film · ikisine de en çok benzeyenden başlayarak"} /></p>
            <ul className="mt-6 movie-grid">
                {result.films.map((f, i) => (
                    <FilmCard key={f.film.id} film={f.film} reasons={f.reasons} reasonsEn={f.reasonsEn} index={i} context="blend" />
                ))}
            </ul>
        </>
    );
}

function Skeleton() {
    return (
        <div aria-busy="true" aria-label="Filmler karıştırılıyor">
            <p className="text-sm text-muted"><T text={"İki filmin arasında kalan filmler aranıyor…"} /></p>
            <ul className="mt-6 movie-grid">
                {Array.from({ length: 12 }, (_, i) => (
                    <li key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink/5" />
                ))}
            </ul>
        </div>
    );
}
