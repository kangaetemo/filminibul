import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// analytics.ts yalnız sunucuda çalışır ("server-only"); saf yardımcıları test etmek için o import çıkarılır.
const source = readFileSync(new URL('../../src/lib/server/analytics.ts', import.meta.url), 'utf8').replace('import "server-only";', '');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { analyticsRange, rangeQuery, rawStartFilter, rawStartLabel } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('range parameter: 24 hours or an allowed day count, 7 days otherwise', () => {
    assert.deepEqual(analyticsRange({ hours: '24' }), { hours: 24 });
    assert.deepEqual(analyticsRange({ days: '30' }), { days: 30 });
    for (const params of [{}, { days: '5' }, { hours: '12' }, { days: 'abc' }, undefined]) assert.deepEqual(analyticsRange(params), { days: 7 });
    assert.deepEqual(rangeQuery({ hours: 24 }), { hours: '24' });
    assert.deepEqual(rangeQuery({ days: 90 }), { days: '90' });
});

test('raw start: day reports keep the Turkey-midnight filter, hour reports use the exact instant', () => {
    assert.equal(rawStartFilter('2026-10-18'), 'gte.2026-10-18T00:00:00+03:00');
    assert.equal(rawStartFilter('2026-10-17T19:00:00+00:00'), 'gte.2026-10-17T19:00:00.000Z');
    assert.equal(rawStartFilter('2026-10-17T22:00:00+03:00'), 'gte.2026-10-17T19:00:00.000Z');
    for (const bad of ['', '2026-10-18; drop', 'gte.2026-10-18', '2026-13-45T99:00:00Z', 'yesterday']) assert.equal(rawStartFilter(bad), null, bad);
});

test('raw start label is shown in Turkey time', () => {
    assert.equal(rawStartLabel('2026-10-18'), '2026-10-18');
    assert.match(rawStartLabel('2026-10-17T19:00:00+00:00'), /17\.10\.2026 22:00/);
});
