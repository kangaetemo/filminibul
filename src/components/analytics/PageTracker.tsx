"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics/client";
export default function PageTracker() {
    const path = usePathname();
    const params = useSearchParams();
    useEffect(() => {
        const record = () => {
            if (document.visibilityState !== "visible") return;
            const id = path.match(/^\/film\/(\d+)/)?.[1];
            track(id ? "film_opened" : "page_view", id ? { film_id: Number(id) } : {}, "page");
        };
        record();
        document.addEventListener("visibilitychange", record);
        return () => document.removeEventListener("visibilitychange", record);
    }, [path, params]);
    return null;
}
