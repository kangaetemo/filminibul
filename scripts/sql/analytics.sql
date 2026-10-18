-- Filminibul product analytics v1. Run in Supabase SQL Editor before enabling.
-- No anonymous client has direct table or RPC access. Only the server service role.
begin;
create table if not exists public.analytics_events (
    id uuid primary key,
    session_id uuid not null,
    visit_id uuid not null,
    name text not null check (name in ('page_view','film_opened','search_performed','film_clicked','recommendation_impression','recommendation_clicked','blend_completed','mood_selected','trailer_clicked','platform_clicked')),
    source text not null check (source in ('direct','google','bing','social','referral')),
    path text not null check (length(path) <= 100),
    data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 2000),
    created_at timestamptz not null default now()
);
create index if not exists analytics_events_time on public.analytics_events (created_at);
create index if not exists analytics_events_session_time on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_visit on public.analytics_events (visit_id, name);
create table if not exists public.analytics_daily (
    day date primary key,
    sessions bigint not null,
    views bigint not null,
    searches bigint not null,
    no_results bigint not null,
    impressions bigint not null,
    matched_clicks bigint not null,
    recommendation_clicks bigint not null,
    blends bigint not null,
    trailers bigint not null,
    platforms bigint not null,
    moods bigint not null
);
create table if not exists public.analytics_budget (day date primary key, used integer not null default 0);
alter table public.analytics_events enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.analytics_budget enable row level security;
revoke all on public.analytics_events, public.analytics_daily, public.analytics_budget from public, anon, authenticated;
grant select, insert, update, delete on public.analytics_events, public.analytics_daily, public.analytics_budget to service_role;

-- All instances share these limits. A forged session cannot evade the global cap.
-- Max 5,000 events/day; max 100 events/minute and 600/hour per session.
create or replace function public.analytics_ingest(p_session uuid, p_source text, p_events jsonb)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare
    event_count integer;
    inserted integer;
    today date := (now() at time zone 'Europe/Istanbul')::date;
begin
    event_count := jsonb_array_length(p_events);
    if event_count < 1 or event_count > 20 or p_source not in ('direct','google','bing','social','referral') then return -1; end if;
    -- Serialize the short ingestion transaction: cap checks stay correct under concurrency.
    perform pg_advisory_xact_lock(641906011);
    insert into analytics_budget(day, used) values (today, 0) on conflict do nothing;
    if (select used from analytics_budget where day = today) + event_count > 5000 then return -1; end if;
    if (select count(*) from analytics_events where session_id = p_session and created_at >= now() - interval '1 minute') + event_count > 100 then return -1; end if;
    if (select count(*) from analytics_events where session_id = p_session and created_at >= now() - interval '1 hour') + event_count > 600 then return -1; end if;
    insert into analytics_events (id, session_id, visit_id, name, source, path, data)
    select (e->>'id')::uuid, p_session, (e->>'visit_id')::uuid, e->>'name', p_source, e->>'path', e->'data'
    from jsonb_array_elements(p_events) e
    on conflict (id) do nothing;
    get diagnostics inserted = row_count;
    update analytics_budget set used = used + inserted where day = today;
    return inserted;
end $$;

-- One impression per visit/source film/target film/rank. A quick click before the
-- one-second visibility threshold is counted as a click but not as an exposed CTR conversion.
create or replace function public.analytics_daily_rows(p_since date)
returns setof public.analytics_daily language sql stable security invoker set search_path = public, pg_temp as $$
    with e as (
        select *, (created_at at time zone 'Europe/Istanbul')::date as day
        from analytics_events where created_at >= (p_since::timestamp at time zone 'Europe/Istanbul')
    ), impressions as (
        select distinct on (visit_id, data->>'source_film_id', data->>'film_id', data->>'rank') *
        from e where name = 'recommendation_impression' order by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank', created_at
    ), clicks as (
        select visit_id, data->>'source_film_id' as source_id, data->>'film_id' as target_id,
            data->>'rank' as rank, max(created_at) as clicked_at
        from e where name = 'recommendation_clicked'
        group by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank'
    ), exposure as (
        select i.day, count(*) as impressions, count(*) filter (where c.clicked_at >= i.created_at) as matched_clicks
        from impressions i left join clicks c on c.visit_id = i.visit_id and c.source_id = i.data->>'source_film_id'
            and c.target_id = i.data->>'film_id' and c.rank = i.data->>'rank'
        group by i.day
    )
    select e.day, count(distinct e.session_id), count(*) filter (where name in ('page_view','film_opened')),
        count(*) filter (where name = 'search_performed'), count(*) filter (where name = 'search_performed' and data->>'result_count' = '0'),
        coalesce(max(x.impressions), 0), coalesce(max(x.matched_clicks), 0), count(*) filter (where name = 'recommendation_clicked'),
        count(*) filter (where name = 'blend_completed'), count(*) filter (where name = 'trailer_clicked'),
        count(*) filter (where name = 'platform_clicked'), count(*) filter (where name = 'mood_selected')
    from e left join exposure x using (day) group by e.day order by e.day;
