const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });

export function safePersonalFailure(error, stage) {
    const message = String(error?.message || "");
    return {
        stage: ["catalog", "ranking"].includes(error?.stage) ? error.stage : stage,
        name: ["Error", "TypeError", "AbortError", "TimeoutError"].includes(error?.name) ? error.name : "Error",
        code: /^[a-z_]{1,40}$/.test(error?.code || "") ? error.code : "recommendations_unavailable",
        httpStatus: message.match(/^Supabase(?: RPC \w+)? (\d{3}):/)?.[1] || null,
        databaseCode: message.match(/"code"\s*:\s*"([A-Z0-9]{5})"/)?.[1] || null,
        column: message.match(/column ([a-zA-Z0-9_.]+) does not exist/)?.[1] || null,
    };
}

export function createPersonalHandler({ verify, storage, recommend, now = Date.now, cacheTtlMs = 120000, maxCacheEntries = 250, logFailure = details => console.error("personal_recommendation_failed", details), logTiming = details => { if (details.totalMs >= 3000) console.info("personal_recommendation_timing", details); } }) {
    const requests = new Map(), cache = new Map(), inFlight = new Map();
    return async request => {
        let stage = "authentication";
        const startedAt = now();
        try {
            if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
            const uid = await verify(request.headers.get("authorization"));
            const recent = (requests.get(uid) || []).filter(at => now() - at < 60000);
            if (recent.length >= 8) return reply({ error: "too_many_requests" }, 429);
            requests.set(uid, [...recent, now()]);
            if (requests.size > 5000) for (const [key, hits] of requests) if (hits.every(at => now() - at >= 60000)) requests.delete(key);
            // Query/body IDs or a claimed UID never control another user's interests.
            stage = "watchlist";
            const listStartedAt = now();
            const records = await storage.list(uid);
            const listMs = now() - listStartedAt;
            const ids = [...new Set(records.map(record => record.id).filter(id => Number.isSafeInteger(id) && id > 0))];
            stage = "recommendations";
            // A cache hit still requires fresh auth and the current private list.
            // The tuple prevents collisions and isolates identical lists by UID.
            const key = JSON.stringify([uid, ids]);
            const cached = cache.get(key);
            if (cached && cached.until > now()) {
                cache.delete(key); cache.set(key, cached);
                logTiming({ totalMs: now() - startedAt, listMs, computeMs: 0, cacheHit: true });
                return reply(cached.data);
            }
            if (cached) cache.delete(key);
            const computeStartedAt = now();
            let task = inFlight.get(key);
            if (!task) {
                task = Promise.resolve().then(() => recommend(ids));
                inFlight.set(key, task);
            }
            let data;
            try { data = await task; }
            finally { if (inFlight.get(key) === task) inFlight.delete(key); }
            // Let partial failures retry; only completed results get a short TTL.
            if (!data.partial) {
                for (const [cacheKey, item] of cache) if (item.until <= now()) cache.delete(cacheKey);
                cache.delete(key);
                while (cache.size >= maxCacheEntries) cache.delete(cache.keys().next().value);
                cache.set(key, { data, until: now() + cacheTtlMs });
            }
            logTiming({ totalMs: now() - startedAt, listMs, computeMs: now() - computeStartedAt, cacheHit: false });
            return reply(data);
        } catch (error) {
            const safe = ["sign_in_required", "member_not_configured", "member_unavailable", "watchlist_not_private", "watchlist_limit"];
            if (error?.code !== "sign_in_required") logFailure(safePersonalFailure(error, stage));
            return reply({ error: safe.includes(error?.code) ? error.code : "recommendations_unavailable" }, Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 503);
        }
    };
}
