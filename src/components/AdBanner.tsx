"use client";

import { useTranslation } from "@/contexts/LanguageContext";

interface AdBannerProps {
    variant?: "banner" | "interstitial";
    className?: string;
}

export default function AdBanner({ variant = "banner", className = "" }: AdBannerProps) {
    const { t } = useTranslation();

    if (variant === "interstitial") {
        return (
            <div className={`w-full py-4 ${className}`}>
                <div className="mx-auto max-w-[300px] h-[250px] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-accent/10 flex items-center justify-center">
                            <span className="text-accent text-lg font-bold">AD</span>
                        </div>
                        <p className="text-white/40 text-sm">{t("ad.placeholder")}</p>
                        <p className="text-white/20 text-xs mt-1">300×250</p>
                    </div>
                </div>
            </div>
        );
    }

    // Default banner (320x50 mobile / 728x90 desktop)
    return (
        <div className={`w-full ${className}`}>
            <div className="mx-auto h-[50px] md:h-[90px] max-w-[320px] md:max-w-[728px] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <span className="text-accent text-xs font-bold px-2 py-0.5 bg-accent/10 rounded">AD</span>
                    <p className="text-white/30 text-xs">{t("ad.placeholder")}</p>
                </div>
            </div>
        </div>
    );
}
