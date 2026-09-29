-- similar_movies: ivfflat probes düzeltmesi + olmayan seed için boş sonuç
-- Supabase SQL Editor'de TAMAMINI yapıştırıp (hiçbir şey seçili değilken) Run'a bas.

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

  -- ivfflat varsayılanı probes=1: 100 listenin sadece 1'ine bakıyor, komşuları kaçırıyor
  perform set_config('ivfflat.probes', '10', true);

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
