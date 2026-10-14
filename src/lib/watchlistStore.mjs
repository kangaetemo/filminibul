import { GUEST_KEY, accountKey, pendingKey, parseSavedFilms, savedFilm } from "./watchlistModel.mjs";

export const INITIAL_WATCHLIST = Object.freeze({ films: [], ready: false, member: null, phase: "loading", pendingIds: [], localCount: 0, persistent: true, importing: false, importNotice: null, error: null });

export function createWatchlistStore({ read, write, cloud, nonce = () => crypto.randomUUID() }) {
    const listeners = new Set(), memory = new Map(), failedWrites = new Set();
    let owner, epoch = 0, mutation = 0, state = INITIAL_WATCHLIST, refreshTask = null, flushTask = null;
    let confirmed = [], pending = [], hasSnapshot = false, persistent = true, importing = false, importNotice = null;
    function get(key) {
        if (failedWrites.has(key)) return memory.get(key) || null;
        try { const value = read(key); if (value !== null) memory.set(key, value); else memory.delete(key); return value; }
        catch { return memory.get(key) || null; }
    }
    function put(key, value) {
        memory.set(key, value);
        try { write(key, value); failedWrites.delete(key); persistent = ![GUEST_KEY, ...(owner ? [accountKey(owner), pendingKey(owner)] : [])].some(key => failedWrites.has(key)); return true; } catch { failedWrites.add(key); persistent = false; return false; }
    }
    const localFilms = () => parseSavedFilms(get(GUEST_KEY));
    function readPending(uid) {
        try {
            const values = JSON.parse(get(pendingKey(uid)) || "[]");
            if (!Array.isArray(values)) return [];
            return values.filter(op => typeof op.nonce === "string" && typeof op.saved === "boolean" && savedFilm(op.film));
        } catch { return []; }
    }
    function visibleFilms() {
        const list = new Map(confirmed.map(film => [film.id, film]));
        for (const op of pending) { list.delete(op.film.id); if (op.saved) list.set(op.film.id, op.film); }
        const added = pending.filter(op => op.saved).map(op => op.film).reverse();
        return [...added, ...confirmed.filter(film => list.has(film.id) && !added.some(item => item.id === film.id))];
    }
    function emit(phase = state.phase, error = null) {
        state = { films: owner ? visibleFilms() : localFilms(), ready: owner !== undefined && (hasSnapshot || phase !== "loading"), member: owner || null, phase, pendingIds: pending.map(op => op.film.id), localCount: localFilms().length, persistent, importing, importNotice, error };
        for (const listener of listeners) listener();
    }
    function persist() {
        if (!owner) return;
        put(accountKey(owner), JSON.stringify(confirmed));
        put(pendingKey(owner), JSON.stringify(pending));
    }
    const same = (uid, generation) => owner === uid && epoch === generation;
    async function flush() {
        if (!owner || flushTask) return flushTask;
        const uid = owner, generation = epoch;
        const task = (async () => {
            while (same(uid, generation) && pending.length) {
                const op = pending[0]; emit("syncing");
                try { await cloud(uid, op.saved ? "PUT" : "DELETE", op.saved ? op.film : op.film.id); }
                catch (error) { if (same(uid, generation)) emit("error", error.code || "watchlist_unavailable"); return false; }
                if (!same(uid, generation)) return false;
                // A rapid second click may replace this operation in flight.
                // Only acknowledge the matching nonce, then send the new intent.
                if (op.saved) confirmed = [op.film, ...confirmed.filter(film => film.id !== op.film.id)];
                else confirmed = confirmed.filter(film => film.id !== op.film.id);
                pending = readPending(uid).filter(item => item.nonce !== op.nonce); mutation++;
                persist(); emit(pending.length ? "syncing" : "synced");
            }
            return true;
        })();
        flushTask = task;
        try { return await task; } finally { if (flushTask === task) flushTask = null; }
    }
    async function refresh() {
        if (!owner) { if (owner === null) emit("guest"); return true; }
        if (refreshTask) return refreshTask;
        const uid = owner, generation = epoch;
        const task = (async () => {
            // Replay durable writes before reading so stale cloud data cannot
            // erase offline additions or removals.
            if (pending.length && !await flush()) return false;
            if (!same(uid, generation)) return false;
            emit(hasSnapshot ? "syncing" : "loading");
            try {
                for (let attempt = 0; attempt < 2; attempt++) {
                    const before = mutation;
                    const result = await cloud(uid, "GET");
                    if (!same(uid, generation)) return false;
                    // Discard a read that raced with a completed local write.
                    if (before !== mutation) { if (attempt === 0) continue; return false; }
                    confirmed = parseSavedFilms(result.films); hasSnapshot = true;
                    persist(); emit(pending.length ? "syncing" : "synced");
                    if (pending.length) void flush();
                    break;
                }
                return true;
            } catch (error) { if (same(uid, generation)) emit("error", error.code || "watchlist_unavailable"); return false; }
        })();
        refreshTask = task;
        try { return await task; } finally { if (refreshTask === task) refreshTask = null; }
    }
    function setMember(uid) {
        if (owner === uid && state.ready) return;
        owner = uid; epoch++;
        refreshTask = null; flushTask = null; importing = false; importNotice = null;
        persistent = ![GUEST_KEY, ...(uid ? [accountKey(uid), pendingKey(uid)] : [])].some(key => failedWrites.has(key));
        confirmed = uid ? parseSavedFilms(get(accountKey(uid))) : [];
        pending = uid ? readPending(uid) : [];
        hasSnapshot = uid ? get(accountKey(uid)) !== null : true;
        emit(uid ? (hasSnapshot ? "syncing" : "loading") : "guest");
        if (uid) void refresh();
    }
    function toggle(value) {
        const film = savedFilm(value);
        if (!film || !state.ready || !owner) return { blocked: true, saved: false, persistent, cloud: !!owner };
        mutation++;
        const saved = !state.films.some(item => item.id === film.id);
        // Merge another tab's durable pending films before this update.
        const stored = readPending(owner);
        pending = [...stored.filter(op => op.film.id !== film.id), { film, saved, nonce: nonce() }];
        persist(); emit("syncing"); void flush();
        return { saved, persistent, cloud: !!owner, blocked: false };
    }
    async function importLocal() {
        if (!owner || importing) return;
        const uid = owner, generation = epoch;
        if (!await refresh() || !same(uid, generation) || importing) return;
        importing = true; importNotice = null; emit(state.phase);
        const films = localFilms(); let imported = 0;
        try {
            for (let i = 0; i < films.length; i += 50) {
                const batch = films.slice(i, i + 50), result = await cloud(uid, "POST", batch);
                if (!same(uid, generation)) return;
                const ids = new Set((result.importedIds || []).filter(id => batch.some(film => film.id === id)));
                // Remove only server-acknowledged guest records. New guest
                // additions during import and failed records remain intact.
                if (ids.size) {
                    put(GUEST_KEY, JSON.stringify(localFilms().filter(film => !ids.has(film.id))));
                    for (const film of batch) if (ids.has(film.id) && !confirmed.some(item => item.id === film.id)) confirmed.unshift(film);
                    imported += ids.size; mutation++; persist(); emit(state.phase);
                }
                if (result.failedIds?.length) break;
            }
            if (same(uid, generation)) { importNotice = { imported, remaining: localFilms().length }; await refresh(); }
        } catch (error) {
            if (same(uid, generation)) { importNotice = { imported, remaining: localFilms().length }; emit("error", error.code || "watchlist_unavailable"); }
        } finally { if (same(uid, generation)) { importing = false; emit(state.phase, state.error); } }
    }
    function storageChanged(key) {
        if (key) { memory.delete(key); failedWrites.delete(key); } else { memory.clear(); failedWrites.clear(); }
        mutation++;
        if (!owner) { emit(owner === null ? "guest" : "loading"); return; }
        if (key === accountKey(owner) || key === pendingKey(owner) || key === null) {
            confirmed = parseSavedFilms(get(accountKey(owner))); pending = readPending(owner); hasSnapshot = true;
            emit("syncing"); void refresh();
        } else if (key === GUEST_KEY) emit(state.phase, state.error);
    }
    return { subscribe: callback => { listeners.add(callback); return () => listeners.delete(callback); }, getSnapshot: () => state, setMember, toggle, refresh, importLocal, storageChanged };
}
