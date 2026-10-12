"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { track } from "@/lib/analytics/client";
import { Play, X } from "lucide-react";

export default function TrailerButton({ videoKey, filmTitle, filmId, previewUrl }: { videoKey: string; filmTitle: string; filmId: number; previewUrl?: string }) {
    const { language, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Tab") {
                const items = dialogRef.current?.querySelectorAll<HTMLElement>("button, iframe");
                const first = items?.[0], last = items?.[items.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; openerRef.current?.focus(); };
    }, [open]);

    return <>
        <button ref={openerRef} type="button" onClick={() => { track("trailer_clicked", { film_id: filmId }); setOpen(true); }} className={previewUrl ? "group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-ink text-white" : "button-primary"}>
            {previewUrl ? <><Image src={previewUrl} alt="" fill sizes="(min-width: 1024px) 600px, (min-width: 640px) 50vw, 90vw" className="object-cover opacity-65 transition-opacity group-hover:opacity-80" /><span className="relative flex flex-col items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-button-ink"><Play className="ml-1 h-6 w-6 fill-current" aria-hidden /></span><span className="text-sm font-bold"><T text={"Fragmanı izle"} /></span></span></> : <><Play className="h-4 w-4 fill-current" aria-hidden /><T text={"Fragmanı izle"} /></>}
        </button>
        {open && createPortal(<div role="dialog" aria-modal="true" aria-label={`${filmTitle} fragmanı`} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(false)}>
            <div ref={dialogRef} className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={t("Fragmanı kapat")} className="absolute -top-14 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" aria-hidden /></button>
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                    <iframe src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`} title={`${filmTitle} fragmanı`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full" />
                </div>
            </div>
        </div>, document.body)}
    </>;
}
