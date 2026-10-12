import Link from "next/link";
import { Bookmark, Clapperboard } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";

export default function SiteHeader({ search = true }: { search?: boolean }) {
    return (
        <header className="relative z-30 border-b border-line bg-background">
            <div className="page-width flex min-h-[82px] flex-wrap items-center gap-x-6 gap-y-3 py-4 sm:py-5">
                <Link href="/" className="flex items-center gap-2 text-ink" aria-label="Filminibul ana sayfa">
                    <span className="text-[27px] font-extrabold leading-none tracking-[-0.07em]">filminibul</span>
                    <span className="flex h-7 w-6 items-center justify-center rounded-sm bg-accent"><Clapperboard className="h-4 w-4" aria-hidden /></span>
                </Link>
                <nav className="order-last flex w-full items-center gap-5 text-[12px] font-bold text-ink sm:order-none sm:w-auto sm:gap-6 lg:ml-5 lg:text-sm" aria-label="Ana menü">
                    <Link href="/" className="py-1.5 hover:underline underline-offset-4">Keşfet</Link>
                    <Link href="/#modlar" className="py-1.5 hover:underline underline-offset-4">Ruh hâline göre</Link>
                    <Link href="/karistir" className="py-1.5 hover:underline underline-offset-4">İki filmi karıştır</Link>
                </nav>
                <Link href="/kaydedilenler" className="ml-auto flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-semibold text-ink hover:underline underline-offset-4">
                    <Bookmark className="h-5 w-5" aria-hidden /><span className="hidden lg:inline">Kaydettiklerim</span><span className="sr-only lg:hidden">Kaydettiklerim</span>
                </Link>
                {search && <div className="order-last w-full md:order-none md:w-60"><SearchBox size="sm" autoFocus={false} /></div>}
            </div>
        </header>
    );
}
