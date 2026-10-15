# API-01 → AR-02 → İÇ-01 doğrulaması

15 Ekim 2026 · Filminibul · SEO-02 bu üç görevin arkasında.

## Durum

| Görev | Sonuç | Açık kalan |
| --- | --- | --- |
| API-01 | Üretimde chat+embedding zinciri ve GitHub bakım anahtarıyla iki küçük çağrı çalıştı | OpenAI proje kimliği, kalan bakiye, bütçe ve uyarı ayarları hesap ekranında giriş gerektiriyor; bunlar doğrulanmadı. Görev kısmi açık. |
| AR-02 | TR/EN API, canlı form, 24 sonuç ve film detayına geçiş doğrulandı | Tekil ölçümler p95 değildir; üretim API yanıtı token usage vermediği için gerçek toplam arama maliyeti bilinmiyor. |
| İÇ-01 | Güncel sayım, maliyet hesabı, yetersiz kaynak ayrımı ve test edilmiş bütçe kontrolü hazır | Toplu çeviri ve afiş işi başlatılmadı; onaylanmış toplam bütçe yok. Görev açık. |
| SEO-02 | Mevcut plan ve ayrı 0. adım raporu korunuyor | İÇ-01 sonrası; kişi kimliği / tam kredi önkoşulları sürüyor. |

## API-01: iki ayrı çalışma ortamı

Üretim `/api/vibe-search` HTTP200 ile sonuç verdi. Kaynak kodda mevcut zincir gpt-4.1-mini → text-embedding-3-large (1536) → Supabase. Anahtar dışarı alınmadan mevcut çalışan yol denendi; hesap bakiyesi sorgulanmış sayılmadı.

