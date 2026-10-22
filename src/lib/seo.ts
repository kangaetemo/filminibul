// Paylaşım önizlemesinin (Open Graph) ortak alanları. Next, alt sayfanın openGraph'ını layout'unkiyle birleştirmez,
// üzerine yazar: kendi openGraph'ını veren her sayfa bunu yaymalı.
// Kendi görselini vermeyen sayfalar (listeler, modlar, ana sayfa…) varsayılan paylaşım görselini kullanır;
// film/oyuncu sayfalarının images alanı bunun üzerine yazar.
export const OG_BASE = {
    siteName: "Filminibul",
    locale: "tr_TR",
    images: [{ url: "/og-varsayilan.png", width: 1200, height: 630, alt: "Filminibul - Sevdiğin filme benzeyenleri bul" }],
};

// Ön izleme / doğrulama derlemeleri (SITE_ENV=preview) arama motorlarına açılmaz ve sitemap üretmez.
// Canlı sunucuda tanımsızdır.
export const isPreviewSite = () => process.env.SITE_ENV === "preview";
