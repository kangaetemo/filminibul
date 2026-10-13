// Run the production TS recommender against deterministic REST fixtures without
// a second implementation, a new test runner or a live user's private list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createPersonalHandler } from '../../src/lib/server/personalHandler.mjs';
import { createWatchlistStorage, ownerPrefix } from '../../src/lib/server/watchlistStorage.mjs';

const root = fileURLToPath(new URL('../../src/', import.meta.url));
const urls = new Map();
function moduleUrl(path) {
    if (urls.has(path)) return urls.get(path);
    if (path.endsWith('.mjs')) return pathToFileURL(path).href;
    let source = path.endsWith('.json') ? `export default ${readFileSync(path, 'utf8')};`
        : ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    source = source.replace(/from\s+["']([^"']+)["']/g, (match, specifier) => {
        let dependency = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(path), specifier);
        if (!existsSync(dependency)) dependency += '.ts';
        return `from ${JSON.stringify(moduleUrl(dependency))}`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    urls.set(path, url); return url;
}

process.env.SUPABASE_URL = 'https://catalog.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
const { getPersonalRecommendations } = await import(moduleUrl(resolve(root, 'lib/recommend/personal.ts')));
const row = (movie_id, extra = {}) => ({ movie_id, title: `Film ${movie_id}`, tr_title: `Türkçe ${movie_id}`, original_title: null, overview: 'A film story.', tr_overview: 'Bir film hikâyesi.', year: 2000, genres: [{ id: 28, name: 'Action' }], keywords: ['space travel'], rating: 7, vote_count: 5000, popularity: 20, language: 'en', countries: [], poster_path: '/poster.jpg', backdrop_path: null, director: null, cast_names: [], collection_id: null, collection_name: null, ...extra });
const req = new Request('https://filminibul.com/api/member/recommendations?uid=B&ids=999', { headers: { authorization: 'Bearer fixture' } });

async function runFixture(ids, { catalog = ids.map(id => row(id)), failedSeed = null, allFailed = false, signals = [] } = {}) {
    const calls = [], oldFetch = globalThis.fetch, oldError = console.error;
    let active = 0, maxActive = 0;
    globalThis.fetch = async (url, init) => {
        calls.push({ url, init });
        if (url.includes('/bucket/')) return Response.json({ public: false });
        if (url.includes('/object/list/')) {
            assert.equal(JSON.parse(init.body).prefix, ownerPrefix('member-A') + '/');
            const offset = JSON.parse(init.body).offset;
            return Response.json(ids.slice(offset, offset + 100).map(id => ({ name: `${id}.json` })));
        }
        if (url.includes('/rpc/')) {
            const { seed_movie_id: seed } = JSON.parse(init.body);
            assert.ok(catalog.some(row => row.movie_id === seed)); active++; maxActive = Math.max(maxActive, active);
            await new Promise(done => setTimeout(done, 2)); active--;
            if (allFailed || seed === failedSeed) return Response.json({ error: 'fixture unavailable' }, { status: 503 });
            return Response.json([row(seed, { similarity: .99 }), row(9001, { similarity: .98 }), row(9002, { similarity: .8 }), row(9003, { similarity: .7 })]);
        }
        if (url.includes('/rest/v1/film_embeddings_v3?')) {
            const wanted = new Set(url.match(/movie_id=in\.\(([^)]+)\)/)[1].split(',').map(Number));
            return Response.json(catalog.filter(film => wanted.has(film.movie_id)));
        }
        throw Error('unexpected external service');
    };
    console.error = () => {};
    try {
        const handle = createPersonalHandler({ verify: async auth => { assert.equal(auth, 'Bearer fixture'); return 'member-A'; }, storage: createWatchlistStorage({ url: 'https://storage.invalid', key: 'fixture-only' }), signals: { list: async uid => { assert.equal(uid, "member-A"); return signals; } }, recommend: getPersonalRecommendations });
        const response = await handle(req);
        return { response, data: await response.json(), calls, maxActive };
    } finally { globalThis.fetch = oldFetch; console.error = oldError; }
}

