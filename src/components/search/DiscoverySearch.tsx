"use client";
import { T, useLanguage } from "@/components/preferences/Preferences";

import { useId, useState } from "react";
import Link from "next/link";
import { Search, MessageSquareText, Shuffle } from "lucide-react";
import SearchBox from "./SearchBox";

export default function DiscoverySearch() {
    const { t } = useLanguage();
    const [mode, setMode] = useState<"film" | "vibe">("film");
    const panelId = useId();
    return (
        <div className="hero-search max-w-[650px]">
            <div className="mb-3 grid grid-cols-3 gap-2 border-b border-white/20" role="group" aria-label={t("Keşif yöntemi")}>
                <button type="button" aria-pressed={mode === "film"} aria-controls={panelId} onClick={() => setMode("film")} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-[3px] px-1 pb-2 text-center text-xs font-bold leading-snug transition-colors sm:flex-row sm:gap-2 sm:text-sm ${mode === "film" ? "border-accent text-white" : "border-transparent text-white/75 hover:text-white"}`}><Search className="h-4 w-4 shrink-0" aria-hidden /><T text={"Benzerini bul"} /></button>
                <button type="button" aria-pressed={mode === "vibe"} aria-controls={panelId} onClick={() => setMode("vibe")} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-[3px] px-1 pb-2 text-center text-xs font-bold leading-snug transition-colors sm:flex-row sm:gap-2 sm:text-sm ${mode === "vibe" ? "border-accent text-white" : "border-transparent text-white/75 hover:text-white"}`}><MessageSquareText className="h-4 w-4 shrink-0" aria-hidden /><T text={"Tarif et"} /></button>
                <Link href="/karistir" className="flex min-h-14 flex-col items-center justify-center gap-1 border-b-[3px] border-transparent px-1 pb-2 text-center text-xs font-bold leading-snug text-white/85 transition-colors hover:border-white/50 hover:text-white sm:flex-row sm:gap-2 sm:text-sm"><Shuffle className="h-4 w-4 shrink-0" aria-hidden /><T text={"İki filmi karıştır"} /></Link>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-white/80 sm:text-sm"><T text={mode === "film" ? "Sevdiğin filmi yaz, benzerlerini keşfet." : "Nasıl bir film izlemek istediğini anlat."} /></p>
            <div id={panelId}><SearchBox key={mode} mode={mode} autoFocus={false} /></div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
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
