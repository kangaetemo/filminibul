import test from "node:test";
import assert from "node:assert/strict";
import { creditLabel } from "../../src/lib/catalog/creditLabel.mjs";

test("voice credit markers are Turkish while character names are preserved", () => {
    assert.equal(creditLabel("Duke Caboom (voice)"), "Duke Caboom (seslendirme)");
    assert.equal(creditLabel("Sage (VOICE) · Neo"), "Sage (seslendirme) · Neo");
    assert.equal(creditLabel("Character (voice, uncredited)"), "Character (seslendirme, uncredited)");
    assert.equal(creditLabel("The Voice · Voice Actor"), "The Voice · Voice Actor");
    assert.equal(creditLabel("Neo"), "Neo");
    assert.equal(creditLabel(""), "");
});
