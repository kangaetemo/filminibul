import type { MetadataRoute } from "next";

// /robots.txt: admin ve API arama motorlarına kapalı; site haritası bildirilir
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
        sitemap: "https://filminibul.com/sitemap.xml",
    };
}