$$;

create or replace function public.analytics_maintain()
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
    today date := (now() at time zone 'Europe/Istanbul')::date;
    oldest date;
begin
    select min((created_at at time zone 'Europe/Istanbul')::date) into oldest from analytics_events;
    -- Separate from ingestion; no global lock while aggregating. Never archive today's mutable data.
    insert into analytics_daily
    select * from analytics_daily_rows(coalesce(oldest, today)) where day < today
    on conflict (day) do update set sessions = excluded.sessions, views = excluded.views, searches = excluded.searches,
        no_results = excluded.no_results, impressions = excluded.impressions, matched_clicks = excluded.matched_clicks,
        recommendation_clicks = excluded.recommendation_clicks, blends = excluded.blends,
        trailers = excluded.trailers, platforms = excluded.platforms, moods = excluded.moods;
    delete from analytics_events where created_at < ((today - 29)::timestamp at time zone 'Europe/Istanbul');
    delete from analytics_daily where day < today - 364;
    delete from analytics_budget where day < today - 2;
end $$;

-- Detail tables from raw events since p_from. Shared by the day report and the 24-hour report
-- so both count queries, recommendation ranks, sources and landings the same way.
create or replace function public.analytics_report_details(p_from timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
    with raw as (
        select * from analytics_events where created_at >= p_from
    ), search_clicks as (
        select session_id, data->>'search_id' as search_id, max(created_at) as clicked_at
        from raw where name = 'film_clicked' and data ? 'search_id'
        group by session_id, data->>'search_id'
    ), vibe_clicks as (
        select visit_id, max(created_at) as clicked_at from raw
        where name = 'film_clicked' and data->>'context' = 'vibe' group by visit_id
    ), queries as (
        select lower(s.data->>'query') as query, s.data->>'context' as context, count(*) as searches,
            count(*) filter (where s.data->>'result_count' = '0') as no_results,
            count(*) filter (where c.clicked_at >= s.created_at or (s.data->>'context' = 'vibe' and v.clicked_at >= s.created_at)) as clicked
        from raw s left join search_clicks c on c.session_id = s.session_id and c.search_id = s.data->>'search_id'
            left join vibe_clicks v on v.visit_id = s.visit_id
        where s.name = 'search_performed' and s.data ? 'query'
        group by lower(s.data->>'query'), s.data->>'context'
    ), impressions as (
        select distinct on (visit_id, data->>'source_film_id', data->>'film_id', data->>'rank') *
        from raw where name = 'recommendation_impression' order by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank', created_at
    ), clicks as (
        select visit_id, data->>'source_film_id' as source_id, data->>'film_id' as target_id,
            data->>'rank' as rank, max(created_at) as clicked_at
        from raw where name = 'recommendation_clicked'
        group by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank'
    ), ranks as (
        select (i.data->>'rank')::integer as rank, count(*) as impressions,
            count(*) filter (where c.clicked_at >= i.created_at) as clicked
        from impressions i left join clicks c on c.visit_id = i.visit_id and c.source_id = i.data->>'source_film_id'
            and c.target_id = i.data->>'film_id' and c.rank = i.data->>'rank'
        group by i.data->>'rank'
    ), sources as (
        select source, count(distinct session_id) as sessions, count(*) filter (where name in ('film_opened','page_view')) as views,
            count(distinct session_id) filter (where name = 'recommendation_clicked') as recommendation_sessions,
            count(distinct session_id) filter (where name = 'blend_completed') as blend_sessions
        from raw group by source
    ), entries as (
        select distinct on (session_id) session_id, source, path, created_at from raw where name in ('page_view','film_opened') order by session_id, created_at, id
    ), session_clicks as (
        select session_id, max(created_at) as clicked_at from raw
        where name = 'recommendation_clicked' group by session_id
    ), landings as (
        select e.path, count(*) as sessions, count(*) filter (where c.clicked_at >= e.created_at) as recommendation_sessions
        from entries e left join session_clicks c on c.session_id = e.session_id group by e.path
    ), films as (
        select (data->>'film_id')::bigint as film_id,
            count(*) filter (where name = 'film_opened') as opens,
            count(*) filter (where name = 'recommendation_clicked') as recommendations
        from raw where name in ('film_opened','recommendation_clicked') group by data->>'film_id'
    ), film_titles as (
        select f.*, coalesce(nullif(m.tr_title,''), nullif(m.title,''), nullif(m.original_title,''), 'Film #' || f.film_id) as title
        from films f left join film_embeddings_v3 m on m.movie_id = f.film_id
    ), pairs as (
        select (data->>'source_film_id')::bigint as source_film_id, (data->>'film_id')::bigint as film_id, count(*) as clicks
        from raw where name = 'recommendation_clicked' group by data->>'source_film_id', data->>'film_id'
    )
    select jsonb_build_object(
        'queries', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (select * from queries order by searches desc, query limit 20) q),
        'no_result_queries', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (select * from queries where no_results > 0 order by no_results desc, query limit 20) q),
        'ranks', (select coalesce(jsonb_agg(to_jsonb(r) order by r.rank), '[]'::jsonb) from ranks r),
        'sources', (select coalesce(jsonb_agg(to_jsonb(s) order by s.sessions desc), '[]'::jsonb) from sources s),
        'landings', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from (select * from landings order by sessions desc, path limit 15) l),
        'films', (select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) from (select * from film_titles order by opens desc, film_id limit 20) f),
        'pairs', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (select * from pairs order by clicks desc, source_film_id limit 15) p),
        'events', (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from (select name, count(*) as count from raw group by name order by count(*) desc) e)
    );
