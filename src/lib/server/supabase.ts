// Supabase REST erişimi — SADECE sunucu tarafı (API route / server component).
// service_role key RLS'i aşar; bu dosyayı client component'lerden import etme.

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(): HeadersInit {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil (.env.local)");
    }
    return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

/** PostgREST tablo sorgusu, ör. `film_embeddings_v3?select=title&movie_id=eq.603` */
export async function supabaseSelect<T>(query: string, revalidateSeconds = 3600): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        headers: headers(),
        next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json() as Promise<T>;
}

/** Satır sayısı (önbelleksiz), ör. `film_providers?flatrate=cs.{8}` */
export async function supabaseCount(query: string): Promise<number> {
    const sep = query.includes("?") ? "&" : "?";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}${sep}limit=1`, {
        headers: { ...headers(), Prefer: "count=exact" },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
}

/** RPC çağrısı (POST) */
export async function supabaseRpc<T>(fn: string, body: Record<string, unknown>, revalidateSeconds = 3600): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) throw new Error(`Supabase RPC ${fn} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json() as Promise<T>;
}
