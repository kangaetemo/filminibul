import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS, adminConfigured, checkPassword, sessionToken } from "@/lib/server/adminAuth";

// POST /api/admin/login  { password }
export async function POST(request: NextRequest) {
    if (!adminConfigured()) {
        return NextResponse.json({ error: "ADMIN_PASSWORD tanımlı değil" }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";

    if (!(await checkPassword(password))) {
        // Kaba kuvvet denemelerini yavaşlat
        await new Promise((r) => setTimeout(r, 800));
        return NextResponse.json({ error: "Şifre yanlış" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, (await sessionToken())!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60,
    });
    return res;
}
