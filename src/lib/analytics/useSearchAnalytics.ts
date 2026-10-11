"use client";
import { useEffect, useRef } from "react";
import { analyticsEnabled, track } from "./client";
export function useSearchAnalytics(query: string, context: "search" | "blend") {
    const current = useRef(query.trim());
    current.current = query.trim();
    const state = useRef<{ query: string; count: number; id: string; sent: boolean }>();
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const commit = () => {
        const s = state.current;
        if (!s || s.query !== current.current) return undefined;
        if (!s.sent) {
            s.sent = true;
            track("search_performed", { query: s.query, result_count: s.count, context, search_id: s.id });
        }
        return s.id;
    };
    const ready = (q: string, count: number) => {
        if (!analyticsEnabled() || q !== current.current) return;
        if (timer.current) clearTimeout(timer.current);
        if (state.current?.query !== q) state.current = { query: q, count, id: crypto.randomUUID(), sent: false };
        timer.current = setTimeout(() => { if (document.visibilityState === "visible") commit(); }, 1200);
    };
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return { ready, commit };
}
