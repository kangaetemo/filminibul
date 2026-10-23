// Ana sayfanın büyük film karesi havuzu (GR-01).
// Seçim ölçütleri: gerçek film sahnesi (afiş / oyuncu dizilimi değil), görselde yazı veya logo yok, metnin durduğu
// sol taraf sakin, renk ve tür bakımından birbirinden farklı. Görseller katalogdaki TMDB arka planlarıdır;
// film adı ve yılı katalogla aynı olmalı. Yeni kare eklerken ana sayfada açık ve koyu temada okunurluğu kontrol et.

import { filmPath } from "@/lib/filmUrl";

export interface HeroFrame {
    id: number;
    title: string;
    titleEn: string;
    year: number;
    /** TMDB arka plan yolu (w1280 olarak istenir, yükleyici gereken boyuta çevirir) */
    backdrop: string;
}

export const HERO_FRAMES: HeroFrame[] = [
    { id: 157336, title: "Yıldızlararası", titleEn: "Interstellar", year: 2014, backdrop: "/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg" },
    { id: 418472, title: "Ahlat Ağacı", titleEn: "The Wild Pear Tree", year: 2018, backdrop: "/3VUKpgrssr9iQYFAZiAbN5lbw7g.jpg" },
    { id: 693134, title: "Dune: Çöl Gezegeni - Bölüm İki", titleEn: "Dune: Part Two", year: 2024, backdrop: "/o869RihWTdTyBcEZBjz0izvEsVf.jpg" },
    { id: 372058, title: "Senin Adın", titleEn: "Your Name.", year: 2016, backdrop: "/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg" },
    { id: 581734, title: "Nomadland", titleEn: "Nomadland", year: 2021, backdrop: "/563sRDK3rZS31TXCdTY4lfcwrNK.jpg" },
    { id: 313369, title: "Aşıklar Şehri", titleEn: "La La Land", year: 2016, backdrop: "/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg" },
    // GR-03 eklemeleri (23 Ekim 2026)
    { id: 265169, title: "Kış Uykusu", titleEn: "Winter Sleep", year: 2014, backdrop: "/fotAOepDgZPyNJhDgpqHaRJY3aV.jpg" },
    { id: 273481, title: "Sicario", titleEn: "Sicario", year: 2015, backdrop: "/meeileDF37uB8ykIs4iFb713ABO.jpg" },
    { id: 128, title: "Prenses Mononoke", titleEn: "Princess Mononoke", year: 1997, backdrop: "/15WkAcIsR6MxpEwXMipNxZHKC7v.jpg" },
    { id: 426, title: "Ölüm Korkusu", titleEn: "Vertigo", year: 1958, backdrop: "/77aHwg1SCy89rfvQtiruPU58qEV.jpg" },
    { id: 44160, title: "Bal", titleEn: "Honey", year: 2010, backdrop: "/2Pc1ih7yFNqh3Heq79JSKpI3Moi.jpg" },
    { id: 76341, title: "Mad Max: Fury Road", titleEn: "Mad Max: Fury Road", year: 2015, backdrop: "/uT895WNwm0aIJRtGizcQhrejWUo.jpg" },
    { id: 758866, title: "Drive My Car", titleEn: "Drive My Car", year: 2021, backdrop: "/asv6iF7oA6yDLTZnp9DYn46JtCB.jpg" },
    { id: 146233, title: "Tutsak", titleEn: "Prisoners", year: 2013, backdrop: "/3RFmTz5h2UuFWEV4oH00XICBR9y.jpg" },
    { id: 336804, title: "Mustang", titleEn: "Mustang", year: 2015, backdrop: "/hJ3F1mHLCbDtMsc07ZIcD56kXZL.jpg" },
    { id: 120467, title: "Büyük Budapeşte Oteli", titleEn: "The Grand Budapest Hotel", year: 2014, backdrop: "/wMQgG7pzfFoorL4JC0U9YKlkcSl.jpg" },
    { id: 10681, title: "VOL-İ", titleEn: "WALL·E", year: 2008, backdrop: "/ai2FicMUxLCurVkjtYdSvVDWRmS.jpg" },
    { id: 171160, title: "Kelebeğin Rüyası", titleEn: "The Butterfly's Dream", year: 2013, backdrop: "/j1CL0LSWODUyE7yrcgLVfa0cxgj.jpg" },
    { id: 152601, title: "Aşk", titleEn: "Her", year: 2013, backdrop: "/1YnZchmaGc8dchgRPDpR1KGrixA.jpg" },
];

export const heroBackdropUrl = (frame: HeroFrame) => `https://image.tmdb.org/t/p/w1280${frame.backdrop}`;
export const heroFilmPath = (frame: HeroFrame) => filmPath(frame.id, frame.title);

/**
 * Yedek seçim: ilk kare normalde her istekte middleware'de rastgele seçilir (src/middleware.ts → /ana-sayfa/<n>).
 * Bu fonksiyon yalnız "/" sayfası doğrudan üretilirse kullanılır; kare saatte bir değişir.
 */
export function heroFrameIndex(now = Date.now()): number {
    return Math.floor(now / 3_600_000) % HERO_FRAMES.length;
}
