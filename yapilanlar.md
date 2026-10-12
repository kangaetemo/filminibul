# Filminibul — yapılanlar

## 12 Ekim 2026 · Tema, dil, film içerikleri, üyelik ve yönetim

### Tamamlanan kod değişiklikleri

- **Açık / koyu tema:** üst menüye tema seçicisi eklendi. İlk ziyarette cihaz tercihi kullanılır; elle seçilen tema tarayıcıda hatırlanır. Koyu tema sıcak kömür / amber, açık tema krem / kum tonları kullanır. İlk açılışta tema parlamasını önleyen başlangıç kodu eklendi.
- **Renk düzenlemesi:** karıştır alanındaki parlak yeşil kaldırıldı; iki temaya uyumlu sakin yüzeyler, amber düğmeler, okunabilir metin ve sınırlar kullanıldı. Favicon paleti de güncellendi.
- **Türkçe / İngilizce arayüz:** üst menüde TR / EN seçicisi; ana sayfa, arama, modlar, karıştırma, film ayrıntıları, kaydedilenler ve üyelik ekranları. Dil tercihi hatırlanır. Film başlıkları / özetleri ve öneri gerekçeleri için ayrı İngilizce alanlar kullanılır. Türkçe canonical adresler korunur. Seçici, sayfaların ISR önbelleğini bozmadan istemcide çalışır.
- **Türkçe özetler:** Türkçe boşsa İngilizceyi doğrudan gösteren geri dönüş kaldırıldı. Kaynak İngilizce `overview` ve embedding korunur; Türkçe metin `tr_overview` alanında tutulur. Türkçe metin henüz yoksa arayüz bunu bildirir.
- **TMDB metin temizliği:** HTML, gereksiz satır / boşluk, görünmez karakter ve HTML entity temizliği; anlamı değiştirmeyen sunum düzeltmeleri.
- **Toplu içerik bakımı:** `scripts/catalog/refresh_content.mjs` mevcut Türkçe metni temizler; eksik metinde önce TMDB'nin Türkçe çevirisine bakar, yoksa İngilizce kaynağı `gpt-4.1-mini` ile Türkçeleştirir. Mevcut Türkçe metni keyfi biçimde yeniden yazmaz. Aynı anda admin tarafından yapılan düzeltmeler karşılaştırmalı PATCH ile korunur.
- **Orijinal dilde afiş:** toplu iş, filmin orijinal diline ait TMDB afişlerini seçer; bulunamazsa mevcut afişi korur. Yeni film ekleme ve katalog dışı film ayrıntılarında da aynı tercih uygulanır. Öneri kartları ayrı ayrı TMDB isteği açmaz.
- **Romantik bölüm:** “Birlikte izleyelim” ifadesi “Romantik bir akşam” olarak düzeltildi. Sonuçlar romantik türü, en az 6,5 puan / 500 oy ile sınırlandırıldı; korku ve belgesel dışlandı.
- **Üyelik:** `/hesap` ekranı; mevcut Firebase projesi üzerinden Google girişi, oturumun korunması ve çıkış. E-postayla kayıt / giriş, doğrulama ve şifre sıfırlama kodu da hazır; mevcut Firebase projesinde parola girişi kapalı olduğu için bu ek yöntem varsayılan olarak arayüzde gösterilmez (`NEXT_PUBLIC_EMAIL_AUTH_ENABLED=false`). Hatalar Türkçe / İngilizce açıklanır. Firebase kodu üyelik sayfasıyla yüklenir; ana sayfaya eklenmez. İzleme listesi bu sürümde tarayıcıda saklanmaya devam eder.
- **Son bakılan filmler:** `/admin/analytics#recent-films` altında tarih, Türkiye saati ve film adı; 50 kayıtlık sunucu sayfalaması. Mevcut `film_opened` olayları kullanılır; yeni tablo / SQL kurulumu gerekmez. Kişi bilgisi gösterilmez.
- **Açıklama düzenleyici:** `/admin/content`; film adı / TMDB ID ile bulma, İngilizce kaynağı görme, Türkçe başlık / özet düzeltme, TMDB metnini önce taslağa alma, kaydetme ve katalog önbelleği yenileme. Oturum ve kaynak kontrolü uygulanır.
- **İçerik işinin yönetimi:** admin içerik ekranından toplu bakım çalıştırılabilir. İlk push tam taramayı başlatır; salı 07.00 Türkiye saati haftalık artımlı bakım yapılır. GitHub Actions raporu ve `docs/content-maintenance-report.json` gerçek sonuçları kaydeder. İş sonunda imzalı istekle katalog önbelleği yenilenir.
- **Gizlilik metni:** isteğe bağlı üyelik, Firebase, dil / tema depolaması ve hesapların anonim ürün olaylarıyla ilişkilendirilmemesi açıklanır.

### Kontroller

- `npx tsc --noEmit`: başarılı.
- `node --test scripts/tests/*.test.mjs`: 12 test başarılı. Analitik doğrulama / arama geçmişi testlerine ek olarak metin temizliği, İngilizce geri dönüşün engellenmesi, orijinal afiş seçimi ve örnek katalog üzerinde çeviri / PATCH akışı doğrulandı.
- `VERCEL_ENV=preview npm run build`: başarılı. Yerelde üretim Supabase anahtarları bulunmadığı için bu derleme gerçek katalog verisiyle yapılmadı; canlı üretim derlemesi Vercel'deki mevcut değişkenleri kullanır.
- Firebase yapılandırmasında `filminibul.com` ve `www.filminibul.com` izinli alan adları arasında doğrulandı.
- Yetkisiz admin içerik / bakım uç noktaları ve imzasız önbellek yenileme isteği reddedilir.

