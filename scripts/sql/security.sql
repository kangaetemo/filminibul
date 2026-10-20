-- Filminibul güvenlik tabloları (GV-01, GV-02, GV-04). Uygulama kodundan önce çalıştırılır.
-- Hiçbir anonim istemcinin doğrudan tablo ya da RPC erişimi yok; yalnız sunucu service role.
begin;

-- GV-01: yönetici oturumları. Çerez yalnız oturum kimliğini ve bitişini imzalı taşır;
-- çıkışta satır iptal edilir, süresi dolan ya da iptal edilen çerez sunucuda reddedilir.
create table if not exists public.admin_sessions (
    id uuid primary key,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz
);
create index if not exists admin_sessions_expires on public.admin_sessions (expires_at);

-- GV-02 / GV-04: bütün sunucu örneklerinin paylaştığı sabit pencereli sayaçlar.
create table if not exists public.rate_limits (
    bucket text primary key check (length(bucket) <= 200),
    window_start timestamptz not null,
    used integer not null
);
create index if not exists rate_limits_window on public.rate_limits (window_start);

alter table public.admin_sessions enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.admin_sessions, public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.admin_sessions, public.rate_limits to service_role;

-- Sayaçtan bir hak alır. Aynı anda gelen istekler satır kilidiyle sıraya girer, böylece
-- paralel denemeler sınırı aşamaz. Pencere dolunca sayaç sıfırdan başlar.
-- true: izin var, false: sınır doldu.
create or replace function public.rate_limit_take(p_bucket text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_used integer;
begin
    if p_bucket is null or length(p_bucket) > 200 or p_window_seconds < 1 or p_max < 1 then
        raise exception 'invalid rate limit arguments';
    end if;
    insert into public.rate_limits as r (bucket, window_start, used)
    values (p_bucket, now(), 1)
    on conflict (bucket) do update set
        window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
        used = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.used + 1 end
    returning used into v_used;
    -- Tablo büyümesin: ara sıra bir günden eski pencereleri temizle.
    if random() < 0.01 then
        delete from public.rate_limits where window_start < now() - interval '1 day';
    end if;
    return v_used <= p_max;
end;
$$;

-- Geçerli (iptal edilmemiş, süresi dolmamış) oturum mu?
create or replace function public.admin_session_valid(p_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    select exists (select 1 from public.admin_sessions where id = p_id and revoked_at is null and expires_at > now());
$$;

-- Oturumu iptal eder (çıkış). Süresi çoktan dolmuş eski satırları da temizler.
create or replace function public.admin_session_revoke(p_id uuid)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
    update public.admin_sessions set revoked_at = now() where id = p_id and revoked_at is null;
    delete from public.admin_sessions where expires_at < now() - interval '30 days';
$$;

revoke all on function public.rate_limit_take(text, integer, integer), public.admin_session_valid(uuid), public.admin_session_revoke(uuid) from public, anon, authenticated;
grant execute on function public.rate_limit_take(text, integer, integer), public.admin_session_valid(uuid), public.admin_session_revoke(uuid) to service_role;

commit;
