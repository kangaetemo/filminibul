import test from 'node:test';
import assert from 'node:assert/strict';
import { createVibeOpenAI } from '../../src/lib/server/vibeOpenAI.mjs';

const quotaCodes = ['insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'];

test('credit/spend/quota errors stop after one call, pause both endpoints and recover after the pause', async () => {
    for (const code of quotaCodes) {
        let calls = 0, clock = 1000; const reports = [];
        const client = createVibeOpenAI({ getKey: () => 'fixture-key', now: () => clock, pause: () => { throw Error('quota must not retry'); }, report: value => reports.push(value), request: async () => {
            calls++; return calls === 1 ? Response.json({ error: { code, type: 'insufficient_quota', message: 'private prompt and credential' } }, { status: 429 }) : Response.json({ ok: true });
        } });
        await assert.rejects(client.call('chat/completions', { messages: ['private query'] }), { kind: 'quota' });
        assert.equal(calls, 1);
        await assert.rejects(client.call('embeddings', {}), { kind: 'quota' }); assert.equal(calls, 1);
        assert.ok(!JSON.stringify(reports).includes('private')); assert.ok(!JSON.stringify(reports).includes('fixture-key'));
        clock += 60001; assert.deepEqual(await client.call('chat/completions', {}), { ok: true }); assert.equal(calls, 2);
    }
});

test('legacy insufficient_quota type is recognized without an error code', async () => {
    const client = createVibeOpenAI({ getKey: () => 'fixture', report: () => {}, request: async () => Response.json({ error: { type: 'insufficient_quota' } }, { status: 429 }) });
    await assert.rejects(client.call('chat/completions', {}), { kind: 'quota' });
});

test('ordinary rate limits remain transient and honor Retry-After', async () => {
    let calls = 0, clock = 1000;
    const client = createVibeOpenAI({ getKey: () => 'fixture', now: () => clock, report: () => {}, request: async () => { calls++; return Response.json({ error: { code: 'slow_down', type: 'rate_limit_error' } }, { status: 429, headers: { 'Retry-After': '90' } }); } });
    await assert.rejects(client.call('chat/completions', {}), { kind: 'busy', retryAfter: 90 });
    clock += 60000; await assert.rejects(client.call('embeddings', {}), { kind: 'busy', retryAfter: 30 }); assert.equal(calls, 1);
});

test('temporary server failures retry once; credentials and unsupported endpoints never fan out', async () => {
    let calls = 0, pauses = 0;
    const client = createVibeOpenAI({ getKey: () => 'fixture', pause: async () => { pauses++; }, request: async (_url, options) => { calls++; assert.equal(options.cache, 'no-store'); return calls === 1 ? Response.json({}, { status: 503 }) : Response.json({ choices: [] }); } });
    assert.deepEqual(await client.call('chat/completions', {}), { choices: [] }); assert.equal(calls, 2); assert.equal(pauses, 1);
    await assert.rejects(client.call('arbitrary-endpoint', {}), { kind: 'unavailable' }); assert.equal(calls, 2);
    const missing = createVibeOpenAI({ getKey: () => '', request: async () => { throw Error('must not call'); } });
    await assert.rejects(missing.call('chat/completions', {}), { kind: 'unavailable' });
});

test('authentication errors are safe and do not retry; provider raw text is never returned', async () => {
    let calls = 0;
    const client = createVibeOpenAI({ getKey: () => 'fixture', report: () => {}, request: async () => { calls++; return Response.json({ error: { message: 'secret credential and query' } }, { status: 401 }); } });
    await assert.rejects(client.call('chat/completions', {}), error => error.kind === 'unavailable' && !error.message.includes('secret'));
    await assert.rejects(client.call('embeddings', {}), { kind: 'unavailable' }); assert.equal(calls, 1);
});
