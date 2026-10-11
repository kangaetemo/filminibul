# Filminibul ürün istatistikleri

## Kurulum

1. Supabase SQL Editor'de `scripts/sql/analytics.sql` dosyasını çalıştır. Mevcut katalog tablolarına yazmaz. Şema yeniden çalıştırılabilir.
2. Supabase Dashboard → Database → Extensions'da **pg_cron**'u etkinleştir. Ardından SQL Editor'de `scripts/sql/analytics_cron.sql` dosyasını çalıştır. Günlük iş 03:15 Türkiye saatinde özet çıkarır ve eski kayıtları temizler. Cron kurulmadan olay toplamayı açma.
3. Vercel'de mevcut `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ve `ADMIN_PASSWORD` sunucu değişkenlerinin bulunduğunu kontrol et. Servis anahtarı `NEXT_PUBLIC_` ile başlamamalı.
4. Aşağıdaki iki değişkeni Production ortamına ekle ve yeniden deploy et:

   ```env
   ANALYTICS_ENABLED=true
   NEXT_PUBLIC_ANALYTICS_ENABLED=true
   ```

   Preview ortamlarında ikisini de `false` tut. `NEXT_PUBLIC_` değeri build sırasında pakete girer; değiştirince yeni deploy gerekir. Toplamayı acilen durdurmak için sunucu bayrağını `false` yapıp yeniden deploy et.
5. `/admin` üzerinden **Ürün istatistiklerini aç** bağlantısına gir. Veriler yalnızca bu kurulumdan sonra birikir; Vercel geçmişi buraya aktarılmaz.
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

**Oturum:** kişi veya kalıcı ziyaretçi değildir. Sekmede rastgele kimlik, 30 dakika hareketsizlikte veya en fazla 24 saatte yenilenir. Farklı tarayıcılar birleştirilmez. Yeni sekmeler genellikle ayrı oturumdur; tarayıcının kopyaladığı sekmeler oturum verisini devralabilir. Günlük kartlardaki oturum toplamı günlük tekil oturumların toplamıdır; gece yarısını geçen oturum iki güne sayılabilir. Ayrıntılardaki kaynak oturumları ham veri dönemi içinde tekildir.

**Kaynak:** ilk referrer'dan Google/Bing/sosyal/diğer/doğrudan kategorisi. Tam referrer URL'si saklanmaz. Bu özellik Google'a yazılan sorguyu göstermez; bunun için Search Console gerekir. Referrer gizlendiğinde kaynak bilinmez ve doğrudan sayılır.

## Erişim, saklama ve sınırlar

- Admin paneli mevcut imzalı `fb_admin` çereziyle korunur; rapor bileşeni ayrıca sunucuda yetki kontrolü yapar. Tablolarda RLS etkin ve `anon` / `authenticated` için tablo ve RPC yetkileri kapalıdır. Yalnızca sunucu servis anahtarı erişir.
- Veri toplama varsayılan olarak kapalıdır. DNT/GPC, otomasyon tarayıcıları, temel bot User-Agent eşleşmeleri ve admin çerezi bulunan istekler dışarıda bırakılır.
- İstemcinin gönderdiği rastgele özellikler kabul edilmez. Yalnızca tanımlı olaylar ve alanlar yazılır. IP, e-posta, cihaz parmak izi ve ham User-Agent yazılmaz. Arama metnindeki URL, e-posta veya uzun sayı dizisi varsa metin atılır. Bu basit filtre kişisel bilgi içermediğini garanti etmez; kullanıcı metni başka kişisel bilgi barındırabilir.
- Ham olaylar bugünün de dahil olduğu son **30 Türkiye takvim günü**, kimlik ve sorgu içermeyen günlük özetler **365 gün** tutulur. Ayrıntı tabloları en fazla 30 günü gösterir; 90/365 günlük grafik günlük özetleri kullanır. Cron başarısız olursa temizleme durur; iş ve depolama durumunu kontrol et. `select public.analytics_maintain();` elle de çalıştırılabilir ve geciken günleri özetler.
- Veritabanında ortak limit: günlük **5.000 olay**, oturum başına dakikada **100** ve saatte **600** olay. Limite gelince API 429 döner; site çalışmaya devam eder ama ölçüm eksik kalır. Günlük sınır panelde görünür. Trafik arttığında SQL fonksiyonundaki sınırı kapasiteye göre artır. Limitler ham veri boyutunu sınırlamaya yardım eder; depolama kullanımını ayrıca izle.
- Açık analitik uç noktası bağımsız kimlik doğrulaması gerektirmez. Origin kontrolü ve temel bot filtresi otomatik sahte veriyi tamamen engellemez; sunucu dışı istemci Origin ve oturum kimliğini taklit edebilir. Günlük ortak limit sahte oturumlarla sınırsız yazmayı engeller; yoğun kötü trafik bütçeyi tüketebilir. Büyüme halinde WAF/edge rate limit eklenebilir.
- `sendBeacon`/`keepalive` ile 20 olaylık küçük paketler gönderilir. Başarısız paketler yeniden denenmez; bir işlem hatası siteyi durdurmaz. Engelleyiciler, sekmenin kapanması ve bağlantı kesintileri nedeniyle Vercel ile birebir eşit sayılar bekleme.

## Kontrol komutları

```sh
node --test scripts/tests/analytics.test.mjs
npx tsc --noEmit
npm run build
```

Production build mevcut sitemap nedeniyle geçerli Supabase ortam değişkenleri gerektirir. Vercel Preview build üretim sitemap kataloğunu oluşturmaz ve sitemap üzerinden Supabase çağrısı yapmaz. Önizlemede gerçek katalog, arama ve admin raporu kullanımı için ayrı test ortamına ait Supabase/TMDB/admin değişkenleri yapılandırılmalıdır; bu değişiklik Production anahtarlarını Preview ortamına kopyalamaz. Bu değişiklik üzerinde TypeScript, doğrulama testleri, yerel PostgreSQL uyumlu PGlite veritabanıyla SQL kurulumu/yeniden kurulum, deduplikasyon, limitler, tıklama oranı, saklama ve erişim testleri yapılmıştır. API için Origin, veri boyutu, geçersiz veri, DNT ve bot dışlama kontrolleri; gerçek tarayıcıda arama/klavye seçimi, görünür öneri gösterimi/tıklaması, admin yetkilendirmesi ve mobil taşma kontrolleri de geçti. Üretim derlemesi yerel veritabanı fixture'ıyla doğrulandı. Üretim veritabanına SQL uygulanmamıştır.
