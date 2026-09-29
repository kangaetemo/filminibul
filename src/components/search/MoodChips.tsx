import Link from "next/link";
import { MOODS } from "@/lib/recommend/moods";

// Mod seçimi butonları (ana sayfa ve mod sayfası)
export default function MoodChips({ activeId, center = false }: { activeId?: string; center?: boolean }) {
    return (
        <div className={`flex flex-wrap gap-2 ${center ? "justify-center" : "justify-center sm:justify-start"}`}>
            {MOODS.map((m) => (
                <Link
                    key={m.id}
                    href={`/mod/${m.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                        m.id === activeId
                            ? "bg-accent/25 border-accent/60 text-white"
                            : "bg-card border-white/10 text-white/70 hover:text-white hover:border-accent/40"
                    }`}
                >
                    <span>{m.emoji}</span>
                    {m.label}
                </Link>
            ))}
        </div>
    );
}
