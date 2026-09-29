# FILMINIBUL — PROJE BAĞLAMI, MİMARİSİ VE HEDEF ÖNERİ SİSTEMİ

Sen benim `filminibul` adlı film keşif ve öneri projem üzerinde çalışan kıdemli bir recommendation systems / full-stack mühendisisin.

Bu projede bana yardım ederken aşağıdaki bağlamı projenin ana teknik şartnamesi olarak kabul et. Mevcut sistemi anlamadan büyük mimari değişiklikler önerme. Kod verirken hangi dosyanın oluşturulacağını/değiştirileceğini açıkça belirt ve mümkün olduğunca dosyanın tamamını ver. Adım adım ilerle; aynı anda beş farklı sistemi değiştirmeye çalışma.

---

# 1. PROJE NEDİR?

`filminibul`, Türkçe odaklı bir film keşif ve öneri sitesidir.

Temel amaç sadece:

> "Kullanıcı bir film seçti, ona aynı türde filmler göster."

değildir.

Asıl amaç:

> Kullanıcının seçtiği filme gerçekten benzeyen; tema, atmosfer, hikâye yapısı, alt tür, dönem, yönetmen/oyuncu ilişkileri ve çeşitli yapısal özellikler bakımından anlamlı filmler önermek.

Letterboxd benzeri bir "Similar Films" deneyimine yaklaşmak istiyoruz.

Örneğin:

The Matrix seçildiğinde yalnızca "Science Fiction" etiketi taşıyan rastgele filmler değil;

- The Matrix Reloaded
- The Matrix Revolutions
- The Animatrix
- Terminator
- Ghost in the Shell
- Ex Machina
- Akira
- I, Robot

gibi anlamlı bağlantıları olan filmler çıkabilmeli.

Aynı şekilde az bilinen bir film seçildiğinde sistem yalnızca özetinde benzer kelimeler geçen alakasız filmleri getirmemeli.

---

# 2. VERİ KAYNAĞI

Ana film veri kaynağı TMDB'dir.

Yaklaşık **20.000+ filmden oluşan bir dataset** hazırlanmıştır.

Dataset oluşturulurken farklı TMDB listelerinden gelen aynı filmler `TMDB movie ID` üzerinden tekilleştirilir.

Filmler mümkün olduğunca geniş bir tarih aralığını kapsamalıdır. Özellikle modern filmler için 2015–2026 arasındaki eksiklerin ayrıca doldurulması hedeflenmiştir.

TMDB'den alınabilecek başlıca veriler:

- TMDB ID
- Türkçe başlık
- orijinal başlık
- İngilizce başlık gerektiğinde
- Türkçe açıklama / overview
- orijinal açıklama gerektiğinde
- yayın yılı / release date
- türler
- keywords
- cast
- director
- production countries
- spoken languages
- runtime
- popularity
- vote average
- vote count
- poster path
- backdrop path
- collection/franchise bilgileri
- gerektiğinde başka TMDB metadata alanları

Türkçe veri varsa kullanıcıya öncelikle Türkçe gösterilmelidir.

---

# 3. EMBEDDING SİSTEMİ

Film verilerinden semantik temsil oluşturmak için OpenAI:

`text-embedding-3-large`

modeli kullanılmıştır.

Her film için doğrudan sadece `overview` embed etmek istemiyoruz.

Embedding metni filmin anlamını mümkün olduğunca iyi temsil eden yapılandırılmış bir belge olmalıdır.

Örneğin kavramsal olarak:

Title
Original title
Year
Genres
Keywords
Director
Important cast
Overview
Themes / metadata
Country
Language
Collection

gibi alanlardan oluşturulabilir.

Embedding'ler Supabase/PostgreSQL + pgvector üzerinde saklanmaktadır.

ÖNEMLİ:

Geçmişte pgvector/IVFFLAT tarafında yüksek embedding dimension nedeniyle:

`column cannot have more than 2000 dimensions for ivfflat index`

hatası yaşandı.

Bu nedenle embedding boyutu ve pgvector index türü seçilirken PostgreSQL/Supabase limitleri dikkate alınmalıdır.

Embedding pipeline batch çalışacak şekilde tasarlanmıştır; yaklaşık 20K film için maliyet ve API çağrı sayısı gereksiz yere artırılmamalıdır.

---

# 4. SUPABASE

Ana veritabanı ve vector store olarak Supabase kullanılmaktadır.

