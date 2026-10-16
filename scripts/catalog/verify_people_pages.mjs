import assert from "node:assert/strict";
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
const manifest=JSON.parse(readFileSync("src/lib/catalog/people-manifest.json","utf8"));
const verified=JSON.parse(readFileSync("docs/seo-02-people-identity-report.json","utf8"));
const expected=new Map(verified.people.map(p=>[p.person_id,p]));
const live=process.argv.includes("--live"),port=3188;
const slug=name=>name.toLocaleLowerCase("tr").replace(/[ığüşöç]/g,c=>({"ı":"i","ğ":"g","ü":"u","ş":"s","ö":"o","ç":"c"}[c])).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const pathFor=p=>"/"+(p.role==="actor"?"oyuncu":"yonetmen")+"/"+p.id+"-"+slug(p.name);
let mock,output="";
const fixtureFilms=Array.from({length:49},(_,i)=>({movie_id:800000+i,title:"Fixture film "+i,tr_title:"Örnek film "+i,original_title:null,language:"en",year:2000+i%20,genres:[{id:28,name:"Action"}],rating:7,vote_count:100-Math.floor(i/2),poster_path:null}));
if(!live){
    mock=createServer((req,res)=>{
        const url=new URL(req.url,"http://localhost"),personId=Number((url.searchParams.get("person_id")||"").replace("eq.",""));
        if(personId===525){res.writeHead(503,{"Content-Type":"application/json"});res.end('{"message":"Fixture unavailable"}');return;}
        let rows=[];
        if(url.pathname.endsWith("/film_people"))rows=[{person_id:6384,name:"Keanu Reeves",display_name:"Keanu Reeves",profile_path:null,pilot_role:"actor",published:true,updated_at:"2026-10-16T00:00:00Z"}];
        else if(url.pathname.endsWith("/film_person_credits")){
            assert.equal(url.searchParams.get("kind"),"eq.cast");
            assert.ok(!/(^|[, (])embedding([, )]|$)/.test(url.searchParams.get("select")));
            rows=fixtureFilms.map(f=>({movie_id:f.movie_id,kind:"cast",job:"Actor",character_name:"Karakter "+f.movie_id+(f.movie_id===800048?" (voice)":""),film:f}));
            const offset=Number(url.searchParams.get("offset"));rows=rows.slice(offset,offset+1000);
        }
        res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(rows));
    });
    await new Promise(resolve=>mock.listen(0,"127.0.0.1",resolve));
}
const env={...process.env,VERCEL_ENV:"preview",NEXT_TELEMETRY_DISABLED:"1",...(!live?{SUPABASE_URL:"http://127.0.0.1:"+mock.address().port,SUPABASE_SERVICE_ROLE_KEY:"fixture-only"}:{})};
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{env,stdio:["ignore","pipe","pipe"]});
app.stdout.on("data",b=>{output=(output+b).slice(-12000);});app.stderr.on("data",b=>{output=(output+b).slice(-12000);});
async function request(path){const started=Date.now();const res=await fetch("http://127.0.0.1:"+port+path,{redirect:"manual",signal:AbortSignal.timeout(45000)});return {status:res.status,headers:res.headers,html:await res.text(),ms:Date.now()-started};}
function graphs(html){return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const x=JSON.parse(m[1]);return x["@graph"]||[x];});}
function items(html){return graphs(html).find(x=>x["@type"]==="ItemList")?.itemListElement;}
const checks=[],cold=[],cached=[];
async function verifyPerson(p){
    const path=pathFor(p),r=await request(path);cold.push(r.ms);
    assert.equal(r.status,200,p.name);
    const list=items(r.html),count=live?expected.get(p.id).role_films:49;
    assert.equal(list.length,Math.min(24,count),p.name+" cards");
    assert.equal(new Set(list.map(i=>i.url)).size,list.length,p.name+" dedup");
    assert.ok(r.html.includes('href="https://filminibul.com'+path+'"'),"self canonical");
    assert.ok(r.html.includes(p.name),"person name in SSR");
    assert.ok(graphs(r.html).some(x=>x["@type"]==="Person"&&x.sameAs==="https://www.themoviedb.org/person/"+p.id));
    for(const entry of list)assert.ok(r.html.includes('href="'+new URL(entry.url).pathname+'"'),"real SSR film link");
    assert.match(r.html,/name="robots" content="noindex, follow"/);
}
try{
    let ready=false;
    for(let i=0;i<100;i++){if(app.exitCode!==null)throw Error("Next exited early");try{if((await request("/listeler")).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
    assert.ok(ready,"server ready");
    const hub=await request("/listeler");
    const actorLinks=hub.html.match(/href="\/oyuncu\/[^"]+"/g)||[],directorLinks=hub.html.match(/href="\/yonetmen\/[^"]+"/g)||[];
    assert.equal(actorLinks.length,30);assert.equal(directorLinks.length,20);
    checks.push("hub: 30 actor and 20 director links in initial HTML");
    if(live){
        await Promise.all(manifest.slice(0,5).map(verifyPerson));
        for(let i=5;i<manifest.length;i+=3)await Promise.all(manifest.slice(i,i+3).map(verifyPerson));
        checks.push("50/50 real catalog role pages: count, SSR cards, no duplicates, canonical and Person JSON-LD");
    }else{
        await verifyPerson(manifest.find(p=>p.id===6384));
        const tail=await request("/oyuncu/6384-keanu-reeves?page=3");
        assert.equal(items(tail.html).length,1);
        assert.ok(tail.html.includes("Karakter 800048 (seslendirme)"));
        assert.equal((await request("/yonetmen/525-christopher-nolan")).status,500);
        checks.push("fixture: missing photo fallback, character labels, single-card last page; upstream failure 500");
    }
    const api=async(path,page)=>request("/api/catalog/page?"+new URLSearchParams({path,page:String(page)}));
    const apiSecond=await api("/oyuncu/6384-keanu-reeves",2),apiTail=await api("/oyuncu/6384-keanu-reeves",3);
    assert.equal(apiSecond.status,200);assert.equal(apiTail.status,200);
    const chunk=JSON.parse(apiSecond.html),tailChunk=JSON.parse(apiTail.html);
    assert.equal(chunk.page,2);assert.equal(chunk.films.length,24);
    assert.equal(tailChunk.films.length,live?expected.get(6384).role_films-48:1);
    assert.ok(chunk.films.every(f=>!("embedding" in f)));
    assert.equal(Object.keys(chunk.notes).length,24);
    assert.ok(chunk.films.every(f=>!tailChunk.films.some(t=>t.id===f.id)));
    assert.match(apiSecond.headers.get("cache-control"),/s-maxage=3600/);
    assert.equal(apiSecond.headers.get("x-robots-tag"),"noindex");
    for(const [path,page,status] of [["/oyuncu/6384-keanu-reeves",0,400],["/oyuncu/6384-keanu-reeves",99999,404],["/oyuncu/6384-eski-ad",2,404],["/yonetmen/6384-keanu-reeves",2,404],["/film/603-matrix",2,404],["https://example.com",2,404]])assert.equal((await api(path,page)).status,status);
    assert.equal((await request("/api/catalog/page?path=/oyuncu/6384-keanu-reeves&page=2&page=3")).status,400);
    assert.equal((await request("/api/catalog/page?path=/oyuncu/6384-keanu-reeves&page=2&select=embedding")).status,400);
    if(!live){
        assert.equal(tailChunk.notes[800048],"Karakter 800048 (seslendirme)");
        const unavailable=await api("/yonetmen/525-christopher-nolan",1);
        assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get("cache-control"),"no-store");
        assert.ok(!unavailable.html.includes("Fixture unavailable"));
    }
    checks.push("infinite feed API: 24-card next page, deduped tail, scoped notes, Turkish voice, whitelist/validation, safe non-cached 503");
    const first=await request("/oyuncu/6384-keanu-reeves"),second=await request("/oyuncu/6384-keanu-reeves?page=2");
    assert.equal(second.status,200);assert.equal(items(second.html).length,24);assert.equal(items(second.html)[0].position,25);
    const ids=new Set(items(first.html).map(x=>x.url));
    assert.ok(items(second.html).every(x=>!ids.has(x.url)));
    assert.ok(second.html.includes('href="https://filminibul.com/oyuncu/6384-keanu-reeves?page=2"'));
    assert.equal((await request("/oyuncu/6384-keanu-reeves?page=1")).status,308);
    const old=await request("/oyuncu/6384-eski-ad?page=2");
    assert.equal(old.status,308);assert.equal(old.headers.get("location"),"/oyuncu/6384-keanu-reeves?page=2");
    for(const path of ["/oyuncu/99999999-bilinmeyen","/oyuncu/525-christopher-nolan","/oyuncu/6384-keanu-reeves?page=0","/oyuncu/6384-keanu-reeves?page=99999","/oyuncu/6384-keanu-reeves?page=1&page=2"])assert.equal((await request(path)).status,404,path);
    assert.match((await request("/oyuncu/6384-keanu-reeves?lang=en")).html,/name="robots" content="noindex, follow"/);
    checks.push("role mismatch/unknown/invalid/overflow pages 404; old slug/page=1 308; page 2 self canonical and non-overlap; language variant noindex");
    if(live){
        const matrix=await request("/film/603-matrix");
        assert.equal(matrix.status,200);
        assert.ok(matrix.html.includes('href="/oyuncu/6384-keanu-reeves"'),"Matrix must link its verified actor");
        assert.ok(graphs(matrix.html).some(x=>x["@type"]==="Movie"&&x.name),"Movie JSON-LD");
        checks.push("Matrix detail: verified Keanu actor link and safe Movie structured data");
        await Promise.all(Array.from({length:5},async()=>{cached.push((await request("/oyuncu/6384-keanu-reeves")).ms);}));
        checks.push("five concurrent cold person pages and five cached requests completed");
    }
    const p95=values=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1]:null;
    const report={checked_at:new Date().toISOString(),mode:live?"live_read_only":"fixture",checks,pages_checked:live?50:1,cold_p95_ms:p95(cold),cached_p95_ms:p95(cached),paid_api_calls:0};
    writeFileSync("docs/seo-02-people-"+(live?"live":"fixture")+"-verification.json",JSON.stringify(report,null,2)+"\n");
    console.log("PEOPLE_SSR_REPORT="+JSON.stringify(report));
}catch(e){console.error(output.slice(-2500));throw e;}
finally{app.kill("SIGTERM");mock?.closeAllConnections();await new Promise(resolve=>mock?mock.close(resolve):resolve());}
