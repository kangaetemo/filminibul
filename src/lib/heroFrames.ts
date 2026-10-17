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
];

export const heroBackdropUrl = (frame: HeroFrame) => `https://image.tmdb.org/t/p/w1280${frame.backdrop}`;
export const heroFilmPath = (frame: HeroFrame) => filmPath(frame.id, frame.title);

/**
 * İlk gösterilecek kare. Ana sayfa saatte bir yeniden üretildiği (ISR) için kare her saat değişir; böylece
 * ziyaretçiler farklı kareler görür, ilk görsel sunucuda seçilip öncelikli yüklenir ve sayfa açılırken
 * görsel sonradan değişmez.
 */
export function heroFrameIndex(now = Date.now()): number {
    return Math.floor(now / 3_600_000) % HERO_FRAMES.length;
}