### Yayın sonrası sonuçlar

Üretim yayını `dc61b43` commit’i için Vercel’de READY oldu; `filminibul.com` alan adına bağlandı. Koyu tema ve İngilizce arayüz, film sayfasında İngilizce özet / öneri gerekçeleri ve gezinirken tercihlerin korunması canlıda doğrulandı. Google sağlayıcısı Firebase `createAuthUri` isteğine başarılı Google giriş adresi döndürdü. Yetkisiz admin uç noktaları ve imzasız katalog yenileme isteği canlıda 401 döndü.

Toplu içerik işi: https://github.com/kangaetemo/filminibul/actions/runs/38304738851 · işlem devam ediyor; gerçek sayı raporu bitince eklenir. Toplu çeviri / afiş sayıları iş bitmeden tamamlanmış kabul edilmez. Google girişi için gerçek hesapla kullanıcı etkileşimi gerekir; hesap seçimi kullanıcıya bırakılır. Firebase Google sağlayıcısı etkin, e-posta/parola sağlayıcısı kapalıdır; site üyeliği Google üzerinden sunulur.

Koyu temadaki karıştır alanının canlı ekran görüntüsü: [koyu-tema-onizleme.jpg](docs/koyu-tema-onizleme.jpg).

## 13 Ekim 2026 · Geliştirme takibi

- Kullanıcının isteğiyle `yapilacaklar.md` oluşturuldu. Mobil keşif, bulut listesi, kişisel öneriler, ek modlar, doğal gerekçeler, görsel havuzu, performans, organik trafik, CSV içe aktarma, profil istatistikleri ve platform bildirimleri ayrı maddeler halinde kaydedildi.
- Tamamlanan işlerin yapılacaklar dosyasında işaretlenip bu dosyaya tarih ve doğrulama sonucuyla eklenmesi kuralı tanımlandı.
- Aynı takip kuralı, sonraki oturumlarda da okunması için repo kökündeki `AGENTS.md` dosyasına yazıldı.
- Mevcut toplu çeviri / afiş işi 00.21 Türkiye saati kontrolünde hâlâ devam ediyor; `İÇ-01` açık bırakıldı. Bu kayıtta ürün özellikleri tamamlanmış olarak gösterilmedi.
- Kontrol: konuşulan geliştirme havuzunun maddelerle eşleşmesi ve Markdown / diff biçimi incelendi. Yalnızca dokümantasyon değiştiği için uygulama testleri tekrar çalıştırılmadı.

## 13 Ekim 2026 · İçerik işi hatasının onarımı (İÇ-01 / İÇ-03)

- İlk çalışma [#38304738851](https://github.com/kangaetemo/filminibul/actions/runs/38304738851) `insufficient_quota` nedeniyle başarısız sonuçlandı. Tarama: 26.775 film; rapor: 13.526 çeviri, 874 metin temizliği, 11 TMDB Türkçe özet, 1.903 eksik özet. İlk iki hata çeviri doğrulaması; sonraki 1.901 kayıt kota / durmuş çeviri servisi nedeniyle tamamlanmadı. Yapılmış veritabanı değişiklikleri geri alınmadı. Rapor commit'i `0b17d70`; katalog önbelleği yenileme adımı başarılı.
- İlk rapordaki 8.613 afiş sayısı seçimleri sayıyordu; çeviri hatasında aynı filmdeki afiş PATCH'i de atlandığından bu değer tamamı kaydedilmiş afiş olarak sunulmuyor. İlk rapor `docs/content-maintenance-initial-report.json` içinde korundu.
- Çeviri ile afiş / Türkçe başlık yazmaları ayrıldı. Kota / yetkilendirme sorunu tek duraklama nedeni ve bekleyen kayıt listesiyle raporlanıyor; gerçek TMDB / veritabanı / doğrulama hataları başarısız sonucu üretmeye devam ediyor. Kısmi sonuçlar açık uyarıyla belirtiliyor.
- Bozuk çeviri çıktısında sınırlı yeniden deneme eklendi; boş / İngilizce / aşırı uzun metin kabul edilmiyor. İngilizce kaynak ve embedding değiştirilmez.
- Afiş, başlık ve özet ayrı karşılaştırmalı yazmalarla eşzamanlı düzenlemeleri korur. Sayaçlar yalnızca veritabanının gerçekten güncellediği kayıtlarla artırılır. Kontrol önbelleği metadata yazıldıktan sonra tutulur ve hata durumunda da GitHub cache'e kaydedilir.
- `--skip-translation` ve `--retry-failed` seçenekleri eklendi. Kod push'u kalan kayıtları OpenAI çağrısı yapmadan kontrol eder; elle çalıştırmada iki seçenek ayrı seçilebilir. Önceki rapordaki eksik kayıtlar ve bu taramada işlenmeyen / çakışan kayıtlar devam listesinde korunur.
- Doğrulama: `node --test scripts/tests/*.test.mjs` — 19 test başarılı; kota duraklaması, son denemede kota hatası, çıktı doğrulama tekrarı, kimlik hataları, çevirisiz hedefli tarama, afişin çeviri hatasından bağımsız kaydı ve eşzamanlı düzenleme sayaçları test edildi. `git diff --check` başarılı. Uygulama arayüzü değişmediği için uygulama derlemesi tekrarlanmadı.
- GitHub push'u ve çevirisiz bakım sonucu doğrulama aşamasında. İÇ-03 henüz açık; İÇ-01 kalan Türkçe özetler tamamlanana kadar açık kalır. Kalan çevirilerin sürmesi OpenAI API kotasının açılmasına bağlıdır.
