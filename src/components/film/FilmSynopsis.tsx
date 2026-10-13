"use client";

import { useEffect, useId, useRef, useState } from "react";
import { T, useLanguage } from "@/components/preferences/Preferences";

export default function FilmSynopsis({ overview, overviewEn }: { overview: string | null; overviewEn?: string | null }) {
    const { language } = useLanguage();
    const [expandedLanguage, setExpandedLanguage] = useState<string | null>(null);
    const [canExpand, setCanExpand] = useState(false);
    const paragraph = useRef<HTMLParagraphElement>(null);
    const paragraphId = useId();
    const text = language === "en" ? overviewEn : overview;
    const expanded = expandedLanguage === language;

    useEffect(() => {
        const element = paragraph.current;
        if (!element || expanded) return;
        const measure = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [text, expanded]);

    if (!text) return <div className="text-sm leading-relaxed text-muted">
        <p><T text={language === "en" ? "A synopsis isn't available yet." : "Türkçe özet henüz bulunmuyor."} /></p>
        {language === "tr" && overviewEn && <details className="mt-2">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold text-ink"><T text={"Orijinal özeti göster"} /></summary>
            <p lang="en" className="mt-2 text-[15px] leading-relaxed">{overviewEn}</p>
        </details>}
    </div>;

    return <div>
        <p ref={paragraph} id={paragraphId} className={`max-w-3xl text-[15px] leading-[1.75] text-ink/85 ${expanded ? "" : "line-clamp-3 sm:line-clamp-none"}`}>{text}</p>
        {(expanded || canExpand) && <button type="button" aria-expanded={expanded} aria-controls={paragraphId} onClick={() => setExpandedLanguage(expanded ? null : language)} className="mt-1 min-h-11 py-2 text-sm font-bold text-accent-ink underline underline-offset-4 sm:hidden"><T text={expanded ? "Daha az göster" : "Devamını oku"} /></button>}
    </div>;
}
