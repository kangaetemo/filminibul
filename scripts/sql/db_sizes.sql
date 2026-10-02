-- Veritabanında yer nereye gidiyor? (Salt okunur; Supabase SQL Editor'de çalıştır.)
select
  c.relname                                   as nesne,
  case c.relkind when 'r' then 'tablo' when 'i' then 'index' when 't' then 'toast' else c.relkind::text end as tur,
  pg_size_pretty(pg_relation_size(c.oid))     as boyut,
  pg_relation_size(c.oid)                     as bayt
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'pg_toast') and pg_relation_size(c.oid) > 1024 * 1024
union all
select 'TOPLAM veritabanı', '', pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database())
union all
select 'pgvector sürümü: ' || (select extversion from pg_extension where extname = 'vector'), '', '', null
order by bayt desc nulls last;
