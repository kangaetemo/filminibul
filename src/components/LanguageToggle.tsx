"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === "tr" ? "en" : "tr")}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            title={language === "tr" ? "Switch to English" : "Türkçe'ye geç"}
        >
            <motion.span
                key={language}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg"
            >
                {language === "tr" ? "🇹🇷" : "🇬🇧"}
            </motion.span>
            <span className="text-xs text-white/60 uppercase font-medium">
                {language}
            </span>
        </button>
    );
}
