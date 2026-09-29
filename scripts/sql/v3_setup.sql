-- film_embeddings_v3: v3 embedding (başlıksız, tema ağırlıklı) + TMDB zenginleştirmesi
-- Supabase SQL Editor'de TAMAMINI yapıştırıp (hiçbir şey seçili değilken) Run'a bas.
-- Eski film_embeddings_v2 tablosuna dokunmaz.

create table if not exists public.film_embeddings_v3 (
  movie_id        integer primary key,
  title           text not null,
  original_title  text,
  tr_title        text,
  overview        text,
  tr_overview     text,
  year            integer,
  genres          jsonb,
  keywords        text[],
  rating          real,
  vote_count      integer,
  popularity      real,
  language        text,
  countries       text[],
  poster_path     text,
  backdrop_path   text,
  director        text,
  cast_names      text[],
  collection_id   integer,
  collection_name text,
  embedding       vector(1536) not null
);

-- RLS açık + policy yok: tabloya sadece service_role (sunucu tarafı) erişir, anon key erişemez
alter table public.film_embeddings_v3 enable row level security;

-- Index boş tabloya kuruluyor: satırlar yüklenirken index'e eklenir, sonradan büyük build (ve dashboard timeout) yok
create index if not exists film_embeddings_v3_embedding_hnsw
  on public.film_embeddings_v3
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Benzer film adayları + reranker'ın ihtiyaç duyduğu tüm metadata (tek çağrı)
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
  select f.embedding into seed_emb
  from public.film_embeddings_v3 f
  where f.movie_id = seed_movie_id;

  -- Film yoksa boş dön (rastgele sonuç yerine)
  if seed_emb is null then
    return;
  end if;

  -- HNSW en fazla ef_search kadar sonuç döndürür; limit'ten küçük olmamalı
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