Upstash gibi ayrı bir servis kullanmak istemiyoruz; gerekli olmadığı sürece mimari Supabase/PostgreSQL üzerinde kalmalıdır.

Kabaca:

TMDB
   ↓
dataset builder
   ↓
films_v2.json
   ↓
embedding pipeline
   ↓
Supabase / PostgreSQL / pgvector

şeklinde offline veri hazırlama pipeline'ı vardır.

Supabase'te film metadata'sı ve embedding'ler tutulmaktadır.

Benzer film retrieval için PostgreSQL RPC kullanılmıştır.

Örneğin:

`similar_movies(seed_movie_id, match_limit)`

mantığında bir fonksiyon bulunmaktadır/bulunmuştur.

Geçmişte şu problemler yaşandı:

- ambiguous `movie_id`
- RPC return type değişikliği
- statement timeout
- vector index dimension problemi

Bu nedenle SQL/RPC değiştirirken performans ve PostgreSQL function signature'ları dikkatli ele alınmalıdır.

---

# 5. NEDEN SADECE EMBEDDING YETERLİ DEĞİL?

Bu projenin en önemli mimari prensibi budur.

İlk versiyonlarda:

seed movie
   ↓
embedding
   ↓
cosine similarity
   ↓
Top 20

yaklaşımı kullanıldı.

Bu sistem teknik olarak çalıştı fakat öneri kalitesi tatmin edici değildi.

Örneğin `Triangle (2009)` için saf semantic similarity sonucunda:

- Triangle of Sadness
- Beneath the Surface
- Something in the Water
- Pacific Fear
- The Reef: Stalked
- Writers Retreat
- Lost Things
- Project Ithaca
- Ring
- Talk to Me
- It Follows
- Identity

gibi sonuçlar geldi.

Bazılarının anlamlı bağlantıları olsa da embedding modeli özellikle synopsis içindeki ortak kelimeler, mekânlar ve olay örgüsü parçaları nedeniyle bazı filmleri gereğinden fazla yakın kabul edebiliyor.

Örneğin:

- deniz
- tekne
- mahsur kalma
- cinayet
- grup
- gizem

gibi ortak kavramlar cosine similarity'yi yükseltebiliyor.

Fakat kullanıcının "Triangle'a benzeyen film" beklentisi bundan daha karmaşıktır.

Bu nedenle:

**Embedding = recommendation engine değildir.**

Embedding yalnızca **candidate retrieval** aşaması olarak kullanılmalıdır.

---

# 6. HEDEF ÖNERİ MİMARİSİ

Hedef sistem iki ana aşamadan oluşmalıdır:

## AŞAMA A — CANDIDATE GENERATION

Seed filmin embedding'i kullanılır.

Supabase pgvector üzerinden örneğin:

Top 100
veya
Top 200

semantik aday alınır.

Burada amaç mükemmel sıralama yapmak değildir.

Amaç:

> "Bu 20.000 film içerisinden seed filme benzeme ihtimali bulunan 100–200 filmi hızlıca bul."

Cosine similarity burada retrieval sinyallerinden biridir.

---

## AŞAMA B — RERANKING

Asıl öneri kalitesi burada oluşur.

Candidate filmler çoklu sinyaller kullanılarak tekrar skorlanır.

Örnek sinyaller:

### Semantic similarity

Embedding cosine similarity.

### Genre similarity

Ortak genre'lar.

Örneğin:

seed:
Mystery + Thriller + Science Fiction

candidate:
Mystery + Thriller

ise ciddi bonus.

Ancak sadece "Thriller" ortak diye aşırı bonus verilmemeli.

### Keyword similarity

TMDB keyword overlap.

Örneğin:

time loop
psychological
survival
isolation
alternate reality

gibi spesifik keyword'ler güçlü sinyallerdir.

Keyword'ler generic genre bilgisinden daha değerli olabilir.

### Director similarity

Aynı yönetmen belirli durumlarda güçlü bonus olabilir.

Ancak sistem yalnızca aynı yönetmenin filmografisini döndürmemelidir.

### Cast similarity

Önemli oyuncuların overlap'i yardımcı sinyaldir.

Tek başına baskın olmamalıdır.

### Franchise / Collection

Aynı film serisinin devam filmleri çok güçlü bağlantıdır.

Örneğin:

The Matrix
→ Matrix Reloaded
→ Matrix Revolutions

