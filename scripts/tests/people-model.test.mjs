import test from "node:test";
import assert from "node:assert/strict";
import { normalizedName, nameMatches, roleCredits, catalogCredits } from "../../src/lib/catalog/peopleModel.mjs";
test("names normalize Turkish letters without assigning identity by name alone", () => {
    assert.equal(normalizedName("Şener Şen"), normalizedName("Sener Sen"));
    assert.ok(nameMatches({ name: "Tony Leung", also_known_as: ["Tony Leung Chiu-wai"] }, "Tony Leung Chiu-wai"));
    assert.ok(!nameMatches({ name: "John Smith" }, "Jane Smith"));
});
test("Director job is distinct from directing department and Writing credits", () => {
    const s = { cast: [{id:1}], crew: [{id:2,job:"Director",department:"Directing"},{id:3,job:"Assistant Director",department:"Directing"},{id:4,job:"Writer",department:"Writing"}] };
    assert.deepEqual(roleCredits(s,"director").map(c=>c.id),[2]);
    assert.deepEqual(roleCredits(s,"actor").map(c=>c.id),[1]);
    assert.throws(()=>roleCredits({cast:[]},"actor"), /Incomplete/);
});
test("dedup retains multiple roles and characters, excludes non-catalog films, preserves raw Writing", () => {
    const s = { cast:[{id:1,character:"A"},{id:1,character:"A"},{id:1,character:"B"},{id:99,character:"X"}], crew:[{id:1,job:"Director",department:"Directing"},{id:1,job:"Novel",department:"Writing"}] };
    const rows=catalogCredits(s,10,new Set([1]));
    assert.equal(rows.length,4);
    assert.equal(rows.filter(c=>c.kind==="cast").length,2);
    assert.ok(rows.some(c=>c.job==="Novel" && c.department==="Writing"));
    assert.equal(new Set(rows.map(c=>c.identity)).size,4);
});
