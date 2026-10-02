/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Görseller Vercel optimizasyonu yerine doğrudan TMDB CDN'inden (ücretsiz plan kotası doluyordu)
        loader: 'custom',
        loaderFile: './src/lib/tmdbImageLoader.ts',
    },
};

export default nextConfig;
