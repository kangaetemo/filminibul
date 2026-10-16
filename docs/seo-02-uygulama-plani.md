# SEO-02 uygulama planı

14 Ekim 2026 · SEO-01, SEO-02, Kİ-01 ve Kİ-02 birlikte değerlendirilmiştir.

Durum güncellemesi (16 Ekim 2026): 30 yıl/tür listesi + 50 kimlikli kişi pilotu kodlandı. 50 kişi / 2.810 kredi kaydedildi, depolama/erişim/atomiklik doğrulandı. Güncel sonuç ve kapsam docs/seo-02-pilot-uygulama-sonucu.md belgesinde izlenir. Son 50/50 kişi sayfası SSR kontrolü başarılı; ilk pilot uygulaması yayına hazır. Üretim uygulaması henüz yayımlanmadı. Aşağıdaki ilk inceleme bulguları tarihsel bağlamıyla korunur.

## 1. Sonuç ve görevlerin sınırı

Mevcut katalog yıl + tür listelerine yeterli alanları sağlıyor. Güvenilir filmografiler için TMDB kişi kimlikleri ve rol / kredi ilişkileri gerekiyor. Aynı liste şablonu, SEO kuralları ve veri hattı kullanılmalı; dört ayrı özellik olarak tekrar geliştirilmemeli.

| Görev | Bu paketteki sorumluluk | Tamamlanma sınırı |
| --- | --- | --- |
| SEO-01 | Taranabilir HTML, başlıklar, URL / canonical, iç bağlantılar ve organik trafik ölçümü | Pilot SEO altyapısı bu görevin ilk bölümüdür; genel organik büyüme işi bütünüyle bitmiş sayılmaz. |
| SEO-02 | Film Listeleri dizini, yıl + tür sayfaları, kontrollü pilot / sonraki tematik seçkiler | İlk pilot ile ikinci aşama tematik seçkiler ayrı doğrulanır. |
| Kİ-01 | Oyuncu / yönetmen kimliği, fotoğraf, ayrı rol filmografileri ve filmden bağlantı | 50 kişinin pilotu bütün katalogdaki isimlerin kimliklendirilmesi anlamına gelmez. |
| Kİ-02 | Gerçek yazarlık kredileri, rol ayrımı ve aynı kişi sayfası altyapısının genişletilmesi | Şema hazırlanması senarist verilerinin ve sayfalarının tamamlanması değildir. |

Önerilen sıra: kapasite / veri kontrolü → ortak liste ve SEO altyapısı → yıl + tür pilotu → kimlikli kişi verisi ve filmografiler → senarist sayfaları → seçilmiş tematik listeler.

## 2. Kontrol edilen mevcut durum

İncelenen kaynak sürümü: `8dbf0a1` (main, SEO-02 görev kaydı). Yerel kaynaklar güncel main'e fast-forward edildi.

