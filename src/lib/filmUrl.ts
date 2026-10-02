// Film sayfası adresleri: /film/126986-devlet-kusu
// Baştaki TMDB id filmi kesin bulur (aynı adlı filmler çakışmaz, başlık değişse de eski bağlantı çalışır);
// arkadaki başlık paylaşılan bağlantıyı okunur yapar. Sadece id'li ya da eski başlıklı adresler film sayfasında
// kalıcı yönlendirmeyle güncel adrese gider.

const TURKISH: Record<string, string> = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c" };

/** "Kurtlar Vadisi: Irak" → "kurtlar-vadisi-irak". Latin harfi olmayan başlıklarda (ör. Japonca) boş döner. */
export function slugify(title: string): string {
    const slug = title
        .toLocaleLowerCase("tr")
        .replace(/[ığüşöç]/g, (c) => TURKISH[c])
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "") // é → e
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (slug.length <= 80) return slug;
    // Uzun başlıkta kelime ortasından kesme
    const cut = slug.slice(0, 80);
    return cut.slice(0, cut.lastIndexOf("-") > 40 ? cut.lastIndexOf("-") : 80);
}

export function filmPath(id: number, title: string): string {
    const slug = slugify(title);
    return slug ? `/film/${id}-${slug}` : `/film/${id}`;
}

/** Adres parçasından id: "126986-devlet-kusu", "126986-Eski-Baslik" ve "126986" → 126986 */
export function parseFilmParam(raw: string): number | null {
    // Başlık kısmı ne olursa olsun id yeter; film sayfası güncel adrese yönlendirir
    const m = /^(\d+)(?:-.*)?$/.exec(raw);
    const id = m ? Number(m[1]) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
