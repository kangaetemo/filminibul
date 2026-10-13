import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { EMBEDDING_DIMS } from '../../src/lib/recommend/embeddingDoc.mjs';
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


test('real vibe flow stops chat/embedding quota, preserves cached results and resumes after pause', async () => {
    const oldFetch = globalThis.fetch, oldNow = Date.now, oldWarn = console.warn;
    const oldEnv = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
    let clock = 1000, mode = 'chat-quota'; const calls = [], warnings = [];
    Date.now = () => clock; console.warn = (...values) => warnings.push(values);
    process.env.OPENAI_API_KEY = 'fixture-only'; process.env.SUPABASE_URL = 'https://catalog.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
    globalThis.fetch = async url => {
        calls.push(url);
        if (url.endsWith('/chat/completions')) return mode === 'chat-quota'
            ? Response.json({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota', message: 'private query' } }, { status: 429 })
            : Response.json({ choices: [{ message: { content: 'Genres: Science Fiction\nThemes: space travel\nStory: A crew in space.' } }] });
        if (url.endsWith('/embeddings')) return mode === 'embedding-quota'
            ? Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 })
            : Response.json({ data: [{ embedding: Array(EMBEDDING_DIMS).fill(.01) }] });
        if (url.includes('/rpc/vibe_search_v3')) return Response.json([]);
        throw Error('unexpected external request');
    };
    try {
        const { vibeSearch } = await import(moduleUrl(resolve(root, 'lib/recommend/vibe.ts')));
        await assert.rejects(vibeSearch('uzayda geçen bir gerilim', 'fixture-ip'), { code: 'vibe_service_unavailable', status: 503 });
        assert.equal(calls.length, 1);
        for (let i = 0; i < 10; i++) await assert.rejects(vibeSearch(`uzayda gerilim ${i}`, 'fixture-ip'), { code: 'vibe_service_unavailable', status: 503 });
        assert.equal(calls.length, 1);
        clock += 60001; mode = 'healthy';
        const cached = await vibeSearch('umutlu bir uzay hikayesi', 'fixture-ip'); assert.deepEqual(cached.films, []);
        assert.equal(calls.length, 4);
        mode = 'embedding-quota';
        await assert.rejects(vibeSearch('farklı bir uzay hikayesi', 'fixture-ip'), { code: 'vibe_service_unavailable', status: 503 });
        assert.equal(calls.length, 6); assert.equal(calls.filter(url => url.includes('/rpc/')).length, 1);
        assert.deepEqual(await vibeSearch('UMUTLU   bir uzay hikayesi', 'fixture-ip'), cached); assert.equal(calls.length, 6);
        assert.ok(!JSON.stringify(warnings).includes('private query')); assert.ok(!JSON.stringify(warnings).includes('fixture-only'));
    } finally {
        globalThis.fetch = oldFetch; Date.now = oldNow; console.warn = oldWarn;
        for (const [key, value] of Object.entries(oldEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
});
