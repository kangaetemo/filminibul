import { signalOperation } from "../filmSignalsModel.mjs";
import { sameOrigin } from "../requestOrigin.mjs";
const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
export function createFilmSignalsHandler({ verify, storage, loadFilms, now = Date.now }) {
    const requests = new Map();
    return async request => {
        try {
            if (!["GET", "PUT"].includes(request.method)) return reply({ error: "method_not_allowed" }, 405);
            const uid = await verify(request.headers.get("authorization"));
            if (request.method === "PUT" && !sameOrigin(request)) return reply({ error: "invalid_origin" }, 403);
            const key = `${uid}:${request.method}`, recent = (requests.get(key) || []).filter(at => now() - at < 60000);
            if (recent.length >= (request.method === "GET" ? 30 : 180)) return reply({ error: "too_many_requests" }, 429);
            requests.set(key, [...recent, now()]);
            if (requests.size > 5000) for (const [key, hits] of requests) if (hits.every(at => now() - at >= 60000)) requests.delete(key);
            if (request.method === "GET") {
                const records = (await storage.list(uid)).filter(r => r.watched || r.reaction);
                const films = loadFilms ? await loadFilms(records.map(r => r.id)) : [];
                const byId = new Map(films.map(f => [f.id, f]));
                return reply({ records: records.map(r => ({ ...r, ...(byId.has(r.id) && { film: byId.get(r.id) }) })) });
            }
            if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "invalid_body" }, 400);
            if (Number(request.headers.get("content-length")) > 1024) return reply({ error: "body_too_large" }, 413);
            const text = await request.text();
            if (new TextEncoder().encode(text).length > 1024) return reply({ error: "body_too_large" }, 413);
            let data; try { data = JSON.parse(text); } catch { return reply({ error: "invalid_body" }, 400); }
            const op = signalOperation(data);
            if (!op) return reply({ error: "invalid_signal" }, 400);
            await storage.set(uid, op);
            return reply({ updated: true });
        } catch (error) {
            const safe = ["sign_in_required", "member_not_configured", "member_unavailable", "watchlist_not_private", "signals_limit"];
            return reply({ error: safe.includes(error?.code) ? error.code : "signals_unavailable" }, Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 503);
        }
    };
}