| Alan | Gözlenen durum | Sonuç |
| --- | --- | --- |
| Uygulama | Next.js 14.2.35 / App Router, React 18; `package.json` | Yeni route'lar mevcut senkron params yapısına uymalı. Next 16 varsayımıyla kod yazılmamalı. |
| Film tablosu | `film_embeddings_v3`; movie_id, year, JSONB genres, başlıklar, özetler, poster, rating, vote_count, popularity | Yıl ve TMDB tür kimliğiyle sorgulama mümkün; embedding okumaya gerek yok. |
| Kişiler | SQL / FilmRow / import kodlarında `director: text`, `cast_names: text[]`; tek yönetmen ve ilk 5 oyuncu tutuluyor | İsimden filmografi üretmek aynı adlı kişileri karıştırır ve yardımcı rolleri eksik gösterir. |
| Eksik kredi verisi | Uygulama modelinde kişi ID, kişi fotoğrafı, credit_id, karakter ve yazarlık kredisi yok | Kişi verisi için yeni ilişki modeli gerekiyor. Canlı DB'de başka kullanılmayan tablo olmadığı ayrıca kontrol edilmeli. |
| Yıl anlamı | İçe aktarımda TMDB movie `release_date` yılından türetiliyor; tam tarih saklanmıyor | Türkiye vizyon yılı diye sunulmamalı. İlk pilot tamamlanmış yıllarla başlamalı. |
| Film detayları | `/film/{id}-{slug}`, kimlikten çözümleme ve yanlış slug'a kalıcı yönlendirme; canonical / OG mevcut | Kartlar aynı adreslere gitmeli; ikinci bir film detay route'u açılmamalı. |
| Film kredilerinin görünümü | Film ayrıntısı alanında yönetmen / oyuncular düz metin; oyuncular yine ilk 5 | Doğrulanmış kişi ID'si olan adlar normal link'e çevrilebilir. |
| Liste kartları | `FilmCard`, `toFilmDTO`, `filmPath`, özel TMDB image loader hazır | Tasarım ve Kaydet paneli yeniden kullanılabilir. Kart için server-side HTML ilk yanıtta bulunmalı. |
| Modlar | `/mod/[id]` force-dynamic; adaylardan rastgele 20 film | SEO listesinde bu rastgele seçim kullanılmamalı; sayfalama için sabit sıra gerekir. |
| Veri erişimi | Sunucudan Supabase REST, katalog cache etiketi, TMDB server client ve GitHub bakım işleri | Yeni sayfalar tarayıcıdan service-role kullanmaz; kredi toplama istek anında yapılmaz. |
| Sitemap / robots | Sitemap günlük; katalog 1.000'lik partilerle okunuyor. Robots admin ve API'yi engelliyor | Pilot sayfalar kontrollü manifestten eklenebilir; sitemap'i her ziyarette tüm katalogla yeniden hesaplamak gereksiz. |
| Dil | TR / EN seçimi ağırlıkla istemci bağlamında ve `?lang=` ile | Pilotun SEO dili Türkçe olmalı. Gerçek EN SEO için ayrı URL + sunucu HTML + metadata / hreflang ayrıca gerekir. |
| Ölçüm | `cleanPath` yalnızca mevcut keşif / film / mod adreslerini kabul ediyor; kart context allowlist'inde list/person yok | Yeni sayfaların site içi açılışları / tıklamaları aksi hâlde sessizce düşer. |

Canlı salt okunur doğrulama:

- `/sitemap.xml`: HTTP 200, 26.785 URL; bunların 26.775'i film. Yeni liste / kişi route'u görünmüyor. Bu sitemap snapshot'ıdır, canlı tablonun anlık `count(*)` ölçümü değildir.
- `/robots.txt`: HTTP 200; `/admin` ve `/api/` kapalı, sitemap adresi doğru.
- `/film/603-matrix?lang=en&p=8`: HTTP 200; canonical `https://filminibul.com/film/603-matrix`, hreflang yok. Kaynak taramasında mevcut Movie / ItemList / BreadcrumbList JSON-LD bulunmadı; yeni pakette bu işaretleme ayrıca eklenmeli.
- `/api/similar/603?limit=1`: HTTP 200; Matrix Reloaded için yıl, tür, tek yönetmen adı ve beş oyuncu adı döndü; public DTO'da kişi kimliği yok.
- Son içerik bakım raporu 13 Ekim'de 26.775 film taramış. Bu da geçmiş snapshot; alan dolulukları / indeks / kapasite kontrolü yerine geçmez.
- Yerel konfigürasyonda Supabase service-role ve TMDB anahtarı yok. Canlı SQL şeması, sorgu planı, tür/yıl başına adet ve bugünkü DB doluluğu doğrudan okunmadı. Üretim anahtarları bu plan için yerel ortama alınmadı.

## 3. İlk adım: canlı veri ve kapasite raporu

Uygulama başlamadan önce mevcut güvenli sunucu / bakım ortamında yalnızca public katalog metadata'sı üzerinden tek toplu rapor üret:

