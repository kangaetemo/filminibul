# Filminibul: Proje Durumu

Son güncelleme: 2026-10-02 · Canlı kod: GitHub `kangaetemo/filminibul`, `main` (Vercel otomatik deploy). Merge bekleyen branch yok; Claude doğrudan `main`'e push'lar.

> `proje-tanimi.md` hedef mimariyi anlatır, bu dosya **şu an ne olduğunu ve nerede kaldığımızı**.
> Yeni oturumda Claude'a "PROJE-DURUMU.md'yi oku" demen yeterli.

---

## 1. Ne yapıldı (özet)

Başlangıçta klasördeki kod eski bir GitHub sürümüydü (Next 14, Upstash, kaydırmalı swipe arayüzü, 384 boyutlu embedding, kırık öneriler). Supabase/OpenAI sürümünün kodu kayıptı ama veri Supabase'te duruyordu. Sırayla:

1. Supabase ve Upstash verisi yerel diske yedeklendi, envanter çıkarıldı.
2. **Öneri kalitesinin asıl sorunu bulundu:** `ivfflat` index (`probes=1`) yüzünden gerçek komşular kaçıyordu (Matrix → Reloaded gelmiyordu). HNSW'ye geçildi.
3. Yeni embedding (v3) üretildi, TMDB'den zenginleştirme yapıldı, reranker LLM ile ölçülerek kuruldu.
4. Site sıfırdan yeni akışa çevrildi: **film ara → film sayfası → 20 benzer film + "neden önerildi?"**
5. Eklendi: semantic modlar, Türkçe keyword açıklamaları, "Nerede izlenir?" (Türkiye platformları), platform filtresi, haftalık otomatik platform yenileme, admin paneli, admin'den film ekleme.
6. **2026-10-01 oturumu:**
   - **Film sayfası akışı + ısıtma** (`96fa5cc`): film bilgisi ~0,2 sn'de gelir, benzer filmler Suspense ile akar; arama kutusu ilk 2 katalog sonucunun `/api/similar/[id]` çağrısını önceden yapar.
   - **Tarife göre arama ("vibe")** (`68b5783`): `/ara?q=…`, `/api/vibe-search`. Türkçe cümle → LLM ile film belgesi formatına → embed → Supabase `vibe_search_v3`. Ayrıntı §3.
   - **Tasarım yenilemesi** (`68b5783`): sıcak sinematik palet (amber), Fraunces serif, film grenı, afiş şeridi, yeni ana sayfa/film/mod sayfaları. Ayrıntı §3.
   - **Fragman** (`5f2b637`): film sayfasında "Fragmanı izle" (TMDB videoları, YouTube nocookie, tıklayınca yüklenir).
   - **Afiş düzeltmesi** (`47d0425`, merge bekliyor): masaüstünde afiş uzuyordu (flex stretch), `self-start` ile 2:3 oranı korundu.

---

## 2. Mimari

```
TMDB ─► scripts/ (offline) ─► Supabase (film_embeddings_v3, film_providers)
                                        │  RPC similar_movies_v3 (HNSW, 200 aday)
Kullanıcı ─► Next.js 14 (Vercel) ─► reranker.ts (hafif hybrid) ─► 20 film + reasons
```

| Konu | Karar |
|---|---|
| Framework | **Next.js 14.2.35** (dokümandaki "16" değil). `params` senkron nesne; Next 15+'a geçilirse `await params` gerekir. |
| Veritabanı | Supabase (ücretsiz plan, 500 MB). Upstash **artık kullanılmıyor**. |
| Embedding | `text-embedding-3-large`, `dimensions: 1536`, **başlıksız** belge (Genres / Themes / Director / Setting / Story). Tek kaynak: `src/lib/recommend/embeddingDoc.mjs` |
| Retrieval | `similar_movies_v3(seed_movie_id, match_limit=200)`, HNSW (`m=16, ef_construction=64`), `hnsw.ef_search` fonksiyon içinde ayarlı |
| Reranker | `src/lib/recommend/reranker.ts` ("lightNoRec"): semantic 0.75, keyword 0.05, genre 0.04, director 0.03, quality 0.04, collection 0.08 + cezalar. Keyword aday kanalı **kapalı**, TMDB öneri bonusu **kapalı**. |
| Kişiselleştirme | Yok (henüz) |

