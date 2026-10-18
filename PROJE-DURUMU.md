# Filminibul: Proje Durumu

Son güncelleme: 17 Ekim 2026 (Türkiye saati) · Canlı: [filminibul.com](https://filminibul.com) · Kod: GitHub `kangaetemo/filminibul`, `main` (Vercel otomatik deploy).

> Bu dosya **sitenin şu anki hâlini** özetler. Ayrıntılı iş takibi: [`yapilacaklar.md`](yapilacaklar.md) (açık / kapanan maddeler) ve [`yapilanlar.md`](yapilanlar.md) (tarihli kayıtlar, doğrulamalar). Çalışma kuralları: [`AGENTS.md`](AGENTS.md). Öneri sisteminin hedef mimarisi ve ilkeleri: [`proje-tanimi.md`](proje-tanimi.md).
>
> Site Ekim 2026'da büyük ölçüde yeniden yapıldı. Bu dosyanın 2 Ekim sürümündeki bazı bilgiler (Firebase'in kaldırıldığı, kişiselleştirme olmadığı, eski tasarım) artık geçerli değil; eski metin git geçmişinde duruyor.

---

## 1. Kısa özet

Türkçe öncelikli film keşif sitesi. Sevilen bir filme benzeyenleri bulur, tarif edilen filmi arar, iki filmi karıştırır, ruh hâline ve listelere göre keşif sunar. Google ile giriş yapan kullanıcının kaydettiği filmler buluta yazılır ve bunlardan kişisel öneri üretilir.

| Konu | Şu anki durum |
|---|---|
| Framework | **Next.js 14.2** (App Router), React 18, Tailwind 3. `params` senkron nesne; Next 15+'a geçilirse `await params` gerekir. |
| Veritabanı | Supabase (ücretsiz plan, 500 MB). 16 Ekim ölçümü ~423 MB. Upstash kullanılmıyor. |
| Üyelik | Firebase Authentication, yalnız Google girişi (e-posta girişi kodda var, `NEXT_PUBLIC_EMAIL_AUTH_ENABLED=false`). Sunucu ID token'ı doğrular (`src/lib/server/memberAuth.mjs`). |
| Kullanıcı verisi | Özel Supabase Storage bucket'ı `member-watchlists`: hesap başına kaydedilen filmler + `signals/` altında izledim / beğendim / bana göre değil. |
| Embedding | OpenAI `text-embedding-3-large`, `dimensions: 1536`, başlıksız film belgesi. Tek kaynak: `src/lib/recommend/embeddingDoc.mjs` |
| Benzer filmler | Önceden hesaplanmış komşu tablosu `film_neighbors` (`similar_movies_v4`), yoksa canlı HNSW (`similar_movies_v3`). 200 aday → hafif reranker → 20 film + gerekçe. |
| Arayüz dili | TR (varsayılan) / EN, istemcide seçilir. Canonical adresler Türkçe; `lang=en` varyantları `noindex`. |
| Katalog | ~26.775 film (14 Ekim), Türk filmleri ~1.546. Canlı sitemap 26.866 URL (17 Ekim). |

---

## 2. Site

### Sayfalar
| Adres | İçerik |
|---|---|
| `/` | Arama kutusu; "Benzerini bul / Tarif et / İki filmi karıştır" girişleri, ruh hâli kutucukları, "Senin için" rafı |
| `/film/[id]` | Adres `/film/603-matrix` biçiminde. Kısa tanıtım → benzer filmler → fragman, nerede izlenir, oyuncu / ayrıntı alanları. Kaydet / İzledim / Beğendim / Bana göre değil / Paylaş |
| `/ara?q=` | Tarife göre arama ("vibe") |
| `/mod/[id]` | 8 ruh hâli: korku, komedi, duygusal, gerilim, macera, romantik, düşündürücü, nostalji |
| `/karistir?a=&b=` | İki filme birlikte benzeyen 24 film |
| `/listeler` | Film listeleri dizini: 30 yıl+tür listesi, 30 oyuncu, 20 yönetmen; bölüm kısayolları |
| `/listeler/[slug]` | Yıl+tür listesi (ör. 2014 bilim kurgu), 24'lü sayfalar, aşağı kaydırdıkça yükleme |
| `/oyuncu/[id]`, `/yonetmen/[id]` | TMDB kişi kimliğine dayalı filmografiler (rol ayrı) |
| `/kaydedilenler` | Kaydedilen filmler (girişli: bulut; eski tarayıcı listesi isteğe bağlı aktarılır) |
| `/senin-icin` | Kaydedilen / beğenilen filmlerden kişisel öneriler |
| `/hesap` | Google girişi / çıkış, tercih geçmişi |
| `/hakkinda` | Hakkında ve veri kaynakları (TMDB logosu ve bildirimi, JustWatch atfı) |
| `/privacy` | Gizlilik politikası (TR / EN, iletişim `admin@filminibul.com`) |
| `/admin` | Şifreli yönetim: katalog ekleme, platform yenileme, DB doluluğu, `/admin/content` (özet düzenleyici), `/admin/analytics` (ürün istatistikleri, son bakılan filmler, arama geçmişi) |