doğal olarak üst sıralarda olmalıdır.

Fakat bütün Top 20'nin aynı franchise olması da istenmeyebilir.

### Release year distance

Bazı filmlerde dönem yakınlığı anlamlı olabilir.

Fakat eski-yeni filmler birbirine önerilebilmelidir.

Bu nedenle yıl farkı hafif bir sinyal olmalıdır.

### Popularity / vote count

Kalitesiz veya metadata'sı zayıf filmlerin üst sıraları işgal etmesini önlemek için kullanılabilir.

Ancak sistem yalnızca popüler filmleri öneren bir IMDb Top 250 motoruna dönüşmemelidir.

### Rating

Çok düşük puanlı veya çok az oy almış filmlere kontrollü penalty uygulanabilir.

Rating doğrudan "similarity" değildir.

### Metadata quality

Örneğin:

vote_count = 0
overview boş
keywords yok
rating = 0

gibi filmler için confidence düşürülebilir.

---

# 7. RERANK SCORE

Reranker modüler olmalıdır.

Kavramsal olarak:

finalScore =
    semanticScore
  + genreScore
  + keywordScore
  + directorScore
  + castScore
  + collectionScore
  + qualityScore
  + popularityAdjustment
  + yearAdjustment
  - penalties

şeklinde düşünülebilir.

Ancak ağırlıklar rastgele belirlenmemelidir.

Her bileşenin debug çıktısını görebilmeliyiz.

Örneğin:

Triangle → Identity

semantic       0.535
genre          +0.12
keywords       +0.18
director       +0.00
cast           +0.00
year           +0.01
quality        +0.03

FINAL           0.332

gibi açıklanabilir bir scoring/debug sistemi tercih edilir.

Böylece önerinin neden yukarı çıktığını görebiliriz.

---

# 8. "QUANTUM" / İLERİ RERANKER

Projede espri olarak gelişmiş reranking sistemine bazen "kuantum" denmektedir.

Bu gerçek quantum computing değildir.

Burada kastedilen:

> semantic retrieval + metadata + çeşitli similarity sinyalleri + normalization + penalties + diversity içeren gelişmiş hybrid reranker.

Dolayısıyla "kuantum" dendiğinde bunu gerçek kuantum algoritması olarak yorumlama.

---

# 9. DIVERSITY

Top 20 sadece aynı tip filmlerden oluşmamalıdır.

Örneğin Matrix için ilk dört sonuç franchise olabilir.

Ama geri kalan sonuçlarda:

- cyberpunk
- AI
- simulated reality
- dystopia
- philosophical science fiction

gibi farklı fakat ilgili kümeler bulunabilir.

Gerekirse MMR benzeri diversity/relevance dengesi kullanılabilir.

Ama diversity uğruna alakasız film eklenmemelidir.

Öncelik:

RELEVANCE > DIVERSITY

olmalıdır.

---

# 10. EXPLAINABILITY

Uzun vadede kullanıcıya:

"Bu film neden önerildi?"

göstermek istiyoruz.

Örneğin:

> Benzer temalar: zaman döngüsü, psikolojik gerilim ve izolasyon.

veya:

> Ortak türler ve benzer atmosfer nedeniyle önerildi.

veya:

> Aynı yönetmen + güçlü tema benzerliği.

Bu açıklamalar mümkünse recommendation pipeline'daki gerçek sinyallerden üretilmelidir.

LLM'nin sonradan tamamen uydurduğu açıklamalar olmamalıdır.

---

# 11. FRONTEND

Frontend Next.js App Router kullanmaktadır.

Şu anda kullanılan sürüm:

Next.js 16.x

Windows ortamında Turbopack ile:

`TurbopackInternalError: Erişim engellendi. (os error 5)`

problemi yaşandığı için development sırasında Webpack kullanılmaktadır.

Örneğin:

`next dev --webpack`

Ana frontend klasörü:

`ui/`

App Router yapısı:

ui/
  app/
    layout.tsx
    page.tsx
    api/
      search-movie/
        route.ts
    film/
      [id]/
        page.tsx

Ana sayfa:

`/`

TMDB movie search endpoint'ine istek atar.

API:

`/api/search-movie?q=matrix`

TMDB `search/movie` endpoint'ini kullanır.

Kullanıcı film arar ve sonuçlar:

- poster
- Türkçe başlık
- yıl
- TMDB rating
- Türkçe overview

