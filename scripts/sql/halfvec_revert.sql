-- halfvec_index.sql'i GERİ ALIR: tam hassasiyetli HNSW index'e ve fonksiyonların eski hâline döner.
-- Embedding sütunu hiç değişmediği için veri kaybı yoktur; sadece index yeniden kurulur.
--
-- ⚠️ ÜÇ ADIM, AYRI AYRI ÇALIŞTIR (her birini seçip Run). Adım 2 ile 3 arasında (~1–3 dk) index yok: benzer filmler/tarif araması yavaşlar.
-- ⚠️ Tam hassasiyetli index halfvec'in ~2 katı yer tutar. Adım 1 yer yetmiyorsa durur (hiçbir şeyi değiştirmeden).

-- ===================== ADIM 1: yer kontrolü =====================
-- Yeni index ≈ halfvec index × 2. Veritabanı + bu fark 490 MB'ı geçecekse dur.
do $$
declare
  half_bytes bigint := coalesce(pg_relation_size(to_regclass('public.film_embeddings_v3_embedding_hnsw_half')), 0);
  db_bytes   bigint := pg_database_size(current_database());
begin
  if db_bytes + half_bytes > 490 * 1024 * 1024 then
    raise exception 'Yer yetmiyor: veritabanı % MB + tahmini ek % MB > 490 MB. Önce yer açılmalı (ör. film_neighbors tablosunu boşalt) ya da plan yükseltilmeli.',
      db_bytes / 1048576, half_bytes / 1048576;
  end if;
  raise notice 'Yer yeterli: % MB + tahmini ek % MB', db_bytes / 1048576, half_bytes / 1048576;
end $$;

-- ===================== ADIM 2: halfvec index'i sil, fonksiyonları eski hâline getir =====================
drop index if exists public.film_embeddings_v3_embedding_hnsw_half;

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
    (1 - (f.embedding <=> seed_emb))::real
  from public.film_embeddings_v3 f
  where f.movie_id <> seed_movie_id
  order by f.embedding <=> seed_emb
  limit match_limit;
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
  perform set_config('hnsw.ef_search', '400', true);

  return query
  select * from (
    select
      f.movie_id, f.title, f.original_title, f.tr_title, f.overview, f.tr_overview,
      f.year, f.genres, f.keywords, f.rating, f.vote_count, f.popularity,
      f.language, f.countries, f.poster_path, f.backdrop_path, f.director,
      f.cast_names, f.collection_id, f.collection_name,
      (1 - (f.embedding <=> query_embedding))::real as similarity
    from public.film_embeddings_v3 f
    order by f.embedding <=> query_embedding
    limit 300
  ) nearest
  where nearest.vote_count >= min_votes
  order by nearest.similarity desc
  limit match_limit;
end;
$$;

-- ===================== ADIM 3: tam hassasiyetli index'i kur (~2–4 dk) =====================
set maintenance_work_mem = '128MB';
set statement_timeout = '30min';
create index if not exists film_embeddings_v3_embedding_hnsw
  on public.film_embeddings_v3
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
