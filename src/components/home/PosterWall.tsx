import Image from "next/image";
import semanticLists from "@/data/moods.json";
import { supabaseSelect } from "@/lib/server/supabase";

// Ana sayfa arkasında yavaş akan, karartılmış afiş şeridi: sinema atmosferi için. Süs olduğu için
// ekran okuyuculardan gizli; veri alınamazsa sessizce hiçbir şey çizmez (sayfa yine çalışır).
const PER_MOOD = 3;

export default async function PosterWall() {
    const lists = Object.values(semanticLists as Record<string, number[]>);
    const ids = lists.flatMap((l) => l.slice(0, PER_MOOD));
    if (!ids.length) return null;

    let posters: { movie_id: number; poster_path: string }[] = [];
    try {
        posters = await supabaseSelect(`film_embeddings_v3?select=movie_id,poster_path&movie_id=in.(${ids.join(",")})&poster_path=not.is.null`, 86400);
    } catch {
        return null;
    }
    if (posters.length < 6) return null;

    // Şeridi iki kez art arda çiz: -50% kaydırınca kesintisiz döngü olur
    const strip = [...posters, ...posters];
    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[78vh] overflow-hidden opacity-[0.42]" aria-hidden>
            <div className="flex w-max gap-4 pt-24 animate-marquee-slow">
                {strip.map((p, i) => (
                    <div key={`${p.movie_id}-${i}`} className="relative h-56 w-[150px] shrink-0 overflow-hidden rounded-lg sm:h-72 sm:w-[192px]">
                        <Image
                            src={`https://image.tmdb.org/t/p/w342${p.poster_path}`}
                            alt=""
                            fill
                            sizes="192px"
                            priority={i < 8}
                            className="object-cover"
                        />
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/40 to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>
    );
}
