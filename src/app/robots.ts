import type { MetadataRoute } from "next";

// /robots.txt: admin ve API arama motorlarına kapalı; site haritası bildirilir.
// /karistir?a=… her film sayfasından bağlanıyor ve zaten noindex: taranması yalnız sunucu / veritabanı yükü.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/karistir?"] },
        sitemap: "https://filminibul.com/sitemap.xml",
    };
}
