-- Admin paneli: veritabanı doluluğu (ücretsiz plan 500 MB). Supabase SQL Editor'de TAMAMINI çalıştır.

create or replace function public.admin_db_usage()
returns table(db_bytes bigint, films bigint, films_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    pg_database_size(current_database()),
    (select count(*) from public.film_embeddings_v3),
    pg_total_relation_size('public.film_embeddings_v3');
$$;

-- Sadece sunucu (service_role) çağırabilsin; tarayıcıdaki anon key çağıramasın
revoke execute on function public.admin_db_usage() from public, anon, authenticated;
grant execute on function public.admin_db_usage() to service_role;
