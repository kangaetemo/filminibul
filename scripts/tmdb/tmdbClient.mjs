// Offline script'ler için küçük TMDB istemcisi (bağımlılıksız).
// TMDB_API_KEY: v3 anahtarı (32 karakter) veya v4 "Read Access Token" (uzun JWT) olabilir.

import { loadEnv, requireEnv } from "../export/loadEnv.mjs";

loadEnv();
const [KEY] = requireEnv("TMDB_API_KEY");
const IS_BEARER = KEY.length > 40;
const BASE = "https://api.themoviedb.org/3";

export async function tmdb(path, params = {}, attempt = 1) {
    const url = new URL(`${BASE}${path}`);
    if (!IS_BEARER) url.searchParams.set("api_key", KEY);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    let res;
    try {
        res = await fetch(url, IS_BEARER ? { headers: { Authorization: `Bearer ${KEY}` } } : {});
    } catch (err) {
        // ECONNRESET gibi ağ hataları: bekleyip tekrar dene
        if (attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        return tmdb(path, params, attempt + 1);
    }
    if (res.status === 404) return null;
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = Number(res.headers.get("retry-after") ?? 0) * 1000 || 500 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
        return tmdb(path, params, attempt + 1);
    }
    if (!res.ok) throw new Error(`TMDB ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
}

// TMDB'nin davranışsal önerileri ("bunu beğenenler bunu da beğendi"), sıralı ID listesi
export async function recommendations(movieId, pages = 2) {
    const ids = [];
    for (let page = 1; page <= pages; page++) {
        const data = await tmdb(`/movie/${movieId}/recommendations`, { page });
        if (!data) break;
        ids.push(...data.results.map((r) => r.id));
        if (page >= data.total_pages) break;
    }
    return ids;
}
