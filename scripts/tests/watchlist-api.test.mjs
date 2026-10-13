import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatchlistHandler } from '../../src/lib/server/watchlistHandler.mjs';
import { createWatchlistStorage, ownerPrefix } from '../../src/lib/server/watchlistStorage.mjs';
import { savedFilm } from '../../src/lib/watchlistModel.mjs';
const film=id=>({id,title:`Film ${id}`,year:2000,rating:7,genres:[],posterUrl:null});
const request=(method,body,extra={})=>new Request('https://filminibul.com/api/member/watchlist'+(method==='DELETE'?'?id=1&uid=B':''),{method,headers:{authorization:'Bearer A',origin:'https://filminibul.com','content-type':'application/json',...extra},...(body!==undefined&&{body:JSON.stringify(body)})});
function fixture() {
    const calls=[],lists=new Map([['A',new Map()],['B',new Map([[1,film(1)]])]]);
    const storage={list:async uid=>{calls.push(['list',uid]);return [...(lists.get(uid)||[]).keys()].map(id=>({id}));},save:async(uid,f)=>{calls.push(['save',uid,f.id]);if(f.id===99)throw Error('secret');lists.get(uid).set(f.id,f);},remove:async(uid,id)=>{calls.push(['remove',uid,id]);lists.get(uid).delete(id);},readFilm:async(uid,id)=>{calls.push(['read',uid,id]);return lists.get(uid).get(id);}};
    const verify=async auth=>{if(auth!=='Bearer A')throw Object.assign(Error('secret'),{code:'sign_in_required',status:401});return 'A';};
    return {calls,lists,handle:createWatchlistHandler({verify,storage,loadFilms:async()=>[]})};
}
test('authorization is required before storage, responses never cache private data',async()=>{
    const f=fixture();const r=await f.handle(request('GET',undefined,{authorization:''}));assert.equal(r.status,401);assert.deepEqual(f.calls,[]);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.get('vary'),'Authorization');assert.deepEqual(await r.json(),{error:'sign_in_required'});
});
test('only verified UID controls save/read/delete; body and query UID cannot select another list',async()=>{
    const f=fixture();assert.equal((await f.handle(request('PUT',{...film(1),uid:'B',bucket:'public'}))).status,200);
    assert.deepEqual(await(await f.handle(request('GET'))).json(),{films:[film(1)]});
    await f.handle(request('DELETE'));assert.equal(f.lists.get('A').size,0);assert.equal(f.lists.get('B').size,1);assert.ok(f.calls.every(call=>call[1]==='A'));
});
test('mutations reject cross-origin, oversized, malformed and untrusted poster data without writes',async()=>{
    const f=fixture();assert.equal((await f.handle(request('PUT',film(1),{origin:'https://evil.test'}))).status,403);
    assert.equal((await f.handle(request('PUT',{...film(1),posterUrl:'https://evil.test/image.jpg'}))).status,400);
    assert.equal((await f.handle(request('PUT',{...film(1),title:'x'.repeat(9000)}))).status,413);
    assert.equal((await f.handle(request('POST',{films:[]}))).status,400);assert.deepEqual(f.calls,[]);
    assert.equal(savedFilm({...film(1),posterUrl:'https://image.tmdb.org.evil.test/t/p/a.jpg'}),null);
});
test('partial import acknowledges successful unique films and exposes no server errors',async()=>{
    const f=fixture();const r=await f.handle(request('POST',{films:[film(1),film(1),film(99)]}));assert.equal(r.status,200);assert.deepEqual(await r.json(),{importedIds:[1],failedIds:[99]});assert.equal(f.calls.filter(c=>c[0]==='save'&&c[2]===1).length,1);
});
test('private Storage uses hashed owner paths, paginates and never upserts an existing save',async()=>{
    const calls=[];const prefix=ownerPrefix('A');const storage=createWatchlistStorage({url:'https://storage.test',key:'fixture-key',request:async(url,init)=>{
        calls.push({url,init});if(url.includes('/bucket/'))return Response.json({public:false});
        if(url.includes('/object/list/')){const {prefix:p,offset}=JSON.parse(init.body);assert.equal(p,prefix+'/');return Response.json(Array.from({length:offset===0?100:1},(_,i)=>({name:`${offset+i+1}.json`,created_at:'2026-10-13'})));}
        if(init.method==='DELETE')return Response.json([]);
        if(init.method==='POST')return Response.json({statusCode:409,message:'Already exists'},{status:400});
        return Response.json(film(1));
    }});
    assert.equal((await storage.list('A')).length,101);await storage.save('A',film(1));await storage.remove('A',1);assert.equal((await storage.readFilm('A',1)).id,1);
    const upload=calls.find(c=>c.url.endsWith(`/${prefix}/1.json`)&&c.init.method==='POST');assert.equal(upload.init.headers['x-upsert'],'false');
    const del=calls.find(c=>c.init.method==='DELETE');assert.deepEqual(JSON.parse(del.init.body),{prefixes:[`${prefix}/1.json`]});assert.notEqual(ownerPrefix('A'),ownerPrefix('B'));
});
test('a public bucket fails closed for read, save and delete',async()=>{
    const calls=[];const storage=createWatchlistStorage({url:'https://storage.test',key:'key',request:async(url)=>{calls.push(url);return Response.json({public:true});}});
    for(const action of [()=>storage.list('A'),()=>storage.save('A',film(1)),()=>storage.remove('A',1),()=>storage.readFilm('A',1)]) await assert.rejects(action,{code:'watchlist_not_private'});
    assert.ok(calls.every(url=>url.includes('/bucket/')));
});
