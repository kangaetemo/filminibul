-- "İki filmi karıştır": iki filme birlikte benzeyen filmler (/karistir).
-- Adaylar iki filmin orta noktasına en yakın 1000 film (halfvec index); her adayın İKİ filme ayrı ayrı benzerliği
-- tam hassasiyetle hesaplanır. Sıralama uygulamada: ikisine de en az ne kadar benzediği (min), ortalama değil —
-- ortalama, filmlerden birinin devam filmlerine kayıyordu (Matrix + Amélie → üç Matrix filmi).
-- Ölçüm (59 rastgele popüler çift): en iyi 24 karışım filminin ort. 0,07'si 600'lük havuzun dışında kaldı → havuz 1000.
-- Supabase SQL Editor'de TAMAMINI çalıştır (tekrar çalıştırmak zararsız). Önce halfvec_index.sql çalıştırılmış olmalı.

create or replace function public.blend_movies(movie_a integer, movie_b integer, min_votes integer default 100)
returns table(
  movie_id integer, title text, original_title text, tr_title text, overview text, tr_overview text,
  year integer, genres jsonb, keywords text[], rating real, vote_count integer, popularity real,
  language text, countries text[], poster_path text, backdrop_path text, director text,
  cast_names text[], collection_id integer, collection_name text, sim_a real, sim_b real
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  emb_a vector(1536);
  emb_b vector(1536);
begin
  select f.embedding into emb_a from public.film_embeddings_v3 f where f.movie_id = movie_a;
  select f.embedding into emb_b from public.film_embeddings_v3 f where f.movie_id = movie_b;
  if emb_a is null or emb_b is null or movie_a = movie_b then
    return;
  end if;

  perform set_config('hnsw.ef_search', '1000', true);

  return query
  select
    f.movie_id, f.title, f.original_title, f.tr_title, f.overview, f.tr_overview,
    f.year, f.genres, f.keywords, f.rating, f.vote_count, f.popularity,
    f.language, f.countries, f.poster_path, f.backdrop_path, f.director,
    f.cast_names, f.collection_id, f.collection_name,
    (1 - (f.embedding <=> emb_a))::real as sa,
    (1 - (f.embedding <=> emb_b))::real as sb
  from (
    -- Embedding'ler birim uzunlukta: a+b yönü orta nokta (cosine için normalize etmek gerekmez)
    select h.movie_id
    from public.film_embeddings_v3 h
    where h.movie_id <> movie_a and h.movie_id <> movie_b
    order by h.embedding::halfvec(1536) <=> (emb_a + emb_b)::halfvec(1536)
    limit 1000
  ) nearest
  join public.film_embeddings_v3 f on f.movie_id = nearest.movie_id
  where f.vote_count >= min_votes
  order by least(1 - (f.embedding <=> emb_a), 1 - (f.embedding <=> emb_b)) desc
  limit 200;
end;
$$;
