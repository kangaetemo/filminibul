import test from 'node:test';
import assert from 'node:assert/strict';
import { matchThemes, phraseSimilarity, themeCoverage, themeTokens } from '../../src/lib/recommend/vibeThemes.mjs';

test('tokens drop punctuation, stop words and simple plurals', () => {
    assert.deepEqual(themeTokens('Father-son bond'), ['father', 'son', 'bond']);
    assert.deepEqual(themeTokens('the dogs of war'), ['dog', 'war']);
    assert.deepEqual(themeTokens('loneliness'), ['loneliness']);
    assert.deepEqual(themeTokens('boss'), ['boss']);
});

test('phrases sharing half their content words match; unrelated ones do not', () => {
    assert.equal(phraseSimilarity('father-son bond', 'father son relationship'), 0.5);
    assert.equal(phraseSimilarity('post-apocalyptic world', 'post-apocalyptic future'), 0.5);
    assert.equal(phraseSimilarity('dog', 'dogs'), 1);
    assert.ok(phraseSimilarity('time travel', 'time loop') < 0.5);
    assert.equal(phraseSimilarity('a the of', 'dog'), 0);
});

test('two-condition request: a film covering both themes outscores one covering only the dominant theme', () => {
    const themes = ['post-apocalyptic world', 'father-son bond', 'survival', 'journey'];
    const road = ['post-apocalyptic future', 'father son relationship', 'survival', 'cannibal'];
    const generic = ['post-apocalyptic future', 'survival', 'zombie', 'virus'];
    const a = themeCoverage(matchThemes(themes, road), themes.length);
    const b = themeCoverage(matchThemes(themes, generic), themes.length);
    assert.ok(a > b, `${a} > ${b}`);
});

test('rare keywords weigh more, hidden keywords never count, one keyword serves one theme', () => {
    const idf = (k) => (k === 'father son relationship' ? 1 : 0.3);
    const matches = matchThemes(['father-son bond', 'father son relationship'], ['father son relationship', 'woman director'], { idf, hidden: new Set(['woman director']) });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].keyword, 'father son relationship');
    assert.deepEqual(matchThemes(['woman director'], ['woman director'], { hidden: new Set(['woman director']) }), []);
    assert.deepEqual(matchThemes(['dog'], null), []);
});

test('coverage is bounded and short theme lists are not inflated', () => {
    const one = matchThemes(['dog'], ['dog']);
    assert.equal(themeCoverage(one, 1), 0.25);
    const many = Array.from({ length: 6 }, (_, i) => `kw${i}`);
    assert.equal(themeCoverage(matchThemes(many, many), many.length), 1);
    assert.equal(themeCoverage([], 10), 0);
});
