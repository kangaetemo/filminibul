import Link from "next/link";

// Ortak üst çubuk. `overlay`: film sayfasında olduğu gibi görselin üstüne biner (arka planı saydam).
export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
    return (
        <header className={`z-20 w-full ${overlay ? "absolute top-0 left-0" : "relative"}`}>
            <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-8 py-5">
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
                <nav className="flex items-center gap-1 text-sm text-white/60">
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
