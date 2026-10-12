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

test("catalog maintenance translates missing copy, preserves English and protects concurrent edits", () => {
    const dir = mkdtempSync(join(tmpdir(), "filminibul-content-"));
    const script = resolve("scripts/catalog/refresh_content.mjs");
    const fixture = `
        import assert from 'node:assert/strict';
        process.env.SUPABASE_URL='https://db.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='fixture'; process.env.TMDB_API_KEY='fixture'; process.env.OPENAI_API_KEY='fixture';
        const english='When a young man returns home, he finds his family missing and must look for them.';
        const rows=[{movie_id:1,title:'One',original_title:'One',language:'ja',overview:english,tr_overview:null,tr_title:null,poster_path:'/english.jpg'}, {movie_id:2,title:'Two',language:'en',overview:english,tr_overview:'<p>Bir genç adam eve döner.</p>',poster_path:'/two.jpg'}];
        const writes=[]; let translated=0;
        globalThis.fetch=async (input,init={})=>{
            const url=new URL(input);
            if(url.hostname==='db.invalid'){
                if(init.method==='PATCH'){writes.push({url,body:JSON.parse(init.body)});return new Response(null,{status:204});}
                return Response.json(url.searchParams.get('offset')==='0'?rows:[]);
            }
            if(url.hostname==='api.themoviedb.org')return Response.json({original_language:'ja',images:{posters:[{iso_639_1:'ja',file_path:'/ja.jpg'}]},translations:{translations:[]}});
            if(url.hostname==='api.openai.com'){
                translated++; const payload=JSON.parse(init.body);assert.equal(JSON.parse(payload.messages[1].content).synopsis,english);
                return Response.json({choices:[{message:{content:JSON.stringify({overview:'Bir genç adam eve döndüğünde ailesinin kaybolduğunu fark eder ve onları aramaya başlar.'})}}]});
            }
            throw new Error('Unexpected host');
        };
        await import(${JSON.stringify(script)});
        assert.equal(translated,1);assert.equal(writes.length,2);
        for(const write of writes){assert.equal('overview' in write.body,false);assert.equal('embedding' in write.body,false);assert.ok(write.url.searchParams.has('tr_overview'));}
        assert.equal(writes.find(w=>w.url.searchParams.get('movie_id')==='eq.1').body.poster_path,'/ja.jpg');
        assert.equal(writes.find(w=>w.url.searchParams.get('movie_id')==='eq.2').body.tr_overview,'Bir genç adam eve döner.');
    `;
    try { const result = spawnSync(process.execPath, ["--input-type=module", "-e", fixture], { cwd: dir, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); }
    finally { rmSync(dir, { recursive: true, force: true }); }
});
