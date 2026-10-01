import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Analytics } from "@vercel/analytics/react";
import Script from 'next/script';


// latin-ext şart: ş, ğ, ı, İ gibi Türkçe karakterler bu alt kümede (yoksa sistem fontuna düşer)
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
    title: "Filminibul - Sevdiğin Filme Benzeyenleri Bul",
    description: "Sevdiğin bir filmi seç ya da aradığını tarif et; tema, atmosfer ve hikâye yapısı bakımından en çok uyan filmleri keşfet.",
    keywords: ["film", "sinema", "benzer filmler", "film önerisi", "ne izlesem", "keşfet"],
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
                <LanguageProvider>
                    <AuthProvider>{children}</AuthProvider>
                </LanguageProvider>
                <Analytics />
            </body>
        </html>
    );
}