1. Canlı tablo / kolon / indeks tanımları; DB ve tablo + indeks boyutları. `PROJE-DURUMU.md` içindeki 2026-10-02 doluluk değerleri güncel kabul edilmez.
2. Year NULL, genres boş / hatalı, başlık / özet / poster eksik sayıları; gelecek yıllar ve güncel yılın tarih belirsizliği.
3. Yıl × TMDB genre ID sayıları. JSONB açılımında bir film / tür bir kez sayılsın; kimlikler desteklenen tür sözlüğüne karşı kontrol edilsin.
4. İsim verisinin kişi kimliğine dönüştürülmüş gibi kabul edilmemesi; pilot kişilerin TMDB ID ile doğrulanması.
5. 30 aday yıl/tür listesi ve 50 aday kişinin katalogdaki gerçek kapsamı; örnek query plan / süre ve pilot veri / indeks boyutu.

Rapor kullanıcı listeleri, Firebase UID, tercih dosyaları veya embedding vektörlerini içermez. Bu kontrol için ücretli OpenAI veya tüm katalog embedding indirme işi gerekmez.

## 4. Sayfalar ve içerik önerisi

Önerilen route'lar (henüz mevcut değil):

| Sayfa | Örnek / kalıp | İçerik |
| --- | --- | --- |
| Dizin | `/listeler` | Pilot yıl/tür listeleri, oyuncu ve yönetmen keşfi; taranabilir bağlantılar |
| Yıl + tür | `/listeler/2024-aksiyon-filmleri` | Yıl / tür açıklaması, kapsam ve sıralama bilgisi, film listesi |
| Oyuncu | `/oyuncu/{tmdb_id}-keanu-reeves` | Fotoğraf, ad, katalogda yer alan oyunculuk filmleri, varsa karakter / seslendirme bilgisi |
| Yönetmen | `/yonetmen/{tmdb_id}-christopher-nolan` | Yalnızca Director kredileri; oyunculuk / yapımcılık karışmaz |
| Sonraki aşama | `/senarist/{tmdb_id}-{slug}` | Yazarlık türü ayrılmış krediler; eser yazarı otomatik senarist sayılmaz |

- Kişi URL'si aynı film adresleri gibi ID + okunabilir slug kullanır; isimden kimlik tahmin edilmez. Aynı adlı kişiler farklı ID ile ayrılır. Eski slug, onaylı güncel slug'a kalıcı yönlendirilir.
- Tek ortak kişi filmografisi / liste şablonu, role parametresiyle farklı route'larda kullanılabilir. Pilot öncesi gereksiz ek `/kisi` sayfaları çoğaltılmamalı.
- Ana sayfaya yeni bölüm şart değil: footer'da Film Listeleri bağlantısı, `/listeler` dizini ve film detayındaki kimlikli kişi linkleri başlangıç için yeterli.
- Her kart mevcut `filmPath` ile film sayfasına gider. Film sayfasındaki benzer öneriler, giriş / Kaydet ve fragman akışı korunur.
- Giriş metni yalnızca isim / yıl değiştirilmiş tekrar paragrafı olmamalı. Gerçek kapsam, dönem veya kişinin sinemasına dair kontrol edilmiş kısa açıklama olmalı. Toplu yapay biyografi / OpenAI metni gerekmez.
- İlk pilot katalogdaki filmlerle sınırlı: “katalogumuzdaki filmleri” denir; bütün filmografi / o yılın bütün filmleri diye eksiksizlik sözü verilmez.
- Bir filme sahip olmak için yeni embedding üretme, kataloğa otomatik film ekleme bu paketin şartı değil. Katalog dışındaki film ID'leri bakım raporunda tutulabilir; içeriksiz kart / ölü link olarak yayımlanmaz.

## 5. Sorgu ve sıralama

Yıl/tür query: `year = seçilen_yıl` ve `genres` içinde **TMDB genre ID**; Türkçe tür adında metin araması değil. Mevcut `genres.cs.[{"id":28}]` yaklaşımı kullanılabilir. Film sütunlarının gerekli metadata kısmı seçilir; embedding seçilmez.