$$;

create or replace function public.analytics_report(p_days integer default 7)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
    today date := (now() at time zone 'Europe/Istanbul')::date;
    first_day date := today - least(365, greatest(1, p_days)) + 1;
    raw_start date := greatest(first_day, today - 29);
    answer jsonb;
begin
    with daily as (
        select * from analytics_daily where day >= first_day and day < today - 29
        union all select * from analytics_daily_rows(raw_start)
    ), series as (
        select d::date as day, coalesce(r.sessions,0) as sessions, coalesce(r.views,0) as views,
            coalesce(r.searches,0) as searches, coalesce(r.no_results,0) as no_results,
            coalesce(r.impressions,0) as impressions, coalesce(r.matched_clicks,0) as matched_clicks,
            coalesce(r.recommendation_clicks,0) as recommendation_clicks, coalesce(r.blends,0) as blends,
            coalesce(r.trailers,0) as trailers, coalesce(r.platforms,0) as platforms, coalesce(r.moods,0) as moods
        from generate_series(first_day::timestamp, today::timestamp, interval '1 day') d left join daily r on r.day = d::date
    )
    select analytics_report_details(raw_start::timestamp at time zone 'Europe/Istanbul') || jsonb_build_object(
        'raw_start', raw_start, 'days', least(365, greatest(1,p_days)),
        'daily', (select coalesce(jsonb_agg(to_jsonb(s) order by s.day), '[]'::jsonb) from series s),
        'budget_used', coalesce((select used from analytics_budget where day = today),0)
    ) into answer;
    return answer;
end $$;

