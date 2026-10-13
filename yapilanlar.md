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
- Onarım [a50fc96](https://github.com/kangaetemo/filminibul/commit/a50fc968c0e42fbc3ee9c05afc6c12402bdda0c3) ile GitHub'a pushlandı. Yeni bakım [#38311949271](https://github.com/kangaetemo/filminibul/actions/runs/38311949271) başarılı tamamlandı. Gerçek sonuç: 1.903 film kontrol edildi; **526 orijinal dil afişi veritabanına kaydedildi**, sıfır hata ve sıfır düzenleme çakışması. Bu çalışma OpenAI çağrısı / yeni çeviri yapmadı.
- Son rapor `e05893f` commit'iyle kaydedildi; kontrol önbelleği `content-audit-38311949271-1` anahtarıyla saklandı. Rapor artifact'i ve katalog önbelleği yenileme adımı başarılı. Son rapor `status: partial` olarak 1.903 bekleyen Türkçe özeti açıkça gösteriyor; başarılı workflow sonucu bütün çevirilerin tamamlandığı anlamına gelmiyor.
- İÇ-03 tamamlandı. İÇ-01 açık: kalan 1.903 Türkçe özet için OpenAI API kotası açılmalı. Kota açıldıktan sonra manuel çalıştırmada `retry_failed=true`, `skip_translation=false` ile yalnızca eksikler sürdürülebilir. Kayıtlar silinmez; mevcut Türkçe metinler yeniden çevrilmez.

## 13 Ekim 2026 · Mobil keşif paketi (MB-01–MB-06 / İÇ-02)

- Ana sayfanın üst arama alanına “Benzerini bul”, “Tarif et” ve “İki filmi karıştır” girişleri eklendi. İlk ikisi doğru arama biçimini açar; karıştırma doğrudan mevcut `/karistir` akışına gider. Mobil hero boşlukları azaltıldı; büyük karıştır tanıtımı aşağıda da korunur.
- Film tanıtımı mobilde 96 px afiş ve yanındaki başlık / yıl / tür / puan ile kompaktlaştırıldı. Dekoratif arka plan 80 px yüksekliğe indirildi; masaüstündeki geniş kapak korunur. Tekrarlayan mobil tür rozetleri kaldırıldı.
- Türkçe / İngilizce özet mobilde üç satırla başlar. Gerçek taşmayı ölçen `ResizeObserver` ile yalnızca gerektiğinde “Devamını oku / Daha az göster” düğmesi sunulur; masaüstünde tam özet gösterilir. Düğmenin açılma durumu ve metin ilişkisi erişilebilirlik özellikleriyle belirtilir.
- Benzer filmler kısa tanıtımın hemen arkasına taşındı. Oyuncular, yönetmen, seri ve dış bağlantılar önerilerden sonra açılabilir ayrıntı alanına alındı; mobil yayın platformları tanıtımın altındaki kapalı “Nerede izlenir?” panelinde erişilebilir tutulur; uzun oyuncu / yönetmen alanıyla birlikte önerilerin altına gömülmez. Masaüstü yayın platformları afiş altında korunur. Büyük fragman önerilerden sonra gelir; üstteki fragman düğmesi aynı modalı açmaya devam eder.
- Mod sayfasında düğme “Başka filmler göster” / “Show more films” ve yenileme simgesiyle güncellendi. Yeni seçki getiren mevcut sunucu akışı korunur.
- Özet yok mesajı “Türkçe özet henüz bulunmuyor” olarak düzeltildi. Türkçe eksik ve kaynak metin mevcutsa kullanıcı “Orijinal özeti göster” ile kaynağı açabilir. Bu paket çeviri / embedding API çağrısı eklemez; kalan toplu çeviriler beklemede tutulur.
- Yerel kontroller: `npx tsc --noEmit`, `VERCEL_ENV=preview npm run build` ve `git diff --check` başarılı. Yerel ortamda üretim Supabase anahtarları olmadığı için gerçek katalog akışı yayında doğrulanacak. React bileşenlerinin sunucu / istemci sınırları, küçük özet props'ları, gözlemci temizliği, native ayrıntı panelleri ve TR / EN metinleri incelendi.
- İlk paket [f44b996](https://github.com/kangaetemo/filminibul/commit/f44b99699e450b022427edd8f365ab42c8152940) ile GitHub'a pushlandı. Vercel `dpl_2jVkdRs4CsSD8MsSoQsbgV7Bai2y` üretim yayını READY oldu ve `filminibul.com` alan adına bağlandı.
- Canlı tarayıcı doğrulaması: ana sayfada üç giriş, film aramasında Matrix sonuçları, “Tarif et” ile doğru alanın açılması, yeni karıştır bağlantısıyla `/karistir` sayfasına erişim; Matrix sayfasında önerilerin ayrıntı / büyük fragmandan önce gelmesi, ayrıntı panelinin açılıp kapanması, üst fragman modalı ve YouTube iframe'i; TR / EN film metinleri; mod yenilemesinde 20 filmlik seçkiye 19 farklı film gelmesi ve “Show more films” karşılığı doğrulandı. Doğal dil araması gönderilmedi; bu kontrol ücretli model çağrısı yapmadı.
- Türkçe özeti eksik film `784161` üzerinde doğru eksik mesajı ve kullanıcı açınca İngilizce kaynağın görünmesi doğrulandı (İÇ-02). İncelenen masaüstü sayfalarında yatay taşma yok; site URL'sine ait tarayıcı hata kaydı görülmedi. Tarayıcı eklentisinin kendi hata mesajları site hatası sayılmadı.
- Canlı keşif girişlerinin ekran görüntüsü: [kesif-girisleri-onizleme.jpg](docs/kesif-girisleri-onizleme.jpg). Görüntü masaüstü test tarayıcısından alınmıştır.
- Son küçük düzenleme: mobilde yayın platformları tanıtımın altındaki kapalı panelde korunur; uzun orijinal başlık iki satırla sunulur, ana film başlığı tam gösterilir. Son düzenleme [3df0800](https://github.com/kangaetemo/filminibul/commit/3df08003e5cd1a775978993fa4aa244ec6b11d47) ile pushlandı; yerel üretim derlemesi başarılı. Vercel `dpl_2aCYTRDe685rS2ArJvDYbxmgHF8H` üretim yayını READY. Canlı Matrix yanıtında panelin mevcut, başlangıçta kapalı ve masaüstünde gizli olduğu; normal masaüstü platformlarının afiş altında kaldığı ve 20 benzer filmin yüklendiği doğrulandı. Bu DOM kontrolü gerçek telefonda panel etkileşimi testi olarak sunulmaz.
- MB-06 kapsamında gerçek telefon / dar ekran görsel, özet açma-kapama ve kaydırma performansı kontrolü açık; test tarayıcısı desteklenen API'de telefon emülasyonu sunmuyor. Gerçek S25 FE ölçümü veya dar ekran etkileşimi yapılmış gibi kaydedilmez.


## 13 Ekim 2026 · Yeni geliştirme isteklerinin kaydı

- Kullanıcının yeni talepleri `yapilacaklar.md` dosyasına eklendi: harici puanlar (PU-01–PU-03), film / karıştır paylaşımı (PY-01–PY-02), kaynak metinleri ve TMDB bağlantısının sadeleştirilmesi (KYN-01–KYN-03), oyuncu / yönetmen / senarist listeleri (Kİ-01–Kİ-02) ve kompakt platform filtresi (PF-03).
- Koşullu kaldırma istekleri, kesin “TMDB’de incele” kaldırma isteğinden ayrı kaydedildi. Resmî kaynakların bağlantıları ve puan entegrasyonlarının veri izni bağımlılıkları takip dosyasına not edildi. Özellikler tamamlandı diye işaretlenmedi.
- Paylaşımda sistem paylaşımı / bağlantı kopyalama ve iki film kimliğinin korunması; kişi sayfalarında kişi kimliği ve rol ayrımı; platform filtresinde çoklu seçim, URL, hatırlanan tercih ve seçili sayı göstergesi istişare önerisi olarak kaydedildi. Bunlar bu turda ürün değişikliği olarak uygulanmadı.
- Kontrol: mevcut footer, gizlilik metni ve platform filtresi incelendi; resmî TMDB, IMDb ve Rotten Tomatoes sayfaları açılarak kaynak şartları doğrulandı. Yeni taleplerle takip maddelerinin eşleşmesi ve `git diff --check` kontrol edildi. Yalnızca iki takip dosyası değiştiği için uygulama derlemesi / testleri tekrarlanmadı.
