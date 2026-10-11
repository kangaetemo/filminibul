import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import { platform, type FilmProviders } from "@/lib/recommend/providers";

// "Nerede izlenir?" — Türkiye. Veri JustWatch'tan (TMDB üzerinden); kaynak belirtmek şart.
export default function WatchProviders({ providers, filmId }: { providers: FilmProviders | null; filmId: number }) {
    const groups = providers
        ? [
              { label: "Abonelikle", ids: providers.flatrate },
              { label: "Ücretsiz", ids: providers.free },
              { label: "Kirala", ids: providers.rent },
              { label: "Satın al", ids: providers.buy },
          ].filter((g) => g.ids.length > 0)
        : [];

    return (
        <div className="mt-6">
            <h2 className="text-sm font-semibold text-white/80">Nerede izlenir?</h2>
            {groups.length === 0 ? (
                <p className="mt-2 text-sm text-white/40">Şu an Türkiye&apos;de bir dijital platformda görünmüyor.</p>
            ) : (
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
                    {groups.map((g) => (
                        <div key={g.label}>
                            <div className="text-[11px] uppercase tracking-wide text-white/40">{g.label}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {g.ids.map((id) => {
                                    const p = platform(id);
                                    return p.logoUrl ? (
                                        <Image key={id} src={p.logoUrl} alt={p.name} title={p.name} width={36} height={36} className="rounded-lg" />
                                    ) : (
                                        <span key={id} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70">
                                            {p.name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-2 text-[11px] text-white/30">
                Veri: JustWatch
                {providers?.link && (
                    <>
                        {" · "}
                        <TrackedLink event="platform_clicked" data={{ film_id: filmId, platform: "justwatch" }} href={providers.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                            tüm seçenekler
                        </TrackedLink>
                    </>
                )}
            </p>
        </div>
    );
}
