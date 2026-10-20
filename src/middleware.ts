import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "@/lib/server/adminAuth";
import { requestOrigin } from "@/lib/requestOrigin.mjs";

// /admin ve /api/admin altındaki her şey oturum ister (giriş sayfası ve giriş API'si hariç)
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

    if (await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", requestOrigin(request)));
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
