const QUOTA_CODES = new Set(["insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded"]);

export class VibeProviderError extends Error {
    constructor(kind, retryAfter = 60) { super(kind); this.kind = kind; this.retryAfter = retryAfter; }
}

// Deneme başına zaman aşımı (ms). Normal yanıt chat'te ~2–4 sn, embedding'de <1 sn; takılan bir isteği
// 20 sn beklemek yerine erken kesip tazesini denemek uç gecikmeyi kısaltır (en kötü durum ~20 sn).
export const VIBE_TIMEOUTS = { "chat/completions": [8000, 12000], embeddings: [5000, 8000] };

export function createVibeOpenAI({ getKey = () => process.env.OPENAI_API_KEY, request = fetch, now = Date.now, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), report = details => console.warn("vibe_provider_unavailable", details), timeouts = VIBE_TIMEOUTS } = {}) {
    let blocked = null;
    function ensureAvailable() {
        if (!getKey()) throw new VibeProviderError("unavailable");
        if (blocked && blocked.until > now()) throw new VibeProviderError(blocked.kind, Math.ceil((blocked.until - now()) / 1000));
    }
    function block(kind, seconds, providerCode) {
        blocked = { kind, until: now() + seconds * 1000 };
        // Never log prompts, credentials or the provider's raw response body.
        report({ kind, providerCode });
        return new VibeProviderError(kind, seconds);
    }
    async function call(endpoint, body) {
        if (!["chat/completions", "embeddings"].includes(endpoint)) throw new VibeProviderError("unavailable");
        ensureAvailable();
        for (let attempt = 0; attempt < 2; attempt++) {
            let response;
            try {
                response = await request(`https://api.openai.com/v1/${endpoint}`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(timeouts[endpoint][attempt]), headers: { Authorization: `Bearer ${getKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
            } catch {
                if (attempt === 0) { await pause(500); continue; }
                throw new VibeProviderError("busy");
            }
            if (response.ok) return response.json().catch(() => { throw new VibeProviderError("busy"); });
            const error = (await response.json().catch(() => ({})))?.error || {};
            const quota = QUOTA_CODES.has(error.code) || QUOTA_CODES.has(error.type);
            if (quota) throw block("quota", 60, QUOTA_CODES.has(error.code) ? error.code : "insufficient_quota");
            if (response.status === 401 || response.status === 403) throw block("unavailable", 60, "authentication");
            if (response.status === 429) {
                const retryHeader = response.headers.get("retry-after");
                const parsed = Number(retryHeader) || Math.ceil((Date.parse(retryHeader || "") - now()) / 1000);
                const seconds = Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 60;
                throw block("busy", Math.max(1, seconds), "rate_limit");
            }
            if (response.status >= 500 && attempt === 0) { await pause(500); continue; }
            throw new VibeProviderError("busy");
        }
    }
    return { ensureAvailable, call };
}
