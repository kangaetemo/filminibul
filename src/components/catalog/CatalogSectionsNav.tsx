"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { ArrowDown } from "lucide-react";

export default function CatalogSectionsNav() {
    const cancel = useRef<(() => void) | null>(null);
    useEffect(() => () => cancel.current?.(), []);

    function goToSection(event: MouseEvent<HTMLAnchorElement>) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const hash = event.currentTarget.hash;
        const target = document.getElementById(hash.slice(1));
        if (!target) return;
        event.preventDefault();
        cancel.current?.();

        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        const from = window.scrollY;
        const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
        const to = Math.max(0, Math.min(from + target.getBoundingClientRect().top - margin - padding, root.scrollHeight - window.innerHeight));
        let frame = 0;
        root.style.scrollBehavior = "auto";
        if (window.location.hash !== hash) window.history.pushState(null, "", hash);

        const finish = (focus: boolean) => {
            window.cancelAnimationFrame(frame);
            root.style.scrollBehavior = previousBehavior;
            window.removeEventListener("wheel", stop);
            window.removeEventListener("touchstart", stop);
            window.removeEventListener("pointerdown", stop);
            window.removeEventListener("keydown", stop);
            cancel.current = null;
            if (focus) target.focus({ preventScroll: true });
        };
        const stop = () => finish(false);
        cancel.current = stop;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(to - from) < 2) {
            window.scrollTo(0, to);
            finish(true);
            return;
        }
        window.addEventListener("wheel", stop, { passive: true });
        window.addEventListener("touchstart", stop, { passive: true });
        window.addEventListener("pointerdown", stop);
        window.addEventListener("keydown", stop);
        const started = performance.now();
        const animate = (now: number) => {
            const progress = Math.min(1, (now - started) / 500);
            const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
            window.scrollTo(0, from + (to - from) * eased);
            if (progress < 1) frame = window.requestAnimationFrame(animate);
            else finish(true);
        };
        frame = window.requestAnimationFrame(animate);
    }

    return <nav aria-label="Keşif bölümleri" className="mt-7 flex flex-wrap gap-3">
        <a href="#seckiler" onClick={goToSection} className="button-primary">Listelere dal <ArrowDown className="ml-2 h-4 w-4" aria-hidden /></a>
        <a href="#actor" onClick={goToSection} className="button-secondary">Oyuncular</a>
        <a href="#director" onClick={goToSection} className="button-secondary">Yönetmenler</a>
    </nav>;
}
