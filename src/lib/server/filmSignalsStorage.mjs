import { createWatchlistStorage, WATCHLIST_BUCKET, ownerPrefix, WatchlistStorageError } from "./watchlistStorage.mjs";
import { MAX_SIGNAL_FILMS, signalOperation } from "../filmSignalsModel.mjs";
const tokens = { watched: { true: "watched", false: "unwatched" }, reaction: { liked: "liked", disliked: "disliked", null: "neutral" } };
// Bounded, per-film/per-field markers: last server timestamp wins within each
// field. Different devices never overwrite an entire profile or another field.
// Listing yields the state without downloading N film files. Neutral markers
// preserve resets across concurrent writes; at most five tiny files per film.
export function createFilmSignalsStorage(options) {
    const storage = createWatchlistStorage(options);
    const prefix = uid => `${ownerPrefix(uid)}/signals/`;
    async function list(uid) {
        if (!await storage.bucket()) return [];
        const fields = new Map();
        for (let offset = 0; offset <= MAX_SIGNAL_FILMS * 5; offset += 1000) {
            const response = await storage.call(`object/list/${WATCHLIST_BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: prefix(uid), limit: 1000, offset, sortBy: { column: "name", order: "asc" } }) });
            if (!response.ok) throw new WatchlistStorageError("signals_unavailable");
            const page = await response.json();
            if (!Array.isArray(page)) throw new WatchlistStorageError("signals_unavailable");
            for (const object of page) {
                const name = object.name?.startsWith(prefix(uid)) ? object.name.slice(prefix(uid).length) : object.name;
                const match = typeof name === "string" && name.match(/^([1-9]\d{0,15})\.(watched|unwatched|liked|disliked|neutral)\.json$/);
                if (!match || !Number.isSafeInteger(Number(match[1]))) continue;
                const id = Number(match[1]), token = match[2], watched = token === "watched" || token === "unwatched";
                const field = watched ? "watched" : "reaction";
                const value = watched ? token === "watched" : token === "neutral" ? null : token;
                const at = Date.parse(object.updated_at || object.created_at);
                if (!Number.isFinite(at)) throw new WatchlistStorageError("signals_unavailable");
                const record = fields.get(id) || { id, watched: false, reaction: null, times: {} };
                const previous = record.times[field];
                // Conservative deterministic tie: neutral and unwatched win;
                // dislike beats like. No accidental positive inference.
                const priority = token === "neutral" || token === "unwatched" ? 2 : token === "disliked" ? 1 : 0;
                if (!previous || at > previous.at || (at === previous.at && priority > previous.priority)) {
                    record[field] = value; record.times[field] = { at, priority };
                }
                fields.set(id, record);
            }
            if (fields.size > MAX_SIGNAL_FILMS) throw new WatchlistStorageError("signals_limit", 409);
            if (page.length < 1000) return [...fields.values()].map(({ times, ...record }) => record);
        }
        throw new WatchlistStorageError("signals_limit", 409);
    }
    async function set(uid, value) {
        const op = signalOperation(value);
        if (!op) throw new WatchlistStorageError("invalid_signal", 400);
        const records = await list(uid);
        if (!records.some(record => record.id === op.id) && records.length >= MAX_SIGNAL_FILMS) throw new WatchlistStorageError("signals_limit", 409);
        await storage.bucket(true);
        const token = tokens[op.field][String(op.value)];
        const response = await storage.call(`object/${WATCHLIST_BUCKET}/${prefix(uid)}${op.id}.${token}.json`, { method: "POST", headers: { "x-upsert": "true", "Cache-Control": "no-store" }, body: JSON.stringify(op) });
        if (!response.ok) throw new WatchlistStorageError("signals_unavailable");
    }
    return { list, set };
}
