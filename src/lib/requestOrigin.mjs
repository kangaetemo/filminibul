// İsteğin tarayıcının gördüğü genel adresi, ör. "https://filminibul.com".
// Next bir proxy'nin (VPS'te Caddy) arkasında çalışırken request.url / nextUrl.origin kendi dinlediği
// adresi (https://localhost:3000) verir; gerçek adres proxy'nin eklediği X-Forwarded-Host /
// X-Forwarded-Proto başlıklarındadır (Vercel de aynılarını ekler). Next yalnız 127.0.0.1'i dinlediği
// için bu başlıklar yalnız proxy'den gelebilir. Edge (middleware) ve Node'da çalışır.
const first = (request, name) => request.headers.get(name)?.split(",")[0].trim() || "";

export function requestOrigin(request) {
    const url = new URL(request.url);
    const forwardedProto = first(request, "x-forwarded-proto").toLowerCase();
    const proto = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : url.protocol.slice(0, -1);
    const host = first(request, "x-forwarded-host") || first(request, "host") || url.host;
    return `${proto}://${host}`;
}

/** Değiştiren isteklerde (POST/PUT/PATCH/DELETE) kaynak denetimi: Origin başlığı sitenin kendi adresi mi? */
export const sameOrigin = request => request.headers.get("origin") === requestOrigin(request);
