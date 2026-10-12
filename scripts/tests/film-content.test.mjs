import test from "node:test";
import assert from "node:assert/strict";
import { cleanOverview, looksEnglish, turkishOverview, selectOriginalPoster } from "../../src/lib/filmContent.mjs";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("cleans TMDB paragraphs/entities without adding or rewriting story facts", () => {
    assert.equal(cleanOverview('<p>Bir genç&nbsp;adam</p><br/> &quot;eve&quot; döner.\u200b'), 'Bir genç adam "eve" döner.');
    assert.equal(cleanOverview("  \n  "), null);
    assert.equal(cleanOverview(null), null);
    assert.equal(cleanOverview("&#9999999999;"), null);
});
test("Turkish UI never falls back to an English source", () => {
    const en = "When a young man finds his home empty, he must discover who took his family.";
    assert.equal(looksEnglish(en), true);
    assert.equal(turkishOverview(null, en, "en"), null);
    assert.equal(turkishOverview(null, en, "tr"), null);
    assert.equal(turkishOverview(en, en, "fr"), null);
    assert.equal(turkishOverview("Bir genç adam ailesini bulmak için yola çıkar.", en, "en"), "Bir genç adam ailesini bulmak için yola çıkar.");
    assert.equal(turkishOverview(null, "Bir genç adam eve döner.", "tr"), "Bir genç adam eve döner.");
});
test("original-language posters outrank popular English ones, with a usable fallback", () => {
    const images = [{ iso_639_1: "en", vote_average: 10, file_path: "/english.jpg" }, { iso_639_1: "ja", vote_average: 4, file_path: "/japanese.jpg" }, { iso_639_1: "ja", vote_average: 6, file_path: "/japanese-better.jpg" }];
    assert.equal(selectOriginalPoster(images, "ja", "/fallback.jpg"), "/japanese-better.jpg");
    assert.equal(selectOriginalPoster(images, "tr", "/fallback.jpg"), "/fallback.jpg");
    assert.equal(selectOriginalPoster(images, null, "/fallback.jpg"), "/fallback.jpg");
    assert.equal(selectOriginalPoster([], "fr", null), null);
});

function runMaintenance(mode) {
    const dir = mkdtempSync(join(tmpdir(), "filminibul-content-"));
    const script = resolve("scripts/catalog/refresh_content.mjs");
    const fixture = `
        import assert from 'node:assert/strict';
        import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
        process.env.SUPABASE_URL='https://db.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='fixture'; process.env.TMDB_API_KEY='fixture'; process.env.OPENAI_API_KEY='fixture';
        const mode=${JSON.stringify(mode)};
        if(mode==='skip'){process.argv.push('--skip-translation','--retry-failed');mkdirSync('docs');writeFileSync('docs/content-maintenance-report.json',JSON.stringify({failed_ids:[1]}));}
        const english='When a young man returns home, he finds his family missing and must look for them.';
        const rows=[{movie_id:1,title:'One',original_title:'One',language:'ja',overview:english,tr_overview:null,tr_title:null,poster_path:'/english.jpg'}, {movie_id:2,title:'Two',language:'en',overview:english,tr_overview:'<p>Bir genç adam eve döner.</p>',poster_path:'/two.jpg'}];
        const writes=[]; let translated=0;
        globalThis.fetch=async (input,init={})=>{
            const url=new URL(input);
            if(url.hostname==='db.invalid'){
                if(init.method==='PATCH'){
                    const body=JSON.parse(init.body);writes.push({url,body});assert.equal(init.headers.Prefer,'return=representation');
                    const id=Number(url.searchParams.get('movie_id').slice(3));
                    if(mode==='conflict' && body.tr_overview)return Response.json([]);
                    Object.assign(rows.find(r=>r.movie_id===id),body);return Response.json([{movie_id:id}]);
                }
                return Response.json(url.searchParams.get('offset')==='0'?rows:[]);
            }
            if(url.hostname==='api.themoviedb.org')return Response.json({original_language:'ja',images:{posters:[{iso_639_1:'ja',file_path:'/ja.jpg'}]},translations:{translations:[]}});
            if(url.hostname==='api.openai.com'){
                translated++; const payload=JSON.parse(init.body);assert.equal(JSON.parse(payload.messages[1].content).synopsis,english);
                if(mode==='quota')return Response.json({error:{code:'insufficient_quota'}},{status:429});
                return Response.json({choices:[{message:{content:JSON.stringify({overview:'Bir genç adam eve döndüğünde ailesinin kaybolduğunu fark eder ve onları aramaya başlar.'})}}]});
            }
            throw new Error('Unexpected host');
        };
        await import(${JSON.stringify(script)});
        assert.equal(translated,mode==='skip'?0:1);
        for(const write of writes){
            assert.equal('overview' in write.body,false);assert.equal('embedding' in write.body,false);
            assert.ok(write.url.searchParams.has(write.body.poster_path?'poster_path':'tr_overview'));
        }
        const report=JSON.parse(readFileSync('docs/content-maintenance-report.json','utf8'));
        assert.equal(report.original_posters,1);assert.equal(rows[0].poster_path,'/ja.jpg');
        assert.equal(report.translated,['quota','skip','conflict'].includes(mode)?0:1);
        assert.equal(report.failed,0);
        assert.equal(report.remaining_turkish,mode==='success'?0:1);
        assert.equal(report.status,mode==='success'?'complete':'partial');
        if(mode==='quota'){assert.equal(report.stop_reason,'insufficient_quota');assert.equal(report.deferred,1);}
        if(mode==='conflict')assert.equal(report.conflicts,2);
        if(mode==='skip'){assert.equal(report.scanned,1);assert.deepEqual(report.unresolved_ids,[1]);}
        assert.ok(report.updated_at>=report.started_at);
    `;
    try { const result = spawnSync(process.execPath, ["--input-type=module", "-e", fixture], { cwd: dir, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); }
    finally { rmSync(dir, { recursive: true, force: true }); }
}
for (const mode of ["success", "quota", "conflict", "skip"]) {
    test(`catalog maintenance: ${mode}; independent metadata and accurate persisted counts`, () => runMaintenance(mode));
}
