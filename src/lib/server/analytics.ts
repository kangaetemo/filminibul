import "server-only";
// Server-only REST RPC: deliberately bypass the catalog cache and tags.
export async function analyticsRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Analytics database is not configured");
    const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Analytics RPC failed (${response.status})`);
    return response.json() as Promise<T>;
}
