// next/image için özel yükleyici: görseller Next'in optimizasyonundan geçmeden, istenen genişliğe en yakın
// TMDB hazır boyutunda kendi alan adımızdan (/img/..., bkz. ownImage.ts) gelir.
// Neden optimizasyon yok: Vercel ücretsiz planında görsel optimizasyonu kotası 25 bin filmlik katalogda doldu
// (402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, 2026-10-02); TMDB her görseli bu boyutlarda zaten hazır veriyor.
import { ownImageUrl } from "./ownImage";

export default function tmdbImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
    return ownImageUrl(src, width);
}
