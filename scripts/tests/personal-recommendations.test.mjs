import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPersonalSeeds, rankPersonalCandidates } from '../../src/lib/recommend/personalModel.mjs';
import { createPersonalHandler, safePersonalFailure } from '../../src/lib/server/personalHandler.mjs';

const film = (movie_id, extra = {}) => ({ movie_id, title: `Film ${movie_id}`, genres: [], director: null, collection_id: null, ...extra });
const scored = row => ({ film: row, final: .8, signals: { sharedGenres: [], sharedKeywords: [], sameCollection: null, sameDirector: false } });
const pool = (id, rows) => ({ seed: film(id), ranked: rows.map(scored) });

test('representative seeds are bounded, catalog-only and broaden a franchise-heavy list', () => {
    const franchise = Array.from({ length: 20 }, (_, i) => film(i + 1, { collection_id: 1, director: 'A', genres: [{ id: 28 }] }));
    const other = film(99, { genres: [{ id: 18 }], director: 'B' });
    const rows = [...franchise, other], ids = [...franchise.map(f => f.movie_id), 99, 404, 1];
    const selected = selectPersonalSeeds(rows, ids);
    assert.equal(selected.length, 8); assert.equal(selected[0].movie_id, 1); assert.equal(selected[1].movie_id, 99);
    assert.equal(new Set(selected.map(f => f.movie_id)).size, 8);
    assert.equal(rows.length, 21); assert.deepEqual(selectPersonalSeeds([], [404]), []);
    assert.equal(selectPersonalSeeds([film(7)], [7])[0].movie_id, 7);
});

test('excludes every saved film, deduplicates candidates and keeps only real source films', () => {
    const saved = Array.from({ length: 1000 }, (_, i) => i + 1);
    const results = rankPersonalCandidates([pool(1, [film(1000), film(2001), film(2002)]), pool(2, [film(2001), film(2003), film(2001)])], saved);
    assert.deepEqual(results.map(r => r.film.movie_id).sort(), [2001, 2002, 2003]);
    assert.deepEqual(results.find(r => r.film.movie_id === 2001).sources.map(s => s.seed.movie_id), [1, 2]);
    assert.ok(results.every(r => r.sources.every(s => [1, 2].includes(s.seed.movie_id))));
});

test('agreement helps without swamping a strong interest; ordering is deterministic', () => {
    const a = pool(1, [film(100), film(101), film(102)]), b = pool(2, [film(200), film(101)]);
    const first = rankPersonalCandidates([a, b], [1, 2]);
    assert.equal(first[0].film.movie_id, 101);
    assert.deepEqual(rankPersonalCandidates([b, a], [1, 2]).map(r => r.film.movie_id), first.map(r => r.film.movie_id));
    assert.deepEqual(rankPersonalCandidates([], [1]), []);
});

test('final results cap franchises and directors across all seed pools', () => {
    const rows = Array.from({ length: 10 }, (_, i) => film(100 + i, { collection_id: i < 5 ? 77 : null, director: 'A' }));
    rows.push(...Array.from({ length: 25 }, (_, i) => film(200 + i)));
    const result = rankPersonalCandidates([pool(1, rows)], [1]);
    assert.equal(result.length, 20);
    assert.ok(result.filter(r => r.film.collection_id === 77).length <= 2);
    assert.ok(result.filter(r => r.film.director === 'A').length <= 3);
});

function fixture({ storageError, recommendError } = {}) {
    const calls = [], failures = [];
    let clock = 100000;
    const handle = createPersonalHandler({ now: () => clock, logFailure: details => failures.push(details),
        verify: async auth => { if (!['Bearer A', 'Bearer B'].includes(auth)) throw Object.assign(Error('private token'), { code: 'sign_in_required', status: 401 }); return auth.slice(7); },
        storage: { list: async uid => { calls.push(['list', uid]); if (storageError) throw storageError; return uid === 'A' ? [{ id: 1 }, { id: 1 }, { id: 2 }] : []; } },
        recommend: async ids => { calls.push(['recommend', ids]); if (recommendError) throw recommendError; return { recommendations: [], savedCount: ids.length, status: ids.length ? 'no_matches' : 'empty' }; }
    });
    const request = (uid = 'A') => new Request('https://filminibul.com/api/member/recommendations?uid=B&ids=999', { headers: { authorization: uid ? `Bearer ${uid}` : '' } });
    return { handle, request, calls, failures, advance: () => { clock += 60001; } };
}

test('requires verified membership before reading data; private results never cache at the CDN', async () => {
    const f = fixture(), response = await f.handle(f.request(''));
    assert.equal(response.status, 401); assert.deepEqual(f.calls, []);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.equal(response.headers.get('vary'), 'Authorization');
});

