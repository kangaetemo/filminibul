import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
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

process.env.SUPABASE_URL = 'https://catalog.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';

const { blendFilms } = await import(moduleUrl(resolve(root, 'lib/recommend/blend.ts')));
const vec = (a,b) => [a,b,...Array(1534).fill(0)];
const row = (movie_id, extra={}) => ({movie_id,title:'Film '+movie_id,tr_title:null,original_title:null,overview:'Story',tr_overview:null,year:2000,genres:[],keywords:[],rating:7,vote_count:1000,popularity:1,language:'en',countries:[],poster_path:'/poster.jpg',backdrop_path:null,director:null,cast_names:[],collection_id:null,collection_name:null,...extra});
async function fixture({primaryError=null,invalid=false,fallbackError=false,large=false,missing=false}={}) {
    const calls=[], previous=globalThis.fetch, warn=console.warn;
    globalThis.fetch=async (raw,init) => {
        const url=new URL(raw); calls.push({url,init});
        if(url.pathname.endsWith('/rpc/blend_movies')) {
            assert.deepEqual(JSON.parse(init.body),{movie_a:194,movie_b:603});
            return primaryError ? Response.json(primaryError,{status:500}) : Response.json([row(101,{sim_a:.8,sim_b:.7})]);
        }
        if(url.pathname.endsWith('/rpc/vibe_search_v3')) {
            const body=JSON.parse(init.body);
            assert.equal(body.match_limit,200); assert.equal(body.min_votes,100);
            assert.deepEqual(body.query_embedding,vec(1,1));
            if(fallbackError) return Response.json({code:'57014'},{status:500});
            const result=[row(194),row(603),row(102),row(101),row(103,{keywords:['softcore']})];
            if(large) result.push(...Array.from({length:205},(_,i)=>row(1000+i)));
            return Response.json(result);
        }
        const filter=url.searchParams.get('movie_id');
        if(url.searchParams.get('select')==='movie_id,embedding') {
            const ids=filter.match(/in\.\(([^)]+)\)/)[1].split(',').map(Number);
            assert.ok(ids.length<=50);
            return Response.json(ids.map(movie_id=>({movie_id,embedding:JSON.stringify(invalid?vec(NaN,1):movie_id===194?vec(1,0):movie_id===603?vec(0,1):movie_id===102?vec(.99,.1):vec(1,1))})));
        }
        const id=Number(filter.slice(3)); return Response.json(missing?[]:[row(id)]);
    };
    console.warn=()=>{};
    try {return {result:await blendFilms(603,194),calls};}
    finally {globalThis.fetch=previous;console.warn=warn;}
}
test('normal blend keeps existing RPC ranking and does not read embeddings',async()=>{
    const {result,calls}=await fixture();assert.equal(result.films[0].film.id,101);
    assert.equal(result.a.id,603);assert.equal(result.b.id,194);
    assert.equal(calls.length,3);assert.ok(calls.every(c=>!c.url.searchParams.get('select')?.includes('embedding')));
});
test('57014 recovery ranks exact similarity to both films, excludes seeds and adult candidates without OpenAI',async()=>{
    const {result,calls}=await fixture({primaryError:{code:'57014',message:'canceling statement due to statement timeout'}});
    assert.deepEqual(result.films.map(f=>f.film.id),[101,102]);
    assert.ok(calls.every(c=>c.url.hostname==='catalog.invalid'));
    assert.equal(calls.filter(c=>c.url.pathname.endsWith('/rpc/blend_movies')).length,1);
    assert.ok(!JSON.stringify(result).includes('embedding'));
});
test('recovery bounds vector batches even if RPC returns too many rows',async()=>{
    const {result,calls}=await fixture({primaryError:{code:'57014'},large:true});
    const vectors=calls.filter(c=>c.url.searchParams.get('select')==='movie_id,embedding');
    assert.equal(vectors.length,5);assert.equal(result.films.length,24);
    const ids=vectors.slice(1).flatMap(c=>c.url.searchParams.get('movie_id').slice(4,-1).split(','));
    assert.equal(ids.length,200);
});
test('unrelated errors, invalid vectors and failed recovery stay visible instead of producing false empty results',async()=>{
    await assert.rejects(fixture({primaryError:{code:'42501'}}),/42501/);
    await assert.rejects(fixture({primaryError:{code:'57014'},invalid:true}),/Invalid blend embedding/);
    await assert.rejects(fixture({primaryError:{code:'57014'},fallbackError:true}),/57014/);
});
test('same or missing catalog seeds do not start the expensive candidate RPC',async()=>{
    assert.equal(await blendFilms(603,603),null);
    const {result,calls}=await fixture({missing:true});assert.equal(result,null);assert.equal(calls.length,2);
});
