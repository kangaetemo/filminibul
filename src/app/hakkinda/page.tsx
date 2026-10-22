import type { Metadata } from "next";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { T } from "@/components/preferences/Preferences";
export const metadata: Metadata = { title: "Hakkında ve veri kaynakları · Filminibul", description: "Filminibul nedir, benzer film önerileri nasıl hazırlanır ve film bilgileri, afişler ve yayın platformu verileri hangi kaynaklardan (TMDB, JustWatch) gelir?", alternates: { canonical: "/hakkinda" } };
export default function AboutPage() {
    return <><SiteHeader /><main className="page-width max-w-3xl py-12"><h1 className="section-heading"><T text="Hakkında ve veri kaynakları" /></h1>
        <p className="mt-6 leading-relaxed text-muted"><T text="Filminibul, sevdiğin filmlerden yola çıkarak yeni hikâyeler bulmana yardımcı olur. Benzer filmleri keşfedebilir, iki filmi karıştırabilir ve kendi film listeni oluşturabilirsin." /></p>
        <section className="mt-10 rounded-xl border border-line bg-card p-6"><h2 className="text-xl font-bold">TMDB</h2>
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block"><Image src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" width={185} height={133} className="h-auto w-28" /></a>
            <p className="mt-4 text-sm leading-relaxed text-muted"><T text="Film bilgileri, afişler ve TMDB puanları The Movie Database üzerinden sağlanır. Gösterilen puanlar IMDb veya Rotten Tomatoes puanı değildir." /></p>
            <p className="mt-4 text-sm leading-relaxed"><T text="Bu site, TMDB API'sini kullanır; TMDB tarafından onaylanmış veya sertifikalandırılmış değildir." /></p>
            <p lang="en" className="mt-3 text-sm leading-relaxed">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </section>
        <section className="mt-6 rounded-xl border border-line bg-card p-6"><h2 className="text-xl font-bold">JustWatch</h2><p className="mt-4 text-sm leading-relaxed text-muted"><T text="Türkiye'deki abonelik, kiralama ve satın alma bilgileri TMDB üzerinden JustWatch tarafından sağlanır. Yayın seçenekleri zamanla değişebilir." /></p></section>
        <section className="mt-6"><h2 className="text-xl font-bold"><T text="Öneriler nasıl oluşuyor?" /></h2><p className="mt-4 text-sm leading-relaxed text-muted"><T text="Öneriler, film kataloğundaki tema, atmosfer ve diğer benzerliklerden oluşur. Kaydettiğin ve beğendiğin filmler kişisel keşfine yön verir; izlediklerin ve sana göre olmayan filmler kişisel önerilerden çıkarılır." /></p></section>
    </main><Footer /></>;
}
