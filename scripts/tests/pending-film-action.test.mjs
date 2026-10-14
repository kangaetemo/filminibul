import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPendingFilmAction } from '../../src/lib/auth/pendingFilmAction.mjs';
import { createWatchlistStore } from '../../src/lib/watchlistStore.mjs';
import { createFilmSignalsStore } from '../../src/lib/filmSignalsStore.mjs';
const film={id:603,title:'Matrix',year:1999,rating:8,genres:[],posterUrl:null};
const view=(extra={})=>({ready:true,member:'A',phase:'synced',pendingIds:[],films:[],records:[],...extra});
test('login, fresh cloud read and acknowledgment are required; repeated effects submit once',()=>{
    for(const kind of ['save','watched','liked','disliked']) {
        const c=createPendingFilmAction(),r=c.request(film,kind),calls=[];
        const h={save:f=>{calls.push(f);return {blocked:false};},signal:op=>{calls.push(op);return true;}};
        assert.equal(c.advance(r,view(),view(),h),'login');assert.deepEqual(calls,[]);
        c.authenticate(r,'A');
        assert.equal(c.advance(r,view({phase:'syncing'}),view({phase:'syncing'}),h),'waiting');assert.deepEqual(calls,[]);
        assert.equal(c.advance(r,view(),view(),h),'waiting');assert.equal(calls.length,1);
        const pending=view({phase:'syncing',pendingIds:[603]});
        assert.equal(c.advance(r,pending,pending,h),'waiting');assert.equal(calls.length,1);
        assert.equal(c.advance(r,view(),view(),h),'done');assert.equal(calls.length,1);
    }
});
test('existing saved or signalled films are not toggled off after sign-in',()=>{
    for(const kind of ['save','watched','liked','disliked']) {
        const c=createPendingFilmAction(),r=c.request(film,kind);c.authenticate(r,'A');
        const existing=view({films:[film],records:[{id:603,watched:true,reaction:kind}]});
        assert.equal(c.advance(r,existing,existing,{save:()=>assert.fail(),signal:()=>assert.fail()}),'done');
    }
});
test('closed prompt, replaced request and account switches reject late login/action responses',()=>{
    const c=createPendingFilmAction(),r=c.request(film,'save');c.cancel();
    assert.equal(c.authenticate(r,'A'),false);
    assert.equal(c.advance(r,view(),view(),{}),'cancelled');
    const current=c.request(film,'watched');assert.equal(c.authenticate(r,'A'),false);
    c.authenticate(current,'A');assert.equal(c.advance(current,view({member:'B'}),view({member:'B'}),{}),'account_changed');
    assert.equal(c.advance(current,view({phase:'loading'}),view({phase:'loading'}),{}),'waiting');
    assert.equal(c.advance(current,view({member:null}),view({member:null}),{}),'account_changed');
});
test('failed cloud sync cannot show success and retries do not duplicate the submitted intent',()=>{
    const c=createPendingFilmAction(),r=c.request(film,'save'),calls=[];c.authenticate(r,'A');
    const h={save:()=>{calls.push(1);return {blocked:false};}};
    assert.equal(c.advance(r,view({phase:'error'}),view(),h),'error');assert.equal(calls.length,0);
    assert.equal(c.advance(r,view(),view(),h),'waiting');assert.equal(calls.length,1);
    assert.equal(c.advance(r,view({phase:'error',pendingIds:[603]}),view(),h),'error');
    assert.equal(c.advance(r,view(),view(),h),'done');assert.equal(calls.length,1);
});
test('real watchlist/signals stores complete pending intents and preserve independent preferences',async()=>{
    for(const kind of ['save','watched','liked','disliked']) {
        const disk=new Map(),calls=[];
        const options={read:k=>disk.get(k)??null,write:(k,v)=>disk.set(k,v),nonce:randomUUID,
            cloud:async(uid,method,payload)=>{calls.push({uid,method,payload});return {films:[],records:[]};}};
        const saved=createWatchlistStore(options),signals=createFilmSignalsStore(options);
        saved.setMember(null);signals.setMember(null);
        const c=createPendingFilmAction(),r=c.request(film,kind),h={save:saved.toggle,signal:signals.set};
        assert.equal(c.advance(r,saved.getSnapshot(),signals.getSnapshot(),h),'login');assert.deepEqual(calls,[]);
        c.authenticate(r,'A');saved.setMember('A');signals.setMember('A');await Promise.all([saved.refresh(),signals.refresh()]);
        assert.equal(c.advance(r,saved.getSnapshot(),signals.getSnapshot(),h),'waiting');
        await new Promise(resolve=>setImmediate(resolve));
        assert.equal(c.advance(r,saved.getSnapshot(),signals.getSnapshot(),h),'done');
        assert.equal(calls.filter(c=>c.method==='PUT').length,1);
        if(kind==='save') assert.equal(saved.getSnapshot().films[0].id,603);
        else {const record=signals.getSnapshot().records[0];assert.equal(record.watched,kind==='watched');assert.equal(record.reaction,kind==='watched'?null:kind);}
    }
});
