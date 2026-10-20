import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { requestOrigin, sameOrigin } from '../../src/lib/requestOrigin.mjs';
import { createWatchlistHandler } from '../../src/lib/server/watchlistHandler.mjs';
import { createWatchlistStorage } from '../../src/lib/server/watchlistStorage.mjs';
import { MAX_SAVED_FILMS } from '../../src/lib/watchlistModel.mjs';

const film = id => ({ id, title: `Film ${id}`, year: 2000, rating: 7, genres: [], posterUrl: null });
const tick = () => new Promise(resolve => setImmediate(resolve));

// ---- ALT-04: proxy arkasında genel adres ----
test('origin comes from proxy headers when Next only sees its local address', () => {
    const behindProxy = new Request('https://localhost:3000/api/x', { headers: { 'x-forwarded-host': 'filminibul.com', 'x-forwarded-proto': 'https', origin: 'https://filminibul.com' } });
    assert.equal(requestOrigin(behindProxy), 'https://filminibul.com');
    assert.equal(sameOrigin(behindProxy), true);
    const forged = new Request('https://localhost:3000/api/x', { headers: { 'x-forwarded-host': 'filminibul.com', 'x-forwarded-proto': 'https', origin: 'https://localhost:3000' } });
    assert.equal(sameOrigin(forged), false);
    const crossSite = new Request('https://localhost:3000/api/x', { headers: { 'x-forwarded-host': 'filminibul.com', 'x-forwarded-proto': 'https', origin: 'https://evil.test' } });
    assert.equal(sameOrigin(crossSite), false);
    // Başlık yoksa isteğin kendi adresi; tanınmayan protokol değeri yok sayılır; listedeki ilk değer alınır.
    assert.equal(requestOrigin(new Request('https://filminibul.com/a')), 'https://filminibul.com');
    assert.equal(requestOrigin(new Request('https://filminibul.com/a', { headers: { 'x-forwarded-proto': 'javascript' } })), 'https://filminibul.com');
    assert.equal(requestOrigin(new Request('http://localhost:3000/a', { headers: { 'x-forwarded-host': 'filminibul.com, proxy.internal', 'x-forwarded-proto': 'https, http' } })), 'https://filminibul.com');
});

