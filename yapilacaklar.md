# Filminibul — yapılacaklar

Son güncelleme: 13 Ekim 2026 (Türkiye saati).

Bu dosya, konuşulan geliştirmeleri ve açık işleri takip eder. Öncelikler istişarede önerilen sıradır; uygulama kapsamı yeni kararlarla güncellenir. Tamamlanan maddeler burada `[x]` olarak işaretlenir, tarih ve doğrulama bilgileriyle `yapilanlar.md` dosyasına eklenir. Başlatılmış ama bitmemiş işler açık kalır.

## Devam eden içerik işi

- [ ] **İÇ-01 — Toplu Türkçeleştirme ve orijinal afiş taramasının sonucunu doğrula.** İlk çalışma: [GitHub Actions #38304738851](https://github.com/kangaetemo/filminibul/actions/runs/38304738851). İlk çalışma kota nedeniyle kısmi tamamlandı: raporda 13.526 çeviri ve 1.903 eksik Türkçe özet var. Afiş sayacı eski kodda yazmadan önce artırıldığı için 8.613 seçimin tamamının kaydedildiği varsayılmıyor. Kalan çeviriler API kotasının açılmasını bekliyor. Çevrilen / temizlenen özet, değişen afiş, kalan özet ve hata sayılarını raporla. Hataları ve kalan kayıtları ele al; sonucu `yapilanlar.md` dosyasına işle.

- [x] **İÇ-03 — Başarısız içerik işini onar ve doğrula.** Kota / kimlik sorununu tek duraklama nedeni olarak raporla; çeviri hatasında afiş / başlık güncellemesini koru. Yalnızca veritabanına yazılan değişiklikleri say; başarısız çalışmada kontrol önbelleğini sakla. Kalan kayıtları çeviri harcaması yapmadan tekrar kontrol et. Doğrulama: [#38311949271](https://github.com/kangaetemo/filminibul/actions/runs/38311949271) başarılı; 1.903 film kontrol edildi, 526 afiş kaydedildi, sıfır hata / çakışma. Rapor ve kontrol önbelleği saklandı; site önbelleği yenilendi. OpenAI çağrısı yapılmadı. İÇ-01 kapsamında kalan 1.903 çeviri kota bekliyor.

## P0 — Mobil keşif ve bulut listesi

- [ ] **MB-01 — Mod sayfasındaki düğmeyi yeniden adlandır.** “Karıştır” yerine “Başka filmler göster” kullan; yeni seçki geldiğini açıkça anlat. İngilizce karşılığını da ekle.
- [ ] **MB-02 — Mobil film sayfasında önerileri öne al.** Küçük afiş ve başlığı yan yana yerleştir; uzun tanıtımın önerileri aşağı itmesini azalt.
- [ ] **MB-03 — Mobil özeti kısaltılabilir yap.** İlk birkaç satırı göster, “Devamını oku” ile aç; tam açıklama erişilebilir kalsın.
- [ ] **MB-04 — Film sayfasının bölüm sırasını düzenle.** Kısa film tanıtımından sonra benzer filmler gelsin. Oyuncular ve ayrıntılı bilgiler aşağıdaki açılabilir alanlarda olsun. Üst tanıtımda fragman düğmesi, önerilerden sonra büyük fragman bölümü bulunsun.
- [ ] **MB-05 — Ana sayfada karıştırmayı ilk ekranda keşfedilebilir yap.** Üst alanda “Benzerini bul”, “Tarif et”, “İki filmi karıştır” girişlerini açıkça sun. Büyük karıştır tanıtımı aşağıda ayrıca bulunabilir.
- [ ] **MB-06 — Mobil görünürlüğü ve kaydırma performansını doğrula.** Dar ekranlarda taşma, bölüm uzunluğu, dokunma hedefleri ve film önerilerine ulaşma adımlarını kontrol et.
- [ ] **BL-01 — Kaydedilen filmleri hesaba bağlı bulut listesine taşı.** Mevcut Google / Firebase kimliği ile veritabanı bağlantısını kur; her kullanıcı yalnızca kendi listesine erişebilsin.
- [ ] **BL-02 — Tarayıcıdaki eski listeyi hesaba aktarma akışı ekle.** İlk girişte birleştirmeyi sun; aynı film iki kez oluşmasın ve eski kayıtlar kaybolmasın.
- [ ] **BL-03 — Cihazlar arasında listeyi eşitle.** Kaydetme / kaldırma işlemleri telefonda ve bilgisayarda aynı hesabın listesine yansısın; bekleme ve hata durumları anlaşılır olsun.
- [ ] **BL-04 — Oturum ve liste sınırlarını düzenle.** Hesapsız kullanım, giriş, çıkış ve farklı hesaplara geçişte doğru listeyi göster; tarayıcı önbelleğini kullanıcıya göre ayır.
- [ ] **İÇ-02 — Özet yok mesajını gerçek durumla uyumlu yap.** Film bazında çeviri durumu izlenmediği sürece “Türkçe özet hazırlanıyor” yerine “Türkçe özet henüz bulunmuyor” kullan. Kaynak metin varsa “Orijinal özeti göster” seçeneği ekle.

## P1 — Kişisel öneriler, modlar ve açıklamalar

- [ ] **KŞ-01 — “Senin için” kişisel öneri alanı ekle.** Kaydedilen filmlerdeki ortak tema ve tercihlerden yeni filmler öner. İlk aşamada mevcut öneri altyapısını kullan.
- [ ] **KŞ-02 — İlgi, izleme ve beğeni sinyallerini ayrı tut.** Kaydetmek ilgi sinyalidir. “İzledim”, “Beğendim” ve “Bana göre değildi” durumlarını destekle; kaydedilen her filmi beğenilmiş sayma.
- [ ] **KŞ-03 — Öneri isabeti geri bildirimi topla.** “Bu öneri uydu / uymadı” sinyalini film beğenisinden ayrı kaydet; ilgiyi, izlemeyi ve öneri alakasını birbirine karıştırma.
- [ ] **KŞ-04 — Kişisel önerilerde tekrarları ve tekdüzeliği azalt.** Kaydedilmiş / izlenmiş / reddedilmiş filmleri uygun şekilde dışla; farklı yönetmen ve serilere yer ver.
- [ ] **KŞ-05 — Kişiselleştirmenin gerekçesini göster.** Örneğin “Matrix ve İsyan’ı kaydettiğin için”. Listesi boş kullanıcıya başlangıç seçimi veya genel keşif sun.
- [ ] **MD-01 — Ek modları kesinleştir ve ekle.** Adaylar: “İçimi ısıtsın”, “Kafamı dinlendireyim”, “Ters köşe olsun”, “Sürükleyip götürsün”. Her modun ayrı aday havuzu ve uygun filtresi olsun.
- [ ] **MD-02 — Gizli cevher keşfini güçlendir.** Az bilinen ama güçlü filmler için ayrı keşif alanı / mod tasarla; düşük oy sayısını tek başına kalite sayma.
- [ ] **GK-01 — Etiketleri doğal öneri gerekçelerine dönüştür.** Ortak temayı, yönetmeni veya diğer doğrulanmış sinyalleri okunabilir cümlelerle anlat; filmde bulunmayan olay veya ilişki uydurma.
- [ ] **GK-02 — Gerekçe üretimini ekonomik kur.** İlk aşamada doğrulanmış eşleşmelerden kontrollü cümle kalıpları kullan; her kart gösteriminde ayrıca model çağrısı gerektirmesin. Türkçe / İngilizce karşılıklarını birlikte ele al.
- [ ] **GR-01 — Ana sayfa film karesi havuzu ekle.** “Bu kare: Yıldızlararası” alanına farklı filmlerden 5–6 görsel aday ekle; ziyaret başına bir kare seç ve küçük oklarla geçiş sun. Film adı / bağlantısı gösterilen kareyle birlikte değişsin.
- [ ] **GR-02 — Görsel değişimin mobil maliyetini kontrol et.** İlk görünür görseli öncelikli yükle; ek görselleri gerektiğinde getir. Görseller arama ve diğer keşif yollarının görünürlüğünü azaltmasın.

## P1 — Öneri kalitesi, performans ve organik trafik

- [ ] **ÖM-01 — Öneri motorunu ölçülebilir biçimde değerlendir.** Sabit örnek filmler / sorgular ve kullanıcı geri bildirimleri üzerinden alaka, çeşitlilik ve tekrarları karşılaştır.
- [ ] **ÖM-02 — Öneri kullanım akışını ölç.** Önerinin görülmesi, filme tıklama, kaydetme, izleme ve isabet geri bildirimini ayrı ölç; tıklamayı tek başına başarılı öneri sayma.
- [ ] **PF-01 — Öneri altyapısı ve önbelleği iyileştir.** Tekrarlayan sorguları, pahalı veritabanı işlemlerini ve API beklemelerini incele. Kullanıcıya özel sonuçları farklı hesaplar arasında paylaşma.
- [ ] **PF-02 — Maliyet ve gecikmeyi birlikte takip et.** Film sayfaları ve öneri uç noktalarının CPU / yanıt sürelerini ölç; iyileştirmelerin öneri kalitesini bozmadığını doğrula.
- [ ] **SEO-01 — Organik film keşfi trafiğini güçlendir.** Gerçek film önerisi aramalarına yanıt veren film / mod / keşif sayfalarını, başlıkları ve iç bağlantıları planla; taranabilirlik ve canonical davranışını kontrol et.

## P2 — İçe aktarma, profil ve bildirimler

- [ ] **İA-01 — Letterboxd / IMDb CSV içe aktarma ekle.** Film eşleştirmelerini önizlet; belirsiz eşleşmeleri kullanıcıya çözdür. Tekrarları ayıkla; kaydedilen, izlenen ve puanlanan filmleri uygun durumlara aktar.
- [ ] **PS-01 — Kişisel film istatistikleri ekle.** Kullanıcının gerçek kayıtlarından sevilen türler, dönemler ve keşfedilen filmleri göster. İzlemek istenen filmlerle beğenilen / izlenmiş filmleri ayır.
- [ ] **HB-01 — “Platforma gelince haber ver” akışını tasarla.** Kaydedilen filmlerin kullanıcının seçtiği platformlara gelişini takip et. Bildirim kanalı, izinler, veri güncelliği ve çalışma maliyetini uygulamadan önce netleştir.

## Takip kuralı

1. Yeni istek veya karar ilgili maddelere eklenir; kapsam değişirse açıklama güncellenir.
2. İşe başlanırken durum ve gerekiyorsa bağımlılıklar belirtilir.
3. Kod, veri işlemi ve gerekli doğrulama tamamlanınca madde `[x]` yapılır.
4. Aynı değişiklikte `yapilanlar.md` dosyasına tarih, ilgili madde kodu, yapılan iş, kontroller ve kalan sınırlamalar yazılır.
5. GitHub’a push / canlı yayın yapıldıysa sonucu ve ilgili commit ya da çalışma bağlantısı kaydedilir. Devam eden arka plan işleri tamamlanmış gösterilmez.
