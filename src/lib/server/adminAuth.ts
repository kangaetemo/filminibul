// Admin oturumu: tek şifre (ADMIN_PASSWORD env) + imzalı, httpOnly çerez + sunucuda oturum kaydı.
// Web Crypto kullanır: hem middleware'de (edge runtime) hem route handler'larda (Node) çalışır.
//
// Çerez "<oturum kimliği>.<bitiş (ms)>.<imza>" biçimindedir. İmza şifreden türetilen anahtarla atılır:
// şifre değişince tüm oturumlar geçersiz olur. Süre çerezin içinde ve veritabanında (admin_sessions) tutulur;
// çıkışta kayıt iptal edilir, böylece kopyalanmış çerez de çıkıştan ya da 7 günden sonra işe yaramaz.
// Veritabanına ulaşılamazsa oturum geçersiz sayılır (güvenli tarafta kalır).

export const ADMIN_COOKIE = "fb_admin";
export const ADMIN_SESSION_DAYS = 7;
const SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;

// Giriş denemesi sınırları (bütün sunucu örnekleri ortak sayaç kullanır): IP başına 15 dakikada 10,
// toplamda 15 dakikada 30 deneme. Başarılı girişler de sayılır; yönetici nadiren giriş yapar.
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_PER_IP = 10;
const LOGIN_MAX_TOTAL = 30;
export const LOGIN_RETRY_AFTER_SECONDS = LOGIN_WINDOW_SECONDS;

const encoder = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
    return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(message: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(message));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Uzunluk dahil sabit zamanlı karşılaştırma (zamanlama saldırısına karşı)
function safeEqual(a: string, b: string): boolean {
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0;
}

export const adminConfigured = () => !!process.env.ADMIN_PASSWORD;

/** Önbelleksiz RPC (servis anahtarıyla). Oturum ve sayaç sonuçları asla önbelleğe girmemeli. */
async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("admin database is not configured");
    const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`admin RPC ${fn} failed (${response.status})`);
    const text = await response.text(); // void dönen RPC'lerde gövde boş olabilir
    return (text ? JSON.parse(text) : null) as T;
}

async function signingKey(): Promise<string | null> {
    const password = process.env.ADMIN_PASSWORD;
    return password ? hmacHex(password, "filminibul-admin-session-v2") : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Çerezi ayrıştırır ve imzasını, süresini doğrular (veritabanına bakmadan). Geçersizse null. */
async function parseSession(cookieValue: string | undefined, now = Date.now()): Promise<{ id: string; expires: number } | null> {
    const key = await signingKey();
    if (!key || !cookieValue) return null;
    const parts = cookieValue.split(".");
    if (parts.length !== 3) return null;
    const [id, exp, sig] = parts;
    const expires = Number(exp);
    if (!UUID.test(id) || !/^\d{1,16}$/.test(exp) || !Number.isSafeInteger(expires)) return null;
    if (!safeEqual(sig, await hmacHex(key, `${id}.${exp}`))) return null;
    if (expires <= now || expires > now + SESSION_MS + 60_000) return null;
    return { id, expires };
}

/** Yeni oturum açar ve çerez değerini döndürür. Veritabanına yazılamazsa hata fırlatır. */
export async function createSession(now = Date.now()): Promise<string> {
    const key = await signingKey();
    if (!key) throw new Error("ADMIN_PASSWORD tanımlı değil");
    const id = crypto.randomUUID();
    const expires = now + SESSION_MS;
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("admin database is not configured");
    const response = await fetch(`${url}/rest/v1/admin_sessions`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ id, expires_at: new Date(expires).toISOString() }),
    });
    if (!response.ok) throw new Error(`admin session insert failed (${response.status})`);
    return `${id}.${expires}.${await hmacHex(key, `${id}.${expires}`)}`;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
    const session = await parseSession(cookieValue);
    if (!session) return false;
    try { return (await rpc<boolean>("admin_session_valid", { p_id: session.id })) === true; }
    catch { return false; }
}

/** Çıkış: oturumu sunucuda iptal eder. İmzası geçersiz çerez için bir şey yapmaz. */
export async function revokeSession(cookieValue: string | undefined): Promise<void> {
    const session = await parseSession(cookieValue);
    if (session) await rpc("admin_session_revoke", { p_id: session.id });
}

/** Giriş denemesi hakkı (IP başına ve toplam). Sayaca ulaşılamazsa deneme reddedilir. */
export async function takeLoginAttempt(ip: string): Promise<boolean> {
    try {
        const ipKey = `admin_login:ip:${(await sha256Hex(`filminibul:${ip}`)).slice(0, 32)}`;
        const [perIp, total] = await Promise.all([
            rpc<boolean>("rate_limit_take", { p_bucket: ipKey, p_window_seconds: LOGIN_WINDOW_SECONDS, p_max: LOGIN_MAX_PER_IP }),
            rpc<boolean>("rate_limit_take", { p_bucket: "admin_login:all", p_window_seconds: LOGIN_WINDOW_SECONDS, p_max: LOGIN_MAX_TOTAL }),
        ]);
        return perIp === true && total === true;
    } catch { return false; }
}

export async function checkPassword(input: string): Promise<boolean> {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return false;
    // İki tarafı da hash'leyip karşılaştır: uzunluk bilgisi de sızmaz
    const [a, b] = await Promise.all([hmacHex("filminibul-login", input), hmacHex("filminibul-login", password)]);
    return safeEqual(a, b);
}
