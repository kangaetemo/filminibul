import test from "node:test";
import assert from "node:assert/strict";
import { pageAddress, pageAtViewport } from "../../src/lib/catalog/scrollPage.mjs";

test("prefetching a page below the fold does not change the current URL", () => {
    assert.equal(pageAtViewport([{page:1,top:-2000},{page:2,top:1100}],936,1),1);
    assert.equal(pageAtViewport([{page:1,top:-3000},{page:2,top:280}],936,1),2);
});
test("scrolling upward restores earlier pages, including the clean first-page URL", () => {
    assert.equal(pageAtViewport([{page:1,top:-3000},{page:2,top:-800},{page:3,top:200}],936,1),3);
    assert.equal(pageAtViewport([{page:1,top:-2000},{page:2,top:100},{page:3,top:2000}],936,1),2);
    assert.equal(pageAtViewport([{page:1,top:200},{page:2,top:2000}],936,1),1);
    assert.equal(pageAddress("https://filminibul.com/oyuncu/6384-keanu-reeves?page=3",1),"/oyuncu/6384-keanu-reeves");
});
test("short final chunks and direct page-2 visits retain the correct page", () => {
    assert.equal(pageAtViewport([{page:2,top:-1500},{page:3,top:150}],700,2),3);
    assert.equal(pageAtViewport([{page:2,top:700}],700,2),2);
    assert.equal(pageAtViewport([],700,2),2);
});
test("page addresses retain unrelated URL parameters and anchors without page=1 aliases", () => {
    assert.equal(pageAddress("https://filminibul.com/listeler/2023-aksiyon-filmleri?lang=en&utm_source=test#filmler",2),"/listeler/2023-aksiyon-filmleri?lang=en&utm_source=test&page=2#filmler");
    assert.equal(pageAddress("https://filminibul.com/listeler/2023-aksiyon-filmleri?page=2&lang=en",3),"/listeler/2023-aksiyon-filmleri?page=3&lang=en");
});
