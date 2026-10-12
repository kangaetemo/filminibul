// Shared by the website and the catalog maintenance job. Never rewrite the
// English source used for embeddings when cleaning the Turkish display copy.
export function cleanOverview(value) {
    if (typeof value !== "string") return null;
    const text = value
        .replace(/<\/?(?:br|p|div)[^>]*>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;|&#34;/gi, '"')
        .replace(/&apos;|&#39;/gi, "'")
        .replace(/&#(\d+);/g, (_, n) => { const code = Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; })
        .replace(/[\u0000-\u001f\u007f\u200b\ufeff]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text || null;
}

export function looksEnglish(value) {
    const text = cleanOverview(value);
    if (!text) return false;
    const english = text.match(/\b(the|and|with|when|who|their|his|her|from|after|into|they|while|about|finds|young|must|has)\b/gi) || [];
    const turkish = text.match(/\b(ve|bir|bu|ile|için|olan|ancak|olarak|onun|sonra|kendi|yaşayan|hayatını|genç|fakat|iki|birlikte)\b/gi) || [];
    return english.length >= 3 && english.length > turkish.length * 2;
}

export function turkishOverview(tr, original, language) {
    const preferred = cleanOverview(tr);
    if (preferred && !looksEnglish(preferred)) return preferred;
    const source = cleanOverview(original);
    return language === "tr" && source && !looksEnglish(source) ? source : null;
}

export function selectOriginalPoster(posters, language, fallback) {
    if (!language) return fallback || null;
    const candidates = (posters || []).filter(p => p.iso_639_1 === language);
    candidates.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0) || (b.vote_count || 0) - (a.vote_count || 0) || (b.width || 0) - (a.width || 0));
    return candidates[0]?.file_path || fallback || null;
}