Önerilen varsayılan sıra: `vote_count DESC NULLS LAST, movie_id ASC`. Aynı oyda film ID eşitliği bozar. Sayfa başına 24 kart; ilk sayfa ve devam sayfaları aynı veri snapshot'ıyla sıralanır. Bu “en iyi filmler” iddiası değildir; “oy sayısına göre” açıkça yazılır. Puan bazlı alternatif istenirse az oylu filmin öne çıkması ayrıca ele alınır.

- Öneri motorunun min_votes / rating eşikleri listelere aynen taşınmaz; özellikle Türk filmleri ve eski filmler gereksiz dışlanmamalı.
- Birden fazla karakter / kredi aynı filmde birden fazla kart oluşturmaz. Film kartı movie_id bazında tek; kredi bilgileri altında birleştirilebilir.
- Sayfa sınırları ve sıralama sabit olmalı. Snapshot / bakım sürümü değiştiğinde sayfa üyeliği değişebilir; tek ziyaret boyunca kaydırmalı rastgele seçim yok.
- İlk 30 liste tamamlanmış yıllardan seçilir. Güncel yıl / “Türkiye'de vizyona girenler” ancak tam çıkış tarihleri ve bölgesel kapsam doğrulanırsa eklenir.
- Boyut kontrolünden sonra year için B-tree ve genres containment için GIN değerlendirilir. Canlıda mevcut olup olmadığı ve `EXPLAIN` sonucu görülmeden yeni indeks kurma. GIN / ek lookup tablo yer maliyetleri rapora yazılır.

## 6. Kimlikli kişi ve kredi modeli

Öneri: mevcut embedding satırını büyütmek veya ID'leri ad dizilerine sıkıştırmak yerine küçük ilişkili metadata tabloları kullan.

| Model | Asgari alanlar / amaç |
| --- | --- |
| `film_people` | `person_id` PK, name, profile_path, updated_at; ihtiyaca göre kontrollü TR açıklama |
| `film_person_credits` | person_id, movie_id, credit_id, cast/crew ayrımı, raw job / department, character, cast_order, updated_at |
| Pilot yayın manifesti | Onaylı person_id + rol / yıl + genre ID, slug, metin, yayın ve index durumu |

Tablo adları öneridir; canlıda çakışma / mevcut kullanılabilir model olup olmadığı ilk adımda kontrol edilir. Kredi anahtarı TMDB credit_id ve kaynak bağlamıyla idempotent olmalı; NULL / değişmiş credit_id politikası migration öncesi belirlenir. Tek `(person_id,movie_id)` unique kullanmak hatalıdır: aynı kişi oyuncu ve yönetmen olabilir, birden fazla yazarlık kredisi taşıyabilir.

- Kişi / rol sorgusu ve filmden kişiye geçiş için uygun B-tree indeksleri; RLS + mevcut sunucu erişim sınırı. Tarayıcı service-role anahtarı görmez.
- Aynı kişi bir filmin yönetmeni ve oyuncusuysa iki ayrı rol sayfasında o film bulunabilir; roller ayrı başlık / liste ve self canonical ile sunulur. Diğer rol, yeterli kapsam ve yayın onayı varsa linklenir.
- Oyunculuk cast'ten; yönetmenlik **job=Director** ile. `Directing` department içindeki tüm ekip üyeleri yönetmen değildir.
- Kİ-02 için gerçek Writing department / raw job korunur. Screenplay / Writer, Story, Novel / Book / Characters gibi kaynak kredileri ayrı gösterilir; kaynak eser yazarı otomatik senarist sayılmaz. Senaryo, hikâye ve uyarlama / kaynak eser eşlemesi açık whitelist olarak doğrulanır.
- İlk pilot kişiler TMDB kişi detay + movie_credits endpoint'inden kimlikli alınır; film ID'leri mevcut katalogla toplu eşleştirilir. İsmi arayıp ilk sonucu almak yasak bir kestirmedir.
- Katalogdaki ilk beş oyuncu adından ID tahmini yapılmaz. Film detayında ancak doğrulanmış film/kişi ilişkisi olan isim linklenir; eksik kimlikli eski isim düz metin kalabilir.
- Pilot kişi listesi dışındaki filmleri / kişileri küresel taramak gerekmez. Kapsam dışındaki kredi bağlantıları tamamlanmış gibi sunulmaz.

