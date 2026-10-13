"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Platform } from "@/lib/recommend/providers";
import { platformUrl } from "@/lib/discoveryUrl.mjs";
const STORAGE_KEY = "filminibul:platforms";
function readSaved(): number[] {
    try { return (localStorage.getItem(STORAGE_KEY) ?? "").split(",").map(Number).filter(id => Number.isSafeInteger(id) && id > 0); }
    catch { return []; }
}
function save(ids: number[]) {
    try { if (ids.length) localStorage.setItem(STORAGE_KEY, ids.join(",")); else localStorage.removeItem(STORAGE_KEY); } catch {}
}
export default function PlatformFilter({ platforms, selected }: { platforms: Platform[]; selected: number[] }) {
    const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams();
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    const search = searchParams.toString();
    useEffect(() => {
        if (new URLSearchParams(search).has("p")) return;
        const saved = readSaved().filter(id => platforms.some(p => p.id === id));
        if (saved.length) router.replace(platformUrl(pathname, search, saved), { scroll: false });
    }, [pathname, search, platforms, router]);
    const apply = (ids: number[]) => {
        save(ids);
        router.replace(platformUrl(pathname, window.location.search, ids) + window.location.hash, { scroll: false });
    };
    const chosen = platforms.filter(p => selected.includes(p.id));
    return <div className="mb-5" onKeyDown={event => { if (event.key === "Escape" && open) { setOpen(false); button.current?.focus(); } }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button ref={button} type="button" aria-expanded={open} aria-controls="platform-options" onClick={() => setOpen(value => !value)} className="button-secondary">
                <SlidersHorizontal className="h-4 w-4" aria-hidden />{t("Platformlar")}{selected.length > 0 && ` (${selected.length})`}<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {chosen.length > 0 && <p className="min-w-0 max-w-full break-words text-xs text-muted">{chosen.map(p => p.name).join(" · ")}</p>}
            {selected.length > 0 && <button type="button" onClick={() => apply([])} className="min-h-11 text-xs text-muted underline hover:text-ink"><T text="Tümünü göster" /></button>}
        </div>
        {open && <div id="platform-options" className="mt-3 rounded-xl border border-line bg-card p-4">
            <p className="mb-3 text-xs text-muted"><T text="Önerileri izleyebileceğin platformlara göre filtrele." /></p>
            <div className="flex flex-wrap gap-2">{platforms.map(p => {
                const active = selected.includes(p.id);
                return <button key={p.id} type="button" aria-pressed={active} onClick={() => apply(active ? selected.filter(id => id !== p.id) : [...selected, p.id])} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs ${active ? "border-accent-ink/50 bg-accent/25 text-ink" : "border-line text-muted hover:text-ink"}`}>
                    {p.logoUrl && <Image src={p.logoUrl} alt="" width={20} height={20} className="rounded-full" />}{p.name}
                </button>;
            })}</div>
        </div>}
    </div>;
}
