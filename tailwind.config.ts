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
                background: "#0a0a0a",
                card: "#1a1a1a",
                "card-hover": "#252525",
                accent: "#6366f1",
                "accent-glow": "#818cf8",
                like: "#22c55e",
                "like-glow": "#4ade80",
                pass: "#ef4444",
                "pass-glow": "#f87171",
            },
            boxShadow: {
                "glow-like": "0 0 40px rgba(34, 197, 94, 0.4)",
                "glow-pass": "0 0 40px rgba(239, 68, 68, 0.4)",
                "glow-card": "0 8px 32px rgba(0, 0, 0, 0.5)",
            },
            animation: {
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
            },
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
                    "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.6)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