GitHub doğrulaması [#38745740817](https://github.com/kangaetemo/filminibul/actions/runs/38745740817) başarılı. Commit: `3d4e6dcb4c596289be463bf5b60a05d801480b31`; yalnız `verify/openai-credit-20261015` doğrulama branch'i. Retry yok; azami iki küçük çağrı, DB/TMDB erişimi yok. Anahtar mevcut Actions secret'ından runner'a geçiyor; yerel ortama alınmadı. Log/artifact'te yanıt metni / anahtar / vektör bulunmuyor.

| Çağrı | Gerçek model | Girdi / çıktı tokenı | Süre | Standart fiyatla tahmin |
| --- | --- | ---: | ---: | ---: |
| Chat | gpt-4.1-mini-2025-04-14 | 15 / 1 | 1.708 ms | $0,00000760 |
| Embedding | text-embedding-3-large | 4 / 0 | 798 ms | $0,00000052 |

Son başarılı çalışmanın toplamı **$0,00000812**. Önceki [#38745318775](https://github.com/kangaetemo/filminibul/actions/runs/38745318775) tek chat çağrısı HTTP200 aldığı halde dar OK yanıt doğrulamasını geçmedi; daha açık istem ve zararsız noktalama toleransı sonrası doğrulandı. Önceki 10 girdi / 2 çıktı tokenı da dahil iki runner çalışması **$0,00001532**. Bunlar API'nin döndürdüğü usage ile standart fiyat hesabıdır, fatura veya kalan bakiye değildir; cached input indirimi hesaba katılmadı.

Runner başlıkları: chat için 5.000 requests ve 2.000.000 tokens; embedding için 5.000 requests ve 1.000.000 tokens oran limitleri döndü. Bu başlıklar bakiye / aylık bütçe / harcama uyarısı bilgisi değildir.

OpenAI faturalama ekranı bu tarayıcıda giriş istiyor. GitHub secret'ı ve Vercel anahtarının aynı projeye ait olduğu bağımsız olarak doğrulanmadı. Her ikisinin mevcut çağrılara yettiği doğrulandı. Anahtar okunmadı / değiştirilmedi; faturalama ayarı veya limit yükseltilmedi.

## AR-02: gerçek arama sonuçları

| Tarif | HTTP / sonuç | Tek istek süresi | İlk sonuçlar |
| --- | --- | ---: | --- |
| Zaman döngüsünde kalan bir karakter ve giderek büyüyen bir gizem | 200 / 24 | 21.859 ms | ARQ, Ölüm Günün Kutlu Olsun, Kelebek Etkisi, Keşif, Sonsuz |
| A lonely astronaut stranded on Mars trying to survive and return home | 200 / 24 | 12.550 ms | Marslı, Yıldızlara Doğru, Yerçekimi, Hayat, Görev: Mars |

İlk sonuçlar tarifin ana temasına uyuyor; tüm 24 sonucun aynı olayı birebir içerdiği veya genel kalite testinin tamamlandığı iddia edilmiyor. Bunlar uçtan uca tek API örnekleri; model / ağ / veritabanı / başlatma süresini ayrıştırmaz. Soğuk/sıcak veya p95 etiketi verilmedi.

Canlı Türkçe formdan sorgu gönderildi; 24 film, zaman döngüsü gerekçeleri ve mevcut film linkleri geldi. İngilizceye geçilince başlıklar / türler / gerekçeler İngilizce oldu. İngilizce tarif formdan da 24 sonuç ve 24 film-detail linki verdi; Marslı kartı `/film/286217-marsli` sayfasını açtı. Hesaba giriş veya kullanıcı listesi / tercih yazımı denenmedi.

Boş sorgu ve 241 karakterlik sorgu HTTP400 ile reddedildi. Kaynak kodda bu kontrol model çağrısından önce. Üretimdeki arama yanıtı usage içermiyor ve ara model belgesi kaydedilmiyor; API/form denemelerinin gerçek token/maliyet toplamı bu nedenle bilinmiyor. Runner'ın çok küçük probe maliyeti bir normal aramanın maliyeti diye sunulmadı. Yeni üretim telemetry veya uygulama yayını eklenmedi.

## İÇ-01: güncel kapsam ve bütçe önerisi

- Canlı katalog: **26.775 film**. Kaynak özet varken TR alanı boş **1.903**; hem kaynak hem TR özet olmayan **1.228** ayrı kapsam. Eski 1.903 retry ID'siyle bugünkü eksiklerin ID kümesi aynı. Tarihsel snapshot güncel diye varsayılmadı.
- 1.903 kaynak toplamı **498.326 karakter / 107.725 o200k_base tokenı**. `tiktoken==0.12.0` ile mevcut model tokenizer'ı kullanıldı. Şema/çerçeve payıyla tahmini 551.177 girdi tokenı. Bu provider usage değildir.
- Mevcut metinde özet yerine etiket / yer tutucu olan **156** kayıt ayrıldı. Örnekler: tek ters eğik çizgi, “Hong Kong movie”, “Details Here”, yalnız dağıtım/yönetmen etiketi. Kaynak veya embedding silinmedi; bu kayıtlar uygun içerik bulunmadan özet uydurularak doldurulmayacak. Kural yalnız belirli açık örüntüleri ayırır; bütün veri kalitesini otomatik doğrulamaz.
- Kalan **1.747 çeviri adayı**, 106.726 kaynak tokenı içeriyor. Çıktının kaynak tokenının 1,5–2,5 katı olduğu varsayımı ve bütün girdiler için muhafazakâr şema payıyla **tek geçiş yaklaşık $0,48–$0,65**. TMDB'de hazır Türkçe bulunursa ücretli aday sayısı azalabilir; çıktı uzunluğu, başarısız deneme ve retry maliyeti artırabilir.
- Eski kodun tüm kayıtları üç kez 1.800 max_tokens'a kadar denediği uç senaryo yaklaşık **$17,10** olabiliyor. Bu beklenen maliyet değildir; salt ortalama tahmine güvenmeden çalışma bütçesi kullanma nedeni.
- **Önerilen toplam tavan $2**. Bu tutar henüz kullanıcı tarafından onaylanmadı. Önce küçük bir parti, ardından aynı toplam bütçenin kalanıyla devam; yeni denemede bütçe baştan $2'ye sıfırlanmamalı.

Hazırlanan kontrol, her API isteğinden önce UTF-8 girdi üst payı + max output tokenı için rezervasyon yapar; eşzamanlı istekler ve retry aynı sayaçtan geçer. usage gelirse standart fiyatla uzlaştırır, timeout / usage belirsizliğinde rezervasyonu harcanmış sayar. Böylece belirsiz çağrı “ücretsiz” kabul edilmez. Bu uygulama sayacı sağlayıcı faturasının yerine geçmez; ayrı iş/harcama ve fiyat değişikliklerini kapsamaz.

`--max-usd` / `MAX_TRANSLATION_USD`, kullanım raporu, kesilmiş çıktıyı reddetme ve kaynak etiketi raporu eklendi. Taslak workflow'da bütçe varsayılanı 0: onaysız otomatik ücretli çeviri başlamaz; metadata bakımı ayrı kalır. Bu değişiklikler **üretim main'ine alınmadı ve içerik işi tetiklenmedi**. Mevcut İngilizce kaynak / embedding yazılmıyor; TR metin ve afiş sayacı compare-and-swap sonucu gerçekten yazılan kayıtları sayıyor. `--retry-failed` ID kapsamını, `--skip-translation` ise metadata işlemlerini koruyor.

İş tamamlandığında çeviri / hazır TMDB Türkçe / temizlik / gerçek afiş değişimi / conflict / hata / uygun kaynak yok / kalan / kullanım ve belirsiz ücret sayıları raporlanmalı; katalog önbelleği yenileme sonucu ayrıca doğrulanmalı. Bu sonuçlar henüz yok; görev açık.

## Kontroller ve dosyalar

94 testin tamamı geçti; ardından gerçek bakım script'inde sıfır bütçe ve uygun olmayan kaynak için iki ek entegrasyon senaryosu da geçti. Ayrı bütçe testleri eşzamanlı rezervasyon, timeout/retry maliyeti, gerçek usage ve kesilmiş çıktı davranışlarını doğruladı. Sözdizimi kontrolleri ve `git diff --check` başarılı. Uygulama kodu değişmediği için yeni web üretim derlemesi yapılmadı.

- `docs/openai-verification-report.json`: gerçek runner kullanım raporu.
- `docs/openai-recovery-checks.json`: canlı API sonuçları, maliyet varsayımları ve kaynak dışlamaları.
- `scripts/catalog/verify_openai.mjs`: küçük erişim kontrolü.
- `scripts/catalog/content_budget.mjs`: bütçe ve kaynak ayrımı.

Resmî fiyat dayanakları: [gpt-4.1-mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [text-embedding-3-large](https://developers.openai.com/api/docs/models/text-embedding-3-large). 15 Ekim 2026 fiyatları sırasıyla $0,40/$1,60 ve $0,13 / milyon token. Model değiştirilmedi. Veritabanı yazımı, migration veya üretim uygulama yayını yapılmadı.
