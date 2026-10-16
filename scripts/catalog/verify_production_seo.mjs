import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const base="https://filminibul.com";
const results=[];
function canonical(html){return html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];}
function robots(html){return html.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/)?.[1] || "";}
function graph(html){return [...html.matchAll(/<script\b(?=[^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const data=JSON.parse(m[1]);return data["@graph"]||[data];});}
function items(html){return graph(html).find(x=>x["@type"]==="ItemList")?.itemListElement;}
function links(html){return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1].replaceAll("&amp;","&"));}
async function get(path,expected=200){
    const started=Date.now();
    const response=await fetch(base+path,{redirect:"manual",signal:AbortSignal.timeout(45000)});
    const html=await response.text();
    const item={path,status:response.status,ms:Date.now()-started,canonical:canonical(html),robots:robots(html),location:response.headers.get("location"),cache:response.headers.get("x-vercel-cache")};
    results.push(item);
    console.log(JSON.stringify(item));
    assert.equal(response.status,expected,path);
    return {html,response};
}
const hub=await get("/listeler");
const hubLinks=links(hub.html);
assert.equal(hubLinks.filter(p=>p.startsWith("/listeler/")).length,30);
assert.equal(hubLinks.filter(p=>p.startsWith("/oyuncu/")).length,30);
assert.equal(hubLinks.filter(p=>p.startsWith("/yonetmen/")).length,20);
assert.equal(canonical(hub.html),base+"/listeler");
assert.ok(!robots(hub.html).includes("noindex"));
const requests=["/listeler/2023-aksiyon-filmleri","/listeler/2023-aksiyon-filmleri?page=2","/oyuncu/6384-keanu-reeves","/yonetmen/525-christopher-nolan"];
const pages={};
for(let i=0;i<requests.length;i+=2){
    await Promise.all(requests.slice(i,i+2).map(async path=>{
        const value=await get(path);pages[path]=value.html;
        assert.equal(canonical(value.html),base+path);
        assert.ok(!robots(value.html).includes("noindex"));
        assert.ok(items(value.html)?.length>0);
        for(const item of items(value.html))assert.ok(links(value.html).includes(new URL(item.url).pathname));
    }));
}
const first=items(pages[requests[0]]),second=items(pages[requests[1]]);
assert.equal(first.length,24);assert.equal(second.length,24);
assert.ok(second.every(x=>!new Set(first.map(f=>f.url)).has(x.url)));
assert.equal(second[0].position,25);
assert.equal(items(pages[requests[2]]).length,24);
assert.equal(items(pages[requests[3]]).length,12);
for(const path of requests.slice(2))assert.ok(graph(pages[path]).some(x=>x["@type"]==="Person"));
const old=await get("/oyuncu/6384-eski-ad?page=2",308);
assert.equal(new URL(old.response.headers.get("location"),base).pathname,"/oyuncu/6384-keanu-reeves");
assert.equal(new URL(old.response.headers.get("location"),base).search,"?page=2");
await get("/listeler/2023-aksiyon-filmleri?page=1",308);
await get("/oyuncu/525-christopher-nolan",404);
await get("/listeler/2023-aksiyon-filmleri?page=99999",404);
const language=await get("/oyuncu/6384-keanu-reeves?lang=en");
assert.ok(robots(language.html).includes("noindex"));
const matrix=await get("/film/603-matrix");
assert.ok(links(matrix.html).includes("/oyuncu/6384-keanu-reeves"));
assert.ok(graph(matrix.html).some(x=>x["@type"]==="Movie"));
const sitemap=await get("/sitemap.xml");
const locations=[...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const listed=new Set(locations);
for(const path of hubLinks.filter(p=>/^\/(?:listeler|oyuncu|yonetmen)\//.test(p)))assert.ok(listed.has(base+path),"Sitemap missing "+path);
assert.ok(listed.has(base+"/listeler"));
assert.equal(new Set(locations.filter(url=>/^https:\/\/filminibul.com\/(?:listeler|oyuncu|yonetmen)\//.test(url))).size,80);
const robotFile=await get("/robots.txt");
assert.ok(robotFile.html.includes("Sitemap: "+base+"/sitemap.xml"));
for(const family of ["/listeler","/oyuncu","/yonetmen"])assert.ok(!robotFile.html.includes("Disallow: "+family));
const report={checked_at:new Date().toISOString(),base_url:base,deployment_id:process.env.SEO_RELEASE_DEPLOYMENT_ID||null,merge_commit:process.env.SEO_RELEASE_COMMIT||null,status:"passed",requests:results,pilot_urls_in_sitemap:80,sitemap_total_urls:locations.length,hub_person_links:50,hub_year_genre_links:30,paid_api_calls:0,checks:["Production indexable canonical pages","SSR card links and structured data","24-card non-overlapping pagination and page-2 self canonical","Correct actor/director roles and verified Matrix actor link","308 old slug/page=1, 404 wrong role/overflow, noindex language variant","All 80 pilot landing URLs plus hub in sitemap; robots allows them"]};
writeFileSync("docs/seo-02-production-verification.json",JSON.stringify(report,null,2)+"\n");
console.log("PRODUCTION_REPORT="+JSON.stringify({status:report.status,pilot_urls_in_sitemap:80,sitemap_total_urls:locations.length,requests:results.length}));
