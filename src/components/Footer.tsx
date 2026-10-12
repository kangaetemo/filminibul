import Link from "next/link";

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-line">
            <div className="page-width flex flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">
                <div><Link href="/" className="text-2xl font-extrabold tracking-[-0.06em] text-ink">filminibul<span className="text-accent-ink">.</span></Link><p className="mt-1 text-sm text-muted">Bir sonraki güzel filme.</p></div>
                <div className="space-y-2 text-xs leading-relaxed text-muted sm:text-right">
                    <p>Film verileri ve puanlar: TMDB · Yayın bilgisi: JustWatch</p>
                    <p>Bu ürün TMDB tarafından onaylanmış veya sertifikalandırılmış değildir.</p>
                    <p>© {new Date().getFullYear()} Filminibul <span className="px-2" aria-hidden>·</span><Link href="/privacy" className="underline underline-offset-4 hover:text-ink">Gizlilik politikası</Link></p>
                </div>
            </div>
        </footer>
    );
}
