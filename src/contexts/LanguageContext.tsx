"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Language, translations, TranslationKey } from "@/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "filminibul_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("tr"); // Default Turkish
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
        if (stored && (stored === "tr" || stored === "en")) {
            setLanguageState(stored);
        }
        setIsHydrated(true);
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    }, []);

    const t = useCallback((key: TranslationKey): string => {
        return translations[language][key] || key;
    }, [language]);

    // Prevent hydration mismatch
    if (!isHydrated) {
        return (
            <LanguageContext.Provider value={{ language: "tr", setLanguage, t: (key) => translations.tr[key] || key }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

// Convenience hook for just translations
export function useTranslation() {
    const { t, language } = useLanguage();
    return { t, language };
}