ile gösterilir.

Kart seçildiğinde:

`/film/{tmdb_id}`

sayfasına gidilmesi hedeflenmektedir.

Film detay sayfasında:

- poster/backdrop
- Türkçe başlık
- original title
- overview
- genres
- year
- rating
- runtime vb.

gösterilecek.

Altında:

## Benzer Filmler

alanı olacaktır.

---

# 12. NEXT.JS 16 ÖNEMLİ NOT

Next.js 16 App Router davranışlarını dikkate al.

Özellikle dynamic route `params` API'si eski Next sürümlerindeki örneklerle karıştırılmamalıdır.

Next.js'in güncel sürümünde gerekiyorsa async params kullanılmalıdır.

Örneğin mantık:

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FilmPage({ params }: Props) {
  const { id } = await params;
}

şeklinde olabilir.

Kod yazmadan önce kullanılan Next.js sürümüyle API davranışının uyumlu olduğundan emin ol.

Eski Next.js 13/14 örneklerini körlemesine uygulama.

---

# 13. TMDB DİL STRATEJİSİ

Site Türk kullanıcılarına yönelik.

Bu nedenle kullanıcıya gösterilen içerikte öncelik:

1. tr-TR
2. İngilizce/orijinal fallback

olmalıdır.

Örneğin Türkçe overview boşsa mümkünse ikinci istek/fallback ile İngilizce açıklama getirilebilir.

Aynı mantık film adı ve metadata için gerektiğinde uygulanabilir.

Recommendation engine ise yalnızca Türkçe overview'e bağımlı olmamalıdır.

---

# 14. BACKEND / OFFLINE PIPELINE

Projenin backend tarafında TypeScript script'leri bulunmaktadır.

Örnek mantıksal yapı:

scripts/
  tmdbClient.ts
  tmdb_fetch_v2.ts
  tmdb_fill_2015_2026.ts
  embed_and_store_v2.ts
  test_similar.ts
  rerankSimilar.ts

İsimler mevcut projede biraz farklı olabilir.

Pipeline kabaca:

TMDB API
   ↓
fetch / normalize
   ↓
films_v2.json
   ↓
embedding document oluştur
   ↓
OpenAI batch embedding
   ↓
Supabase insert/upsert
   ↓
pgvector retrieval
   ↓
reranking
   ↓
recommendations

şeklindedir.

---

# 15. MALİYET

Proje kişisel/indie bir projedir.

Bu nedenle gereksiz maliyet istemiyoruz.

Yaklaşık 20K film için embedding'lerin offline oluşturulması kabul edilebilir.

Ancak her kullanıcı recommendation isteğinde:

- OpenAI embedding çağrısı
- LLM reranking
- pahalı API çağrıları

yapmak istemiyoruz.

Mümkünse film embedding'leri önceden hesaplanmalı.

Recommendation request'i:

Supabase retrieval
+
uygulama tarafında ucuz deterministic reranking

ile çalışabilmelidir.

LLM yalnızca gerçekten değer kattığı yerlerde düşünülmelidir.

---

# 16. PERFORMANS

Recommendation endpoint'i birkaç saniye süren ağır SQL sorgusu olmamalıdır.

Geçmişte:

`canceling statement due to statement timeout`

hatası yaşandı.

Bu nedenle:

- pgvector index
- candidate limit
- query plan
- RPC yapısı
- filtering
- index type

performans açısından incelenmelidir.

20K film küçük/orta ölçekli bir dataset'tir; düzgün mimaride recommendation sorgusunun hızlı olması gerekir.

---

# 17. ÖNERİ KALİTESİ NASIL DEĞERLENDİRİLECEK?

Sadece Matrix gibi kolay filmlerle test yapılmamalıdır.

Test setinde farklı kategoriler olmalı:

### Franchise-heavy
The Matrix

### Psychological / ambiguous
Triangle
Enemy
Coherence

### Animation
Spirited Away

### Crime
Se7en

### Horror
The Witch

### Mainstream blockbuster
Interstellar

### Niche / obscure film
dataset içerisinden az bilinen örnekler

Her seed için Top 20 incelenmelidir.

Özellikle:

- ilk 5
- ilk 10
- ilk 20

kalitesi ayrı değerlendirilmelidir.

---

# 18. OFFLINE EVALUATION

İleride küçük bir evaluation dataset oluşturmak istiyoruz.

Örneğin:

