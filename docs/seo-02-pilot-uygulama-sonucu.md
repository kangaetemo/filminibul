# SEO-02 — İlk pilot: yıl/tür listeleri ve filmografiler

16 Ekim 2026. İlk kapsam: 30 yıl/tür listesi + 30 oyuncu + 20 yönetmen. Üretim uygulaması henüz yayımlanmadı; kaynak ve veri doğrulaması bu branch üzerinde yürütülüyor.

## Veri ve kimlik
- 50 kimlik, katalogdaki örnek film üzerinde gerçek cast veya tam Director kredisiyle bulundu. Kişi detayındaki ad/alternatif ad ve person movie_credits içindeki aynı film/rol tekrar doğrulandı. Arama sonucunun ilk satırını kişi saymak veya ilk beş oyuncudan kimlik uydurmak kullanılmadı.
- Salt okunur kimlik işi: [#38812137450](https://github.com/kangaetemo/filminibul/actions/runs/38812137450), 50/50 başarılı.
- Doğrulanmış artifact kaydı: [#38858978659](https://github.com/kangaetemo/filminibul/actions/runs/38858978659), 50 kişi / 2.810 tüm-rol kredi / 1.605 farklı katalog filmi.
- Pilot filmografileri 2025 ve öncesi mevcut katalogla sınırlı. Ana rol başına kapsam 10–90 film. Aktörlük, tam Director ve gelecekteki yazarlık işleri birbirine dönüştürülmez. Ham Writing department/job kaybolmaz; senarist sayfası bu pilotta yok.
- Örnekler: Kemal Sunal 82 oyunculuk filmi, Keanu Reeves 50, Christopher Nolan 12 yönetmenlik filmi. Bunlar bütün filmografi iddiası değildir.

## Kapasite ve erişim
- Yeni iki tablonun ve indekslerin ölçülen toplamı 1.302.528 byte (yaklaşık 1,3 MB). Ölçüm sırasında DB 423.390.355 byte.
- Metadata embedding satırına veya kullanıcı hesaplarına eklenmedi. Anon/authenticated tablo ve RPC erişimi kapalı; RLS açık; sunucu/runner service_role bağlamında okur/yazar.
- Snapshot RPC SECURITY INVOKER kullanır, search_path sabittir. Kişi güncellemesi tek transaction: başarısız veya eksik yanıt eski kredileri silmez.
- 50 kişi, kişi başına 3.000 kredi, en az 5 ana-rol filmi, gerçek anchor, 2025/öncesi katalog üyeliği, 10 MB pilot ve 450 MB DB sınırları korunur.
- Tekrarlı uygulamada çoğalma olmadı. Geçersiz job ile gerçek snapshot denemesinde kişi JSON'u ve kredi hash'i aynı kaldı; test transaction'ı geri alındı.
- Advisor'da yalnız bu iki tablo için RLS Enabled No Policy INFO var. Hizmete özel tasarımda anon/member yetkileri zaten kapalıdır; public okuma politikası açılmadı. [Supabase açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Sayfalar ve sorgular
- /listeler: 30 yıl/tür, 30 oyuncu ve 20 yönetmene taranabilir bağlantılar. Ana sayfaya yeni bölüm eklenmedi.
- /oyuncu/{id}-{slug} yalnız cast; /yonetmen/{id}-{slug} yalnız crew / Director. Film kartları movie_id ile tekilleştirilir; aynı filmdeki karakter bilgileri birleştirilir.
- 24 kart, vote_count DESC NULLS LAST / movie_id ASC. Sayı ve kartlar aynı üyelik snapshot'ından gelir. Günlük katalog etiketli veri cache'i; kart başına kişi/TMDB/embedding isteği yok.
- Fotoğraf yoksa baş harf fallback'i; geçerli fotoğraf mevcut TMDB loader'ından.
- Film detayında yalnız doğrulanmış film/kişi/rol ilişkisi bağlantı olur. Diğer adlar düz metin kalır; çoklu doğrulanmış yönetmen gösterilebilir.
- Kişiye özgü giriş, gerçek katalog adedi, yıl aralığı ve en çok oy alan üç filmden üretilir. Biyografi veya tarih bilgisi uydurulmaz.

## SEO ve bakım
- Manifest dışı ID/rol kombinasyonları ve taşan sayfalar 404. Eski slug ve page=1 için kalıcı yönlendirme; gerçek devam sayfası self canonical.
- Geçici veri bağlantısı hatası boş filmografi/404'e çevrilmez. Preview ve dil/filtre varyantı noindex; Türkçe pilot için sahte EN hreflang yok.
- Person, ItemList, BreadcrumbList ve gerçek film bilgileriyle Movie JSON-LD. JSON metni script enjeksiyonuna karşı kaçırılır; puan/inceleme veya tarih uydurulmaz.
- Sitemap yalnız 30 + 50 pilot landing sayfasını ekler; sahte günlük lastmod yok. Preview sitemap boş.
- Haftalık refresh-seo-people yalnız main'de çalışır; 50 sabit kimliği doğrular ve atomik yeniler. Başarısız kişiyi raporlar, mevcut doğru verisini korur. Retry/Retry-After, artifact ve sonuç raporu vardır. Katalog tag'i bakım sonunda yenilenir.
- OpenAI anahtarı, embedding üretimi veya ücretli metin çağrısı bu akışa verilmez.

## Yayın ve kalan kapsam
Son CI ve 50/50 kişi sayfası SSR kontrolleri başarılı; ayrıntılar aşağıda. Yayın öncesinde PR #3'ün test edilmiş head'i incelenmeli. DB migration'ı zaten uygulanmıştır; SQL'i tekrar çalıştırmak gerekmez. Uygulama henüz main'e birleştirilmedi.

İlk pilotun ardından ayrı işler: Kİ-02 senaryo/hikâye/kaynak eser ayrımlı sayfalar, 10 seçilmiş tematik liste, gerçek cihaz görsel kontrolü ve yayın sonrası Search Console URL/indeks/28 günlük trafik takibi. Bu işler mevcut pilotla tamamlanmış sayılmaz.


## Son doğrulama · 16 Ekim 2026 09:18 Türkiye saati

[#38860035895](https://github.com/kangaetemo/filminibul/actions/runs/38860035895) tüm adımları başarılı: 13 model/liste/ölçüm testi, bağımsız tsc, Next 14 üretim build, yıl/tür fixture + gerçek katalog, kişi fixture + 50/50 gerçek kişi sayfası.

Kişi testi ilk HTML kartları ve film URL'leri, 30 oyuncu/20 yönetmen dizin bağlantısı, rol bazlı gerçek film adedi, aynı filmde çoklu kredi tekilleştirme, Person/ItemList, sayfa 2 self canonical, 308 eski slug/page=1, 404 bilinmeyen/yanlış rol/geçersiz/taşan/çoğul sayfa, noindex dil varyantı, fotoğraf eksikliği, karakter notları ve upstream 500 senaryolarını kapsadı. Matrix detayındaki Keanu bağlantısı ve Movie işaretlemesi doğrulandı.

Runner'daki canlı katalog ölçümü: 50 ilk sayfanın cold p95 süresi 1.831 ms; 5 cache'li isteğin p95'i 119 ms. Beş eşzamanlı ilk kişi isteği ve beş cache'li istek başarılı. Bunlar runner/Next sunucusu ölçümleridir; Vercel üretim performansı yayın sonrası ayrıca ölçülür. Bu aşamada ücretli API çağrısı yok.

Kaynak PR [#3](https://github.com/kangaetemo/filminibul/pull/3) üzerinde; test edilen kod commit'i 27b777fae4e7e9963dd5b25282531def834f8e61. Uygulama henüz üretimde değil. Kİ-01'in 50 kişilik pilot uygulaması doğrulandı; SEO-02'nin ilk 80 sayfalık pilotu yayına hazır, kontrollü yayın ve sonrasındaki Search Console / mobil cihaz görsel kontrolü açık. Kİ-02 ve tematik ikinci aşama ayrı açık işlerdir.


## Üretim yayını · 16 Ekim 2026 10:34 Türkiye saati

Kullanıcı onayıyla PR #3 / 1d121bd main'e birleştirildi. Üretim READY: dpl_BJx8qrBEjFwyxheAKcBk8gBA8gCo; otomatik rapor commit'i 3d616e1d / dpl_89v5SKBWKBD6E6gsPN8YcpE9UUWX de READY. https://filminibul.com/listeler canlıdır. Bu kayıt, önceki “henüz üretimde değil” durumunun yerine geçer.

13 gerçek HTTP kontrolü başarılı: liste/kişi canonical ve index/follow, 24 kartlı sayfalama, 30 oyuncu / 20 yönetmen dizin bağlantısı, Matrix → Keanu, JSON-LD, 308/404/noindex varyantlar. Sitemap 26.866 URL içinde 80 pilot landing + dizini içeriyor; robots izin veriyor. İki yeni deployment'ta son 10 dakikalık error/fatal filtresinde kayıt yok. Kanıt: docs/seo-02-production-verification.json. Ek OpenAI kullanımı 0. Gerçek cihaz görsel kontrolü ve Search Console / 28 günlük trafik ölçümü yayın sonrası açık işlerdir.
