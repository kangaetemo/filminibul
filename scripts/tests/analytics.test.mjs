// No new test runner dependencies: compile the pure validation module in memory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
const js = ts.transpileModule(readFileSync(new URL('../../src/lib/analytics/schema.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseBatch, cleanQuery, cleanPath } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const event = (name, data) => ({ id: randomUUID(), visit_id: randomUUID(), name, path: '/film/603-matrix?q=private', data });
const batch = (events) => ({ session_id: randomUUID(), source: 'google', events });
test('accepts explicit film events and removes query strings/slugs/arbitrary fields', () => {
    const value = parseBatch(batch([event('film_opened', { film_id: 603, email: 'secret', ip: '127.0.0.1' })]));
    assert.equal(value.events[0].path, '/film/603');
    assert.deepEqual(value.events[0].data, { film_id: 603 });
});
test('rejects malformed batches, event names, IDs, ranks and required fields', () => {
    for (const value of [null, {}, batch([]), batch(Array(21).fill(event('page_view', {}))), batch([event('unknown', {})]), batch([event('film_opened', { film_id: -1 })]), batch([event('recommendation_clicked', { film_id: 603, rank: 1 })]), batch([event('search_performed', { result_count: 0 })]), batch([event('blend_completed', { source_film_id: 603, second_film_id: 603, result_count: 2 })])]) assert.equal(parseBatch(value), null);
    assert.equal(parseBatch({ ...batch([event('page_view',{})]), session_id:'bad' }), null);
});
test('sensitive-looking queries are redacted, counts are preserved', () => {
    for(const query of ['test@example.com','https://site.com','www.site.com','0532 123 45 67','12345678901']) {
        assert.equal(cleanQuery(query),undefined);
        const value=parseBatch(batch([event('search_performed',{query, result_count:0,context:'search',search_id:randomUUID()})]));
        assert.equal(value.events[0].data.result_count,0);assert.equal(value.events[0].data.query,undefined);
    }
    assert.equal(cleanQuery('  Matrix  1999 \n'), 'Matrix 1999');
    assert.equal(cleanQuery('x'.repeat(200)).length,120);
});
test('admin, arbitrary URLs and unknown moods are excluded', () => {
    for(const path of ['/admin','/admin/analytics','https://evil.com','/foo','/film/0','/mod/unknown']) assert.equal(cleanPath(path),null);
    assert.equal(cleanPath('/mod/korku'),'\/mod/korku');
    assert.equal(parseBatch(batch([event('mood_selected',{mood:'komedi-private'})])),null);
});
test('valid exposure and conversion carry matching source, target and rank', () => {
    const data={ film_id:604, source_film_id:603, rank:2, context:'similar' };
    assert.deepEqual(parseBatch(batch([event('recommendation_impression',data),event('recommendation_clicked',data)])).events.map(e=>e.data),[data,data]);
});
test('client respects opt-out and admin exclusions, deduplicates visits and rotates idle sessions', async () => {
    const schemaUrl=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
    const clientJs=ts.transpileModule(readFileSync(new URL('../../src/lib/analytics/client.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('from "./schema"',`from ${JSON.stringify(schemaUrl)}`);
    const old={window:globalThis.window,location:globalThis.location,document:globalThis.document,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),sessionStorage:globalThis.sessionStorage,addEventListener:globalThis.addEventListener,enabled:process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,now:Date.now};
    const storage=new Map();const sent=[];
    globalThis.window={};globalThis.location={pathname:'/',search:'',hostname:'filminibul.com'};
    globalThis.document={referrer:'https://www.google.com/search?q=never-store',visibilityState:'visible',addEventListener(){}};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'0',webdriver:false,sendBeacon(_url,blob){sent.push(blob);return true;}}});
    globalThis.sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.addEventListener=()=>{};
    const client=await import(`data:text/javascript;base64,${Buffer.from(clientJs).toString('base64')}`);
    try {
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED='false';client.track('page_view',{},'page');assert.equal(sent.length,0);
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED='true';navigator.doNotTrack='1';client.track('page_view');client.flush();assert.equal(sent.length,0);
        navigator.doNotTrack='0';navigator.globalPrivacyControl=true;client.track('page_view');client.flush();assert.equal(sent.length,0);
        navigator.globalPrivacyControl=false;location.pathname='/admin/analytics';client.track('page_view');client.flush();assert.equal(sent.length,0);
        location.pathname='/';client.track('page_view',{},'page');client.track('page_view',{},'page');client.flush();
        const first=JSON.parse(await sent[0].text());assert.equal(first.events.length,1);assert.equal(first.source,'google');assert.ok(parseBatch(first));
        location.pathname='/film/603-matrix';client.track('film_opened',{film_id:603},'page');client.flush();
        const second=JSON.parse(await sent[1].text());assert.equal(second.session_id,first.session_id);assert.notEqual(second.events[0].visit_id,first.events[0].visit_id);
        Date.now=()=>old.now()+31*60000;
        client.track('film_opened',{film_id:603},'page');client.flush();
        const third=JSON.parse(await sent[2].text());assert.notEqual(third.session_id,second.session_id);assert.notEqual(third.events[0].visit_id,second.events[0].visit_id);
    } finally {
        client.flush();Date.now=old.now;
        for(const key of ['window','location','document','sessionStorage','addEventListener']) {if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];}
        if(old.navigator)Object.defineProperty(globalThis,'navigator',old.navigator);else delete globalThis.navigator;
        if(old.enabled===undefined)delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED=old.enabled;
    }
});