-- Hourly counts since p_from (Turkey time). Same counting rules as analytics_daily_rows,
-- bucketed by hour; keep the two in step when a metric changes.
create or replace function public.analytics_hourly_rows(p_from timestamptz)
returns table(hour timestamp, sessions bigint, views bigint, searches bigint, no_results bigint, impressions bigint,
    matched_clicks bigint, recommendation_clicks bigint, blends bigint, trailers bigint, platforms bigint, moods bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
    with e as (
        select *, date_trunc('hour', created_at at time zone 'Europe/Istanbul') as hour
        from analytics_events where created_at >= p_from
    ), impressions as (
        select distinct on (visit_id, data->>'source_film_id', data->>'film_id', data->>'rank') *
        from e where name = 'recommendation_impression' order by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank', created_at
    ), clicks as (
        select visit_id, data->>'source_film_id' as source_id, data->>'film_id' as target_id,
            data->>'rank' as rank, max(created_at) as clicked_at
        from e where name = 'recommendation_clicked'
        group by visit_id, data->>'source_film_id', data->>'film_id', data->>'rank'
    ), exposure as (
        select i.hour, count(*) as impressions, count(*) filter (where c.clicked_at >= i.created_at) as matched_clicks
        from impressions i left join clicks c on c.visit_id = i.visit_id and c.source_id = i.data->>'source_film_id'
            and c.target_id = i.data->>'film_id' and c.rank = i.data->>'rank'
        group by i.hour
    )
    select e.hour, count(distinct e.session_id), count(*) filter (where name in ('page_view','film_opened')),
        count(*) filter (where name = 'search_performed'), count(*) filter (where name = 'search_performed' and data->>'result_count' = '0'),
        coalesce(max(x.impressions), 0), coalesce(max(x.matched_clicks), 0), count(*) filter (where name = 'recommendation_clicked'),
        count(*) filter (where name = 'blend_completed'), count(*) filter (where name = 'trailer_clicked'),
        count(*) filter (where name = 'platform_clicked'), count(*) filter (where name = 'mood_selected')
    from e left join exposure x using (hour) group by e.hour order by e.hour;
$$;

-- Last N hours (default 24) in whole Turkey-time hours, the current hour included.
create or replace function public.analytics_report_hours(p_hours integer default 24)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
    span integer := least(168, greatest(1, p_hours));
    this_hour timestamp := date_trunc('hour', now() at time zone 'Europe/Istanbul');
    first_hour timestamp := this_hour - (span - 1) * interval '1 hour';
    since timestamptz := first_hour at time zone 'Europe/Istanbul';
    answer jsonb;
begin
    with series as (
        select to_char(h, 'YYYY-MM-DD HH24:00') as hour, coalesce(r.sessions,0) as sessions, coalesce(r.views,0) as views,
            coalesce(r.searches,0) as searches, coalesce(r.no_results,0) as no_results,
            coalesce(r.impressions,0) as impressions, coalesce(r.matched_clicks,0) as matched_clicks,
            coalesce(r.recommendation_clicks,0) as recommendation_clicks, coalesce(r.blends,0) as blends,
            coalesce(r.trailers,0) as trailers, coalesce(r.platforms,0) as platforms, coalesce(r.moods,0) as moods
        from generate_series(first_hour, this_hour, interval '1 hour') h left join analytics_hourly_rows(since) r on r.hour = h
    )
    select analytics_report_details(since) || jsonb_build_object(
        'raw_start', since, 'hours', span,
        'hourly', (select coalesce(jsonb_agg(to_jsonb(s) order by s.hour), '[]'::jsonb) from series s),
        'sessions_total', (select count(distinct session_id) from analytics_events where created_at >= since),
        'budget_used', coalesce((select used from analytics_budget where day = (now() at time zone 'Europe/Istanbul')::date),0)
    ) into answer;
    return answer;
end $$;

revoke execute on function public.analytics_ingest(uuid,text,jsonb), public.analytics_daily_rows(date), public.analytics_maintain(), public.analytics_report(integer),
    public.analytics_report_details(timestamptz), public.analytics_hourly_rows(timestamptz), public.analytics_report_hours(integer) from public, anon, authenticated;
grant execute on function public.analytics_ingest(uuid,text,jsonb), public.analytics_daily_rows(date), public.analytics_maintain(), public.analytics_report(integer),
    public.analytics_report_details(timestamptz), public.analytics_hourly_rows(timestamptz), public.analytics_report_hours(integer) to service_role;
commit;

-- Required: enable pg_cron in Supabase Dashboard > Database > Extensions first.
-- Then run scripts/sql/analytics_cron.sql. Keeping this separate makes the schema
-- migration atomic even when cron is not installed yet.
