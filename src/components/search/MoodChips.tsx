import { T } from "@/components/preferences/Preferences";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { MOODS } from "@/lib/recommend/moods";

const PICKS = [
    { id: "dusundurucu", label: "Aklımı karıştır", image: "/ii8QGacT3MXESqBckQlyrATY0lT.jpg" },
    { id: "komedi", label: "Yüzüm gülsün", image: "/6n53UI4mX9QMfe2S0Pgt8mGebY1.jpg" },
    { id: "gerilim", label: "Gerilim olsun", image: "/mmd1HnuvAzFc4iuVJcnBrhDNEKr.jpg" },
    { id: "macera", label: "Başka dünyalar", image: "/a0lfia8tk8ifkrve0Tn8wkISUvs.jpg" },
    { id: "romantik", label: "Romantik bir akşam", image: "/744ybMaYRry1IQKoDakMc4GEU4L.jpg" },
];

export default function MoodChips({ activeId, tiles = false }: { activeId?: string; tiles?: boolean }) {
    if (tiles) return <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PICKS.map((m) => <TrackedLink key={m.id} event="mood_selected" data={{ mood: m.id }} href={`/mod/${m.id}`} className="mood-tile group relative isolate flex aspect-[1.65/1] items-end overflow-hidden rounded-lg bg-ink p-4 last:col-span-2 sm:aspect-[1.7/1] sm:last:col-span-1 lg:aspect-[1.55/1]">
                <Image src={`https://image.tmdb.org/t/p/w780${m.image}`} alt="" fill sizes="(min-width: 1024px) 230px, (min-width: 640px) 33vw, 50vw" className="mood-image -z-20 object-cover" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
                <span className="flex w-full items-end justify-between gap-1 text-base font-extrabold leading-tight tracking-tight text-white"><T text={m.label} /><ArrowUpRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden /></span>
            </TrackedLink>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted"><span><T text={"Bir de bunlar var:"} /></span>{MOODS.filter(m => !PICKS.some(p => p.id === m.id)).map(m => <TrackedLink key={m.id} event="mood_selected" data={{ mood: m.id }} href={`/mod/${m.id}`} className="inline-flex min-h-9 items-center gap-1 font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"><T text={m.label} /> <ArrowUpRight className="h-3 w-3" aria-hidden /></TrackedLink>)}</div>
    </>;

    return <div className="flex flex-wrap gap-2">{MOODS.map(m => <TrackedLink key={m.id} event="mood_selected" data={{ mood: m.id }} href={`/mod/${m.id}`} aria-current={m.id === activeId ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${m.id === activeId ? "border-accent-ink/30 bg-accent text-button-ink" : "border-line bg-card text-muted hover:border-ink/40 hover:text-ink"}`}><T text={m.label} /></TrackedLink>)}</div>;
}
