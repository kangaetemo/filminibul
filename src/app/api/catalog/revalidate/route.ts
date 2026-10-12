import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/supabase";
export async function POST(request: NextRequest) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const timestamp = request.headers.get("x-catalog-time") || "";
    const signature = request.headers.get("x-catalog-signature") || "";
    if (!key || !/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 300000 || !/^[a-f0-9]{64}$/.test(signature)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const expected = createHmac("sha256", key).update(`catalog:${timestamp}`).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    revalidateTag(CATALOG_TAG);
    return NextResponse.json({ ok: true });
}
