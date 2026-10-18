import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFilmSnippet, DESCRIPTION_MAX, snippetTitles } from '../../src/lib/filmSnippet.mjs';

const overview = 'Issac, üvey babasından miras kalan cenaze işleri işletmesini yöneten genç ve içine kapanık bir cenaze görevlisidir. Dost canlısı bir garson olan Cassi ile tanışır.';
const similar = ['Kızıl Ejder', 'Kuzuların Sessizliği', 'Yedi', 'Zodyak', 'Sessiz Tanık'];

test('title names both the similar films and where to watch, without Turkish suffixes', () => {
    const { title } = buildFilmSnippet({ title: 'Love Me Dead', year: 2024, overview, similarTitles: similar });
    assert.equal(title, 'Love Me Dead (2024): benzer filmler ve nerede izlenir · Filminibul');
});

test('very long titles fall back to the shorter title form', () => {
    const long = 'Munna Kardeş: Mutluluk Dağıtıcısı Munnabhai M.B.B.S. Uzun Başlık';
    const { title } = buildFilmSnippet({ title: long, year: 2003, similarTitles: similar });
    assert.equal(title, `${long} (2003) ve benzer filmler · Filminibul`);
});

test('description leads with real similar films, then platforms, then the story, within the limit', () => {
    const { description } = buildFilmSnippet({ title: 'Love Me Dead', year: 2024, overview, similarTitles: similar, similarCount: 20, platforms: ['Netflix', 'MUBI', 'Prime Video'] });
    assert.ok(description.startsWith('Love Me Dead gibi filmler: Kızıl Ejder, Kuzuların Sessizliği, Yedi ve 17 film daha.'), description);
    assert.ok(description.includes('Yayında: Netflix, MUBI.'), description);
    assert.ok(!description.includes('Prime Video'));
    assert.ok(description.includes('Konusu: Issac'), description);
    assert.ok(description.length <= DESCRIPTION_MAX, `${description.length}`);
});

test('small similar lists are joined naturally and no platform line is invented', () => {
    const { description } = buildFilmSnippet({ title: 'Kupa Kızı', overview: '', similarTitles: ['Bergen', 'Öngörü'] });
    assert.equal(description, 'Kupa Kızı gibi filmler: Bergen ve Öngörü.');
});

test('without similar films the description stays the synopsis (previous behavior)', () => {
    assert.equal(buildFilmSnippet({ title: 'X', overview: 'Kısa bir konu.' }).description, 'Kısa bir konu.');
    assert.equal(buildFilmSnippet({ title: 'X', overview: null }).description, 'X filmine tema, atmosfer ve hikâyece benzeyen filmler.');
    const longStory = 'kelime '.repeat(60).trim();
    const d = buildFilmSnippet({ title: 'X', overview: longStory }).description;
    assert.ok(d.length <= 200 && d.endsWith('…'));
});

test('long similar titles are reduced instead of crowding out the rest, and words are never cut', () => {
    const longTitles = ['Dune: Çöl Gezegeni - Bölüm İki ve Çok Uzun Bir Alt Başlık', 'Yüzüklerin Efendisi: Kralın Dönüşü Genişletilmiş Sürüm', 'Harry Potter ve Ölüm Yadigârları: Bölüm 2'];
    const { description } = buildFilmSnippet({ title: 'Yıldızlararası', overview, similarTitles: longTitles, similarCount: 20, platforms: ['Netflix'] });
    assert.ok(description.length <= DESCRIPTION_MAX, `${description.length}`);
    assert.ok(description.startsWith('Yıldızlararası gibi filmler: Dune'), description);
    assert.ok(!/\S…\S/.test(description));
});

test('same-series films move behind other similar films, keeping their order', () => {
    const similar = [
        { title: 'Matrix Reloaded', collectionName: 'Matrix' }, { title: 'Matrix Revolutions', collectionName: 'Matrix' },
        { title: 'Dark City', collectionName: null }, { title: 'Matrix Resurrections', collectionName: 'Matrix' },
        { title: 'Ghost in the Shell', collectionName: 'Ghost in the Shell' }, { title: 'Ex Machina' },
    ];
    assert.deepEqual(snippetTitles(similar, 'Matrix'), ['Dark City', 'Ghost in the Shell', 'Ex Machina', 'Matrix Reloaded', 'Matrix Revolutions', 'Matrix Resurrections']);
    const { description } = buildFilmSnippet({ title: 'Matrix', similarTitles: snippetTitles(similar, 'Matrix'), similarCount: 20 });
    assert.ok(description.startsWith('Matrix gibi filmler: Dark City, Ghost in the Shell, Ex Machina ve 17 film daha.'), description);
    // Serisi olmayan filmde ve yalnız seri filmi olduğunda sıra değişmez
    assert.deepEqual(snippetTitles(similar, null), similar.map((s) => s.title));
    assert.deepEqual(snippetTitles(similar.slice(0, 2), 'Matrix'), ['Matrix Reloaded', 'Matrix Revolutions']);
});
