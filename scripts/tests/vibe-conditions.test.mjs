import test from 'node:test';
import assert from 'node:assert/strict';
import { countryFit, decadesFromText, eraFit, parseConditions } from '../../src/lib/recommend/vibeConditions.mjs';

test('decades are read from Turkish phrasing', () => {
    assert.deepEqual(decadesFromText("80'lerde geçen nostaljik bir macera"), [1980]);
    assert.deepEqual(decadesFromText("70'li yıllarda bir mafya filmi"), [1970]);
    assert.deepEqual(decadesFromText("1990'larda geçen bir lise filmi"), [1990]);
    assert.deepEqual(decadesFromText("2000'lerin başında bir aşk"), [2000]);
    assert.deepEqual(decadesFromText('kırk yıllık bir dostluk, 3 arkadaş'), []);
});

test('countries come from Turkish words and city names, without common false positives', () => {
    assert.deepEqual(parseConditions('Kore yapımı bir intikam gerilimi').countries, ['KR']);
    assert.deepEqual(parseConditions('Türk yapımı, köyde geçen dokunaklı bir dram').countries, ['TR']);
    assert.deepEqual(parseConditions("Paris'te geçen bir aşk").countries, ['FR']);
    assert.deepEqual(parseConditions("Roma'da geçen bir film").countries, ['IT']);
    for (const q of ['türkü söyleyen bir köylü', 'final sahnesi şaşırtan bir gerilim', 'Roman uyarlaması bir dram', 'mısır patlağıyla izlenecek komedi', 'zaman döngüsünde sıkışmış biri']) {
        assert.deepEqual(parseConditions(q), { decades: [], countries: [], languages: [] }, q);
    }
});

test('the LLM Setting line adds countries and languages, but decades only come from the request text', () => {
    const doc = 'Genres: Crime\nThemes: mafia\nSetting: United States · English-language · 1970s\nStory: x';
    assert.deepEqual(parseConditions('bir mafya filmi', doc), { decades: [], countries: ['US'], languages: ['en'] });
    assert.deepEqual(parseConditions("70'lerde geçen bir mafya filmi", doc).decades, [1970]);
    assert.deepEqual(parseConditions("İkinci Dünya Savaşı'nda geçen gerçek bir hikâye", 'Setting: Europe · 1940s').decades, []);
    for (const [name, code] of [['France', 'FR'], ['Germany', 'DE'], ['Turkey', 'TR'], ['Hong Kong', 'HK'], ['UK', 'GB']]) {
        assert.deepEqual(parseConditions('x', `Setting: ${name}`).countries, [code], name);
    }
    assert.deepEqual(parseConditions('bir mafya filmi', 'Genres: Crime\nStory: x'), { decades: [], countries: [], languages: [] });
});

test('fits are null without a condition and graded with one', () => {
    assert.equal(eraFit(1986, []), null);
    assert.equal(eraFit(1986, [1980]), 1);
    assert.equal(eraFit(1991, [1980]), 0.5);
    assert.equal(eraFit(2013, [1980]), 0);
    assert.equal(eraFit(null, [1980]), 0);
    const korea = { decades: [], countries: ['KR'], languages: ['ko'] };
    assert.equal(countryFit(['US'], 'en', { decades: [], countries: [], languages: [] }), null);
    assert.equal(countryFit(['KR'], 'ko', korea), 1);
    assert.equal(countryFit(['US'], 'ko', korea), 1);
    assert.equal(countryFit(['US', 'GB'], 'en', korea), 0);
});
