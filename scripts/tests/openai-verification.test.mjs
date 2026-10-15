import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyOpenAI } from '../catalog/verify_openai.mjs';

test('verification makes at most two bounded calls and never exports key, text or vectors', async () => {
    const calls = [];
    const report = await verifyOpenAI({ apiKey: 'private-fixture-key', request: async (url, options) => {
        calls.push({ url, body: JSON.parse(options.body) });
        return url.endsWith('embeddings') ? Response.json({ model: 'text-embedding-3-large', data: [{ embedding: Array(1536).fill(0.001) }], usage: { prompt_tokens: 5 } }) : Response.json({ model: 'gpt-4.1-mini', choices: [{ finish_reason: 'stop', message: { content: 'OK' } }], usage: { prompt_tokens: 10, completion_tokens: 1 } });
    } });
    assert.equal(report.status, 'passed'); assert.equal(calls.length, 2);
    assert.equal(calls[0].body.max_tokens, 8); assert.equal(calls[1].body.dimensions, 1536);
    assert.ok(Math.abs(report.estimated_usd - 0.00000625) < 1e-12);
    for (const secret of ['private-fixture-key', 'Reply OK.', '0.001', 'Film search verification.']) assert.ok(!JSON.stringify(report).includes(secret));
});
test('quota and authentication stop immediately; missing credentials make no calls', async () => {
    for (const [code, status, expected] of [['insufficient_quota', 429, 'quota_error'], ['invalid_api_key', 401, 'authentication_error']]) {
        let calls = 0;
        const report = await verifyOpenAI({ apiKey: 'fixture', request: async () => { calls++; return Response.json({ error: { code, message: 'private-fixture-key' } }, { status }); } });
        assert.equal(report.status, expected); assert.equal(calls, 1); assert.ok(!JSON.stringify(report).includes('private-fixture-key'));
    }
    const report = await verifyOpenAI({ apiKey: '', request: () => { throw Error('must not call'); } });
    assert.equal(report.status, 'not_configured');
});
test('invalid / truncated output or missing usage cannot count as a pass', async () => {
    const report = await verifyOpenAI({ apiKey: 'fixture', request: async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: 'O' } }] }) });
    assert.equal(report.status, 'invalid_response'); assert.equal(report.requests.length, 1);
    assert.equal(report.requests[0].estimated_usd, null);
});
