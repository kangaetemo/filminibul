// Exercise the built Next server, not just string templates. No paid provider calls.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const port = Number(process.env.SEO_TEST_PORT || 3187);
const live = process.argv.includes("--live");
const records = Array.from({ length: 49 }, (_, i) => ({ movie_id: 900000 + i, title: `Film ${i + 1}`, tr_title: `Deneme filmi ${i + 1}`, original_title: `Film ${i + 1}`, language: "en", year: 2023, genres: [{ id: 28, name: "Action" }], rating: 7, vote_count: 100 - Math.floor(i / 2), poster_path: null }));
let mock, queries = 0, output = "";
if (!live) {
    mock = createServer((req, res) => {
        queries++;
        const url = new URL(req.url, "http://localhost");
        if (url.searchParams.get("year") === "eq.2023" && url.searchParams.get("genres")?.includes('"id":35')) {
            res.writeHead(503, { "Content-Type": "application/json" }); res.end('{"message":"Fixture unavailable"}'); return;
        }
        assert.equal(url.searchParams.get("order"), "vote_count.desc.nullslast,movie_id.asc");
        assert.ok(!url.searchParams.get("select").includes("embedding"));
        const offset = Number(url.searchParams.get("offset"));
        res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(records.slice(offset, offset + 1000)));
    });
    await new Promise(resolve => mock.listen(0, "127.0.0.1", resolve));
}
const env = { ...process.env,
    ...(!live ? { SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`, SUPABASE_SERVICE_ROLE_KEY: "fixture-only-not-a-secret" } : {}),
    NEXT_TELEMETRY_DISABLED: "1", VERCEL_ENV: "preview" };
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
app.stdout.on("data", b => { output = (output + b).slice(-12000); });
app.stderr.on("data", b => { output = (output + b).slice(-12000); });
const checks = [];
async function request(path) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
    return { res, html: await res.text() };
}
function items(html) {
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const graph = scripts.map(m => JSON.parse(m[1])).flatMap(x => x["@graph"] || [x]);
    return graph.find(x => x["@type"] === "ItemList")?.itemListElement;
}
try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
        if (app.exitCode !== null) throw new Error(`Next exited early: ${output}`);
        try { if ((await fetch(`http://127.0.0.1:${port}/listeler`)).ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, "Next server must start");
    const hub = await request("/listeler");
    assert.equal(hub.res.status, 200);
    assert.equal((hub.html.match(/href="\/listeler\/[^"]+"/g) || []).length, 30);
    checks.push("hub: 30 real links in initial HTML");
    const path = "/listeler/2023-aksiyon-filmleri";
    const first = await request(path), second = await request(`${path}?page=2`);
    for (const [value, page] of [[first, 1], [second, 2]]) {
        assert.equal(value.res.status, 200);
        assert.match(value.html, /<h1[^>]*>2023 aksiyon filmleri<\/h1>/);
        assert.ok(value.html.includes(`href="https://filminibul.com${path}${page > 1 ? "?page=2" : ""}"`), "self canonical");
        const entries = items(value.html);
        assert.equal(entries.length, 24);
        assert.equal(entries[0].position, (page - 1) * 24 + 1);
        for (const entry of entries) assert.ok(value.html.includes(`href="${new URL(entry.url).pathname}"`), "SSR card link matches structured data");
    }
    const firstIds = new Set(items(first.html).map(x => x.url));
    assert.ok(items(second.html).every(x => !firstIds.has(x.url)), "pages must not duplicate cards");
    checks.push("pages 1–2: SSR 24 cards, deterministic non-overlap, self canonical and JSON-LD positions");
    const redirect = await request(`${path}?page=1`);
    assert.equal(redirect.res.status, 308);
    assert.equal(new URL(redirect.res.headers.get("location"), "http://localhost").pathname, path);
    for (const suffix of ["?page=0", "?page=01", "?page=99999", "?page=1&page=2"]) assert.equal((await request(path + suffix)).res.status, 404);
    assert.equal((await request("/listeler/2026-aksiyon-filmleri")).res.status, 404);
    checks.push("invalid/overflow/duplicate page and unknown combination: real 404; page=1: 308");
    assert.match((await request(`${path}?lang=en`)).html, /name="robots" content="noindex, follow"/);
    checks.push("preview and language variants: noindex");
    if (!live) {
        const tail = await request(`${path}?page=3`);
        assert.equal(items(tail.html).length, 1);
        const error = await request("/listeler/2023-komedi-filmleri");
        assert.notEqual(error.res.status, 404);
        assert.equal(error.res.status, 500);
        checks.push("49-row fixture last page: one card; upstream failure: 500 rather than empty/404");
    }
    const report = { checked_at: new Date().toISOString(), mode: live ? "live_read_only" : "fixture", checks, fixture_queries: live ? undefined : queries, paid_api_calls: 0 };
    mkdirSync("docs", { recursive: true });
    writeFileSync(`docs/seo-02-${live ? "live" : "fixture"}-verification.json`, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
} catch (error) {
    console.error(output.slice(-3000)); throw error;
} finally {
    app.kill("SIGTERM");
    mock?.closeAllConnections();
    await new Promise(resolve => mock ? mock.close(resolve) : resolve());
}
