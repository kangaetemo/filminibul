# Filminibul 🎬

Sevdiğin bir filme benzeyenleri bul ya da aradığın filmi tarif et. Canlı: [filminibul.com](https://filminibul.com)

- **Benzer filmler:** film ara → film sayfası → tema, atmosfer ve hikâyece en yakın 20 film + "neden önerildi?"
- **Tarif et:** "zaman döngüsüne sıkışmış biri" gibi bir cümleden film bulur
- **İki filmi karıştır:** iki filme birlikte benzeyen filmler
- **Ruh hâlleri:** korku, komedi, duygusal… listeleri
- **Film listeleri:** yıl + tür listeleri, oyuncu ve yönetmen filmografileri
- **Hesap (Google ile giriş):** kaydedilen filmler cihazlar arasında eşitlenir; izledim / beğendim / bana göre değil işaretleri ve bunlardan "Senin için" kişisel öneriler
- **Nerede izlenir?** Türkiye'deki yayın platformları (JustWatch) ve platform filtresi
- Fragman, paylaşım, açık / koyu tema, Türkçe / İngilizce arayüz, admin paneli, haftalık otomatik katalog ve içerik bakımı

## Nasıl çalışır

Her film TMDB verisinden (tür, tema keyword'leri, yönetmen, özet) üretilen bir belgeyle OpenAI `text-embedding-3-large` ile vektöre çevrilir ve Supabase'te (pgvector) saklanır. Her filmin en yakın 200 komşusu haftalık olarak önceden hesaplanır; film sayfası bunları hafif bir reranker'la (seri, yönetmen, ortak temalar, kalite) sıralar.

## Teknoloji

Next.js 14 (App Router) · Tailwind CSS · Supabase (Postgres + pgvector, Storage) · Firebase Authentication · OpenAI · TMDB · Vercel · GitHub Actions

## Geliştirme

```bash
npm install
npm run dev
```

Gerekli değişkenler için şablon [`.env.example`](.env.example). Projenin güncel durumu: [`PROJE-DURUMU.md`](PROJE-DURUMU.md); iş takibi: [`yapilacaklar.md`](yapilacaklar.md) ve [`yapilanlar.md`](yapilanlar.md).

---

Film verileri [TMDB](https://www.themoviedb.org/) API'sinden alınır; bu ürün TMDB tarafından onaylanmış ya da sertifikalandırılmış değildir. Yayın bilgisi: JustWatch.
