-- HNSW index'ini yarım hassasiyete (halfvec) çevirir: index ~yarıya iner, komşu tablosuna (neighbors.sql) yer açılır.
-- Embedding sütunu DEĞİŞMEZ (tam hassasiyet kalır); sadece index ve onu kullanan iki fonksiyon değişir.
-- Benzer film listeleri artık film_neighbors'tan geldiği için index'i asıl kullanan tarif araması (vibe_search_v3)
-- ve listesi henüz hesaplanmamış yeni filmler (similar_movies_v3). İkisi de en yakın adayları halfvec index'le bulur,
-- benzerliği tam hassasiyetle yeniden hesaplayıp sıralar.
--
-- ⚠️ ÜÇ ADIM, AYRI AYRI ÇALIŞTIR (her birini seçip Run; SQL Editor tek seferde çalıştırınca hepsi tek işlem olur
--    ve eski index silinmeden yenisi kurulur: veritabanı geçici olarak 500 MB'ı aşabilir).
-- Adım 2 ile 3 arasında (~1–3 dk) index yok: benzer filmler/tarif araması yavaşlar, zaman aşımı verebilir.

-- ===================== ADIM 1: kontrol + eski index'i sil =====================
do $$
begin
  if (select string_to_array(extversion, '.')::int[] from pg_extension where extname = 'vector') < array[0, 7] then
    raise exception 'pgvector 0.7+ gerekli (halfvec). Şu anki: %', (select extversion from pg_extension where extname = 'vector');
  end if;
end $$;

drop index if exists public.film_embeddings_v3_embedding_hnsw;

-- ===================== ADIM 2: fonksiyonları halfvec index'e göre güncelle =====================
create or replace function public.similar_movies_v3(seed_movie_id integer, match_limit integer default 200)
returns table(
  movie_id integer, title text, original_title text, tr_title text, overview text, tr_overview text,
  year integer, genres jsonb, keywords text[], rating real, vote_count integer, popularity real,
  language text, countries text[], poster_path text, backdrop_path text, director text,
  cast_names text[], collection_id integer, collection_name text, similarity real
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  seed_emb vector(1536);
begin
  select f.embedding into seed_emb from public.film_embeddings_v3 f where f.movie_id = seed_movie_id;
  if seed_emb is null then
    return;
  end if;

  perform set_config('hnsw.ef_search', least(greatest(match_limit * 2, 100), 1000)::text, true);

  return query
  select
    f.movie_id, f.title, f.original_title, f.tr_title, f.overview, f.tr_overview,
    f.year, f.genres, f.keywords, f.rating, f.vote_count, f.popularity,
    f.language, f.countries, f.poster_path, f.backdrop_path, f.director,
    f.cast_names, f.collection_id, f.collection_name,
    (1 - (f.embedding <=> seed_emb))::real as sim
  from (
    -- Index ifadesiyle birebir aynı (embedding::halfvec(1536)) olmalı, yoksa index kullanılmaz
    select h.movie_id
    from public.film_embeddings_v3 h
    where h.movie_id <> seed_movie_id
    order by h.embedding::halfvec(1536) <=> seed_emb::halfvec(1536)
    limit match_limit
  ) nearest
  join public.film_embeddings_v3 f on f.movie_id = nearest.movie_id
  order by sim desc;
end;
$$;

create or replace function public.vibe_search_v3(query_embedding vector(1536), match_limit integer default 60, min_votes integer default 100)
returns table(
  movie_id integer, title text, original_title text, tr_title text, overview text, tr_overview text,
  year integer, genres jsonb, keywords text[], rating real, vote_count integer, popularity real,
  language text, countries text[], poster_path text, backdrop_path text, director text,
  cast_names text[], collection_id integer, collection_name text, similarity real
)
language plpgsql
stable
as $$
#variable_conflict use_column
begin
  -- HNSW en fazla ef_search kadar sonuç döndürür; oy filtresi sonradan uygulandığı için geniş tut
  perform set_config('hnsw.ef_search', '400', true);

  return query
  select
    f.movie_id, f.title, f.original_title, f.tr_title, f.overview, f.tr_overview,
    f.year, f.genres, f.keywords, f.rating, f.vote_count, f.popularity,
    f.language, f.countries, f.poster_path, f.backdrop_path, f.director,
    f.cast_names, f.collection_id, f.collection_name,
    (1 - (f.embedding <=> query_embedding))::real as sim
  from (
    select h.movie_id
    from public.film_embeddings_v3 h
    order by h.embedding::halfvec(1536) <=> query_embedding::halfvec(1536)
    limit 300
  ) nearest
  join public.film_embeddings_v3 f on f.movie_id = nearest.movie_id
  where f.vote_count >= min_votes
  order by sim desc
  limit match_limit;
end;
$$;

-- ===================== ADIM 3: yeni index'i kur (~1–3 dk) =====================
set maintenance_work_mem = '128MB';
set statement_timeout = '30min';
create index if not exists film_embeddings_v3_embedding_hnsw_half
  on public.film_embeddings_v3
  using hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops)
  with (m = 16, ef_construction = 64);
