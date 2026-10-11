"use client";
import { useEffect } from "react";
import { analyticsEnabled, track } from "@/lib/analytics/client";
import type { EventData } from "@/lib/analytics/schema";
export default function ResultEvent({ name, data }: { name: "search_performed" | "blend_completed"; data: EventData }) {
    const serialized = JSON.stringify(data);
    useEffect(() => {
        const record = () => {
            if (!analyticsEnabled() || document.visibilityState !== "visible") return;
            const value = JSON.parse(serialized) as EventData;
            track(name, name === "search_performed" ? { ...value, search_id: crypto.randomUUID() } : value, `result:${name}:${serialized}`);
        };
        record();
        document.addEventListener("visibilitychange", record);
        return () => document.removeEventListener("visibilitychange", record);
    }, [name, serialized]);
    return null;
}
