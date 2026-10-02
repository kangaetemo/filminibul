// Seri (TMDB collection) adlarını sitede gösterilecek hâle getirir — TEK KAYNAK.
// Hem site (collections.ts) hem haftalık iş (scripts/catalog/collections_tr.mjs) kullanır.
// Ad "Seri:" etiketiyle gösterildiği için ekler atılır: "Matrix [Seri]" / "The Matrix Collection" → "Matrix" / "The Matrix".

const SUFFIX = /\s*[-–:]?\s*(\[seri\]|serisi|seri|koleksiyonu|collection|the series)\s*$/iu;

/** @param {string} name */
export function cleanCollectionName(name) {
    const cleaned = name.replace(SUFFIX, "").trim();
    return cleaned || name.trim();
}

// TMDB, Türkçe çevirisi olmayan serilerde bazen başka dilde ad döndürür (Тысяча и одна ночь, 天元突破…): bunları alma
const NON_LATIN = /[Ѐ-ӿ֐-ۿ฀-๿぀-ヿ㐀-鿿가-힯]/u;

/** @param {string | null | undefined} name */
export function isUsableTurkishName(name) {
    return !!name && !!name.trim() && !NON_LATIN.test(name);
}
