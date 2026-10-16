import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function pureModule(path) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const pilot = await pureModule("../../src/lib/catalog/pilot.ts");
const analytics = await pureModule("../../src/lib/analytics/schema.ts");

test("pilot exposes only the 30 audited completed-year combinations", () => {
    assert.equal(pilot.PILOT_LISTS.length, 30);
    assert.equal(new Set(pilot.PILOT_LISTS.map(x => x.slug)).size, 30);
    for (const list of pilot.PILOT_LISTS) {
        assert.ok(list.year <= 2025);
        assert.equal(pilot.getPilotList(list.slug), list);
        const query = new URLSearchParams(pilot.listQuery(list).split("?")[1]);
        assert.equal(query.get("year"), `eq.${list.year}`);
        assert.equal(query.get("genres"), `cs.[{"id":${list.genreId}}]`);
        assert.equal(query.get("order"), "vote_count.desc.nullslast,movie_id.asc");
        assert.ok(!query.get("select").includes("embedding"));
        assert.ok(!query.get("select").includes("overview"));
    }
    assert.equal(pilot.getPilotList("2026-aksiyon-filmleri"), undefined);
    assert.equal(pilot.getPilotList("1999-aksiyon-filmleri"), undefined);
});
test("pagination accepts canonical positive pages and rejects ambiguous input", () => {
    assert.equal(pilot.parsePage(undefined), 1);
    assert.equal(pilot.parsePage("2"), 2);
    for (const value of ["0", "-1", "1.5", "01", "1e2", "", "100000", ["1", "2"], "2&year=1999"]) assert.equal(pilot.parsePage(value), null);
    assert.equal(pilot.pagePath("/listeler/x", 1), "/listeler/x");
    assert.equal(pilot.pagePath("/listeler/x", 2), "/listeler/x?page=2");
});
test("structured data cannot close its script element", () => {
    const value = { name: "</script><script>alert(1)</script>\u2028\u2029" };
    const serialized = pilot.jsonLd(value);
    assert.ok(!serialized.includes("<"));
    assert.deepEqual(JSON.parse(serialized), value);
});
test("list and person measurement retains bounded routes and page context", () => {
    assert.equal(analytics.cleanPath("/listeler"), "/listeler");
    assert.equal(analytics.cleanPath("/listeler/2024-bilim-kurgu-filmleri?page=2&private=secret"), "/listeler/2024-bilim-kurgu-filmleri");
    assert.equal(analytics.cleanPath("/oyuncu/6384-keanu-reeves?email=secret"), "/oyuncu/6384");
    for (const path of ["/listeler/anything", "/oyuncu/0-x", "/listeler/2024-secret-filmleri", "/yonetmen/1/x"]) assert.equal(analytics.cleanPath(path), null);
});
