// Film sayfasının arama sonucu metni (SEO-03): başlık ve meta açıklaması.
//
// Search Console (28 gün, Ekim 2026): gösterimlerin %99'u film sayfalarından; "X benzer / gibi / benzeri filmler"
// ve "izle" içeren aramalar ortalamadan çok tıklanıyor, ama açıklama yalnız filmin konusuydu. Açıklama artık
// sayfanın sunduğunu söyler: benzer filmlerin ilk birkaçı, varsa Türkiye'deki yayın platformu, sonra konu.
// Türkçe ek sorunu olmasın diye film / platform adına ek getirilmez ("X gibi filmler", "Yayında: Netflix").

export const DESCRIPTION_MAX = 160;
const SITE = " · Filminibul";

const clip = (text, max) => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[\s,;:.–-]+$/, "");
    return cut + "…";
};

function listTitles(titles, total) {
    if (titles.length === 1 && total <= 1) return titles[0];
    const rest = total - titles.length;
    if (rest > 0) return `${titles.join(", ")} ve ${rest} film daha`;
    return `${titles.slice(0, -1).join(", ")} ve ${titles.at(-1)}`;
}

/**
 * @param {{ title: string, year?: number | null, overview?: string | null, similarTitles?: string[], similarCount?: number, platforms?: string[] }} film
 * @returns {{ title: string, description: string }}
 */
export function buildFilmSnippet({ title, year, overview, similarTitles = [], similarCount = similarTitles.length, platforms = [] }) {
    const name = `${title}${year ? ` (${year})` : ""}`;
    const full = `${name}: benzer filmler ve nerede izlenir${SITE}`;
    const pageTitle = full.length <= 70 ? full : `${name} ve benzer filmler${SITE}`;

    const story = (overview ?? "").replace(/\s+/g, " ").trim();
    if (!similarTitles.length) {
        const description = story ? clip(story, 200) : `${title} filmine tema, atmosfer ve hikâyece benzeyen filmler.`;
        return { title: pageTitle, description };
    }

    // En fazla 3 film adı; çok uzunsa daha azıyla yetin (açıklamanın en az yarısı başka bilgilere kalsın)
    let lead = "";
    for (let n = Math.min(3, similarTitles.length); n >= 1; n--) {
        lead = `${title} gibi filmler: ${listTitles(similarTitles.slice(0, n), similarCount)}.`;
        if (lead.length <= DESCRIPTION_MAX * 0.6 || n === 1) break;
    }
    lead = clip(lead, DESCRIPTION_MAX);

    const parts = [lead];
    const where = platforms.length ? `Yayında: ${platforms.slice(0, 2).join(", ")}.` : "";
    if (where && lead.length + 1 + where.length <= DESCRIPTION_MAX) parts.push(where);
    const used = parts.join(" ").length;
    const room = DESCRIPTION_MAX - used - " Konusu: ".length;
    if (story && room >= 40) parts.push(`Konusu: ${clip(story, room)}`);
    return { title: pageTitle, description: parts.join(" ") };
}
