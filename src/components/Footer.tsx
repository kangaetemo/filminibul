"use client";

import { useTranslation } from "@/contexts/LanguageContext";

export default function Footer() {
    const { t, language } = useTranslation();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-10 py-2 px-4 bg-background/80 backdrop-blur-sm border-t border-white/5">
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 text-xs text-white/30">
                <span>© 2024 filminibul</span>
                <span>•</span>
                <a
                    href="/privacy"
                    className="hover:text-white/60 transition-colors"
                >
                    {language === "tr" ? "Gizlilik Politikası" : "Privacy Policy"}
                </a>
                <span>•</span>
                <a
                    href="https://www.themoviedb.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/60 transition-colors"
                >
                    TMDB
                </a>
            </div>
        </footer>
    );
}
