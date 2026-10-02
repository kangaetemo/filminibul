// next/image için özel yükleyici: görseller Vercel'in optimizasyon servisinden geçmeden doğrudan TMDB'nin
// CDN'inden, istenen genişliğe en yakın hazır boyutta gelir.
// Neden: Vercel ücretsiz planında görsel optimizasyonunun aylık kotası var; 25 bin filmlik katalogda doldu
// (402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, 2026-10-02). TMDB her görseli bu boyutlarda zaten hazır veriyor.

const SIZES = [45, 92, 154, 185, 300, 342, 500, 780, 1280];
const TMDB = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)(\/.+)$/;

export default function tmdbImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
    const m = TMDB.exec(src);
    if (!m) return src; // TMDB dışı (yerel) görsel: olduğu gibi
    const size = SIZES.find((s) => s >= width) ?? SIZES[SIZES.length - 1];
    return `https://image.tmdb.org/t/p/w${size}${m[1]}`;
}