test('private Storage → real catalog/reranker → personalized TR/EN reasons, without OpenAI', async () => {
    const { response, data, calls } = await runFixture([603, 19995]);
    assert.equal(response.status, 200); assert.equal(data.status, 'ready'); assert.equal(data.seedCount, 2);
    assert.ok(data.recommendations.length > 0);
    assert.ok(data.recommendations.every(item => ![603, 19995].includes(item.film.id)));
    const first = data.recommendations[0];
    assert.match(first.reasons[0], /Türkçe (603|19995).*kaydettiğin için/);
    assert.match(first.reasonsEn[0], /^Because you saved Film /);
    assert.equal(first.film.inCatalog, true); assert.ok(first.reasonsEn.length >= 2);
    assert.ok(calls.every(call => ['catalog.invalid', 'storage.invalid'].includes(new URL(call.url).hostname)));
});

test('empty and uncatalogued lists show distinct statuses without candidate RPCs', async () => {
    for (const [ids, expected] of [[[], 'empty'], [[404], 'uncatalogued']]) {
        const { data, calls } = await runFixture(ids, { catalog: [] });
        assert.equal(data.status, expected); assert.deepEqual(data.recommendations, []);
        assert.ok(calls.every(call => !call.url.includes('/rpc/')));
    }
});

test('partial candidate failures remain visible; total failure returns a safe service error', async () => {
    const partial = await runFixture([603, 19995], { failedSeed: 19995 });
    assert.equal(partial.response.status, 200); assert.equal(partial.data.partial, true); assert.equal(partial.data.seedCount, 1);
    assert.ok(partial.data.recommendations.every(item => !item.reasons[0].includes('19995')));
    const failed = await runFixture([603], { allFailed: true });
    assert.equal(failed.response.status, 503); assert.deepEqual(failed.data, { error: 'recommendations_unavailable' });
});

test('large lists batch catalog reads and bound candidate work to 8 seeds / 3 concurrent calls', async () => {
    const result = await runFixture(Array.from({ length: 250 }, (_, i) => i + 1));
    assert.equal(result.data.savedCount, 250); assert.equal(result.data.seedCount, 8);
    assert.equal(result.calls.filter(call => call.url.includes('/rest/v1/film_embeddings_v3?')).length, 2);
    assert.equal(result.calls.filter(call => call.url.includes('/rpc/')).length, 8);
    assert.ok(result.maxActive <= 3); assert.ok(result.maxActive > 1);
});


test('real personalized flow uses liked-only interests, excludes watched/disliked and does not infer liking from watching', async () => {
    const likedOnly = await runFixture([], { catalog: [row(603)], signals: [{ id:603, watched:false, reaction:'liked' }, { id:9001, watched:true, reaction:null }, { id:9002, watched:false, reaction:'disliked' }] });
    assert.equal(likedOnly.data.status,'ready');
    assert.deepEqual(likedOnly.data.recommendations.map(r => r.film.id),[9003]);
    assert.match(likedOnly.data.recommendations[0].reasons[0],/603.*beğendiğin için/);
    assert.match(likedOnly.data.recommendations[0].reasonsEn[0],/^Because you liked Film 603/);
    const watchedOnly = await runFixture([], { catalog:[row(603)], signals:[{id:603,watched:true,reaction:null}] });
    assert.equal(watchedOnly.data.status,'empty'); assert.ok(watchedOnly.calls.every(call=>!call.url.includes('/rpc/')));
    const rejectedSave = await runFixture([603], { signals:[{id:603,watched:false,reaction:'disliked'}] });
    assert.equal(rejectedSave.data.status,'empty');assert.ok(rejectedSave.calls.every(call=>!call.url.includes('/rpc/')));
});
