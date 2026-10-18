// Tarif araması (AR-04): LLM'in tariften çıkardığı temalar ile filmin TMDB keyword'lerinin eşleşmesi.
//
// Neden: 18 Ekim taban ölçümünde (2,17 / 3) en zayıf alan iki şartlı tarifler ("kıyamet sonrası + baba-oğul",
// "köpek + yalnız çocuk"): embedding baskın temayı buluyor, ikinci şartı kaçırıyor. Birden çok temayı karşılayan
// filmlere, nadir temalar daha değerli olacak biçimde (IDF) küçük bir sıralama katkısı verilir.
//
// Eşleşme kelime düzeyinde: "father-son bond" ~ "father son relationship" (ortak içerik kelimelerinin oranı ≥ 0,5).
// Tam eşleşme 1, kısmi eşleşme orana göre. Gizli / genel keyword'ler (keywords_tr.json → hidden) sayılmaz.

const STOP = new Set(["a", "an", "the", "of", "and", "or", "in", "on", "at", "to", "for", "with", "by", "from", "into", "about", "as", "film", "movie", "story"]);

/** Küçük harf, noktalama yerine boşluk, durak kelimeler atılır, basit tekil: "dogs" → "dog". */
export function themeTokens(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter((w) => w && !STOP.has(w))
        .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** İki ifadenin benzerliği: ortak içerik kelimesi / birleşim (0–1). */
export function phraseSimilarity(a, b) {
    const x = new Set(themeTokens(a)), y = new Set(themeTokens(b));
    if (!x.size || !y.size) return 0;
    let shared = 0;
    for (const w of x) if (y.has(w)) shared++;
    return shared / (x.size + y.size - shared);
}

export const MATCH_MIN = 0.5;

/**
 * Her tema için filmde en iyi eşleşen keyword. Bir keyword yalnız bir temaya sayılır.
 * @param {string[]} themes
 * @param {string[] | null | undefined} keywords
 * @param {{ hidden?: Set<string>, idf?: (keyword: string) => number }} [options] idf 0–1 arası ağırlık döndürmeli
 * @returns {{ theme: string, keyword: string, similarity: number, weight: number }[]}
 */
export function matchThemes(themes, keywords, { hidden = new Set(), idf = () => 1 } = {}) {
    const usable = (keywords ?? []).filter((k) => !hidden.has(k));
    const used = new Set();
    const out = [];
    for (const theme of themes) {
        let best = null;
        for (const keyword of usable) {
            if (used.has(keyword)) continue;
            const similarity = theme.toLowerCase() === keyword.toLowerCase() ? 1 : phraseSimilarity(theme, keyword);
            if (similarity >= MATCH_MIN && (!best || similarity * idf(keyword) > best.similarity * best.weight)) best = { theme, keyword, similarity, weight: idf(keyword) };
        }
        if (best) { used.add(best.keyword); out.push(best); }
    }
    return out;
}

/** Tema kapsamı (0–1): eşleşen temaların ağırlıklı toplamı / tema sayısı (en az 4 sayılır; az temalı tarif şişmesin). */
export function themeCoverage(matches, themeCount) {
    const total = matches.reduce((sum, m) => sum + m.similarity * m.weight, 0);
    return Math.min(1, total / Math.max(4, themeCount));
}
