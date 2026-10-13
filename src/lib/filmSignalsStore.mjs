import { parseSignals, signalOperation, applySignal } from "./filmSignalsModel.mjs";
export const INITIAL_SIGNALS = Object.freeze({ records: [], member: null, ready: false, phase: "loading", pendingIds: [], persistent: true, error: null });
export function createFilmSignalsStore({ read, write, cloud, nonce = () => crypto.randomUUID() }) {
    const listeners = new Set(), memory = new Map(), failed = new Set();
    let owner, epoch = 0, mutation = 0, confirmed = [], pending = [], state = INITIAL_SIGNALS, refreshTask = null, flushTask = null;
    const key = uid => `filminibul:signals:v1:${uid}`;
    const queueKey = uid => `${key(uid)}:pending`;
    const get = k => { if (failed.has(k)) return memory.get(k) || null; try { return read(k); } catch { return memory.get(k) || null; } };
    const put = (k, value) => { memory.set(k, value); try { write(k, value); failed.delete(k); } catch { failed.add(k); } };
    const readRecords = uid => { try { return parseSignals(JSON.parse(get(key(uid)) || "[]")); } catch { return []; } };
    const readPending = uid => { try { const ops = JSON.parse(get(queueKey(uid)) || "[]"); return Array.isArray(ops) ? ops.filter(op => signalOperation(op) && typeof op.nonce === "string") : []; } catch { return []; } };
    const same = (uid, generation) => owner === uid && epoch === generation;
    function emit(phase, error = null) {
        const records = pending.reduce((records, op) => applySignal(records, op, op.film), confirmed);
        state = { records, member: owner || null, ready: owner !== undefined, phase, pendingIds: [...new Set(pending.map(op => op.id))], persistent: !owner || ![key(owner), queueKey(owner)].some(k => failed.has(k)), error };
        listeners.forEach(listener => listener());
    }
    function persist() { if (owner) { put(key(owner), JSON.stringify(confirmed)); put(queueKey(owner), JSON.stringify(pending)); } }
    async function flush() {
        if (!owner || flushTask) return flushTask;
        const uid = owner, generation = epoch;
        const task = (async () => {
            while (same(uid, generation) && pending.length) {
                const op = pending[0]; emit("syncing");
                try { await cloud(uid, "PUT", signalOperation(op)); }
                catch (error) { if (same(uid, generation)) emit("error", error.code || "signals_unavailable"); return false; }
                if (!same(uid, generation)) return false;
                confirmed = applySignal(confirmed, op, op.film);
                pending = readPending(uid).filter(item => item.nonce !== op.nonce); mutation++;
                persist(); emit(pending.length ? "syncing" : "synced");
            }
            return true;
        })();
        flushTask = task;
        try { return await task; } finally { if (flushTask === task) flushTask = null; }
    }
    async function refresh() {
        if (!owner) return true;
        if (refreshTask) return refreshTask;
        const uid = owner, generation = epoch;
        const task = (async () => {
            if (pending.length && !await flush()) return false;
            if (!same(uid, generation)) return false;
            emit("syncing");
            try {
                for (let attempt = 0; attempt < 2; attempt++) {
                    const before = mutation, data = await cloud(uid, "GET");
                    if (!same(uid, generation)) return false;
                    if (before !== mutation) { if (attempt === 0) continue; return false; }
                    confirmed = parseSignals(data.records); persist(); emit(pending.length ? "syncing" : "synced");
                    if (pending.length) void flush(); return true;
                }
            } catch (error) { if (same(uid, generation)) emit("error", error.code || "signals_unavailable"); return false; }
            return false;
        })();
        refreshTask = task;
        try { return await task; } finally { if (refreshTask === task) refreshTask = null; }
    }
    function setMember(uid) {
        if (owner === uid) return;
        owner = uid; epoch++; flushTask = null; refreshTask = null;
        confirmed = uid ? readRecords(uid) : []; pending = uid ? readPending(uid) : [];
        emit(uid ? "loading" : "guest"); if (uid) void refresh();
    }
    function set(value, film) {
        const op = signalOperation(value);
        if (!op || !owner || !state.ready || state.phase === "loading") return false;
        pending = [...readPending(owner).filter(item => item.id !== op.id || item.field !== op.field), { ...op, film, nonce: nonce() }];
        mutation++; persist(); emit("syncing"); void flush(); return true;
    }
    function storageChanged(k) {
        if (k) { memory.delete(k); failed.delete(k); } else { memory.clear(); failed.clear(); }
        if (owner && (k === key(owner) || k === queueKey(owner) || k === null)) {
            confirmed = readRecords(owner); pending = readPending(owner); mutation++; emit("syncing"); void refresh();
        }
    }
    return { getSnapshot: () => state, subscribe: callback => { listeners.add(callback); return () => listeners.delete(callback); }, setMember, set, refresh, storageChanged };
}
