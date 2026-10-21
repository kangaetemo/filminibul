// Paylaşım önizlemesinin (Open Graph) ortak alanları. Next, alt sayfanın openGraph'ını layout'unkiyle birleştirmez,
// üzerine yazar: kendi openGraph'ını veren her sayfa bunu yaymalı.
export const OG_BASE = { siteName: "Filminibul", locale: "tr_TR" } as const;

// Ön izleme / doğrulama derlemeleri (SITE_ENV=preview) arama motorlarına açılmaz ve sitemap üretmez.
// Canlı sunucuda tanımsızdır.
export const isPreviewSite = () => process.env.SITE_ENV === "preview";
