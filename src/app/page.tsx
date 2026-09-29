import Link from "next/link";
import { Film } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import MoodChips from "@/components/search/MoodChips";
import Footer from "@/components/Footer";

// Ana akış: film ara (ya da mod seç) → /film/[id] → benzer filmler.
export default function HomePage() {
    return (
        <main className="min-h-screen bg-background flex flex-col">
            <header className="flex items-center justify-between px-4 sm:px-6 py-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                        <Film className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">Filminibul</span>
                </Link>
            </header>

            <section className="flex-1 px-4 pt-[12vh] pb-16">
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">Sevdiğin filme benzeyenleri bul</h1>
                    <p className="mt-3 text-white/50">
                        Bir film seç; tema, atmosfer ve hikâye yapısı bakımından ona gerçekten benzeyen filmleri önerelim.
                    </p>
                </div>
                <SearchBox />

                <div className="mt-12 max-w-2xl mx-auto">
                    <p className="mb-3 text-center text-sm text-white/40">…ya da moduna göre seç</p>
                    <MoodChips center />
                </div>
            </section>

            <Footer />
        </main>
    );
}
