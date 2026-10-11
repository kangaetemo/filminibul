import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../../src/lib/server/analytics.ts', import.meta.url), 'utf8').replace('import "server-only";', '');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { analyticsSearchHistory, searchHistoryFilters } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('untrusted URL params cannot expand the read or change allowed contexts', () => {
    assert.deepEqual(searchHistoryFilters({ search_page: '-1', search_context: 'eq.secret', search_term: ['a','b'], search_empty: 'true' }), { page: 1, context: '', term: '', emptyOnly: false });
    assert.equal(searchHistoryFilters({ search_page: 'Infinity' }).page, 1);
    assert.equal(searchHistoryFilters({ search_page: '99999999' }).page, 3000);
    assert.equal(searchHistoryFilters({ search_term: 'x'.repeat(200) }).term.length, 120);
});

test('reads beyond the top twenty, with bounded pages and literal filters', async () => {
    const original = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    process.env.SUPABASE_URL = 'https://fixture.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-key';
    const requests = [];
    globalThis.fetch = async (url, options) => {
        const params = new URL(url).searchParams; requests.push(params);
        assert.equal(options.cache, 'no-store'); assert.equal(options.headers.Prefer, 'count=exact');
        assert.equal(params.get('name'), 'eq.search_performed');
        assert.equal(params.get('created_at'), 'gte.2026-10-01T00:00:00+03:00');
        assert.ok(!params.get('select').includes('session_id'));
        assert.equal(params.get('limit'), '50');
        const escaped = JSON.parse(params.get('data->>query').slice('imatch.'.length));
        const pattern = new RegExp(escaped, 'i');
        assert.ok(pattern.test('TEST Matrix (1999), .* "x" \\ done'));
        assert.ok(!pattern.test('Matrix 1999, other text x'));
        const rows = [{ created_at: '2026-10-11T23:35:00Z', query: 'Matrix (1999), .* "x" \\', context: 'vibe', result_count: '0' }];
        return new Response(JSON.stringify(rows), { status: 206, headers: { 'content-range': '50-50/51' } });
    };
    try {
        const filters = searchHistoryFilters({ search_page: '2', search_term: 'Matrix (1999), .* "x" \\', search_context: 'vibe', search_empty: '1' });
        const history = await analyticsSearchHistory('2026-10-01', filters);
        assert.equal(history.total, 51); assert.equal(history.page, 2); assert.equal(history.rows.length, 1);
        assert.equal(requests[0].get('offset'), '50');
        assert.equal(requests[0].get('data->>context'), 'eq.vibe'); assert.equal(requests[0].get('data->>result_count'), 'eq.0');
        globalThis.fetch = async () => new Response('[]', { headers: { 'content-range': '*/0' } });
        assert.equal((await analyticsSearchHistory('2026-10-01', searchHistoryFilters())).total, 0);
        const offsets = [];
        globalThis.fetch = async url => {
            const offset = new URL(url).searchParams.get('offset'); offsets.push(offset);
            return offset === '0' ? new Response('[{"query":null}]', { headers: { 'content-range': '0-0/1' } }) : new Response('{}', { status: 416, headers: { 'content-range': '*/1' } });
        };
        const clamped = await analyticsSearchHistory('2026-10-01', searchHistoryFilters({ search_page: '3' }));
        assert.equal(clamped.page, 1); assert.deepEqual(offsets, ['100','0']); assert.equal(clamped.rows[0].query, null);
        globalThis.fetch = async () => new Response('[]', { status: 503 });
        await assert.rejects(analyticsSearchHistory('2026-10-01', searchHistoryFilters()));
    } finally {
        globalThis.fetch = original.fetch;
        for (const [name,value] of [['SUPABASE_URL',original.url],['SUPABASE_SERVICE_ROLE_KEY',original.key]]) {
            if (value === undefined) delete process.env[name]; else process.env[name] = value;
        }
    }
});
