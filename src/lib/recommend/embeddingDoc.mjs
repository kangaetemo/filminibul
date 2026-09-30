// v3 embedding belgesi — TEK KAYNAK. Hem offline script'ler (scripts/embed/embed_v3.mjs) hem site
// (admin'den film ekleme) bunu kullanır: yeni filmler mevcutlarla aynı embedding uzayında kalmalı.
// Bu dosyayı değiştirirsen tüm katalogu yeniden embed etmen gerekir.

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMS = 1536;

// Film hakkında bilgi taşımayan TMDB meta keyword'leri
const NOISE_KEYWORDS = new Set([
    "duringcreditsstinger",
    "aftercreditsstinger",
    "woman director",
    "3d",
    "imax",
    "short film",
    "live action remake",
]);

const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const languageName = new Intl.DisplayNames(["en"], { type: "language" });
const safe = (fn, code) => {
    try {
        return fn.of(code) ?? code;
    } catch {
        return code;
    }
};

/**
 * Embed edilecek belge. Başlık bilerek YOK: "Triangle" ↔ "Triangle of Sadness" gibi
 * isim benzerliğinin cosine'i şişirmesini engeller. Temalar özetten önce gelir.
 *
 * @param {{ genres?: {id:number,name:string}[] | null, keywords?: string[] | null, director?: string | null,
 *           countries?: string[] | null, language?: string | null, year?: number | null, overview?: string | null }} f
 * @returns {string}
 */
export function buildDoc(f) {
    const lines = [];
    const genres = (f.genres ?? []).map((g) => g.name);
    const keywords = (f.keywords ?? []).filter((k) => !NOISE_KEYWORDS.has(k));
    if (genres.length) lines.push(`Genres: ${genres.join(", ")}`);
    if (keywords.length) lines.push(`Themes: ${keywords.join(", ")}`);
    if (f.director) lines.push(`Director: ${f.director}`);

    const setting = [];
    if (f.countries?.length) setting.push(f.countries.map((c) => safe(regionName, c)).join(", "));
    if (f.language) setting.push(`${safe(languageName, f.language)}-language`);
    if (f.year) setting.push(`${Math.floor(f.year / 10) * 10}s`);
    if (setting.length) lines.push(`Setting: ${setting.join(" · ")}`);

    if (f.overview) lines.push(`Story: ${f.overview}`);
    return lines.join("\n");
}