Üst menü: Keşfet · Film listeleri · Ruh hâline göre · İki filmi karıştır · Senin için · Kaydedilenler · tema (açık/koyu) · dil (TR/EN).

### API
- Herkese açık: `/api/search-movie?q=`, `/api/vibe-search?q=`, `/api/similar/[id]?limit=&debug=1&p=`, `/api/catalog/page` (liste / filmografi devam sayfaları), `/api/analytics/event`
- Üye (Firebase ID token): `/api/member/watchlist`, `/api/member/film-signals`, `/api/member/recommendations`
- Admin: `/api/admin/*` (login, logout, catalog/search, catalog/add, content, refresh-content, refresh-providers, update-catalog)
- İmzalı: `/api/catalog/revalidate` (bakım işleri sonunda önbellek yenileme)

### Öne çıkan davranışlar
- **Benzer filmler:** reranker `src/lib/recommend/reranker.ts` ("lightNoRec"): semantic 0.75, collection 0.08, keyword 0.05, genre 0.04, quality 0.04, director 0.03 + cezalar. "Neden önerildi?" gerçek sinyallerden (seri, yönetmen, ortak temalar, türler) üretilir. Aynı serinin filmleri ayrı bölümde.
- **Tarife göre arama:** Türkçe / İngilizce cümle → `gpt-4.1-mini` ile film belgesi biçimine → embedding → `vibe_search_v3` (300 aday, ≥100 oy) → 24 film. IP başına dakikada 8 yeni arama, 240 karakter sınırı. OpenAI bakiyesi biterse kota hatası güvenli mesajla karşılanır ve film adı / ruh hâli keşfine yönlendirilir.
- **Karıştır:** sıralama min(benzerlik A, benzerlik B) + hafif kalite. RPC `blend_movies` (1.000 aday); zaman aşımında (57014) 300 adaylı yedek yol devreye girer.
- **Kişisel öneriler:** hesabın bulut listesinden en fazla 8 temsili film; kaydedilen / izlenen / beğenilmeyen filmler dışlanır, beğenilen filmler daha güçlü kaynak sayılır; seri başına 2, yönetmen başına 3 sınırı. Ek OpenAI çağrısı yok.
- **Girişsiz kullanıcı:** Kaydet / İzledim / Beğendim / Bana göre değil düğmeleri sayfada yerinde Google giriş paneli açar; girişten sonra seçilen işlem bir kez tamamlanır.
- **Film içerikleri:** Türkçe özet `tr_overview` alanında; Türkçe yoksa "Türkçe özet henüz bulunmuyor" + "Orijinal özeti göster". Orijinal dilde afiş tercih edilir. Gösterilen başlık: Türkçe çeviri → Türkçe çekilmiş filmde orijinal başlık → İngilizce. Seri adları Türkçe (`src/data/collections_tr.json`).
- **Nerede izlenir?:** TMDB / JustWatch Türkiye verisi, kompakt "Platformlar" filtresi (URL'de `p`, tercih tarayıcıda hatırlanır).
- **Paylaşım:** bağlantıyı doğrudan kopyalama + X / WhatsApp / Telegram / Instagram yönlendirmesi + destekleniyorsa sistem paylaşımı.
- **SEO:** sitemap (filmler + modlar + 80 pilot liste / kişi sayfası), robots (`/admin`, `/api/` kapalı), canonical, paylaşım önizlemeleri, Movie / Person / ItemList / BreadcrumbList JSON-LD. Sonsuz kaydırmada görünen grup URL'ye `?page=N` olarak yansır, JS kapalıyken gerçek sonraki sayfa bağlantıları çalışır. Site **Google Search Console'a eklendi ve `https://filminibul.com/sitemap.xml` gönderildi** (kullanıcı bildirimi, 17 Ekim 2026).
- **Görseller** doğrudan TMDB CDN'inden (`src/lib/tmdbImageLoader.ts`); Vercel görsel optimizasyonu kullanılmıyor (ücretsiz kota dolmuştu).
- **Ürün istatistikleri:** kendi Supabase tablolarında (`docs/analytics.md`); üyelik kimliğiyle ilişkilendirilmez, ham olaylar 30 gün / günlük özetler 365 gün. Ayrıca Vercel Analytics.

### Tasarım
- Açık ve koyu tema: ilk ziyarette cihaz tercihi, elle seçim tarayıcıda hatırlanır, geçişte 220 ms renk geçişi. Açık tema krem zemin, koyu tema kömür; vurgu sıcak amber. Renkler `src/app/globals.css` içindeki CSS değişkenlerinde, Tailwind token'ları `tailwind.config.ts`'te.
- Yazı tipi: Manrope (değişken, yerelden yüklenir, OFL). Başlık ve gövde aynı aile.
- Mobil: film sayfasında öneriler öne alınmış, özet kısaltılabilir, ana düğmeler 48 px. Azaltılmış hareket tercihine uyulur.

---

## 3. Otomasyon (GitHub Actions)

| İş | Zaman (TR) | Ne yapar |
|---|---|---|
| `update-catalog.yml` | Pazartesi 05:00 + elle / admin | Eksik filmleri ekler (≤100; TR vizyonları, Türk filmleri, TMDB'de çok oylu eksikler), 2021+ oy/puan tazeler, komşu tablosu, `idf.json`, `keywords_tr.json`, `moods.json`, seri adları. Değişen `src/data/*.json` commit'lenir. DB 480 MB'ı geçerse eklemez. |
| `refresh-providers.yml` | Pazartesi 06:00 + elle | Türkiye platform bilgisi (>%1 hata veya tablonun %70'inden az veri varsa durur) |
| `refresh-content.yml` | Salı 07:00 + elle | Türkçe özet / başlık temizliği, eksik çeviriler, orijinal dil afişi; rapor `docs/content-maintenance-report.json` |
| `refresh-seo-people.yml` | Çarşamba 08:30 + elle | 50 pilot kişinin filmografisini doğrular ve atomik yeniler (OpenAI yok) |
| Diğerleri (yalnız elle) | — | `verify-*` doğrulama işleri, `collect/persist-seo-people`, `complete-content-approved` (bütçe sınırlı çeviri), `finalize-content`, `prepare-watchlists` |

---

## 4. Ortam değişkenleri (değerler `.env.local` / Vercel / GitHub Secrets'ta)

| Değişken | Nerede gerekli |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, Vercel, GitHub Secrets. Asla `NEXT_PUBLIC_` olmamalı. |
| `TMDB_API_KEY` | `.env.local`, Vercel, GitHub Secrets (yalnız sunucu) |
| `OPENAI_API_KEY` | Vercel (tarif araması, admin'den film ekleme), GitHub Secrets (katalog / içerik işleri) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Vercel, `.env.local`. **Google girişi bunlara bağlı, silinmemeli.** |
| `NEXT_PUBLIC_EMAIL_AUTH_ENABLED` | İsteğe bağlı, varsayılan `false` |
| `ADMIN_PASSWORD` | Vercel (+ istersen `.env.local`) |
| `GITHUB_TOKEN` (+ isteğe bağlı `GITHUB_REPO`) | Vercel: fine-grained, yalnız bu repo, Actions: Read and write (admin'den iş başlatma) |
| `ANALYTICS_ENABLED`, `NEXT_PUBLIC_ANALYTICS_ENABLED` | Production'da `true`, preview'da `false` (`docs/analytics.md`) |

Şablon: [`.env.example`](.env.example).

---

## 5. Ölçümlerle alınmış kararlar (korunmalı)

- Öneri kalitesi (LLM hakem gpt-4.1, 50 seed, nDCG@10): eski ağır hybrid 0.78 · saf semantic v3 0.80 · **şu anki hafif reranker 0.82**. Asıl kazanç v3 embedding'den geldi; reranker'ı ağırlaştırmak zarar verdi. Ağırlık değiştirmeden önce `node scripts/rerank/llm_judge.mjs` ile ölç (puanlar önbellekli).
- Keyword aday kanalı ve TMDB "recommendations" bonusu ölçülebilir fayda vermedi → kapalı (kod duruyor).
- `ivfflat` (`probes=1`) gerçek komşuları kaçırıyordu → HNSW. HNSW index halfvec (ilk 20 birebir aynı ölçüldü); geri alma `scripts/sql/halfvec_revert.sql`.
- Komşu tablosu: benzer film sorgusu medyan 1,8 sn → ~350 ms, eşzamanlı istekte zaman aşımı kalktı. Admin'den eklenen film kendi listesini anında canlı HNSW'den alır, başka filmlerin listelerine pazartesi girer.
- Tarif cümlesini doğrudan embed etmek alakasız sonuç veriyor; önce film belgesine çevrilir. Deney: `node scripts/rerank/vibe_try.mjs "sorgu"`.
- Karıştırmada orta nokta (ortalama) bir filmin devam filmlerine kayıyordu → min yöntemi.
- `scripts/rerank/reranker.mjs` (offline) ile `src/lib/recommend/reranker.ts` (canlı) aynı mantığın iki kopyası; ağırlık değişirse ikisi de güncellenmeli.

### Veri gerçekleri
- Keyword'ü olan film ~%57, seri bilgisi ~%14 (TMDB'de gerçekten yok). Filmlerin yarısından fazlası <10 oylu; az bilinen filmlerin önerilerini besledikleri için silinmiyor.
- Türkçe özet: 16 Ekim'de 1.746 eksik özet çevrildi (~0,36 $). Kaynağı kullanılamayan 157 kayıt kullanıcı kararıyla kapsam dışında (hikâye uydurulmaz).
- Yeni filmlerin oy/puanı haftalık işte tazelenir; tazelenmezse az oylu cezası yüzünden önerilerden düşerler.

---

## 6. Açık işler ve bekleyenler (özet)

Tam liste ve ayrıntılar `yapilacaklar.md`'de. 17 Ekim itibarıyla:

- **Sıradaki geliştirme:** FL-01–FL-04, `/listeler` için 12 editoryal özel seçki (altyapı → içerik → dizin tasarımı → SEO yayını). Henüz kod yok.
- **Ölçüm:** SEO pilotunun Search Console indeks / gösterim / tıklama takibi (site eklendi, sitemap gönderildi, `/listeler` Search Console'da görünüyor — 18 Ekim kullanıcı kontrolü; liste / kişi sayfalarının gösterimleri ve 28 günlük veri bekleniyor).
- **Kullanıcı kontrolü gerekenler:** gerçek telefonda görsel / kaydırma kontrolü (MB-06), eski liste aktarımı ve hesap değişimi (BL-06), kişisel öneri ve tercihlerin gerçek hesapta kontrolü (KŞ-06, KŞ-07), OpenAI faturalama ekranında bakiye / uyarı kontrolü (API-01).
- **Diğer açıklar:** senarist sayfaları (Kİ-02), IMDb / RT puanları (PU-01–03, önce lisans), öneri isabeti geri bildirimi (KŞ-03), ek modlar / gizli cevherler (MD-01/02), doğal dil gerekçeler (GK-01/02), ana sayfa görsel havuzu (GR-01/02), performans / maliyet (PF-01/02), CSV içe aktarma, kişisel istatistik, platform bildirimi.
- **Takip edilmeli:** tarif araması 2 Ekim'de 3,7–4,9 sn ölçülmüştü; 15 Ekim'deki iki canlı denemede 21,9 ve 12,6 sn sürdü. Ayrıştırılmış ölçüm (OpenAI / Supabase / soğuk başlangıç) yapılmadı.

### Bilinen sınırlar / teknik borç
- Niş filmlerde (ör. Triangle) öneriler veri yetersizliği yüzünden zayıf.
- Keyword çevirileri düz JSON (`src/data/keywords_tr.json`); hatalılar elle düzeltilebilir.
- Yeni bir platform gelirse adı / logosu için `fetch_providers.mjs` bilgisayarda çalıştırılıp `src/data/providers_tr.json` commit'lenmeli.
- Tarif aramasındaki hız sınırı sunucu örneği başına bellek içi; kötüye kullanımda Vercel tarafı sınırlama gerekir.
- Sunucu, silinen Firebase üyeliğinin token'ını her istekte sormaz; manuel silme akışı `docs/veri-silme-isleyisi.md`'de.

### Harcama
OpenAI: başlangıç işleri ~1 $ (embedding, LLM hakem, keyword çevirisi), 2 Ekim dolguları ~0,3–0,4 $, 16 Ekim özet çevirisi ~0,36 $ (onaylı tavan 4 $). Değişken maliyet yalnız tarif aramasında (~0,0002 $ / yeni arama) ve admin'den film eklemede. Toplu ücretli işler kullanıcı onayı ve bütçe tavanıyla çalıştırılır.

---

## 7. Sık kullanılan komutlar

```bash
npm run dev                                    # yerel site
npx tsc --noEmit                               # tip kontrolü
node --test scripts/tests/*.test.mjs           # birim / akış testleri

# Değerlendirme
node scripts/rerank/llm_judge.mjs              # LLM hakem (ağırlık denemeleri)
node scripts/rerank/eval.mjs --emb v3          # golden.json recall

# Veri
node scripts/catalog/add_missing.mjs --dry-run # eksik filmleri listele; --max=N, --ids=1,2
node scripts/tmdb/refresh_stats.mjs            # 2021+ oy/puan tazeleme (--from=YIL, --dry-run)
node scripts/catalog/rebuild_static.mjs        # idf + keyword çevirileri + modlar
node scripts/catalog/build_neighbors.mjs       # komşu tablosu (haftalık iş de çalıştırır)
```

Supabase SQL'leri `scripts/sql/` altında. Yeni bir Supabase projesi kurulursa sırayla: `v3_setup.sql`, `film_providers.sql`, `admin_db_usage.sql`, `similar_movies.sql`, `vibe_search.sql`, `blend.sql`, `halfvec_index.sql` (adımlar ayrı ayrı), `neighbors.sql` (+ `build_neighbors.mjs`), `analytics.sql` + `analytics_cron.sql`, `seo_02_people.sql`.

---

## 8. Bilgisayarda olup GitHub'da olmayanlar (yedekle!)

`.gitignore`'daki büyük veri klasörleri yalnızca geliştirme bilgisayarında:
- `data/export/`: Supabase + eski Upstash yedeği; eski v2 embedding'lerinin tek kopyası (`film_embeddings_v2.embeddings.jsonl`, 442 MB).
- `data/embeddings/`: v3 embedding'leri ve mod vektörleri.
- `data/tmdb/`: zenginleştirme, çeviri önbelleği, platform verisi.
- `data/content/`: içerik bakımı kontrol noktaları.

---

## 9. Dosya haritası

```
src/app/                 sayfalar (film, ara, mod, karistir, listeler, oyuncu, yonetmen, kaydedilenler, senin-icin, hesap, hakkinda, privacy, admin) + api/
src/components/          SiteHeader · Footer · film/ · catalog/ (liste, kişi, sonsuz kaydırma) · search/ · auth/ · blend/ · admin/ · preferences/ (tema, dil)
src/lib/recommend/       reranker · similar · personal · blend · vibe · moods · providers · collections · trailer · embeddingDoc
src/lib/catalog/         lists · pilot (30 yıl/tür) · people + people-manifest.json (50 kişi) · scrollPage · creditLabel
src/lib/server/          supabase · tmdbServer · memberAuth · watchlist* / filmSignals* (bulut kayıtları) · personalHandler · vibeOpenAI · catalogAdd · adminAuth · analytics
src/lib/auth/            firebase (istemci) · pendingFilmAction (girişten sonra tamamlanacak işlem)
src/lib/i18n/en.json     İngilizce arayüz metinleri
src/data/                idf · keywords_tr · moods · providers_tr · collections_tr
scripts/catalog/         haftalık katalog, içerik ve kişi bakımı + doğrulama betikleri
scripts/rerank/          offline reranker, değerlendirme, LLM hakem, mod üretimi
scripts/sql/             Supabase şema / RPC dosyaları
scripts/tests/           node --test testleri
docs/                    plan, doğrulama raporları ve ekran görüntüleri
data/eval/               golden set, LLM puan önbelleği, raporlar
```
