const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });

export function createPersonalHandler({ verify, storage, recommend, now = Date.now }) {
    const requests = new Map();
    return async request => {
        try {
            if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
            const uid = await verify(request.headers.get("authorization"));
            const recent = (requests.get(uid) || []).filter(at => now() - at < 60000);
            if (recent.length >= 8) return reply({ error: "too_many_requests" }, 429);
            requests.set(uid, [...recent, now()]);
            if (requests.size > 5000) for (const [key, hits] of requests) if (hits.every(at => now() - at >= 60000)) requests.delete(key);
            // Query/body IDs or a claimed UID never control another user's interests.
            const records = await storage.list(uid);
            const ids = [...new Set(records.map(record => record.id).filter(id => Number.isSafeInteger(id) && id > 0))];
            return reply(await recommend(ids));
        } catch (error) {
            const safe = ["sign_in_required", "member_not_configured", "member_unavailable", "watchlist_not_private", "watchlist_limit"];
            return reply({ error: safe.includes(error?.code) ? error.code : "recommendations_unavailable" }, Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 503);
        }
    };
}
