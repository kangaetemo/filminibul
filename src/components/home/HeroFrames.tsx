"use client";

// Ana sayfanın büyük film karesi: sunucunun seçtiği kareyle açılır, küçük oklarla diğer karelere geçilir (GR-01).
// Mobil maliyet (GR-02): yalnız ilk kare öncelikli yüklenir; diğerleri ancak oka dokunulunca / üzerine gelinince
// indirilir. Yeni kare yüklenene kadar eski kare ve yazısı ekranda kalır, sonra yumuşakça geçilir.

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/preferences/Preferences";
import { heroBackdropUrl, heroFilmPath, type HeroFrame } from "@/lib/heroFrames";

export default function HeroFrames({ frames, initial, children }: { frames: HeroFrame[]; initial: number; children: ReactNode }) {
    const { language } = useLanguage();
    const en = language === "en";
    const [visible, setVisible] = useState(initial); // ekranda görünen kare
    const [target, setTarget] = useState(initial); // seçilen (yükleniyor olabilir) kare
    const [mounted, setMounted] = useState<number[]>([initial]); // indirilen / indirilmiş kareler
    const [loaded, setLoaded] = useState<number[]>([initial]);

    const at = (step: number) => (target + step + frames.length) % frames.length;
    const prefetch = (step: number) => setMounted((m) => (m.includes(at(step)) ? m : [...m, at(step)]));
    const go = (step: number) => {
        const next = at(step);
        prefetch(step);
        setTarget(next);
        if (loaded.includes(next)) setVisible(next);
    };
    const onLoaded = (index: number) => {
        setLoaded((l) => (l.includes(index) ? l : [...l, index]));
        if (index === target) setVisible(index);
    };

    const frame = frames[visible];
    const label = en ? `This scene: ${frame.titleEn} · ${frame.year}` : `Bu kare: ${frame.title} · ${frame.year}`;
    const arrow = "flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white";

    return (
        <section className="cinema-hero" aria-labelledby="home-title">
            {mounted.map((index) => (
                <Image
                    key={frames[index].id}
                    src={heroBackdropUrl(frames[index])}
                    alt=""
                    fill
                    priority={index === initial}
                    sizes="100vw"
                    onLoad={() => onLoaded(index)}
                    className={`hero-art object-cover transition-opacity duration-700 motion-reduce:transition-none ${index === visible ? "opacity-100" : "opacity-0"}`}
                />
            ))}
            <div className="page-width relative pb-7 pt-7 sm:pb-16 sm:pt-16 lg:pb-16 lg:pt-20">
                {children}
                <div role="group" aria-label={en ? "Home page scenes" : "Ana sayfa kareleri"} className="-ml-3 mt-3 flex items-center lg:absolute lg:bottom-4 lg:right-9 lg:ml-0 lg:mt-0">
                    <button type="button" onClick={() => go(-1)} onPointerEnter={() => prefetch(-1)} onFocus={() => prefetch(-1)} className={arrow} aria-label={en ? "Previous scene" : "Önceki kare"}>
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <p aria-live="polite" className="px-1">
                        <Link href={heroFilmPath(frame)} className="inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/75 hover:text-white">
                            {label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    </p>
                    <button type="button" onClick={() => go(1)} onPointerEnter={() => prefetch(1)} onFocus={() => prefetch(1)} className={arrow} aria-label={en ? "Next scene" : "Sonraki kare"}>
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            </div>
        </section>
    );
}
