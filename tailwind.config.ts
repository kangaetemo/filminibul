import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Sıcak, sinematik palet. `white` bilerek hafif krem: text-white/70, border-white/10 gibi
                // tüm opaklık kullanımları sıcak tonda çıkar.
                white: "#f6efe4",
                background: "rgb(var(--background-rgb) / <alpha-value>)",
                card: "rgb(var(--card-rgb) / <alpha-value>)",
                "card-hover": "rgb(var(--card-hover-rgb) / <alpha-value>)",
                "ink": "rgb(var(--ink-rgb) / <alpha-value>)",
                "muted": "rgb(var(--muted-rgb) / <alpha-value>)",
                "line": "rgb(var(--line-rgb) / <alpha-value>)",
                "accent": "rgb(var(--accent-rgb) / <alpha-value>)",
                "accent-glow": "rgb(var(--accent-glow-rgb) / <alpha-value>)",
                "accent-ink": "rgb(var(--accent-ink-rgb) / <alpha-value>)",
                ember: "#c2542d",
                "button-ink": "#241c14",
                // Admin panelinde kullanılan durum renkleri
                like: "#22c55e",
                "like-glow": "#4ade80",
                pass: "#ef4444",
                "pass-glow": "#f87171",
            },
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                display: ["var(--font-display)", "Georgia", "serif"],
            },
            boxShadow: {
                "glow-like": "0 0 40px rgba(34, 197, 94, 0.4)",
                "glow-pass": "0 0 40px rgba(239, 68, 68, 0.4)",
                "glow-card": "0 12px 36px rgba(24, 32, 34, 0.10)",
                "glow-accent": "0 8px 24px rgba(24, 32, 34, 0.10)",
            },
            animation: {
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "marquee-slow": "marquee 90s linear infinite",
                "fade-up": "fade-up 0.6s ease-out both",
            },
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(224, 150, 58, 0.3)" },
                    "50%": { boxShadow: "0 0 40px rgba(224, 150, 58, 0.6)" },
                },
                marquee: {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(-50%)" },
                },
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
