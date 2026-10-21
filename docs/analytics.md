# Filminibul ürün istatistikleri

## Kurulum

> **Durum (21 Ekim 2026):** canlıda kurulu ve açık. Tablolar, RPC'ler ve pg_cron işi 20 Ekim'de VPS'teki self-host Supabase'e taşındı. Aşağıdaki adımlar yeniden kurulum içindir; Supabase Studio dışarı açık olmadığından SQL sunucuda `docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < dosya.sql` ile uygulanır (`ops/vps/README.md`). Gece yedeğinden geri yüklemede tablolar yedekle gelir, cron işi ayrıca kurulur (aynı belge, 3. adım).

1. `scripts/sql/analytics.sql` dosyasını uygula. Mevcut katalog tablolarına yazmaz. Şema yeniden çalıştırılabilir.
2. `create extension if not exists pg_cron;` ile **pg_cron**'u etkinleştir, ardından `scripts/sql/analytics_cron.sql` dosyasını uygula. Günlük iş 03:15 Türkiye saatinde özet çıkarır ve eski kayıtları temizler. Cron kurulmadan olay toplamayı açma.
3. Sunucudaki `/opt/filminibul/site.env` dosyasında `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ve `ADMIN_PASSWORD` değişkenlerinin bulunduğunu kontrol et. Servis anahtarı `NEXT_PUBLIC_` ile başlamamalı.
4. Aşağıdaki iki değişkeni aynı dosyaya ekle ve siteyi yeniden derle:

   ```env
   ANALYTICS_ENABLED=true
   NEXT_PUBLIC_ANALYTICS_ENABLED=true
   ```

   Yerel geliştirmede ve deneme kopyalarında ikisini de `false` tut. `NEXT_PUBLIC_` değeri build sırasında pakete girer; değiştirince yeni derleme gerekir. Toplamayı acilen durdurmak için sunucu bayrağını (`ANALYTICS_ENABLED`) `false` yapıp `systemctl restart filminibul` yeterli; olay uç noktası gelen olayları yazmadan boş yanıt döner.
5. `/admin` üzerinden **Ürün istatistiklerini aç** bağlantısına gir. Veriler yalnızca bu kurulumdan sonra birikir; Vercel Analytics geçmişi buraya aktarılmaz.
6. Deneme için ayrı, admin oturumu olmayan bir sekme/tarayıcı kullan. Bir film aç, benzer kartların görünmesini en az bir saniye bekle ve birine tıkla. Film adı ara ve yazmayı durdur. Panelde film açma, arama, öneri gösterimi ve tıklaması görünmeli. Admin çerezi taşıyan istekler sayılmaz.

Cron kontrolü:

```sql
select jobname, schedule, active from cron.job
where jobname = 'filminibul-analytics-retention';
select status, return_message, start_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'filminibul-analytics-retention')
order by start_time desc limit 5;
```

## Kaydedilenler ve ölçüm tanımları

| Olay | Ne zaman sayılır? |
| --- | --- |
| `page_view` | Desteklenen sayfanın açık, görünür sekmede açılması; URL başına ziyaret içinde bir kez |
| `film_opened` | Film sayfasının açılması; ayrıca `page_view` gönderilmez |
| `search_performed` | Film/karıştırma seçimi aramasında sonuç geldikten sonra 1,2 saniye yazma durması veya film seçimi; tarif aramasında sonuç sayfasının başarıyla açılması |
| `film_clicked` | Arama, tarif, mod veya karıştırma sonuçlarında filme tıklama; klavye seçimi de dahil |
| `recommendation_impression` | Benzer film kartının en az %50'sinin görünür sekmede 1 saniye görünmesi |
| `recommendation_clicked` | Benzer filme tıklama; kaynak film, hedef film ve 1'den başlayan sıra |
| `blend_completed` | Karıştırma sonuçlarının sunucudan başarıyla gelmesi; boş sonuç da 0 adetle sayılır, sunucu hatası sayılmaz |
| `mood_selected` | Mod bağlantısı seçimi |
| `trailer_clicked` | Fragman penceresinin açılması; video izlenme süresi veya tamamlanması değildir |
| `platform_clicked` | Mevcut “tüm seçenekler” JustWatch bağlantısına tıklama; platform logoları tıklanabilir olmadığı için ayrı platform seçimi sayılmaz |

API ön yüklemeleri, Next.js link prefetch'i ve benzer film sorgusunu ısıtma istekleri olay üretmez. React Strict Mode aynı ziyaret olayını tekrar saymaz. Sayfa yenileme/yeni ziyaret yeniden sayılır. Arama sayaçları gönderilen her API isteğini veya her tuşu saymaz; kullanıcı yazarken 1,2 saniye durursa ara sorgu da bir arama olarak sayılabilir. Arama metni en fazla 120 karakterdir.

**Öneri tıklama oranı:** tekil `(ziyaret, kaynak film, hedef film, sıra)` gösterimlerinden daha sonra aynı kartın tıklandığı gösterimlerin oranı. Bir karta tekrar tekrar tıklama oranı yükseltmez. Bir saniye dolmadan tıklamalar toplam tıklama sayısına girer; gösterimle eşleşmediklerinden bu orana girmez. Oran algoritmanın gerçek kullanıcı tarafından beğenildiğini veya filmin izlendiğini kanıtlamaz.

**Aramadan filme geçiş:** film adı aramasıyla aynı `search_id` taşıyan kart seçimi; tarif aramasıyla aynı ziyaretteki tarif sonucu seçimi. Karıştırma seçim aramalarında bu oran uygulanmaz. Hassas görünümlü sorguların adetleri kaydedilir, metni listelenmez.

**Tüm aramalar:** en çok aranan 20 metnin özetine ek olarak her arama ayrı satırda, Türkiye saati, türü ve sonuç sayısıyla gösterilir. Son 30 günlük ham kayıtlar 50'şer satır halinde sunucudan okunur; arama metni, tür ve yalnızca sonuçsuz filtreleri tüm kayıtlar üzerinde uygulanır. Tekrar aramalar ayrı satırdır; hassas görünen metinler gizlenir. Seçilen 7 günlük aralık yalnızca 7 günü gösterir; 90/365 günlük seçimlerde ayrıntı listesi yine son 30 günle sınırlıdır. Mevcut SQL kurulumu yeterlidir; ek SQL çalıştırmak gerekmez. Veri ve servis anahtarı yalnızca admin yetki kontrolünden sonra sunucuda okunur.

**Oturum:** kişi veya kalıcı ziyaretçi değildir. Sekmede rastgele kimlik, 30 dakika hareketsizlikte veya en fazla 24 saatte yenilenir. Farklı tarayıcılar birleştirilmez. Yeni sekmeler genellikle ayrı oturumdur; tarayıcının kopyaladığı sekmeler oturum verisini devralabilir. Günlük kartlardaki oturum toplamı günlük tekil oturumların toplamıdır; gece yarısını geçen oturum iki güne sayılabilir. Ayrıntılardaki kaynak oturumları ham veri dönemi içinde tekildir.

**Kaynak:** ilk referrer'dan Google/Bing/sosyal/diğer/doğrudan kategorisi. Tam referrer URL'si saklanmaz. Bu özellik Google'a yazılan sorguyu göstermez; bunun için Search Console gerekir. Referrer gizlendiğinde kaynak bilinmez ve doğrudan sayılır.

## Erişim, saklama ve sınırlar

- Admin paneli mevcut imzalı `fb_admin` çereziyle korunur; rapor bileşeni ayrıca sunucuda yetki kontrolü yapar. Tablolarda RLS etkin ve `anon` / `authenticated` için tablo ve RPC yetkileri kapalıdır. Yalnızca sunucu servis anahtarı erişir.
- Veri toplama varsayılan olarak kapalıdır. DNT/GPC, otomasyon tarayıcıları, temel bot User-Agent eşleşmeleri ve admin çerezi bulunan istekler dışarıda bırakılır.
- İstemcinin gönderdiği rastgele özellikler kabul edilmez. Yalnızca tanımlı olaylar ve alanlar yazılır. IP, e-posta, cihaz parmak izi ve ham User-Agent yazılmaz. Arama metnindeki URL, e-posta veya uzun sayı dizisi varsa metin atılır. Bu basit filtre kişisel bilgi içermediğini garanti etmez; kullanıcı metni başka kişisel bilgi barındırabilir.
- Ham olaylar bugünün de dahil olduğu son **30 Türkiye takvim günü**, kimlik ve sorgu içermeyen günlük özetler **365 gün** tutulur. Ayrıntı tabloları en fazla 30 günü gösterir; 90/365 günlük grafik günlük özetleri kullanır. Cron başarısız olursa temizleme durur; iş ve depolama durumunu kontrol et. `select public.analytics_maintain();` elle de çalıştırılabilir ve geciken günleri özetler.
- Veritabanında ortak limit: günlük **5.000 olay**, oturum başına dakikada **100** ve saatte **600** olay. Limite gelince API 429 döner; site çalışmaya devam eder ama ölçüm eksik kalır. Günlük sınır panelde görünür. Trafik arttığında SQL fonksiyonundaki sınırı kapasiteye göre artır. Limitler ham veri boyutunu sınırlamaya yardım eder; depolama kullanımını ayrıca izle.
- Açık analitik uç noktası bağımsız kimlik doğrulaması gerektirmez. Origin kontrolü ve temel bot filtresi otomatik sahte veriyi tamamen engellemez; sunucu dışı istemci Origin ve oturum kimliğini taklit edebilir. Günlük ortak limit sahte oturumlarla sınırsız yazmayı engeller; yoğun kötü trafik bütçeyi tüketebilir. Büyüme halinde WAF/edge rate limit eklenebilir.
- `sendBeacon`/`keepalive` ile 20 olaylık küçük paketler gönderilir. Başarısız paketler yeniden denenmez; bir işlem hatası siteyi durdurmaz. Engelleyiciler, sekmenin kapanması ve bağlantı kesintileri nedeniyle başka analitik araçlarıyla (ör. Search Console) birebir eşit sayılar bekleme.

## Kontrol komutları

```sh
node --test scripts/tests/analytics.test.mjs scripts/tests/search-history.test.mjs
npx tsc --noEmit
npm run build
```

Production build mevcut sitemap nedeniyle geçerli Supabase ortam değişkenleri gerektirir. `SITE_ENV=preview` tanımlı derleme sitemap kataloğunu oluşturmaz ve sitemap üzerinden Supabase çağrısı yapmaz (canlı sunucuda değişken tanımsız). Deneme kopyasında gerçek katalog, arama ve admin raporu için ayrı Supabase/TMDB/admin değişkenleri kullanılmalı; canlı anahtarlar denemeye kopyalanmamalı. Bu değişiklik üzerinde TypeScript, doğrulama testleri, yerel PostgreSQL uyumlu PGlite veritabanıyla SQL kurulumu/yeniden kurulum, deduplikasyon, limitler, tıklama oranı, saklama ve erişim testleri yapılmıştır. API için Origin, veri boyutu, geçersiz veri, DNT ve bot dışlama kontrolleri; gerçek tarayıcıda arama/klavye seçimi, görünür öneri gösterimi/tıklaması, admin yetkilendirmesi ve mobil taşma kontrolleri de geçti. Üretim derlemesi yerel veritabanı fixture'ıyla doğrulandı. Üretim veritabanına SQL uygulanmamıştır.
