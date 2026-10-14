import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createWatchlistStore } from '../../src/lib/watchlistStore.mjs';
import { GUEST_KEY, accountKey, pendingKey } from '../../src/lib/watchlistModel.mjs';
const film = id => ({id, title:`Film ${id}`, year:2000, rating:7, genres:['Drama'], posterUrl:null});
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => {resolve=r;}); return {promise, resolve}; };
function fixture() {
    const disk = new Map(), remote = new Map(), calls = [];
    let offline = false, failWrites = false, failImport = null;
    const cloud = async (uid, method, payload) => {
        calls.push({uid,method,payload});
        if (offline) throw Object.assign(new Error(), {code:'watchlist_unavailable'});
        const list = remote.get(uid) || new Map(); remote.set(uid,list);
        if (method==='GET') return {films:[...list.values()]};
        if (method==='PUT') list.set(payload.id,payload);
        if (method==='DELETE') list.delete(payload);
        if (method==='POST') {const importedIds=[],failedIds=[];for(const f of payload) {if(f.id===failImport) failedIds.push(f.id);else {list.set(f.id,f);importedIds.push(f.id);}}return {importedIds,failedIds};}
        return {};
    };
    const make = custom => createWatchlistStore({read:k=>disk.get(k) ?? null,write:(k,v)=>{if(failWrites)throw Error();disk.set(k,v);},cloud:custom||cloud,nonce:randomUUID});
    return {disk,remote,calls,cloud,make,offline:value=>offline=value,failWrites:value=>failWrites=value,failImport:value=>failImport=value};
}
test('guest list stays separate on sign-in; importing deduplicates and removes only acknowledged films',async()=>{
    const f=fixture();f.disk.set(GUEST_KEY,JSON.stringify([film(1),film(2),film(3)]));f.remote.set('A',new Map([[1,film(1)]]));
    const s=f.make();s.setMember(null);assert.equal(s.getSnapshot().films.length,3);
    s.setMember('A');await s.refresh();assert.deepEqual(s.getSnapshot().films.map(f=>f.id),[1]);assert.equal(s.getSnapshot().localCount,3);
    f.failImport(2);await s.importLocal();assert.deepEqual(JSON.parse(f.disk.get(GUEST_KEY)).map(f=>f.id),[2]);
    assert.equal(f.remote.get('A').size,2);assert.deepEqual(s.getSnapshot().importNotice,{imported:2,remaining:1});
    f.failImport(null);await s.importLocal();assert.equal(f.remote.get('A').size,3);assert.equal(s.getSnapshot().localCount,0);
});
test('failed cloud writes survive reload and replay before stale reads',async()=>{
    const f=fixture(), s=f.make();f.remote.set('A',new Map([[1,film(1)]]));s.setMember('A');await s.refresh();
    f.offline(true);s.toggle(film(1));s.toggle(film(2));await tick();assert.equal(s.getSnapshot().phase,'error');
    assert.deepEqual(s.getSnapshot().films.map(f=>f.id),[2]);assert.equal(JSON.parse(f.disk.get(pendingKey('A'))).length,2);
    const reloaded=f.make();reloaded.setMember('A');await reloaded.refresh();assert.deepEqual(reloaded.getSnapshot().films.map(f=>f.id),[2]);
    f.offline(false);await reloaded.refresh();assert.deepEqual([...f.remote.get('A').keys()],[2]);assert.equal(reloaded.getSnapshot().pendingIds.length,0);
});
test('account switch ignores an old read and restores the independent guest list',async()=>{
    const f=fixture(), held=deferred();f.disk.set(GUEST_KEY,JSON.stringify([film(9)]));
    const s=f.make((uid,method,payload)=>uid==='A'&&method==='GET'?held.promise:f.cloud(uid,method,payload));
    s.setMember('A');s.setMember('B');await s.refresh();held.resolve({films:[film(1)]});await tick();
    assert.equal(s.getSnapshot().member,'B');assert.deepEqual(s.getSnapshot().films,[]);assert.equal(f.disk.has(accountKey('B')),true);
    s.setMember(null);assert.deepEqual(s.getSnapshot().films.map(f=>f.id),[9]);
});
test('account switch ignores old write/import results and keeps old pending writes scoped',async()=>{
    const f=fixture(), held=deferred();f.disk.set(GUEST_KEY,JSON.stringify([film(8)]));
    let hold=false;const s=f.make((uid,method,payload)=>hold&&uid==='A'&&method!=='GET'?held.promise:f.cloud(uid,method,payload));
    s.setMember('A');await s.refresh();hold=true;s.toggle(film(1));await tick();s.setMember('B');await s.refresh();held.resolve({id:1,saved:true});await tick();
    assert.equal(s.getSnapshot().member,'B');assert.equal(s.getSnapshot().films.length,0);assert.equal(JSON.parse(f.disk.get(pendingKey('A'))).length,1);
    const heldImport=deferred();const importer=f.make((uid,method,payload)=>method==='POST'?heldImport.promise:f.cloud(uid,method,payload));
    importer.setMember('A');await importer.refresh();const task=importer.importLocal();await tick();importer.setMember('B');await importer.refresh();heldImport.resolve({importedIds:[8],failedIds:[]});await task;
    assert.equal(JSON.parse(f.disk.get(GUEST_KEY))[0].id,8);assert.equal(importer.getSnapshot().member,'B');
});
test('rapid opposite clicks send the final intent after the in-flight save',async()=>{
    const f=fixture(), held=deferred();let first=true;
    const s=f.make(async(uid,method,payload)=>{if(method==='PUT'&&first){first=false;await held.promise;}return f.cloud(uid,method,payload);});
    s.setMember('A');await s.refresh();s.toggle(film(1));s.toggle(film(1));held.resolve();await tick();await s.refresh();
    assert.equal(f.remote.get('A').has(1),false);assert.equal(s.getSnapshot().films.length,0);assert.equal(s.getSnapshot().pendingIds.length,0);
});
test('a read racing with a completed write cannot erase the saved film',async()=>{
    const f=fixture(), held=deferred();let hold=false;
    const s=f.make((uid,method,payload)=>{if(method==='GET'&&hold){hold=false;return held.promise;}return f.cloud(uid,method,payload);});
    s.setMember('A');await s.refresh();hold=true;const read=s.refresh();s.toggle(film(1));await tick();held.resolve({films:[]});await read;
    assert.deepEqual(s.getSnapshot().films.map(f=>f.id),[1]);
});
test('two devices add independent films without replacing the other device’s list',async()=>{
    const f=fixture(), a=f.make(), b=f.make();a.setMember('A');b.setMember('A');await Promise.all([a.refresh(),b.refresh()]);
    a.toggle(film(1));b.toggle(film(2));await tick();await Promise.all([a.refresh(),b.refresh()]);
    assert.deepEqual(new Set(a.getSnapshot().films.map(f=>f.id)),new Set([1,2]));assert.deepEqual(new Set(b.getSnapshot().films.map(f=>f.id)),new Set([1,2]));
});
test('blocked browser storage keeps this-session choices and pending changes in memory',async()=>{
    const f=fixture(),s=f.make();f.failWrites(true);s.setMember(null);assert.equal(s.toggle(film(1)).blocked,true);assert.equal(s.getSnapshot().films.length,0);
    s.setMember('A');await s.refresh();f.offline(true);s.toggle(film(3));await tick();assert.equal(s.getSnapshot().pendingIds[0],3);
    f.offline(false);await s.refresh();assert.equal(f.remote.get('A').has(3),true);assert.equal(s.getSnapshot().pendingIds.length,0);
});

test('unresolved and guest saves are blocked without writing or clearing legacy records', async () => {
    const f=fixture(), s=f.make();
    assert.equal(s.toggle(film(1)).blocked,true);
    f.disk.set(GUEST_KEY,JSON.stringify([film(9)]));
    s.setMember(null);
    const before=new Map(f.disk);
    assert.equal(s.toggle(film(1)).blocked,true);
    assert.equal(s.toggle(film(9)).blocked,true);
    assert.deepEqual(f.disk,before); assert.deepEqual(f.calls,[]);
    s.setMember('A'); await s.refresh(); await s.importLocal();
    assert.equal(f.remote.get('A').has(9),true);
    s.setMember(null);
    assert.equal(s.toggle(film(2)).blocked,true);
});
