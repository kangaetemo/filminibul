import Link from "next/link";
import { MOODS } from "@/lib/recommend/moods";

// Ruh hâli seçimi. `tiles`: ana sayfada büyük kutucuklar; varsayılan: mod sayfasındaki ince çipler.
export default function MoodChips({ activeId, tiles = false }: { activeId?: string; tiles?: boolean }) {
    if (tiles) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MOODS.map((m, i) => (
                    <Link
                        key={m.id}
                        href={`/mod/${m.id}`}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-4 pb-5 transition duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-card-hover animate-fade-up"
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <span className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-accent/10 blur-xl transition-opacity group-hover:bg-accent/25" aria-hidden />
                        <span className="relative block text-2xl" aria-hidden>
                            {m.emoji}
                        </span>
                        <span className="relative mt-4 block font-display text-lg leading-tight text-white">{m.label}</span>
                    </Link>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2 justify-start">
            {MOODS.map((m) => (
                <Link
                    key={m.id}
                    href={`/mod/${m.id}`}
                    aria-current={m.id === activeId ? "page" : undefined}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-colors ${
                        m.id === activeId
                            ? "bg-accent/20 border-accent/60 text-white"
                            : "bg-card border-white/10 text-white/65 hover:text-white hover:border-accent/40"
                    }`}
                >
                    <span aria-hidden>{m.emoji}</span>
                    {m.label}
                </Link>
            ))}
        </div>
    );
}
