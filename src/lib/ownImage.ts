// TMDB görsellerini kendi alan adımızdan sunmak için adres çevirici: image.tmdb.org/t/p/w342/abc.jpg → /img/w342/abc.jpg
// /img/... ilk istekte TMDB'den alınıp sunucu diskine yazılır (src/app/img/[size]/[file]/route.ts),
// sonrakileri Caddy doğrudan diskten verir (ops/vps/site.caddy). Veride TMDB adresi kalır; çeviri yalnız sunarken yapılır.

export const IMG_SIZES = [45, 92, 154, 185, 300, 342, 500, 780, 1280];
const TMDB = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w(\d+)|original)\/([A-Za-z0-9_-]+\.(?:jpg|png))$/;

// width verilmezse adresteki boyuta (yoksa en büyüğe) en yakın hazır boyut kullanılır.
export function ownImageUrl(src: string, width?: number): string {
    const m = TMDB.exec(src);
    if (!m) return src; // TMDB dışı (yerel) görsel ya da desteklenmeyen tür (svg): olduğu gibi
    const want = width ?? (m[1] ? Number(m[1]) : IMG_SIZES[IMG_SIZES.length - 1]);
    const size = IMG_SIZES.find((s) => s >= want) ?? IMG_SIZES[IMG_SIZES.length - 1];
    return `/img/w${size}/${m[2]}`;
}

// Yapısal veri gibi tam adres isteyen yerler için
export const ownImageAbsoluteUrl = (src: string) => {
    const url = ownImageUrl(src);
    return url.startsWith("/") ? "https://filminibul.com" + url : url;
};