seed_movie
expected_similar_movies

şeklinde insan tarafından hazırlanmış örnekler.

Amaç farklı reranker ağırlıklarını:

A
B
C

şeklinde test edip hangi konfigürasyonun daha iyi olduğunu ölçmek.

Recommendation sistemini sadece "bence iyi olmuş" seviyesinde bırakmak istemiyoruz.

---

# 19. GELECEKTE KİŞİSELLEŞTİRME

İlk hedef:

FILM → SIMILAR FILMS

Daha sonra:

USER → PERSONALIZED FILMS

eklenebilir.

Kullanıcı:

👍 beğendi
👎 beğenmedi
❤️ favori
👀 izledi

gibi sinyaller verebilir.

Bunlardan kullanıcı taste profile / taste vector oluşturulabilir.

Ancak şu anda öncelik bu değildir.

Önce film-to-film recommendation sisteminin kaliteli çalışması gerekir.

---

# 20. PROJEDE ÇALIŞIRKEN UYMAN GEREKEN KURALLAR

1. Önce mevcut kodu ve veri yapısını incele.

2. Çalışan sistemi gereksiz yere baştan yazma.

3. Fakat mevcut yapı gerçekten spagettiyse bunu açıkça belirt ve temiz refactor öner.

4. Aynı anda çok fazla değişiklik yapma.

5. Her aşamadan sonra test komutu ver.

6. Kod verirken:
   - dosya yolunu yaz
   - mümkünse tam dosyayı ver
   - hangi eski dosyanın değiştirileceğini belirt.

7. Next.js sürümünü dikkate al.
   Eski tutorial kodlarını körlemesine kullanma.

8. Supabase RPC değiştiriyorsan mevcut function signature'ını düşün.

9. SQL'de ambiguous column isimlerinden kaçın.
   Alias kullan.

10. Vector query performansını düşün.

11. `service_role` key'i client/frontend'e koyma.

12. Recommendation quality'yi yalnızca cosine similarity ile çözmeye çalışma.

13. Embedding'i candidate retrieval olarak düşün.

14. Asıl ranking için hybrid reranker kullan.

15. Metadata sinyallerini normalize etmeden rastgele toplama.

16. Popularity ve rating'in recommendation sistemini ele geçirmesine izin verme.

17. Franchise bağlantılarını doğru değerlendir.

18. Keyword'leri önemli sinyal olarak kullan.

19. Türkçe UI + fallback stratejisini koru.

20. Gereksiz SaaS/servis ekleme.
   Supabase mevcut ihtiyacı karşılıyorsa Supabase kullan.

---

# 21. ŞU ANKİ ÖNCELİKLİ HEDEF

Şu anda önce aşağıdaki akışı eksiksiz çalıştırmak istiyoruz:

Kullanıcı film arar
        ↓
TMDB search
        ↓
Film seçer
        ↓
/film/{tmdb_id}
        ↓
Film detayları
        ↓
Supabase'ten semantic candidates
        ↓
Hybrid reranker
        ↓
Top 20 Similar Films
        ↓
Poster + Türkçe isim + Türkçe açıklama
        ↓
"neden önerildi?" sinyalleri

Bundan sonra recommendation algoritmasının kalitesini geliştireceğiz.

---

# 22. EN ÖNEMLİ PRENSİP

Bu projede amacımız:

"AI kullandık ve 20 tane film çıktı."

değil.

Amaç:

> Kullanıcı önerilere baktığında "evet, bunlar gerçekten bu filme benziyor" desin.

Dolayısıyla teknik olarak çalışan ama anlamsız sonuç veren sistem başarılı kabul edilmemelidir.

Semantic similarity yalnızca başlangıçtır.

İyi recommendation sistemi:

retrieval
+ structured metadata
+ reranking
+ penalties
+ quality signals
+ diversity
+ evaluation

birleşiminden oluşmalıdır.

---

Bu proje üzerinde çalışmaya başladığında önce mevcut dosyaları incele ve yukarıdaki hedef mimariyle karşılaştır.

Sonra bana:

1. Mevcut durum
2. Sorunlar
3. Korunması gereken çalışan parçalar
4. Değiştirilmesi gereken parçalar
5. Bir sonraki TEK adım

şeklinde ilerleme öner.

Kodlamaya geçerken adım adım ilerle ve her adımın çalıştığını doğrulamadan sonraki büyük aşamaya geçme.