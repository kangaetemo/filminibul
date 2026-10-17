"use client";

// Film sayfasındaki öneri bölümünün başlığı (SEO-03): aramalardaki "X gibi / benzeri filmler" ifadesiyle aynı dil.
// Türkçede film adına ek getirilmez ("gibi" ek istemez); İngilizcede söz dizimi farklı olduğu için ayrı cümle.

import { useLanguage } from "@/components/preferences/Preferences";
import type { FilmDTO } from "@/lib/recommend/types";

export default function SimilarHeading({ film }: { film: FilmDTO }) {
    const { language } = useLanguage();
    const en = language === "en";
    const title = en ? film.titleEn || film.title : film.title;
    return (
        <>
            <h2 id="similar-heading" className="section-heading break-words">{en ? `Films like ${title}` : `${title} gibi filmler`}</h2>
            <p className="mt-3 text-sm text-muted">
                {en ? `Similar films in the spirit of ${title}, closest in theme, atmosphere and story.` : `${title} benzeri, aynı havayı taşıyan filmler: tema, atmosfer ve hikâyece en yakın olanlar.`}
            </p>
        </>
    );
}
