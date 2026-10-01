-- Doğal dil ("vibe") arama: verilen embedding vektörüne en yakın filmler.
-- similar_movies_v3 ile aynı HNSW index'ini kullanır, farkı: seed film yerine doğrudan vektör alır.
-- Supabase → SQL Editor'de bir kez çalıştır (tekrar çalıştırmak zararsız).

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
