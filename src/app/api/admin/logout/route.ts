import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, revokeSession } from "@/lib/server/adminAuth";

// POST /api/admin/logout — oturum sunucuda iptal edilir; kopyalanmış çerez de geçersiz olur.
export async function POST(request: NextRequest) {
    try { await revokeSession(request.cookies.get(ADMIN_COOKIE)?.value); }
    catch { return NextResponse.json({ error: "Çıkış kaydedilemedi, tekrar dene." }, { status: 503 }); }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
}