### Ölçümlerle alınan kararlar (LLM hakem: gpt-4.1, 50 seed, Top 10, nDCG@10)

| Sıralama | nDCG@10 |
|---|---|
| Eski ağır hybrid reranker | 0.78 |
| Saf semantic (v3) | 0.80 |
| **Şu anki hafif reranker** | **0.82** |

- Asıl kazanç v3 embedding'den geldi (keyword'leri belgeye koyup başlığı çıkarmak). Reranker'ı ağır tutmak zarar veriyordu.
- Keyword kanalının eklediği adaylar LLM'den ort. 0.95/3 aldı → kapatıldı. Yönetmen sınırı 3 auteur'leri kesiyordu → 10.
- TMDB "recommendations" bonusu ölçülebilir fark yaratmadı → kapalı (kod duruyor).
- Ağırlık değiştirmeden önce mutlaka `llm_judge.mjs` ile ölç (puanlar önbellekli, tekrar ödeme yok).

### Veri gerçekleri
- Katalog: **22.933 film** (22.931 + admin'den eklenen *Düşman* #181886 ve *Kapsül/Primer* #14337).
- Keyword'ü olan film %57 (TMDB'de gerçekten yok, çekim eksikliği değil). Seri (collection) bilgisi %14. Türkçe başlık/özet ~%25.
- Filmlerin yarısından fazlası <10 oy almış. Bunları silmek önerilmedi: az bilinen filmlerin önerilerini besliyorlar (LLM ort. 1.83/3).
- **Oy/puan verisi eskiyebilir (2026-10-02 bulgusu):** vizyondan önce eklenen filmler `vote_count=0` kalıyor; reranker bunlara `lowVotes` cezası (−0,08) + kalite 0 veriyor ve film top 20'den düşüyor (ör. Marslı → Project Hail Mary: adaylarda 7. sıradaydı ama katalogda 0 oy, TMDB'de 8.078). `scripts/tmdb/refresh_stats.mjs` ile 2021+ filmlerde 2.575 satır tazelendi (2026'da "<20 oy" görünen 671 → 491). Eski değerler: `data/tmdb/stats_backup_2026-10-02_dry.json` (tam liste). **Henüz otomatik değil**, haftalık işe bağlanmalı.
- **Katalogda çok sayıda popüler film eksik (2026-10-02 taraması):** TMDB'nin en çok oy alan 10.000 filminden **5.154'ü katalogda yok** (≥5.000 oy: 104 · ≥2.000: 807 · ≥1.000: 2.019 · ≥500: 3.953; ör. Transformers, Minions, Hızlı ve Öfkeli 6, Cloverfield, Addams Ailesi 2019). Katalogdaki 22.934 filmin yalnızca 2.906'sı ≥1.000 oylu, yarısından fazlası <10 oylu. Haftalık iş bunları 100'er ekler; **toplu ilk dolgu kararı bekliyor** (yer: 480 MB sınırına kadar ~4.600 film).
- Supabase doluluk: ~403 MB / 500 MB → tahminen ~5 bin film daha sığar. Admin panelinde göstergesi var.

---

## 3. Site

**Sayfalar:** `/` (tek arama kutusu + örnek tarifler + mod kutucukları) · `/ara?q=` (tarife göre arama) · `/film/[id]` (detay, fragman, nerede izlenir, platform filtresi, benzer filmler) · `/mod/[id]` (8 mod, "Karıştır") · `/privacy` · `/admin` · `/admin/login`

**API:** `/api/search-movie?q=` · `/api/vibe-search?q=` · `/api/similar/[id]?limit=&debug=1&p=8,337` · `/api/admin/*` (login, logout, refresh-providers, catalog/search, catalog/add)

**Öne çıkan davranışlar**
- Arama: katalogda "içinde geçer" araması (yarım kelime, "ruhların kaç") + TMDB (sunucuda, anahtar tarayıcıya gitmez).
- "Neden önerildi?": reranker'daki gerçek sinyallerden (seri, yönetmen, ortak temalar, türler); keyword'ler Türkçe.
- Modlar semantic: mod tanım metni embed edilir, en yakın filmler `src/data/moods.json`'da. **Nostalji** dönem tanımı olduğu için tür/yıl/puan filtresiyle kalır.
- "Nerede izlenir?": TMDB/JustWatch Türkiye verisi (kaynak belirtmek şart, UI'da yazıyor). Filtre 200 adayın tamamında arar, seçim tarayıcıda hatırlanır.
- Eski kaydırmalı `/kesfet` sayfası, `/api/recommendations` ve Upstash kodu **silindi**.

### Tarife göre arama ("vibe", `/ara`)
- **Akış** (`src/lib/recommend/vibe.ts`): Türkçe cümle → `gpt-4.1-mini` ile film belgesi formatına (Genres/Themes/Setting/Story, İngilizce) → `text-embedding-3-large` → Supabase RPC `vibe_search_v3` (HNSW, 300 aday, `vote_count>=100`) → hafif kalite ayarı (≤0.04) → 24 film. Kartta "neden eşleşti" = LLM temalarıyla filmin keyword'lerinin kesişimi (Türkçe).
- **Neden belgeye çeviriyoruz:** cümleyi doğrudan embed etmek alakasız sonuç veriyor ("zaman döngüsü" → Paper Lives, Winter Sleep); belgeye çevirince Kelebek Etkisi, Ölüm Günün Kutlu Olsun, Zamanın Ötesinde. Deney betiği: `node scripts/rerank/vibe_try.mjs ["sorgu"…]` (yerel v3 embedding, Supabase'e dokunmaz, önbellekli).
- **Supabase'te çalıştırıldı:** `scripts/sql/vibe_search.sql` (`vibe_search_v3`). Yeni Supabase projesi kurulursa tekrar çalıştırılmalı.
- **Maliyet/hız:** arama başına ~$0,0002. Yeni tarif ~3,7–4,9 sn (yerel ölçüm; OpenAI ~1,5–2 sn + soğuk Supabase), aynı tarif 8 ms (6 sa önbellek).
- **Koruma:** IP başına dakikada 8 yeni arama + 240 karakter sınırı; **sunucu örneği başına bellek içi** (kesin değil, kötüye kullanım olursa Vercel'in hız sınırlaması eklenmeli). Uç nokta herkese açık ve OpenAI'ye para ödüyor.
- **Arama kutusu** (`SearchBox.tsx`): film adı önerileri + ilk satırda "…gibi bir film bul" (tarif). Enter: 4+ kelime ya da film sonucu yoksa tarif, aksi halde ilk film. Klavye gezintisi + ARIA combobox.

### Tasarım sistemi (2026-10-01 yenileme)
- **Palet** (`tailwind.config.ts`): zemin `#0c0a09`, kart `#171310`, vurgu amber `accent #e0963a` / `accent-glow #f5b966`, `ember #c2542d`. `white` bilerek krem (`#f6efe4`): tüm `text-white/NN`, `border-white/10` kullanımları sıcak tonda çıkar. Token adları eskisiyle aynı olduğu için admin paneli otomatik yeni renkleri aldı (ayrıca elden geçirilmedi).
- **Yazı:** başlıklar `font-display` (Fraunces), gövde Inter. **Inter `latin-ext` ile yüklenir** (yoksa ş/ğ/ı/İ sistem fontuna düşüyordu).
- **Atmosfer:** `body::before` film grenı, `.spotlight` huzmesi, ana sayfada `PosterWall` (moods.json'dan 21 afiş, yavaş akan, karartılmış; veri alınamazsa sessizce gizlenir).
- **Ortak bileşenler:** `SiteHeader` (`overlay` filmde; **üst çubukta kompakt arama kutusu**, `SearchBox size="sm"`, öneri listesi kutunun altına biner ve ~3–4 film yüksekliğinde kaydırılır (`max-h-[25rem]`), mobilde ikinci satır; ana sayfa ve `/ara`'da `search={false}`), `Footer` (artık statik), `FilmCard` (`index` ile kademeli giriş animasyonu), `MoodChips` (`tiles` = ana sayfa kutucukları).
- **Film sayfası:** `SiteHeader overlay` kapak `div`'inin **dışında**, `main`'in (`relative`) doğrudan çocuğu: kapak `overflow-hidden` olduğu için içindeyken üst arama kutusunun sonuç listesini kesiyordu (2026-10-02 düzeltildi). Büyük kapak, `-mt-56` ile bilgi bloğu; afiş `self-start` (flex'te uzamasın diye şart), `lg:w-72`. Benzer filmler `Suspense` içinde (`SimilarList`).
- **Fragman:** `src/lib/recommend/trailer.ts` (TMDB `/movie/{id}/videos`, `include_video_language=tr,en`; Trailer > Teaser, resmî, Türkçe > İngilizce, en yeni; 24 sa önbellek) + `TrailerButton` (modal, Esc/dış tık, odak yönetimi, YouTube yalnızca tıklayınca `youtube-nocookie.com`). Gizlilik sayfasına YouTube eklendi.

### Admin paneli (`/admin`)
- Şifreli giriş (`ADMIN_PASSWORD`), imzalı httpOnly çerez, `src/middleware.ts` ile korunur.
- **Katalog:** TMDB'de ara → katalogda olmayanı "Kataloğa ekle" (TMDB detay + TR çeviri → v3 embedding → Supabase → platform bilgisi, ~1–5 sn, ~$0.00002/film). Eklenen film anında aranır, kendi önerileri çıkar, başka filmlerin önerilerine girer (Supabase okumaları `catalog` etiketiyle önbelleklenir, ekleyince tazelenir).
- **Veritabanı doluluk çubuğu** (`admin_db_usage` SQL fonksiyonu).
- **Platform bilgisi:** istatistikler, son GitHub Actions çalıştırmaları, **"Şimdi güncelle"** butonu.

### Otomasyon (GitHub Actions)
- **Platform yenileme** — `.github/workflows/refresh-providers.yml`: her **pazartesi 03:00 UTC (06:00 TR)** + elle "Run workflow". `fetch_providers.mjs` (>%1 hata varsa durur) → `upload_providers.mjs` (yeni veri tablonun %70'inden azsa silmeden durur; `--force` ile atlanır).
- **Katalog güncelleme** — `.github/workflows/update-catalog.yml`: her **pazartesi 02:00 UTC (05:00 TR)**, platform yenilemesinden bir saat önce (yeni filmler aynı sabah platform taramasına girer) + elle "Run workflow" (`max_add` girdisi) + admin panelinde "Şimdi güncelle". Adımlar:
  1. `scripts/catalog/add_missing.mjs --max=100`: eksik filmleri ekler. Öncelik: (a) Türkiye'de son 60 günde vizyona girenler (TMDB discover `region=TR`, ≥10 oy), (b) TMDB'nin en çok oy alan 10.000 filminden (≥300 oy) katalogda olmayanlar, oy sayısına göre. Ekleme admin'deki "Kataloğa ekle" ile aynı (TMDB detay + TR çeviri → `embeddingDoc.mjs` → OpenAI → `film_embeddings_v3` + `film_providers`). Veritabanı **480 MB**'ı geçerse eklemez. `--dry-run`, `--ids=…`.
  2. `scripts/tmdb/refresh_stats.mjs`: 2021+ filmlerin oy/puan/popülerliği.
  3. `scripts/catalog/rebuild_static.mjs`: `idf.json`, `keywords_tr.json` (sadece yeni keyword'ler çevrilir; mevcut/elle düzeltilmiş çevirilere dokunmaz), `moods.json` (kalite tabanını geçen ~4.700 filmin embedding'i Supabase'ten çekilip tam cosine; yerel `build_moods.mjs` ile aynı sonuç). ~30 sn.
  4. Değişen `src/data/*.json` commit'lenip push'lanır → Vercel deploy. Yazar olarak repodaki son commit'in sahibi kullanılır (Vercel tanımadığı yazarı deploy etmeyebilir).
  - Eklenen filmlerin listesi çalıştırmanın **Summary** sayfasında. Yeni filmler sitede en geç ~1 saat içinde görünür (Supabase okumaları 1 sa önbellekli).
  - Script'ler yerel `data/` klasörüne ihtiyaç duymaz (`scripts/catalog/lib.mjs`). Mod tanımları tek kaynak: `scripts/rerank/moodDefs.mjs`.
  - **Gerekli ek secret:** GitHub'da `OPENAI_API_KEY` (embedding + keyword çevirisi).

---

## 4. Ortam değişkenleri (değerler `.env.local` / Vercel / GitHub Secrets'ta)

| Değişken | Nerede gerekli |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, Vercel, GitHub Secrets |
| `TMDB_API_KEY` | `.env.local`, Vercel, GitHub Secrets |
| `OPENAI_API_KEY` | `.env.local`, Vercel, **GitHub Secrets (haftalık katalog güncellemesi)**. Admin'den film ekleme **ve ziyaretçilerin tarife göre aramasında** (`/ara`) kullanılır; bakiye bitince tarif araması çalışmaz ("Arama şu an yapılamadı"). Benzer film/film adı aramasında OpenAI yok. |
| `ADMIN_PASSWORD` | Vercel (+ istersen `.env.local`) |
| `GITHUB_TOKEN` | Vercel: fine-grained, sadece bu repo, **Actions: Read and write** |

`SUPABASE_SERVICE_ROLE_KEY` asla `NEXT_PUBLIC_` olmamalı. Tarayıcı paketinde anahtar olmadığı doğrulandı.

---

## 5. Sık kullanılan komutlar

```bash
npm run dev                                   # yerel site (kendi terminalinde çalıştır)

# Değerlendirme
node scripts/rerank/llm_judge.mjs             # LLM hakem (ağırlık denemeleri için)
node scripts/rerank/eval.mjs --emb v3         # golden.json recall
node scripts/rerank/compare_emb.mjs 603 26466 # v2/v3 saf semantic karşılaştırma

# Veri üretimi / yenileme
node scripts/tmdb/fetch_providers.mjs && node scripts/tmdb/upload_providers.mjs   # (Actions da yapıyor)
node scripts/tmdb/refresh_stats.mjs            # 2021+ filmlerin oy/puan/popülerliğini TMDB'den tazele (--from=YIL, --dry-run)
node scripts/catalog/add_missing.mjs --dry-run # katalogda eksik filmleri listele (yazmaz); --max=N, --ids=1,2
node scripts/catalog/rebuild_static.mjs       # idf + keyword çevirileri + modlar (Supabase'ten; haftalık iş de bunu çalıştırır)
node scripts/tmdb/translate_keywords.mjs      # yeni keyword'leri Türkçeye çevir (önbellekli)
node scripts/rerank/build_moods.mjs           # mod listelerini yeniden hesapla
node scripts/rerank/build_idf.mjs             # keyword ağırlık tablosu
node scripts/embed/embed_v3.mjs --dry-run     # embedding belgesi + maliyet tahmini
```

Supabase SQL'leri `scripts/sql/` altında: `v3_setup.sql`, `film_providers.sql`, `admin_db_usage.sql` (hepsi çalıştırıldı), `drop_v2.sql` (çalıştırıldı, v2 silindi).

---

## 6. Bilgisayarda olup GitHub'da OLMAYANLAR (yedekle!)

`.gitignore`'daki büyük veri klasörleri yalnızca bu bilgisayarda:
- `data/export/`: Supabase + Upstash yedeği. **Eski v2 embedding yedeği:** `data/export/supabase/film_embeddings_v2.embeddings.jsonl` (442 MB). v2 tablosu silindi, tek kopya bu.
- `data/embeddings/`: v3 embedding'leri (`v3.bin`) ve mod vektörleri
- `data/tmdb/`: zenginleştirme, keyword çevirisi önbelleği, platform verisi

GitHub'da: kod, `src/data/*.json`, `data/eval/` (golden set, LLM puan önbelleği, raporlar), `scripts/`.

---

## 7. Yapılacaklar / açık konular

### Öncelikli
1. **Upstash token'ını iptal et.** Eski commit'lerde (`upload_to_upstash.py`) açıkta duruyor; dosya silindi ama git geçmişinde kalır.
2. **Haftalık katalog güncellemesi kuruldu (2026-10-02)**, ayrıntı: bölüm 3 → Otomasyon. Kalanlar:
   - GitHub Secrets'a `OPENAI_API_KEY` eklenmeli (yoksa iş ilk adımda durur) ve ilk çalıştırma Actions'tan elle denenmeli.
   - **İlk dolgu:** 5.154 eksik popüler film için karar (ör. ≥1.000 oylu 2.019 film: ~35 MB, ~0,1 $). `node scripts/catalog/add_missing.mjs --max=2000`.
   - Admin panelinde eklenen filmlerin listesi yok (GitHub Summary'de); istenirse panele taşınır.
3. **Arama hızı (kenara bırakıldı, sırada):** soğuk film sayfası hâlâ yavaş. Ölçümler (2026-10-01):
   - Vercel fonksiyon bölgesi NA'daydı, **Frankfurt'a çekildi** (canlıda `fra1` doğrulandı).
   - Canlıda soğuk film sayfası: ilk bayt 0,5–1,6 sn, tamamı 2,7–4,8 sn; ikinci açılış 0,4 sn. "matrix" aramasının ilk çağrısı 11 sn (soğuk fonksiyon + soğuk katalog taraması), sonrakiler 0,7–0,9 sn.
   - Asıl darboğaz `similar_movies_v3` soğuk sorgusu: 60 farklı film art arda → ort. 1,8 sn → 0,74 sn → 1,45 sn (medyan 0,97, p90 1,98). Ücretsiz plandaki bellek 22 bin filmlik 1536 boyutlu HNSW index'ini tutmuyor; `pg_prewarm`/ısıtma kalıcı çözüm değil.
   - **Önerilen çözüm:** her film için en yakın 100–200 komşuyu tabloya önceden hesapla (istek anında HNSW taranmaz, ~100–250 ms). ~15 MB (100 komşu) / ~30 MB (200 komşu) yer tutar; Supabase doluluğu 403/500 MB olduğu için yeni film payı ~1.000–1.500 film azalır. Admin'den eklenen filmin listesi canlı HNSW ile hesaplanıp yazılır; eski filmlerin listelerine girmesi haftalık yenilemeyle (katalog güncelleme işiyle birlikte).
   - Alternatif/ek: `hnsw.ef_search` 400 → 200 (yaklaşık yarıya iner, `llm_judge.mjs` ile kaliteyi yeniden ölç); tarif aramasında çeviri adımını daha küçük modele geçirmek (kaliteyi `vibe_try.mjs` ile ölç).
4. **Tasarım turu devam:** yeni tasarım beğenilmeyen yerler olursa elden geçirilecek (ör. afiş görseli 500 px → retina'da yumuşak olabilir, `w780`'e geçilebilir). Admin paneli ayrıca tasarlanmadı. `README.md` ve eski swipe metinleri hâlâ güncellenmedi.

### Fikir listesi (araştırmadan çıkanlar, sırayla)
- 👍/👎 (hesapsız, tarayıcıda): kişiselleştirme + **gerçek kullanıcı verisi** toplamak
- "İki filmi karıştır" (iki embedding'in ortası)
- SEO: sitemap, paylaşım görseli (OG), "X'e benzer filmler" başlıkları
- Seri adlarını Türkçeleştirmek ("The Matrix Collection" → "Matrix serisi")
- İlk açılış gecikmesi → aşağıdaki "Arama hızı" maddesine bakınız

### Bilinen sınırlar / teknik borç
- Niş filmlerde (ör. Triangle) öneriler zayıf: veri sınırı (az keyword, "time loop" filmlerinin çoğu katalogda yok).
- Keyword çevirileri sözlükte düz JSON; hatalı olanlar elle düzeltilebilir (`src/data/keywords_tr.json`, örn. "halk korku filmi", "gnostisizm").
- Yeni bir TV/streaming platformu gelirse adı/logosu için `fetch_providers.mjs`'i **bilgisayarda** çalıştırıp `src/data/providers_tr.json`'ı commit'lemek gerekir (Actions `--no-catalog` ile çalışır).
- `dev_dev_arsiv.json` (79 MB, eski Upstash verisi) hâlâ repoda; `package.json`'da kullanılmayan `@upstash/vector` ve `framer-motion` var.
- `README.md` ve sekme başlığı dışındaki bazı metinler eski swipe uygulamasından kalma olabilir; arayüz elden geçirilecek.
- `NEXT_PUBLIC_TMDB_API_KEY` eski koddan kalma referanslar temizlendi mi kontrol edilebilir (`src/lib/tmdb.ts` yalnızca genre haritaları için kullanılıyor).
- **Tarif araması bulgusu:** LLM bazen tema listesine olmayan şeyler ekleyebilir; "Setting" satırını yalnızca sorguda açıkça ülke/dil/dönem geçerse yazması için istemde kural var (Türkçe yazıldı diye "Turkish" eklemesin). Sonuçlar kalitesiz görünürse önce `vibe_try.mjs` ile istemi ölç.
- **Geliştirme ortamı:** Bu bilgisayarda `gh` (GitHub CLI) kurulu ama PATH'te değil (`C:\Program Files\GitHub CLI\gh.exe`) ve giriş yapılmadı (`gh auth login --web --git-protocol https`, kendi PowerShell penceresinde). Ağ zaman zaman takılıyor (github.com / TMDB zaman aşımı), yeniden denemek yeterli. Claude oturumları worktree'de çalışıyor ve **main'e push/merge yapmıyor**: branch push'lanır, `git merge --ff-only origin/<branch>` + `git push origin main` sende.
- Başsız Chrome (`chrome.exe --headless=new --screenshot`) ile ekran görüntüsü alınabiliyor; 500 px'ten dar pencere açmaz, mobil için iframe sarmalayıcı kullanıldı.

### Harcama
Yaklaşık 1 $ (tahmini; embedding ~0.30 + LLM hakem ~0.30 + keyword çevirisi ~0.40). OpenAI bakiyesi ~3 $ ile başlamıştı. Artık **ziyaretçi başına değişken maliyet** var: tarif araması ~$0,0002/yeni arama (1.000 arama ≈ $0,20); bakiyeyi ara sıra kontrol et.

---

## 8. Önemli dosya haritası

```
src/lib/recommend/   reranker.ts · similar.ts · moods.ts · providers.ts · embeddingDoc.mjs · types.ts · vibe.ts · trailer.ts
src/components/      SiteHeader · Footer · film/{FilmCard,TrailerButton,WatchProviders,PlatformFilter} · search/{SearchBox,MoodChips} · home/PosterWall
src/lib/server/      supabase.ts · tmdbServer.ts · catalogAdd.ts · adminAuth.ts · adminStats.ts · github.ts · workflowRoute.ts
src/data/            idf.json · keywords_tr.json · moods.json · providers_tr.json
src/app/             page.tsx · film/[id] · mod/[id] · admin · api/{similar,search-movie,admin}
scripts/rerank/      reranker.mjs (offline ikiz) · configs.mjs · eval.mjs · llm_judge.mjs · build_*.mjs
scripts/catalog/     lib.mjs · add_missing.mjs · rebuild_static.mjs (haftalık iş)
scripts/tmdb/        enrich · fetch/upload_providers · translate_keywords · tmdbClient
scripts/embed/       embed_v3.mjs · upload_v3.mjs
scripts/export/      supabase/upstash export, inventory, loadEnv
data/eval/           golden.json · llm_seeds.json · llm_judgments.jsonl · raporlar
```

Not: `scripts/rerank/reranker.mjs` (offline deney) ile `src/lib/recommend/reranker.ts` (canlı) aynı mantığın iki kopyası. Ağırlık değişirse ikisini de güncelle.