## 7. Veri toplama ve kapasite

- Önce 50 doğrulanmış kişi için person details + movie_credits; katalog ID'leri batch sorguyla eşleştirilir. TR içerik / fotoğraf için detay gerektiğinde ek çağrı yapılır. İstek sayısı backfill için ölçülür; her sayfa açılışında tekrar API taraması olmaz.
- Film sayfalarının ilk beş kredisine bağ kurmak veya yazarlık bilgisi eksikse yalnızca pilotla ilişkili film credits alınır. Aynı filmin farklı kişiler için tekrar indirilmesi önlenir; bütçe kişi sayısıyla değil ilgili benzersiz film sayısıyla da belirlenir.
- Ham yanıt / checkpoint geçici artifact veya uygun cache'de tutulur; DB'de ihtiyaç duyulan kompakt kimlik ve kredi satırları tutulur. Embedding ve bütün film metni tekrar kopyalanmaz.
- 26.775 filmin tüm oyuncu / ekip kadrosunu ilk aşamada çekme. Yüz binlerce ilişki oluşabilir; yer kullanımını ölçmeden 500 MB planına sığacağı varsayılmaz.
- Yeni film ekleme akışları (`catalogAdd.ts`, `add_missing.mjs`) zaten TMDB credits alıyor; sonraki uygulamada kimlikli metadata bu yanıttan kullanılabilir. Yeni film ve eksik kimlik backfill işleri, ücretli embedding / çeviri işinden ayrılmalı.
- Haftalık kişi / kredi refresh işinde concurrency başlangıçta 2–3, 429 / Retry-After yönetimi, checkpoint ve idempotent upsert. Başarısız veya eksik yanıt mevcut doğru kredileri silmez. Başarılı snapshot değişimi, eski / kaldırılmış kredileri kontrollü uzlaştırır.
- Pilot kapsamlı güncelleme, profil yenileme ve gereken sitemap / liste cache invalidation ayrı yürütülür. İlk aşamada günlük 24 saat sayfa cache, 7 gün kişi/kredi refresh önerisi; değişen katalogda ilgili cache etiketleri invalid edilir. Yıl/tür üyeliği eski oy puanı kadar kritik değildir ama liste, count ve sitemap aynı yayın manifestine dayanmalı.
- Bölgesel tarih, kişi açıklaması ve profil fotoğrafı eksikliği için fallback bulunur. Fotoğraf yok diye kişi uydurulmaz; görseller TMDB CDN / mevcut loader üzerinden kullanılır.

## 8. SEO ve indeksleme politikası

