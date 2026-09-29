import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Analytics } from "@vercel/analytics/react";
import Script from 'next/script';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Filminibul - Sevdiğin Filme Benzeyenleri Bul",
    description: "Bir film seç; tema, atmosfer ve hikâye yapısı bakımından ona gerçekten benzeyen filmleri keşfet.",
    keywords: ["film", "sinema", "benzer filmler", "film önerisi", "ne izlesem", "keşfet"],
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
