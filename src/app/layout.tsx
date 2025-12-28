import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Analytics } from "@vercel/analytics/react";
import Script from 'next/script';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Filminibul - Bir Sonraki Favorini Keşfet",
    description: "Tinder tarzı film keşif uygulaması. Kaydırarak bir sonraki favori filmini bul.",
    keywords: ["film", "sinema", "keşfet", "kaydır", "izleme listesi", "öneriler"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body className={inter.className}>
			<Script
				async
				src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2982897620909749"
				rossOrigin="anonymous"
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
