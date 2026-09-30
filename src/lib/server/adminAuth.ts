// Admin oturumu: tek şifre (ADMIN_PASSWORD env) + imzalı, httpOnly çerez.
// Web Crypto kullanır: hem middleware'de (edge runtime) hem route handler'larda (Node) çalışır.

export const ADMIN_COOKIE = "fb_admin";
export const ADMIN_SESSION_DAYS = 7;

const encoder = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
    return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Uzunluk dahil sabit zamanlı karşılaştırma (zamanlama saldırısına karşı)
function safeEqual(a: string, b: string): boolean {
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0;
}

export const adminConfigured = () => !!process.env.ADMIN_PASSWORD;

/**
 * Oturum çerezinin değeri. Şifreden türetilir: şifre değişince tüm oturumlar geçersiz olur.
 * Çerezde şifrenin kendisi değil, HMAC'i durur.
 */
export async function sessionToken(): Promise<string | null> {
    const password = process.env.ADMIN_PASSWORD;
    return password ? hmacHex(password, "filminibul-admin-session-v1") : null;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
    const expected = await sessionToken();
    return !!expected && !!cookieValue && safeEqual(cookieValue, expected);
}

export async function checkPassword(input: string): Promise<boolean> {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return false;
    // İki tarafı da hash'leyip karşılaştır: uzunluk bilgisi de sızmaz
    const [a, b] = await Promise.all([hmacHex("filminibul-login", input), hmacHex("filminibul-login", password)]);
    return safeEqual(a, b);
}
