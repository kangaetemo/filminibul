"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";

import { useId, useState } from "react";
import Link from "next/link";
import SearchBox from "./SearchBox";

export default function DiscoverySearch() {
    const { t } = useLanguage();
    const [mode, setMode] = useState<"film" | "vibe">("film");
    const panelId = useId();
    return (
        <div className="hero-search max-w-[650px]">
            <div className="mb-4 flex gap-6" role="group" aria-label={t("Arama yöntemi")}>
                <button type="button" aria-pressed={mode === "film"} aria-controls={panelId} onClick={() => setMode("film")} className={`min-h-11 border-b-[3px] pb-2 text-sm font-bold transition-colors ${mode === "film" ? "border-accent text-white" : "border-transparent text-white/70 hover:text-white"}`}><T text={"Sevdiğin bir filmden başla"} /></button>
                <button type="button" aria-pressed={mode === "vibe"} aria-controls={panelId} onClick={() => setMode("vibe")} className={`min-h-11 border-b-[3px] pb-2 text-sm font-bold transition-colors ${mode === "vibe" ? "border-accent text-white" : "border-transparent text-white/70 hover:text-white"}`}><T text={"Biraz tarif et"} /></button>
            </div>
            <div id={panelId}><SearchBox key={mode} mode={mode} autoFocus={false} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                <span><T text={"Mesela:"} /></span>
                {mode === "film" ? <>
                    <Link href="/film/603-matrix" className="min-h-8 py-2 underline underline-offset-4 hover:text-white"><T text={"Matrix"} /></Link>
                    <Link href="/film/157336-yildizlararasi" className="min-h-8 py-2 underline underline-offset-4 hover:text-white"><T text={"Yıldızlararası"} /></Link>
                    <Link href="/film/194-amelie" className="min-h-8 py-2 underline underline-offset-4 hover:text-white"><T text={"Amelie"} /></Link>
                </> : <>
                    <Link href="/ara?q=gerçeklik%20algımı%20sorgulatan%20bir%20film" className="min-h-8 py-2 underline underline-offset-4 hover:text-white"><T text={"Aklım karışsın"} /></Link>
                    <Link href="/ara?q=içimi%20ısıtan%20umutlu%20bir%20hikâye" className="min-h-8 py-2 underline underline-offset-4 hover:text-white"><T text={"İçim ısınsın"} /></Link>
                </>}
            </div>
        </div>
    );
}
