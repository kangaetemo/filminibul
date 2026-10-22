/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Görseller Vercel optimizasyonu yerine doğrudan TMDB CDN'inden (ücretsiz plan kotası doluyordu)
        loader: 'custom',
        loaderFile: './src/lib/tmdbImageLoader.ts',
    },
    // Güvenlik başlıkları (SEO tarama raporu). Caddy'de değil burada: site.caddy otomatik dağıtılmıyor.
    // HSTS yalnız ana alan adı için (includeSubDomains yok: alt alan adları ayrı yönetiliyor).
    // CSP bilerek yok: AdSense'in yüklediği alan adları sürekli değiştiği için reklamları kırabilir.
    async headers() {
        return [{
            source: '/:path*',
            headers: [
                { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            ],
        }];
    },
};

export default nextConfig;