1. Pilot için tek yayın manifesti. İlk hedef 50 kişi ve 30 yıl/tür; her kişi için varsayılan ana rol, ek rol sayfası ancak ayrı fayda / yeterli veri varsa onaylanır. Manifest dışında bütün ID × rol × yıl × tür kombinasyonları otomatik indekslenmez.
2. Veri kalite eşiği önerisi: kişi rol listesinde en az 5 katalog filmi, yıl/türde en az 10. Bunlar Google kuralı değildir; niş ve güçlü editoryal sayfa için gerekçeli istisna olabilir. Kesin pilot sayısı toplu raporla netleşir.
3. Geçerli fakat düşük kapsamlı sayfa gerekiyorsa noindex / sitemap dışında. Bilinmeyen ID, desteklenmeyen tür, anlamsız kombinasyon, boş filtre sonucu veya taşan sayfa gerçek 404; geçici DB / TMDB hatası 404 veya “film yok” sonucu olarak saklanmaz.
4. Sunucu ilk HTML'de H1, açıklama, kart adları, linkler ve sayfalama bulunur; Google için kullanıcıdan ayrı sayfa gösterilmez. Mevcut istemci kartı SSR çıktısıyla kullanılabilir, JS sonrası gelen sonuç tek erişim yolu olmaz.
5. Her indekslenebilir ana sayfa self canonical; `?page=1` temel adrese yönlenir. `?page=2` gibi gerçek devam sayfaları kendi canonical'ını taşır, birinci sayfaya canonical verilmez. Sonraki / önceki sayfalara gerçek `<a href>` linkleri ve ilk sayfaya dönüş. İlk pilot sitemap'te landing sayfaları; devam sayfaları linklerle taranabilir.
6. Alternatif sıralamalar / kişisel platform filtreleri pilotta SEO route'ları oluşturmaz. Eklenirse index politikası ayrılır. noindex uygulanacak sayfayı robots'ta engelleyip Google'ın etiketi okumasını önleme. Canonical tek başına sonsuz filtre URL'si problemini çözmez.
7. Türkçe pilot: sayfa ve metadata sunucuda TR. `?lang=en` mevcut UI tercihi olabilir ama gerçek EN SEO sayfası sayılmaz. Pilot varyantların canonical / noindex politikası net olur; daha sonra `/en/...` veya eşdeğer ayrı URL'lerde sunucuda EN üretimi ve karşılıklı hreflang yapılabilir.
8. `ItemList` / `ListItem` görünür sırayla mevcut canonical film adreslerine bağlanır; `Movie` verisi film detayında gerçek görünen ad / görsel / tür / doğrulanmış yönetmenle tutarlı olur. `Person` kimliği / `BreadcrumbList` eklenebilir. Bugün olmayan tam release_date, review veya sahte kullanıcı puanı üretilmez. İlk sürümde `aggregateRating` zorunlu değil; TMDB puanı ayrı kaynak olarak görünür kalır.
9. JSON-LD güvenli serialization kullanır; kullanıcı / üçüncü taraf metnindeki `</script>` enjeksiyonu engellenir. Rich Results Test + schema doğrulaması yapılır; Movie carousel / sıralama başarısı garanti edilmez.
10. Sitemap yalnızca yayına açık, indexlenebilir manifest girişleri; gerçek içerik değişim zamanına dayalı lastmod (alan varsa). Yeni listeler için uydurma günlük lastmod yok. ~26,8 bin mevcut URL + pilot bugün 50 bin limitinin altında; gereksiz sitemap bölme şart değil, büyürse ayrılır.

## 9. Ölçümde gerekli değişiklik

Search Console: pilot URL ailelerine göre indekslenme, gösterim, sorgu, tıklama ve CTR; ilk 28 günlük dönemi yayın öncesi / sonrası karşılaştır. Search Console sonuçları gecikmeli olabilir; sırf URL sayısı başarı ölçütü değil.

Site içi ölçüm: mevcut `cleanPath`, client context ve event schema allowlist'i listeler / oyuncu / yönetmen / gelecekte senarist için güvenli, sınırlı route kalıplarıyla genişletilir. `FilmCard` context'ine list / person eklenir; uzun listelerde mevcut rank=100 sınırı ve metadata boyut bütçesi gözden geçirilir. Liste / kişi sayfasından filme geçiş, liste kimliği / person_id + rol bağlamıyla ölçülebilir; UID veya yeni kişisel veri gerekmez. Sayfa parametresi `cleanPath` tarafından atıldığı için gerekirse sınırlı page alanı ayrıca tasarlanır.

Kaydet / kişisel öneri dönüşümü ilk başarı KPI'sı olabilir; ancak mevcut sistem bu olayları saymıyorsa otomatik ölçülüyor denmez. İlk sürümde liste → film tıklaması ve ardından mevcut film / fragman metrikleri yeterli.

## 10. Uygulama adımları ve kabul ölçütleri

