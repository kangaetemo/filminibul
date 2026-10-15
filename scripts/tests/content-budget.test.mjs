import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpendMeter, translationSourceIssue } from '../catalog/content_budget.mjs';
import { createTranslator, TranslationPaused } from '../catalog/translate_overview.mjs';

test('simultaneous calls reserve output ceilings before network; zero budget makes no calls', async () => {
    const meter = createSpendMeter(0.004);
    const a = meter.reserve({ max_tokens: 1800, messages: ['source'] });
    assert.ok(a); assert.equal(meter.reserve({ max_tokens: 1800, messages: ['second'] }), null);
    a.settle({ prompt_tokens: 20, completion_tokens: 10 });
    assert.ok(meter.reserve({ max_tokens: 1800, messages: ['second'] }));
    let calls = 0;
    const translate = createTranslator({ apiKey: 'fixture', maxUsd: 0, request: async () => { calls++; throw Error('must not call'); } });
    await assert.rejects(translate('A source synopsis.', 'Title'), e => e instanceof TranslationPaused && e.reason === 'budget_limit');
    assert.equal(calls, 0);
});
test('timeouts and missing usage retain conservative charge and cannot exhaust the budget through retries', async () => {
    let calls = 0;
    const translate = createTranslator({ apiKey: 'fixture', maxUsd: 0.005, request: async () => { calls++; throw Error('network timeout'); }, wait: async () => {} });
    await assert.rejects(translate('A source synopsis.', 'Title'), e => e.reason === 'budget_limit');
    assert.equal(calls, 1); assert.equal(translate.stats().uncertain_requests, 1); assert.equal(translate.stats().reserved_usd, 0);
    assert.ok(translate.stats().estimated_usd <= 0.005);
});
test('actual usage settles once and includes invalid translations that required another charged attempt', async () => {
    let calls = 0;
    const translate = createTranslator({ apiKey: 'fixture', maxUsd: 0.02, wait: async () => {}, request: async () => {
        calls++; return Response.json({ usage: { prompt_tokens: 100, completion_tokens: 30 }, choices: [{ finish_reason: calls === 1 ? 'length' : 'stop', message: { content: JSON.stringify({ overview: 'Bir genç adam ailesini bulmak için yola çıkar.' }) } }] });
    } });
    assert.equal(await translate('A source synopsis.', 'Title'), 'Bir genç adam ailesini bulmak için yola çıkar.');
    assert.equal(calls, 2); assert.equal(translate.stats().prompt_tokens, 200); assert.equal(translate.stats().completion_tokens, 60);
    assert.equal(translate.stats().reserved_usd, 0);
});
test('placeholders and metadata labels are identified without rejecting genuine short story descriptions', () => {
    for (const s of ['\\', 'Details Here', 'Plot TBA.', 'Hong Kong movie', '1999 Japanese short film', 'Pink film directed by Example.', 'Original video.']) assert.ok(translationSourceIssue(s), s);
    for (const s of ['Bigfoot steals the mail!', 'A couple flee their home after a disaster.', 'A picturesque sketch of flowers.']) assert.equal(translationSourceIssue(s), null, s);
});
