import { T } from "@/components/preferences/Preferences";
import ResultEvent from "@/components/analytics/ResultEvent";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import SearchBox from "@/components/search/SearchBox";
import FilmCard from "@/components/film/FilmCard";
import { VibeError, VIBE_MAX_CHARS } from "@/lib/recommend/vibe";
import { cachedVibeSearch } from "@/lib/recommend/vibeCached";

// Tarife göre film arama: /ara?q=zaman döngüsünde sıkışmış bir karakter
// Sorgu sonsuz çeşitlilikte olduğu için arama motorlarına açılmaz; adres yine de paylaşılabilir.
export const metadata: Metadata = { robots: { index: false } };

// Next 14: searchParams senkron nesne (Next 15+'da Promise olur)
type Props = { searchParams?: { q?: string } };

const EXAMPLES = [
    "ağlatan ama sonunda umut veren bir aile hikâyesi",
    "uzayda mahsur kalan astronotun hayatta kalma mücadelesi",
    "soğuk, kasvetli, İskandinav havasında bir cinayet gizemi",
    "iyi insanların kötü seçimler yaptığı ahlaki ikilem filmleri",
];

export default function VibePage({ searchParams }: Props) {
    const q = (searchParams?.q ?? "").slice(0, VIBE_MAX_CHARS).trim();

    return (
        <main className="min-h-screen bg-background">
            <div className="spotlight">
                <SiteHeader search={false} />
                <section className="mx-auto max-w-[1280px] px-5 pt-6 pb-10 sm:px-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-accent-ink/80"><T text={"Tarifine göre"} /></p>
                    <h1 className="mt-3 max-w-4xl font-display text-3xl leading-tight text-ink sm:text-5xl">
                        {q ? <><T text={"“"} />{q}<T text={"“"} /></> : <T text={"Nasıl bir film arıyorsun?"} />}
                    </h1>
                    <div className="mt-8 max-w-2xl">
                        <SearchBox key={q} initialQuery={q} autoFocus={!q} size="md" mode="vibe" />
                    </div>
                </section>
            </div>

            <section className="mx-auto max-w-[1280px] px-5 pb-8 sm:px-8">
                {q ? (
                    <Suspense key={q} fallback={<Skeleton />}>
                        <Results q={q} />
                    </Suspense>
                ) : (
                    <div>
                        <p className="text-muted"><T text={"Konusunu, havasını ya da hissettirdiğini yaz. Film adını bilmen gerekmiyor. Örneğin:"} /></p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {EXAMPLES.map((e) => (
                                <Link
                                    key={e}
                                    href={`/ara?q=${encodeURIComponent(e)}`}
                                    className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink"
                                >
                                    <T text={e} />
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

async function Results({ q }: { q: string }) {
    const ip = headers().get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    let result;
    try {
        result = (await cachedVibeSearch(q, ip)).result;
    } catch (err) {
        if (!(err instanceof VibeError)) console.error("vibe sayfası hatası:", err);
        const message = err instanceof VibeError ? err.message : "Arama şu an yapılamadı. Biraz sonra tekrar dene.";
        const unavailable = err instanceof VibeError && err.code === "vibe_service_unavailable";
        return (
            <div role="alert" className="rounded-2xl border border-line bg-card p-6 text-ink/80">
                <p><T text={message} /></p>
                {unavailable && <div className="mt-5 max-w-xl"><h2 className="mb-3 text-base font-bold"><T text="Film adıyla ara" /></h2><SearchBox mode="film" allowDescription={false} autoFocus={false} size="md" /><Link href="/#modlar" className="text-link mt-4 inline-flex min-h-11 items-center"><T text="Ruh hâline göre keşfet" /></Link></div>}
            </div>
        );
    }

    if (result.films.length === 0) {
        return <><ResultEvent name="search_performed" data={{ query: q, context: "vibe", result_count: 0 }} /><p className="text-muted"><T text={"Bu tarife uyan bir film bulamadık. Biraz daha farklı anlatmayı dene."} /></p></>;
    }

    return (
        <>
            <ResultEvent name="search_performed" data={{ query: q, context: "vibe", result_count: result.films.length }} />
            <p className="text-sm text-muted">
                {result.films.length} <T text={"film · tarifine en çok uyandan başlayarak"} /> </p>
            <ul className="mt-6 movie-grid">
                {result.films.map((v, i) => (
                    <FilmCard key={v.film.id} film={v.film} reasons={v.matched} reasonsEn={v.matchedEn} index={i} context="vibe" />
                ))}
            </ul>
            <p className="mt-10 text-sm text-muted"> <T text={"Bir filme tıkla, ona benzeyen filmleri ve nerede izlenebildiğini gör."} /> </p>
        </>
    );
}

function Skeleton() {
    return (
        <div aria-busy="true" aria-label="Filmler aranıyor">
            <p className="text-sm text-muted"><T text={"Tarifine uyan filmler aranıyor…"} /></p>
            <ul className="mt-6 movie-grid">
                {Array.from({ length: 12 }, (_, i) => (
                    <li key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink/5" />
                ))}
            </ul>
        </div>
    );
}
