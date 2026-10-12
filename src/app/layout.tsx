import { Suspense } from "react";
import PageTracker from "@/components/analytics/PageTracker";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Script from 'next/script';
import { OG_BASE } from "@/lib/seo";


// Türkçe karakterleri içeren değişken font yerelden yüklenir; harici font isteği gerekmez.
const manrope = localFont({ src: "../fonts/Manrope.ttf", variable: "--font-sans", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
    // Göreli canonical/OG adresleri bu alan adına çözülür (film sayfası: /film/126986-devlet-kusu)
    metadataBase: new URL("https://filminibul.com"),
    title: "Filminibul - Sevdiğin Filme Benzeyenleri Bul",
    description: "Sevdiğin bir filmi seç ya da aradığını tarif et; tema, atmosfer ve hikâye yapısı bakımından en çok uyan filmleri keşfet.",
    keywords: ["film", "sinema", "benzer filmler", "film önerisi", "ne izlesem", "keşfet"],
    // Sayfalar kendi başlık/görselini verir; vermeyenler bunları kullanır (canonical/url burada YOK: alt sayfalara miras kalırdı)
    openGraph: { ...OG_BASE, type: "website" },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body className={`${manrope.variable} font-sans`} style={{ "--font-display": "var(--font-sans)" } as React.CSSProperties}>
			<Script
				async
				src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2982897620909749"
				crossOrigin="anonymous"
				strategy="afterInteractive"
				/>
                {children}
                <Suspense fallback={null}><PageTracker /></Suspense>
                <Analytics />
            </body>
        </html>
    );
}
