import { MAX_SAVED_FILMS, savedFilm } from "../watchlistModel.mjs";

const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
const validId = id => Number.isSafeInteger(id) && id > 0;

async function parallel(items, action, concurrency = 4) {
    const result = new Array(items.length); let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) { const i = next++; result[i] = await action(items[i]); }
    }));
    return result;
}

export function createWatchlistHandler({ verify, storage, loadFilms, now = Date.now }) {
    const requests = new Map();
    return async request => {
        try {
            if (!["GET", "PUT", "POST", "DELETE"].includes(request.method)) return reply({ error: "method_not_allowed" }, 405);
            const uid = await verify(request.headers.get("authorization"));
            if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "invalid_origin" }, 403);
            const rateKey = `${uid}:${request.method === "GET" ? "read" : "write"}`;
            const recent = (requests.get(rateKey) || []).filter(at => now() - at < 60000);
            if (recent.length >= (request.method === "GET" ? 30 : 180)) return reply({ error: "too_many_requests" }, 429);
            requests.set(rateKey, [...recent, now()]);
            if (requests.size > 5000) for (const [key, hits] of requests) if (hits.every(at => now() - at >= 60000)) requests.delete(key);

            if (request.method === "GET") {
                const records = await storage.list(uid);
                const ids = records.map(record => record.id);
                // One catalog read per batch; only uncatalogued films need their
                // stored display snapshot. Never fan out into TMDB or OpenAI.
                const catalog = await loadFilms(ids);
                const byId = new Map(catalog.map(film => [film.id, film]));
                const films = await parallel(records, record => byId.get(record.id) || storage.readFilm(uid, record.id));
                return reply({ films: films.filter(Boolean) });
            }
            if (request.method === "DELETE") {
                const id = Number(new URL(request.url).searchParams.get("id"));
                if (!validId(id)) return reply({ error: "invalid_film" }, 400);
                await storage.remove(uid, id);
                return reply({ id, saved: false });
            }
            const limit = request.method === "POST" ? 262144 : 8192;
            if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "invalid_body" }, 400);
            if (Number(request.headers.get("content-length")) > limit) return reply({ error: "body_too_large" }, 413);
            const text = await request.text();
            if (new TextEncoder().encode(text).length > limit) return reply({ error: "body_too_large" }, 413);
            let body; try { body = JSON.parse(text); } catch { return reply({ error: "invalid_body" }, 400); }
            const values = request.method === "POST" ? body?.films : [body];
            if (!Array.isArray(values) || values.length < 1 || values.length > 50) return reply({ error: "invalid_film" }, 400);
            const films = values.map(savedFilm);
            if (films.some(film => !film)) return reply({ error: "invalid_film" }, 400);
            const unique = [...new Map(films.map(film => [film.id, film])).values()];
            const existing = new Set((await storage.list(uid)).map(record => record.id));
            let available = MAX_SAVED_FILMS - existing.size;
            const results = await parallel(unique, async film => {
                if (!existing.has(film.id) && available-- <= 0) return { id: film.id, ok: false };
                try { await storage.save(uid, film); return { id: film.id, ok: true }; }
                catch { return { id: film.id, ok: false }; }
            });
            if (request.method === "PUT") return results[0].ok ? reply({ id: unique[0].id, saved: true }) : reply({ error: available < 0 ? "watchlist_limit" : "watchlist_unavailable" }, available < 0 ? 409 : 503);
            return reply({ importedIds: results.filter(result => result.ok).map(result => result.id), failedIds: results.filter(result => !result.ok).map(result => result.id) });
        } catch (error) {
            const safe = ["sign_in_required", "member_not_configured", "member_unavailable", "watchlist_unavailable", "watchlist_not_private", "watchlist_limit"];
            return reply({ error: safe.includes(error?.code) ? error.code : "watchlist_unavailable" }, Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 503);
        }
    };
}