| Sıra | İş | Çıkış / kabul |
| --- | --- | --- |
| 0 | Salt okunur canlı veri / boyut / plan raporu | Gerçek year×genre adetleri, uygun pilot, canlı indeks ve kapasite bilgisi; tahmin yerine ölçüm |
| 1 | Liste route / manifest / query / shared UI ve SEO çekirdeği | 30 aday yıl/tür; deterministik 24 kart, SSR HTML, canonical, doğru sayfalama, eksik / hata durumları |
| 2 | Kimlikli kişi / kredi migration ve sınırlı TMDB backfill | 50 kişi için ID eşleşmesi, kaynaklı rol verisi, katalog kapsam raporu, idempotence / tekrar / hata testi |
| 3 | Oyuncu / yönetmen sayfaları ve film linkleri | Aynı adlı kişiler ayrılıyor; çoklu yönetmen / roller korunuyor; mevcut film linkleri çalışıyor; rol dışı film karışmıyor |
| 4 | Ölçüm, sitemap ve kontrollü yayın | Yalnızca onaylı canonical'lar, canlı HTML / mobil kontrol, Search Console örnek URL denetimi ve event doğrulaması |
| 5 | Kİ-02 senarist genişlemesi | Gerçek Writing kredileri, senaryo / hikâye / kaynak eser ayrımı, ayrı rol sayfaları ve aynı şablon |
| 6 | İkinci aşama 10 tematik seçki | Otomatik keyword kombinasyonu değil; seçilmiş film üyeliği + özgün açıklama + doğru içerik / bağlantı |

Test / doğrulama planı: yıl ve genre ID üyeliği; NULL alanlar; oyunculuk / Director / Writing ayrımı; aynı adlı kişi; çoklu kredi / dedup; bilinmeyen ID / slug yönlendirmesi / taşan sayfa / geçici DB hatası; iki sayfa arasında aynı snapshot'ta tekrar veya kayıp olmaması; canonical / robots / sitemap / JSON-LD ilk HTML; Türkçe ve EN UI davranışı; metadata payload'ında embedding / secret yokluğu; erişilebilir sayfalama; S25 FE / dar ekranda kart ve yükleme; ilk / cache'li p95 ve 5 eşzamanlı cache miss; bakım yarıda kesilmesi / 429 / eski verinin korunması. Önce kendi başlangıç süreleri ölçülür, doğrulanmamış performans sözü verilmez.

Önerilen dosya temasları: `src/app/listeler`, `src/app/oyuncu`, `src/app/yonetmen`, ileride `src/app/senarist`; ortak filmografi / sayfalama bileşenleri; `src/lib/recommend` veya ayrı `catalog/lists` / `people` server modülleri; `tmdbServer.ts` kredi tipleri; SQL metadata migration ve `scripts/catalog` bakım işi; `FilmRow` / DTO genişlemesi yalnızca detayda gerekli ID'ler için; film detayları, Footer, sitemap, analytics schema / FilmCard context. Mevcut öneri sıralama veya embedding belgeleri bu iş için değiştirilmez.

## 11. Açık kararlar ve varsayımlar

- Bu planın varsayımı: önce Türkçe SEO, mevcut katalog, klasik 24 kart sayfalama, oy sayısı sıralaması ve ana sayfaya yeni bölüm eklemeyen pilot.
- Hangi 50 kişi / 30 yıl-tür, kişi ana rol dağılımı ve kısa giriş metinleri veri raporundan sonra seçilir; bugünden 80 sayfanın kalitesinin doğrulandığı iddia edilmez.
- DB yer sınırı ve pilot ilişki boyutuna göre tüm krediler / yalnızca pilot kimlikli krediler kapsamı netleşir; doğrudan tüm katalog backfill yapılmaz.
- “Bütün filmleri”, güncel yıl, Türkiye vizyon yılı, EN indeksleme ve toplam talep / arama hacmi için ek veri gereklidir. Bu plan bunları doğrulamış veya uygulama kararı verilmiş saymaz.

## Resmî kaynaklar

- TMDB movie credits: https://developer.themoviedb.org/reference/movie-credits
- TMDB person movie credits: https://developer.themoviedb.org/reference/person-movie-credits
- TMDB person details: https://developer.themoviedb.org/reference/person-details
- Google taranabilir sayfalama ve canonical: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- Google filtreli URL yönetimi: https://developers.google.com/crawling/docs/faceted-navigation
- Google yararlı içerik: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Movie / ItemList: https://developers.google.com/search/docs/appearance/structured-data/movie
- Google çok dilli URL'ler: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
