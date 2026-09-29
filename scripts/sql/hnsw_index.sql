-- ivfflat -> HNSW geçişi + similar_movies'in HNSW'ye göre ayarlanması
-- Supabase SQL Editor'de TAMAMINI yapıştırıp (hiçbir şey seçili değilken) Run'a bas.
-- Index oluşturma 1-5 dakika sürebilir.

set statement_timeout = '30min';
-- Free plan'da /dev/shm küçük: paralel build'in shared memory istemesini engelle
set max_parallel_maintenance_workers = 0;
set maintenance_work_mem = '64MB';

-- 1536 boyut pgvector'ın 2000 sınırının altında, HNSW burada sorunsuz
create index if not exists film_embeddings_v2_embedding_hnsw
  on public.film_embeddings_v2
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Planner'ın eski ivfflat'ı seçmemesi için kaldırıyoruz
drop index if exists public.film_embeddings_v2_embedding_idx;

create or replace function public.similar_movies(seed_movie_id integer, match_limit integer default 50)
returns table(result_id integer, title text, poster_path text, year integer, rating real, popularity real, similarity real)
language plpgsql
stable
as $$
declare
  seed_emb vector(1536);
begin
  select fe.embedding into seed_emb
  from film_embeddings_v2 fe
  where fe.movie_id = seed_movie_id;

  -- Film yoksa veya embedding'i yoksa boş dön (rastgele sonuç yerine)
  if seed_emb is null then
    return;
  end if;

  -- HNSW en fazla ef_search kadar sonuç döndürür; limit'ten küçük olmamalı
  perform set_config('hnsw.ef_search', least(greatest(match_limit * 2, 100), 1000)::text, true);

  return query
  select
    f.movie_id,
    f.title,
    f.poster_path,
    f.year,
    f.rating,
    f.popularity,
    (1 - (f.embedding <=> seed_emb))::float4
  from film_embeddings_v2 f
  where f.movie_id <> seed_movie_id
  order by f.embedding <=> seed_emb
  limit match_limit;
end;
$$;
