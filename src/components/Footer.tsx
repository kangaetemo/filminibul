import { T } from "@/components/preferences/Preferences";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-line">
            <div className="page-width flex flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">
                <div><Link href="/" className="text-2xl font-extrabold tracking-[-0.06em] text-ink"><T text={"filminibul"} /><span className="text-accent-ink">.</span></Link><p className="mt-1 text-sm text-muted"><T text={"Bir sonraki güzel filme."} /></p></div>
                <div className="space-y-2 text-xs leading-relaxed text-muted sm:text-right">
                    <p><Link href="/listeler" className="underline underline-offset-4 hover:text-ink">Film listeleri</Link></p>
                    <p><Link href="/hakkinda" className="underline underline-offset-4 hover:text-ink"><T text="Hakkında ve veri kaynakları" /></Link></p>
                    <p>© {new Date().getFullYear()} <T text={"Filminibul"} /> <span className="px-2" aria-hidden>·</span><Link href="/privacy" className="underline underline-offset-4 hover:text-ink"><T text={"Gizlilik politikası"} /></Link></p>
                </div>
            </div>
        </footer>
    );
}
