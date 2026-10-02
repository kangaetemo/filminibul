import Link from "next/link";
import SearchBox from "@/components/search/SearchBox";

// Ortak üst çubuk. `overlay`: film sayfasında olduğu gibi görselin üstüne biner (arka planı saydam).
// `search`: ortada arama kutusu (ana sayfa ve /ara kendi büyük kutusunu gösterdiği için orada kapalı).
export default function SiteHeader({ overlay = false, search = true }: { overlay?: boolean; search?: boolean }) {
    return (
        <header className={`z-20 w-full ${overlay ? "absolute top-0 left-0" : "relative"}`}>
            <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-3 px-4 sm:px-8 py-4 sm:py-5">
                <Link href="/" className="group flex items-center gap-2.5" aria-label="Filminibul ana sayfa">
                    {/* Projeksiyon ışığı: küçük amber nokta */}
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-glow" />
                    </span>
                    <span className="font-display text-2xl leading-none tracking-tight text-white">
                        Filmini<span className="text-accent-glow">bul</span>
                    </span>
                </Link>
                {search && (
                    <div className="order-last w-full sm:order-none sm:ml-auto sm:w-72 lg:w-80">
                        <SearchBox size="sm" autoFocus={false} />
                    </div>
                )}
                <nav className={`flex items-center gap-1 text-sm text-white/60 ${search ? "ml-auto sm:ml-0" : "ml-auto"}`}>
                    <Link href="/#modlar" className="px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                        Ruh hâlleri
                    </Link>
                    <Link href="/ara" className="px-3 py-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors">
                        Tarif et
                    </Link>
                </nav>
            </div>
        </header>
    );
}
