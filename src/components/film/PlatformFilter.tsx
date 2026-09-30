"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Platform } from "@/lib/recommend/providers";

// "Sadece benim platformlarım" filtresi. Seçim URL'de (?p=8,119) tutulur, sunucu buna göre filtreler.
// Seçim tarayıcıda da hatırlanır: başka bir film sayfası açılınca otomatik uygulanır.
const STORAGE_KEY = "filminibul:platforms";

function readSaved(): number[] {
    try {
        return (localStorage.getItem(STORAGE_KEY) ?? "").split(",").map(Number).filter(Boolean);
    } catch {
        return [];
    }
}

function save(ids: number[]) {
    try {
        if (ids.length) localStorage.setItem(STORAGE_KEY, ids.join(","));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // gizli sekme vb.: hatırlama olmadan da çalışır
    }
}

export default function PlatformFilter({ platforms, selected }: { platforms: Platform[]; selected: number[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const apply = (ids: number[]) => {
        save(ids);
        router.replace(ids.length ? `${pathname}?p=${ids.join(",")}` : pathname, { scroll: false });
    };

    // URL'de seçim yoksa kayıtlı tercihi uygula
    useEffect(() => {
        if (searchParams.has("p")) return;
        const saved = readSaved().filter((id) => platforms.some((p) => p.id === id));
        if (saved.length) router.replace(`${pathname}?p=${saved.join(",")}`, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const toggle = (id: number) => apply(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/50 mr-1">Platformlarım:</span>
            {platforms.map((p) => {
                const active = selected.includes(p.id);
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={active}
                        title={p.name}
                        className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs transition-colors ${
                            active ? "bg-accent/25 border-accent/60 text-white" : "bg-card border-white/10 text-white/60 hover:text-white hover:border-accent/40"
                        }`}
                    >
                        {p.logoUrl && <Image src={p.logoUrl} alt="" width={20} height={20} className="rounded-full" />}
                        {p.name}
                    </button>
                );
            })}
            {selected.length > 0 && (
                <button type="button" onClick={() => apply([])} className="text-xs text-white/40 hover:text-white underline ml-1">
                    Tümünü göster
                </button>
            )}
        </div>
    );
}
