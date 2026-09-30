-- Türkiye yayın platformları (TMDB / JustWatch). scripts/tmdb/fetch_providers.mjs + upload_providers.mjs doldurur.
-- Supabase SQL Editor'de TAMAMINI yapıştırıp (hiçbir şey seçili değilken) Run'a bas.

create table if not exists public.film_providers (
  movie_id   integer primary key,
  flatrate   integer[] not null default '{}',  -- abonelikle
  free       integer[] not null default '{}',  -- ücretsiz / reklamlı
  rent       integer[] not null default '{}',
  buy        integer[] not null default '{}',
  link       text,                              -- TMDB'nin "nerede izlenir" sayfası (TR)
  updated_at timestamptz not null default now()
);

-- RLS açık + policy yok: sadece service_role (sunucu) erişir
alter table public.film_providers enable row level security;
