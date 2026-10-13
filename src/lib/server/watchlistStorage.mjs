import { createHash } from "node:crypto";
import { MAX_SAVED_FILMS, savedFilm } from "../watchlistModel.mjs";

export const WATCHLIST_BUCKET = "member-watchlists";
export const ownerPrefix = uid => createHash("sha256").update(uid).digest("hex");
export class WatchlistStorageError extends Error {
    constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

export function createWatchlistStorage({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, request = fetch } = {}) {
    const base = url?.replace(/\/+$/, "");
    async function call(path, init = {}) {
        if (!base || !key) throw new WatchlistStorageError("watchlist_unavailable");
        return request(`${base}/storage/v1/${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(12000), headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers } });
    }
    async function errorData(response) { return response.clone().json().catch(() => ({})); }
    async function missing(response) {
        if (response.ok) return false;
        const data = await errorData(response);
        return response.status === 404 || Number(data.statusCode) === 404 || data.error === "Bucket not found" || data.message === "Bucket not found";
    }
    async function bucket(create = false) {
        let response = await call(`bucket/${WATCHLIST_BUCKET}`);
        if (await missing(response)) {
            if (!create) return false;
            const created = await call("bucket", { method: "POST", body: JSON.stringify({ id: WATCHLIST_BUCKET, name: WATCHLIST_BUCKET, public: false, file_size_limit: 8192, allowed_mime_types: ["application/json"] }) });
            if (!created.ok) {
                const data = await errorData(created);
                if (created.status !== 409 && !/already exists|duplicate/i.test(String(data.message || data.error || ""))) throw new WatchlistStorageError("watchlist_unavailable");
            }
            response = await call(`bucket/${WATCHLIST_BUCKET}`);
        }
        if (!response.ok) throw new WatchlistStorageError("watchlist_unavailable");
        const info = await response.json();
        // Never silently reuse a public bucket with the same name.
        if (info.public !== false) throw new WatchlistStorageError("watchlist_not_private");
        return true;
    }
    const path = (uid, id) => `${ownerPrefix(uid)}/${id}.json`;
    async function list(uid) {
        if (!await bucket()) return [];
        const prefix = ownerPrefix(uid);
        const out = [];
        for (let offset = 0; offset <= MAX_SAVED_FILMS; offset += 100) {
            const response = await call(`object/list/${WATCHLIST_BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: `${prefix}/`, limit: 100, offset, sortBy: { column: "created_at", order: "desc" } }) });
            if (!response.ok) throw new WatchlistStorageError("watchlist_unavailable");
            const page = await response.json();
            if (!Array.isArray(page)) throw new WatchlistStorageError("watchlist_unavailable");
            for (const object of page) {
                const name = object.name?.startsWith(`${prefix}/`) ? object.name.slice(prefix.length + 1) : object.name;
                if (typeof name !== "string" || !/^[1-9]\d{0,15}\.json$/.test(name)) continue;
                const id = Number(name.slice(0, -5));
                if (Number.isSafeInteger(id)) out.push({ id, savedAt: object.created_at });
            }
            if (out.length > MAX_SAVED_FILMS) throw new WatchlistStorageError("watchlist_limit", 409);
            if (page.length < 100) return out;
        }
        throw new WatchlistStorageError("watchlist_limit", 409);
    }
    async function readFilm(uid, id) {
        if (!await bucket()) return null;
        const response = await call(`object/authenticated/${WATCHLIST_BUCKET}/${path(uid, id)}`);
        if (await missing(response)) return null;
        if (!response.ok) throw new WatchlistStorageError("watchlist_unavailable");
        const record = await response.json();
        return record.id === id ? savedFilm(record) : null;
    }
    async function save(uid, film) {
        const valid = savedFilm(film);
        if (!valid) throw new WatchlistStorageError("invalid_film", 400);
        await bucket(true);
        const response = await call(`object/${WATCHLIST_BUCKET}/${path(uid, valid.id)}`, { method: "POST", headers: { "x-upsert": "false" }, body: JSON.stringify(valid) });
        if (!response.ok) {
            const data = await errorData(response);
            if (response.status !== 409 && Number(data.statusCode) !== 409 && !/already exists|duplicate/i.test(String(data.message || data.error || ""))) throw new WatchlistStorageError("watchlist_unavailable");
        }
    }
    async function remove(uid, id) {
        if (!await bucket()) return;
        const response = await call(`object/${WATCHLIST_BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: [path(uid, id)] }) });
        if (!response.ok) throw new WatchlistStorageError("watchlist_unavailable");
    }
    return { bucket, list, save, remove, readFilm, call };
}