// ---- GV-03: liste sınırı yarışı ----
function sharedList(initialCount) {
    let clock = 0; const saves = [];
    const list = new Map(Array.from({ length: initialCount }, (_, i) => [i + 1, { id: i + 1, savedAt: new Date(++clock * 1000).toISOString() }]));
    const storage = {
        list: async () => { await tick(); return [...list.values()]; },
        save: async (uid, f) => { saves.push(f.id); await tick(); if (!list.has(f.id)) list.set(f.id, { id: f.id, savedAt: new Date(++clock * 1000).toISOString() }); },
        remove: async (uid, id) => { await tick(); list.delete(id); },
        readFilm: async (uid, id) => film(id),
    };
    return { list, storage, saves };
}
const proxied = (method, body) => new Request('https://localhost:3000/api/member/watchlist', { method, headers: { authorization: 'Bearer A', origin: 'https://filminibul.com', 'x-forwarded-host': 'filminibul.com', 'x-forwarded-proto': 'https', 'content-type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) });

test('two devices adding at 999 films leave exactly the limit; the later add is rolled back with 409', async () => {
    const { list, storage, saves } = sharedList(MAX_SAVED_FILMS - 1);
    const handle = createWatchlistHandler({ verify: async () => 'A', storage, loadFilms: async () => [] });
    const [first, second] = await Promise.all([handle(proxied('PUT', film(5001))), handle(proxied('PUT', film(5002)))]);
    assert.deepEqual(saves.sort(), [5001, 5002], 'both devices passed the pre-check, so the race really happened');
    assert.equal(list.size, MAX_SAVED_FILMS);
    assert.deepEqual([first.status, second.status].sort(), [200, 409]);
    const rejected = first.status === 409 ? first : second;
    assert.deepEqual(await rejected.json(), { error: 'watchlist_limit' });
    assert.ok(list.has(5001) && !list.has(5002), 'the earlier save keeps its place');
});

test('a list already above the limit can still be read and a further add is refused', async () => {
    const { list, storage } = sharedList(MAX_SAVED_FILMS + 1);
    const handle = createWatchlistHandler({ verify: async () => 'A', storage, loadFilms: async () => [] });
    const read = await handle(proxied('GET'));
    assert.equal(read.status, 200);
    assert.equal((await read.json()).films.length, MAX_SAVED_FILMS + 1);
    assert.equal((await handle(proxied('PUT', film(7000)))).status, 409);
    assert.equal(list.size, MAX_SAVED_FILMS + 1);
});

test('Storage listing tolerates more than the limit instead of failing the read', async () => {
    const total = MAX_SAVED_FILMS + 1;
    const storage = createWatchlistStorage({ url: 'https://storage.test', key: 'fixture-key', request: async (url, init) => {
        if (url.includes('/bucket/')) return Response.json({ public: false });
        const { offset } = JSON.parse(init.body);
        return Response.json(Array.from({ length: Math.max(0, Math.min(100, total - offset)) }, (_, i) => ({ name: `${offset + i + 1}.json`, created_at: '2026-10-20' })));
    } });
    assert.equal((await storage.list('A')).length, total);
});

// ---- GV-01 / GV-02: yönetici oturumu ve giriş sınırı ----
async function loadAdminAuth() {
    const source = ts.transpileModule(readFileSync(new URL('../../src/lib/server/adminAuth.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Math.random()}`);
}
async function withAdminEnv(run) {
    const old = { fetch: globalThis.fetch, now: Date.now, env: { ...process.env } };
    process.env.ADMIN_PASSWORD = 'fixture-password'; process.env.SUPABASE_URL = 'https://db.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-key';
    const db = { sessions: new Map(), calls: [], rate: { perIp: true, total: true }, down: false };
    globalThis.fetch = async (url, init = {}) => {
        const body = init.body ? JSON.parse(init.body) : null;
        db.calls.push({ url, body, cache: init.cache });
        if (db.down) throw new Error('db down');
        if (url.endsWith('/rest/v1/admin_sessions')) { db.sessions.set(body.id, { expires: Date.parse(body.expires_at), revoked: false }); return new Response(null, { status: 201 }); }
        if (url.endsWith('/rpc/admin_session_valid')) { const s = db.sessions.get(body.p_id); return Response.json(!!s && !s.revoked && s.expires > Date.now()); }
        if (url.endsWith('/rpc/admin_session_revoke')) { const s = db.sessions.get(body.p_id); if (s) s.revoked = true; return new Response('', { status: 200 }); }
        if (url.endsWith('/rpc/rate_limit_take')) return Response.json(body.p_bucket === 'admin_login:all' ? db.rate.total : db.rate.perIp);
        throw new Error(`unexpected ${url}`);
    };
    try { await run(await loadAdminAuth(), db); }
    finally { globalThis.fetch = old.fetch; Date.now = old.now; for (const key of Object.keys(process.env)) if (!(key in old.env)) delete process.env[key]; Object.assign(process.env, old.env); }
}

test('admin cookie is revoked on logout, so a copied cookie stops working', () => withAdminEnv(async (auth, db) => {
    const cookie = await auth.createSession();
    assert.match(cookie, /^[0-9a-f-]{36}\.\d+\.[0-9a-f]{64}$/);
    assert.equal(await auth.isValidSession(cookie), true);
    const copied = String(cookie);
    await auth.revokeSession(cookie);
    assert.equal(await auth.isValidSession(copied), false);
    assert.ok(db.calls.filter(call => call.url.includes('/rpc/')).every(call => call.cache === 'no-store'));
}));

test('admin cookie is refused after 7 days even without logout, and when tampered or signed with an old password', () => withAdminEnv(async (auth, db) => {
    const start = Date.now();
    const cookie = await auth.createSession(start);
    const [id, exp, sig] = cookie.split('.');
    assert.equal(await auth.isValidSession(`${id}.${Number(exp) + 86400000}.${sig}`), false, 'extended expiry breaks the signature');
    assert.equal(await auth.isValidSession(`${id}.${exp}.${'0'.repeat(64)}`), false);
    Date.now = () => start + 7 * 24 * 3600 * 1000 + 1;
    const before = db.calls.length;
    assert.equal(await auth.isValidSession(cookie), false);
    assert.equal(db.calls.length, before, 'an expired cookie is rejected without a database call');
    Date.now = () => start;
    process.env.ADMIN_PASSWORD = 'changed-password';
    assert.equal(await auth.isValidSession(cookie), false);
}));

test('sessions fail closed when the database is unreachable', () => withAdminEnv(async (auth, db) => {
    const cookie = await auth.createSession();
    db.down = true;
    assert.equal(await auth.isValidSession(cookie), false);
    await assert.rejects(auth.createSession());
    assert.equal(await auth.takeLoginAttempt('203.0.113.7'), false);
}));

test('login attempts use the shared per-IP and global counters without storing the raw IP', () => withAdminEnv(async (auth, db) => {
    assert.equal(await auth.takeLoginAttempt('203.0.113.7'), true);
    const buckets = db.calls.filter(call => call.url.endsWith('/rpc/rate_limit_take')).map(call => call.body.p_bucket);
    assert.equal(buckets.length, 2);
    assert.ok(buckets.includes('admin_login:all'));
    assert.ok(buckets.every(bucket => !bucket.includes('203.0.113.7')));
    db.rate.perIp = false; assert.equal(await auth.takeLoginAttempt('203.0.113.7'), false);
    db.rate.perIp = true; db.rate.total = false; assert.equal(await auth.takeLoginAttempt('198.51.100.1'), false);
}));
