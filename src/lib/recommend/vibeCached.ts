// Tarif aramasının sunucular arası önbelleği.
//
// vibe.ts içindeki bellek önbelleği yalnız o sunucu örneğinde yaşar; Vercel yeni örnek açınca aynı tarif
// yeniden OpenAI'ye gider (yavaş ve ücretli). Burada sonuç Next'in veri önbelleğine (Vercel Data Cache)
// yazılır, bütün örnekler paylaşır. Hatalar önbelleğe girmez; hız sınırı ve doğrulama yalnız önbellekte
// olmayan aramada çalışır. Katalog etiketiyle birlikte tazelenir (yeni film eklenince).

import { unstable_cache } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/supabase";
import { normalizeQuery, vibeSearch, type VibeResult, type VibeTiming } from "./vibe";

const CACHE_SECONDS = 6 * 3600;
// Sıralama değişince sürüm artırılır; eski önbellekteki sonuçlar yeni sıralamayla karışmasın (v2: tema ağırlığı 0,2 · v3: oy sınırı 30, dönem ve ülke şartı)

export async function cachedVibeSearch(rawQuery: string, ip = "unknown"): Promise<{ result: VibeResult; timing: VibeTiming; cached: boolean }> {
    const timing: VibeTiming = {};
    const result = await unstable_cache(() => vibeSearch(rawQuery, ip, timing), ["vibe-search-v3", normalizeQuery(rawQuery)], {
        revalidate: CACHE_SECONDS,
        tags: [CATALOG_TAG],
    })();
    return { result, timing, cached: timing.chat === undefined };
}

/** `Server-Timing` başlığı: tarayıcı geliştirici araçlarında ve dış ölçümde aşamaları gösterir. */
export function serverTimingHeader(timing: VibeTiming, cached: boolean, totalMs: number): string {
    const parts = cached ? ["cache;desc=hit"] : (["chat", "embed", "db"] as const).filter((k) => timing[k] !== undefined).map((k) => `${k};dur=${timing[k]}`);
    return [...parts, `total;dur=${totalMs}`].join(", ");
}
