import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "@/lib/server/adminAuth";
import { requestOrigin } from "@/lib/requestOrigin.mjs";
import { HERO_FRAMES } from "@/lib/heroFrames";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ana sayfa: her istekte rastgele bir film karesi. Her kare önceden üretilmiş ayrı bir statik sayfa
    // (src/app/ana-sayfa/[kare]); adres çubuğunda "/" kalır, sayfa istek başına yeniden çizilmez.
    if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = `/ana-sayfa/${Math.floor(Math.random() * HERO_FRAMES.length)}`;
        return NextResponse.rewrite(url);
    }
    // İç adresler dışarıdan açılmasın (yinelenen içerik olmasın)
    if (pathname.startsWith("/ana-sayfa")) return NextResponse.redirect(new URL("/", requestOrigin(request)), 308);

    // /admin ve /api/admin altındaki her şey oturum ister (giriş sayfası ve giriş API'si hariç)
    if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

    if (await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", requestOrigin(request)));
}

export const config = {
    matcher: ["/", "/ana-sayfa/:path*", "/admin/:path*", "/api/admin/:path*"],
};
