"use client";

import { useTranslation } from "@/contexts/LanguageContext";

export default function Footer() {
    const { language } = useTranslation();

    return (
        <footer className="mt-20 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
                <span className="font-display text-sm text-white/50">Filminibul</span>
                <div className="flex items-center gap-4">
                    <span>© {new Date().getFullYear()} filminibul</span>
                    <a href="/privacy" className="hover:text-white/70 transition-colors">
                        {language === "tr" ? "Gizlilik Politikası" : "Privacy Policy"}
                    </a>
                </div>
                <span>Film verileri: TMDB · Yayın bilgisi: JustWatch</span>
            </div>
        </footer>
    );
}
