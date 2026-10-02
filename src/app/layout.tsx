import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Script from 'next/script';
import { OG_BASE } from "@/lib/seo";


// latin-ext şart: ş, ğ, ı, İ gibi Türkçe karakterler bu alt kümede (yoksa sistem fontuna düşer)
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap", axes: ["opsz"] });

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
            <body className={`${inter.variable} ${fraunces.variable} font-sans`}>
			<Script
				async
				src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2982897620909749"
				crossOrigin="anonymous"
				strategy="afterInteractive"
				/>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
