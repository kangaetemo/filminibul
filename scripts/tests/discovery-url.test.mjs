import test from 'node:test';
import assert from 'node:assert/strict';
import { platformUrl, shareUrl } from '../../src/lib/discoveryUrl.mjs';
test('platform changes preserve film pair/language; explicit clear prevents remembered-filter restoration',()=>{
    const url=new URL(platformUrl('/karistir','a=603&b=194&lang=en',[8,119]),'https://filminibul.com');
    assert.equal(url.searchParams.get('a'),'603');assert.equal(url.searchParams.get('b'),'194');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('p'),'8,119');
    const cleared=new URL(platformUrl(url.pathname,url.search,[]),url.origin);assert.equal(cleared.searchParams.get('p'),'');assert.equal(cleared.searchParams.get('a'),'603');
});
test('shared URLs contain only canonical content, public preference parameters and the actual pair',()=>{
    const url=new URL(shareUrl('/karistir','a=1&b=2&p=8,evil,119&uid=private&token=secret&lang=tr','en',[603,194]));
    assert.equal(url.origin,'https://filminibul.com');assert.equal(url.searchParams.get('a'),'603');assert.equal(url.searchParams.get('b'),'194');assert.equal(url.searchParams.get('p'),'8,119');assert.equal(url.searchParams.get('lang'),'en');
    assert.ok(!url.href.includes('secret'));assert.ok(!url.href.includes('private'));
    const film=new URL(shareUrl('/film/603-matrix','a=1&b=2&uid=A&p=','tr'));assert.equal(film.searchParams.get('a'),null);assert.equal(film.searchParams.get('p'),'');
});

test('social compose URLs preserve encoded film pairs, punctuation and public preferences without tracking SDKs', async()=>{
    const {socialShareUrls}=await import('../../src/lib/discoveryUrl.mjs');
    const shared=shareUrl('/karistir','uid=secret&p=8,119','en',[603,194]);
    const links=socialShareUrls(shared,'Matrix & Amélie + ?');
    const x=new URL(links.x),telegram=new URL(links.telegram),whatsapp=new URL(links.whatsapp);
    assert.equal(x.origin,'https://x.com');assert.equal(x.pathname,'/intent/tweet');assert.equal(x.searchParams.get('url'),shared);
    assert.equal(telegram.searchParams.get('url'),shared);assert.equal(telegram.searchParams.get('text'),'Matrix & Amélie + ? · Filminibul');
    assert.equal(whatsapp.origin,'https://wa.me');assert.equal(whatsapp.searchParams.get('text'),'Matrix & Amélie + ? · Filminibul\n'+shared);
    assert.ok(Object.values(links).every(url=>!url.includes('secret')));
});
