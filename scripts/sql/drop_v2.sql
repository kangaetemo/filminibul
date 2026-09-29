-- ⚠️ GERİ ALINAMAZ: eski v2 tablosunu ve ona bağlı fonksiyonları siler (~429 MB yer açar).
-- Önce yerel yedek alınmış olmalı: data/export/supabase/film_embeddings_v2(.embeddings).jsonl
-- Sonra scripts/sql/v3_setup.sql çalıştırılır.

drop function if exists public.similar_movies(integer, integer);
-- Var olmayan "films" tablosuna bakan, kullanılmayan eski fonksiyon
drop function if exists public.match_films(vector, double precision, integer, integer[]);
drop table if exists public.film_embeddings_v2;
