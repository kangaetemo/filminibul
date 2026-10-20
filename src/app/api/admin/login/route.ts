import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS, LOGIN_RETRY_AFTER_SECONDS, adminConfigured, checkPassword, createSession, takeLoginAttempt } from "@/lib/server/adminAuth";
import { sameOrigin } from "@/lib/requestOrigin.mjs";

// POST /api/admin/login  { password }
export async function POST(request: NextRequest) {
    if (!adminConfigured()) {
        return NextResponse.json({ error: "ADMIN_PASSWORD tanımlı değil" }, { status: 503 });
    }
    if (!sameOrigin(request)) return NextResponse.json({ error: "Geçersiz kaynak" }, { status: 403 });
    // Deneme hakkı şifreye bakmadan önce alınır: paralel denemeler de ortak sayaca takılır.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!(await takeLoginAttempt(ip))) {
        return NextResponse.json({ error: "Çok fazla deneme. 15 dakika sonra tekrar dene." }, { status: 429, headers: { "Retry-After": String(LOGIN_RETRY_AFTER_SECONDS) } });
    }
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";

    if (!(await checkPassword(password))) {
        // Kaba kuvvet denemelerini yavaşlat
        await new Promise((r) => setTimeout(r, 800));
        return NextResponse.json({ error: "Şifre yanlış" }, { status: 401 });
    }

    let token: string;
    try { token = await createSession(); }
    catch { return NextResponse.json({ error: "Oturum açılamadı, biraz sonra tekrar dene." }, { status: 503 }); }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60,
    });
    return res;
}
