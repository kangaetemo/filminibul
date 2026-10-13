import test from 'node:test';
import assert from 'node:assert/strict';
import { createFilmSignalsStore } from '../../src/lib/filmSignalsStore.mjs';
import { createFilmSignalsStorage } from '../../src/lib/server/filmSignalsStorage.mjs';
import { createFilmSignalsHandler } from '../../src/lib/server/filmSignalsHandler.mjs';
import { createPersonalHandler } from '../../src/lib/server/personalHandler.mjs';
import { ownerPrefix } from '../../src/lib/server/watchlistStorage.mjs';
const op = (id, field, value) => ({ id, field, value });
const settle = () => new Promise(done => setImmediate(done));
function storageFixture() {
    const objects = new Map(), calls = []; let time = Date.parse('2026-10-13T12:00:00Z');
    const options = { url: 'https://private.invalid', key: 'secret-fixture', request: async (url, init) => {
        calls.push({ url, init });
        if (url.includes('/bucket/')) return Response.json({ public: false });
        if (url.includes('/object/list/')) {
            const { prefix, offset, limit } = JSON.parse(init.body);
            const items = [...objects].filter(([name]) => name.startsWith(prefix)).sort(([a],[b]) => a.localeCompare(b)).map(([name, item]) => ({ name: name.slice(prefix.length), updated_at: item.at }));
            return Response.json(items.slice(offset, offset + limit));
        }
        if (url.includes('/object/member-watchlists/') && init.method === 'POST') {
            const path = url.split('/object/member-watchlists/')[1];
            objects.set(path, { body: JSON.parse(init.body), at: new Date(++time).toISOString() }); return Response.json({ Key: path });
        }
        throw Error('unexpected request');
    }};
    return { options, calls, objects };
}
test('private storage merges independent devices/fields; reactions and resets follow server time without film downloads', async () => {
    const f = storageFixture(), a = createFilmSignalsStorage(f.options), b = createFilmSignalsStorage(f.options);
    await a.set('A', op(603, 'watched', true));
    await b.set('A', op(603, 'reaction', 'liked'));
    assert.deepEqual(await a.list('A'), [{ id:603, watched:true, reaction:'liked' }]);
    await a.set('A', op(603, 'reaction', 'disliked'));
    await b.set('A', op(7, 'watched', true));
    await a.set('A', op(603, 'reaction', null));
    assert.deepEqual((await a.list('A')).find(r => r.id === 603), { id:603, watched:true, reaction:null });
    await b.set('A', op(603, 'reaction', 'liked'));
    await b.set('A', op(603, 'watched', false));
    assert.deepEqual((await a.list('A')).find(r => r.id === 603), { id:603, watched:false, reaction:'liked' });
    assert.deepEqual(await a.list('B'), []);
    assert.ok(f.calls.every(c => !c.url.includes('/object/authenticated/')));
    assert.ok(f.calls.filter(c => c.init.headers['x-upsert']).every(c => c.init.headers['x-upsert'] === 'true'));
    assert.ok([...f.objects.keys()].every(path => path.startsWith(ownerPrefix('A') + '/signals/')));
    assert.ok(f.objects.size <= 7);
});
test('storage paginates bounded markers, rejects corrupt timestamps and fails closed on public buckets', async () => {
    const f = storageFixture();
    for (let id = 1; id <= 501; id++) for (const token of ['watched','liked']) f.objects.set(`${ownerPrefix('A')}/signals/${id}.${token}.json`, {at:'2026-10-13T12:00:00Z'});
    const storage = createFilmSignalsStorage(f.options);
    assert.equal((await storage.list('A')).length, 501);
    assert.equal(f.calls.filter(c => c.url.includes('/object/list/')).length, 2);
    f.objects.set(`${ownerPrefix('A')}/signals/1.liked.json`, {at:'invalid'});
    await assert.rejects(() => storage.list('A'), { code:'signals_unavailable' });
    const publicStorage = createFilmSignalsStorage({url:'https://private.invalid',key:'fixture',request:async()=>Response.json({public:true})});
    await assert.rejects(() => publicStorage.set('A',op(1,'watched',true)), {code:'watchlist_not_private'});
});
const request = (method = 'GET', body, headers = {}) => new Request('https://filminibul.com/api/member/film-signals?uid=B', { method, headers:{authorization:'Bearer A',origin:'https://filminibul.com','content-type':'application/json',...headers}, ...(body !== undefined && {body:JSON.stringify(body)}) });
test('signals API authenticates, enforces origin/body/enum limits, and cannot select another owner', async () => {
    const f = storageFixture();
    const verify = async auth => { if (auth !== 'Bearer A') throw Object.assign(Error('private-token'),{code:'sign_in_required',status:401}); return 'A'; };
    const handle = createFilmSignalsHandler({ verify, storage:createFilmSignalsStorage(f.options) });
    for (const [req, expected] of [[request('GET',undefined,{authorization:''}),401],[request('PUT',op(603,'watched',true),{origin:'https://evil.test'}),403],[request('PUT',op(603,'reaction','bad')),400],[request('PUT',{...op(603,'watched',true),extra:'x'.repeat(2000)}),413]]) assert.equal((await handle(req)).status,expected);
    assert.equal(f.calls.length,0);
    assert.equal((await handle(request('PUT',{...op(603,'reaction','liked'),uid:'B',path:'evil'}))).status,200);
    const response = await handle(request());
    assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('vary'),'Authorization');
    assert.deepEqual(await response.json(),{records:[{id:603,watched:false,reaction:'liked'}]});
    assert.ok([...f.objects.keys()].every(path => path.startsWith(ownerPrefix('A'))));
});
function clientFixture() {
    const data = new Map(), profiles = new Map(); let number=0, fail=false, blocker=null;
    const store = createFilmSignalsStore({read:k=>data.get(k)||null,write:(k,v)=>data.set(k,v),nonce:()=>String(++number),cloud:async(uid,method,payload)=>{
        if (blocker) await blocker;
        if(fail)throw Object.assign(Error('offline'),{code:'signals_unavailable'});
        const records=profiles.get(uid)||[];
        if(method==='GET')return {records};
        const existing=records.find(r=>r.id===payload.id)||{id:payload.id,watched:false,reaction:null};
        profiles.set(uid,[{...existing,[payload.field]:payload.value},...records.filter(r=>r.id!==payload.id)]);return {updated:true};
    }});
    return {store,data,profiles,fail:v=>{fail=v;},block:p=>{blocker=p;}};
}
test('offline field writes survive restart/refresh and rapid opposite intent; switching accounts never leaks results',async()=>{
    const f=clientFixture();f.store.setMember('A');await settle();
    f.fail(true);f.store.set(op(603,'watched',true));f.store.set(op(603,'reaction','liked'));await settle();
    assert.equal(f.store.getSnapshot().phase,'error');assert.equal(f.store.getSnapshot().pendingIds[0],603);
    f.fail(false);await f.store.refresh();assert.deepEqual(f.profiles.get('A'),[{id:603,watched:true,reaction:'liked'}]);
    let release;f.block(new Promise(done=>{release=done;}));
    f.store.set(op(603,'reaction','disliked'));f.store.set(op(603,'reaction',null));
    release();f.block(null);await settle();await f.store.refresh();assert.equal(f.profiles.get('A')[0].reaction,null);
    f.store.setMember('B');assert.deepEqual(f.store.getSnapshot().records,[]);await settle();
    f.store.set(op(9,'reaction','liked'));await settle();assert.equal(f.store.getSnapshot().records[0].id,9);
    f.store.setMember('A');await settle();assert.equal(f.store.getSnapshot().records[0].id,603);
});
test('in-flight old-account writes/reads cannot replace a new account or its queue',async()=>{
    const f=clientFixture();f.store.setMember('A');await settle();let release;
    f.block(new Promise(done=>{release=done;}));f.store.set(op(603,'watched',true));f.store.setMember('B');
    release();f.block(null);await settle();
    assert.equal(f.store.getSnapshot().member,'B');assert.deepEqual(f.store.getSnapshot().records,[]);assert.deepEqual(f.store.getSnapshot().pendingIds,[]);
    f.store.setMember('A');await settle();await f.store.refresh();assert.equal(f.store.getSnapshot().records[0].watched,true);
});
test('unavailable browser storage retains queued changes in memory and reports persistence',async()=>{
    let offline=true;
    const store=createFilmSignalsStore({read:()=>{throw Error('blocked');},write:()=>{throw Error('blocked');},nonce:()=> '1',cloud:async(_,method)=>{if(offline)throw Error();return method==='GET'?{records:[{id:1,watched:true,reaction:null}]}:{updated:true};}});
    store.setMember('A');await settle();assert.equal(store.set(op(1,'watched',true)),true);await settle();
    assert.equal(store.getSnapshot().persistent,false);assert.equal(store.getSnapshot().records[0].watched,true);
    offline=false;await store.refresh();assert.equal(store.getSnapshot().pendingIds.length,0);assert.equal(store.getSnapshot().records[0].watched,true);
});
test('personal cache rereads verified feedback; a reaction change invalidates the same saved-list result',async()=>{
    let feedback=[],count=0;const owners=[];
    const handle=createPersonalHandler({verify:async()=> 'A',storage:{list:async()=>[{id:603}]},signals:{list:async uid=>{owners.push(uid);return feedback;}},recommend:async(ids,signals)=>({partial:false,ids,signals,version:++count})});
    const req=()=>new Request('https://filminibul.com/api/member/recommendations?uid=B');
    await handle(req());await handle(req());assert.equal(count,1);
    feedback=[{id:603,watched:false,reaction:'disliked'}];const result=await(await handle(req())).json();
    assert.equal(count,2);assert.equal(result.signals[0].reaction,'disliked');assert.deepEqual(owners,['A','A','A']);
});
