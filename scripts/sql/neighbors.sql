-- Önceden hesaplanmış benzer film listeleri (scripts/catalog/build_neighbors.mjs doldurur, haftalık iş yeniler).
-- Film sayfası similar_movies_v4 ile okur: istek anında HNSW taranmaz (~1–5 sn → birkaç yüz ms).
-- Supabase SQL Editor'de TAMAMINI yapıştırıp (hiçbir şey seçili değilken) Run'a bas. Tekrar çalıştırmak zararsız.

create table if not exists public.film_neighbors (
  movie_id     integer primary key,
  neighbor_ids integer[]  not null,  -- en yakından uzağa
  sims         smallint[] not null   -- cosine benzerliği × 10000 (aynı sırayla)
);

-- RLS açık + policy yok: sadece service_role (sunucu) erişir
alter table public.film_neighbors enable row level security;

-- similar_movies_v3 ile aynı çıktı (reranker değişmeden kullanır); film listede yoksa boş döner (site v3'e düşer)
create or replace function public.similar_movies_v4(seed_movie_id integer, match_limit integer default 200)
returns table(
  movie_id integer, title text, original_title text, tr_title text, overview text, tr_overview text,
  year integer, genres jsonb, keywords text[], rating real, vote_count integer, popularity real,
  language text, countries text[], poster_path text, backdrop_path text, director text,
  cast_names text[], collection_id integer, collection_name text, similarity real
)
language sql
stable
as $$
  select
    f.movie_id, f.title, f.original_title, f.tr_title, f.overview, f.tr_overview,
    f.year, f.genres, f.keywords, f.rating, f.vote_count, f.popularity,
    f.language, f.countries, f.poster_path, f.backdrop_path, f.director,
    f.cast_names, f.collection_id, f.collection_name,
    (n.sim / 10000.0)::real
  from public.film_neighbors fn
  cross join lateral unnest(fn.neighbor_ids, fn.sims) with ordinality as n(neighbor_id, sim, pos)
  join public.film_embeddings_v3 f on f.movie_id = n.neighbor_id
  where fn.movie_id = seed_movie_id and n.pos <= match_limit
  order by n.pos;
$$;

-- Haftalık yenileme tabloyu boşaltıp doldurur: TRUNCATE yeri hemen geri verir (UPDATE gibi şişirmez)
create or replace function public.truncate_film_neighbors()
returns void
language sql
security definer
set search_path = public
as $$
  truncate public.film_neighbors;
$$;

revoke execute on function public.truncate_film_neighbors() from public, anon, authenticated;
grant execute on function public.truncate_film_neighbors() to service_role;
