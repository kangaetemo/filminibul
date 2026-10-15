export const PAGE_SIZE = 24;
export const GENRES = {
    28: { slug: "aksiyon", name: "Aksiyon", description: "Takipler, çatışmalar ve fiziksel mücadele etrafında ilerleyen hikâyeler." },
    35: { slug: "komedi", name: "Komedi", description: "Gündelik hayat, toplumsal ilişkiler ve beklenmedik durumlara mizahla yaklaşan filmler." },
    16: { slug: "animasyon", name: "Animasyon", description: "Çizimden bilgisayar animasyonuna farklı tekniklerle kurulan dünyalar; yalnızca çocuk filmleriyle sınırlı değil." },
    27: { slug: "korku", name: "Korku", description: "Doğaüstü tehditlerden insan kaynaklı dehşete, korku duygusunu merkeze alan hikâyeler." },
    18: { slug: "dram", name: "Dram", description: "Karakterlerin kararları, ilişkileri ve yaşadıkları değişim üzerinden ilerleyen filmler." },
    878: { slug: "bilim-kurgu", name: "Bilim Kurgu", description: "Bilim, teknoloji ve olası dünyalar üzerinden insanın yerini sorgulayan hikâyeler." },
    10749: { slug: "romantik", name: "Romantik", description: "Yakınlaşma, ayrılık ve birlikte yaşamın farklı yüzlerini anlatan aşk hikâyeleri." },
} as const;
export type GenreId = keyof typeof GENRES;
const pairs: [number, GenreId][] = [
    [2024,878], [2023,28], [2023,35], [2023,16], [2023,27], [2023,18],
    [2022,878], [2022,28], [2022,10749], [2022,16], [2021,878], [2021,28],
    [2019,16], [2019,27], [2019,35], [2019,18], [2014,878], [2014,28],
    [2014,35], [2014,10749], [2010,878], [2010,28], [2004,10749], [2004,16],
    [1999,878], [1999,18], [1994,18], [1975,35], [1976,35], [1977,35],
];
export const PILOT_LISTS = pairs.map(([year, genreId]) => ({
    year, genreId, slug: `${year}-${GENRES[genreId].slug}-filmleri`,
    title: `${year} ${GENRES[genreId].name.toLocaleLowerCase("tr")} filmleri`,
}));
export type PilotList = typeof PILOT_LISTS[number];
export const getPilotList = (slug: string) => PILOT_LISTS.find(list => list.slug === slug);
export function parsePage(value: string | string[] | undefined): number | null {
    if (value === undefined) return 1;
    if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value)) return null;
    const page = Number(value);
    return Number.isSafeInteger(page) ? page : null;
}
export const pagePath = (path: string, page: number) => page === 1 ? path : `${path}?page=${page}`;
export function listQuery(list: PilotList, offset = 0): string {
    const params = new URLSearchParams({
        select: CARD_COLUMNS, year: `eq.${list.year}`, genres: `cs.${JSON.stringify([{id:list.genreId}])}`,
        order: "vote_count.desc.nullslast,movie_id.asc", limit: "1000", offset: String(offset),
    });
    return `film_embeddings_v3?${params}`;
}
// Deliberately exclude embeddings, source overviews and unnecessary detail fields.
export const CARD_COLUMNS = "movie_id,title,tr_title,original_title,language,year,genres,rating,vote_count,poster_path";
export function jsonLd(value: unknown): string {
    return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
