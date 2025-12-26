import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Filminibul - Discover Movies You'll Love",
    description: "Swipe through movies Tinder-style. Find your next favorite film with our intuitive movie discovery app.",
    keywords: ["movies", "film", "discover", "swipe", "watchlist", "recommendations"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
