import Link from "next/link";
import { Suspense } from "react";
import { MessageSquareText, Search, Lightbulb } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import MoodChips from "@/components/search/MoodChips";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import PosterWall from "@/components/home/PosterWall";

// Kullanıcının aklına gelebilecek, örnek olsun diye tıklanabilir tarifler
const EXAMPLES = [
    "zaman döngüsünde sıkışıp kalmış bir karakter",
    "yağmurlu, melankolik, yalnızlık hissi veren",
    "sonunda herkesi şaşırtan psikolojik gerilim",
    "kıyamet sonrası dünyada baba ve oğul",
    "küçük bir kasabada gizemli kayboluşlar",
    "gerçeklik algını sorgulatan bir film",
];

const STEPS = [
    {
        icon: Search,
        title: "Bir film seç",
        text: "Sevdiğin bir filmin adını yaz; tema, atmosfer ve hikâye yapısı en çok uyanları bulalım.",
    },
    {
        icon: MessageSquareText,
        title: "Ya da tarif et",
        text: "Film adı aklına gelmiyorsa anlat: “zaman döngüsünde sıkışmış biri”, “yağmurlu ve melankolik”.",
    },
    {
        icon: Lightbulb,
        title: "Nedenini gör",
        text: "Her öneri neden önerildiğini söyler: ortak temalar, aynı yönetmen, aynı seri.",
    },
];

// Ana akış: film adı yaz ya da tarif et → sonuçlar; ya da ruh hâline göre seç.
export default function HomePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="relative overflow-hidden spotlight">
                <Suspense>
                    <PosterWall />
                </Suspense>

                <SiteHeader search={false} />

                <section className="relative px-4 pt-[9vh] pb-24 sm:pt-[12vh]">
                    <div className="mx-auto max-w-3xl text-center animate-fade-up">
                        <p className="text-xs uppercase tracking-[0.3em] text-accent-glow/80">Tema · Atmosfer · Hikâye</p>
                        <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-white sm:text-7xl">
                            Aklındaki filmi <em className="italic text-accent-glow">tarif et</em>.
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
                            Sevdiğin bir film ya da yarım hatırladığın bir his yeter. Konusuna, havasına ve hikâye yapısına göre sana en yakın filmleri bulalım.
                        </p>
                    </div>

                    <div className="mt-10">
                        <SearchBox />
                    </div>

                    <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
                        {EXAMPLES.map((e) => (
                            <Link
                                key={e}
                                href={`/ara?q=${encodeURIComponent(e)}`}
                                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-white/55 transition-colors hover:border-accent/40 hover:text-white"
                            >
                                {e}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            <section id="modlar" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-8">
                <h2 className="font-display text-3xl text-white sm:text-4xl">Ya da bugünkü ruh hâline göre</h2>
                <p className="mt-2 text-white/45">Bir kutucuk seç, seni o havaya sokan filmler gelsin.</p>
                <div className="mt-8">
                    <MoodChips tiles />
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-8">
                <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
                    {STEPS.map((s, i) => (
                        <div key={s.title} className="bg-card p-6">
                            <div className="flex items-center gap-3 text-accent-glow">
                                <s.icon className="h-5 w-5" aria-hidden />
                                <span className="text-xs tabular-nums text-white/30">0{i + 1}</span>
                            </div>
                            <h3 className="mt-4 font-display text-xl text-white">{s.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-white/50">{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <Footer />
        </main>
    );
}