test('list ownership is controlled only by the verified UID, and empty accounts stay empty', async () => {
    const f = fixture();
    assert.equal((await (await f.handle(f.request())).json()).savedCount, 2);
    assert.deepEqual(f.calls, [['list', 'A'], ['recommend', [1, 2]]]);
    assert.equal((await (await f.handle(f.request('B'))).json()).status, 'empty');
    assert.deepEqual(f.calls.slice(2), [['list', 'B'], ['recommend', []]]);
});

test('rate limiting is per account, rejects work early and expires', async () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) assert.equal((await f.handle(f.request())).status, 200);
    const before = f.calls.length; assert.equal((await f.handle(f.request())).status, 429); assert.equal(f.calls.length, before);
    assert.equal((await f.handle(f.request('B'))).status, 200);
    f.advance(); assert.equal((await f.handle(f.request())).status, 200);
});

test('storage and recommendation failures return safe errors, never a generic or other-account fallback', async () => {
    const storage = fixture({ storageError: Object.assign(Error('secret key'), { code: 'watchlist_not_private' }) });
    const response = await storage.handle(storage.request());
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'watchlist_not_private' });
    assert.deepEqual(storage.calls, [['list', 'A']]);
    const f = fixture({ recommendError: Error('private SQL detail') });
    const failure = await f.handle(f.request());
    assert.equal(failure.status, 503); assert.deepEqual(await failure.json(), { error: 'recommendations_unavailable' });
    assert.equal(f.failures[0].stage, 'recommendations');
    assert.ok(!JSON.stringify(f.failures).includes('private SQL detail'));
});

test('diagnostics disclose only safe stage/status/schema codes, not raw errors or user records', () => {
    const error = Object.assign(Error('Supabase 400: {"code":"42703","message":"column film_embeddings_v3.example does not exist","details":"member-A token-secret 603 19995"}'), { stage: 'catalog' });
    const details = safePersonalFailure(error, 'recommendations');
    assert.equal(details.stage, 'catalog'); assert.equal(details.httpStatus, '400'); assert.equal(details.databaseCode, '42703');
    assert.equal(details.column, 'film_embeddings_v3.example');
    for (const secret of ['member-A', 'token-secret', '603', '19995']) assert.ok(!JSON.stringify(details).includes(secret));
});


test('cache hits require fresh auth and list reads; another UID, list change and TTL do not reuse a result', async () => {
    const lists = new Map([['A', [1]], ['B', [1]]]), calls = [], verified = [];
    let clock = 1000;
    const handler = createPersonalHandler({ now: () => clock,
        verify: async value => { verified.push(value); if (!['A', 'B'].includes(value)) throw Object.assign(Error(), { code: 'sign_in_required', status: 401 }); return value; },
        storage: { list: async uid => { calls.push(['list', uid]); return lists.get(uid).map(id => ({ id })); } },
        recommend: async ids => { calls.push(['recommend', ids]); return { recommendations: [], ids, partial: false }; }
    });
    const req = uid => new Request('https://filminibul.com/api/member/recommendations', { headers: { authorization: uid } });
    await handler(req('A')); await handler(req('A'));
    assert.equal(calls.filter(call => call[0] === 'recommend').length, 1);
    assert.equal(calls.filter(call => call[0] === 'list').length, 2); assert.equal(verified.length, 2);
    assert.equal((await handler(req('invalid'))).status, 401);
    await handler(req('B')); assert.equal(calls.filter(call => call[0] === 'recommend').length, 2);
    lists.set('A', [2]); assert.deepEqual((await (await handler(req('A'))).json()).ids, [2]);
    assert.equal(calls.filter(call => call[0] === 'recommend').length, 3);
    clock += 120001; await handler(req('A')); assert.equal(calls.filter(call => call[0] === 'recommend').length, 4);
});

test('concurrent requests for one account/list share work, and partial results are retried', async () => {
    let calls = 0, finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const handler = createPersonalHandler({ verify: async () => 'A', storage: { list: async () => [{ id: 1 }] }, recommend: async () => { calls++; if (calls === 1) return pending; return { recommendations: [], partial: false }; } });
    const request = () => new Request('https://filminibul.com/api/member/recommendations');
    const first = handler(request()), second = handler(request());
    await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 1);
    finish({ recommendations: [], partial: true });
    assert.equal((await first).status, 200); assert.equal((await second).status, 200);
    await handler(request()); assert.equal(calls, 2);
    await handler(request()); assert.equal(calls, 2);
});

test('memory cache is bounded and evicts old results without mixing accounts', async () => {
    let calls = 0;
    const handler = createPersonalHandler({ maxCacheEntries: 2, verify: async value => value, storage: { list: async () => [{ id: 1 }] }, recommend: async () => ({ recommendations: [], computation: ++calls, partial: false }) });
    const request = uid => new Request('https://filminibul.com/api/member/recommendations', { headers: { authorization: uid } });
    for (const uid of ['A', 'B', 'C', 'A']) await handler(request(uid));
    assert.equal(calls, 4);
});
