"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

// "Fragmanı izle" düğmesi + video penceresi.
// YouTube sadece tıklayınca yüklenir (sayfa hızı ve gizlilik: tıklamadan YouTube'a hiç istek gitmez) ve
// youtube-nocookie.com alan adıyla gömülür.
export default function TrailerButton({ videoKey, filmTitle }: { videoKey: string; filmTitle: string }) {
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden"; // arkadaki sayfa kaymasın
        closeRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
            // Basit odak tuzağı: pencerede tek odaklanabilir öğe (kapat) var
            if (e.key === "Tab") {
                e.preventDefault();
                closeRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            openerRef.current?.focus(); // kapanınca odak düğmeye dönsün
        };
    }, [open]);

    return (
        <>
            <button
                ref={openerRef}
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black shadow-glow-accent transition hover:bg-accent-glow"
            >
                <Play className="h-4 w-4 fill-black" aria-hidden />
                Fragmanı izle
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${filmTitle} fragmanı`}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-up"
                    onClick={() => setOpen(false)}
                >
                    <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Kapat"
                            className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        >
                            <X className="h-5 w-5" aria-hidden />
                        </button>
                        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-glow-card ring-1 ring-white/10">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
                                title={`${filmTitle} fragmanı`}
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                allowFullScreen
                                className="h-full w-full"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
