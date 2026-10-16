-- SEO-02 pilot metadata only. Existing catalog rows/vectors are not rewritten.
create table public.film_people (
    person_id integer primary key check (person_id > 0),
    name text not null check (length(name) between 1 and 200),
    display_name text not null check (length(display_name) between 1 and 200),
    profile_path text check (profile_path is null or profile_path ~ '^/[A-Za-z0-9_.-]+$'),
    pilot_role text not null check (pilot_role in ('actor','director')),
    published boolean not null default false,
    anchor_movie_id integer not null references public.film_embeddings_v3(movie_id),
    updated_at timestamptz not null default now()
);
create table public.film_person_credits (
    person_id integer not null references public.film_people(person_id) on delete cascade,
    credit_key text not null check (credit_key ~ '^[a-f0-9]{64}$'),
    movie_id integer not null references public.film_embeddings_v3(movie_id) on delete cascade,
    credit_id text,
    kind text not null check (kind in ('cast','crew')),
    job text not null check (length(job) <= 200),
    department text not null check (length(department) <= 200),
    character_name text check (character_name is null or length(character_name) <= 4096),
    cast_order integer,
    updated_at timestamptz not null default now(),
    primary key (person_id, credit_key)
);
create index film_person_credits_movie_idx on public.film_person_credits(movie_id,person_id);
create index film_person_credits_role_idx on public.film_person_credits(person_id,kind,job,movie_id);
alter table public.film_people enable row level security;
alter table public.film_person_credits enable row level security;
revoke all on public.film_people, public.film_person_credits from public, anon, authenticated;
grant select,insert,update,delete on public.film_people, public.film_person_credits to service_role;

create function public.replace_pilot_person_snapshot(p_person jsonb, p_credits jsonb)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
    person_key integer := (p_person->>'person_id')::integer;
    primary_role text := p_person->>'pilot_role';
    role_films integer;
    stored integer;
    pilot_bytes bigint;
begin
    perform pg_catalog.pg_advisory_xact_lock(21002,0);
    if person_key is null or person_key <= 0 or primary_role not in ('actor','director') then
        raise exception 'Invalid pilot person';
    end if;
    if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) not between 1 and 3000 then
        raise exception 'Invalid or incomplete credit snapshot';
    end if;
    if pg_database_size(current_database()) > 450000000 then raise exception 'Pilot database capacity guard'; end if;
    if not exists(select 1 from public.film_people where person_id=person_key)
       and (select count(*) from public.film_people) >= 50 then raise exception 'Pilot limited to 50 identities'; end if;
    if exists(select 1 from jsonb_array_elements(p_credits) c where (c->>'person_id')::integer is distinct from person_key) then
        raise exception 'Mixed person snapshot';
    end if;
    select count(distinct c.movie_id) into role_films
    from jsonb_to_recordset(p_credits) as c(movie_id integer,kind text,job text)
    where case when primary_role='actor' then c.kind='cast' else c.kind='crew' and c.job='Director' end;
    if role_films < 5 then raise exception 'Pilot minimum is five role films'; end if;
    if not exists(
        select 1 from jsonb_to_recordset(p_credits) as c(movie_id integer,kind text,job text)
        where c.movie_id=(p_person->>'anchor_movie_id')::integer
        and case when primary_role='actor' then c.kind='cast' else c.kind='crew' and c.job='Director' end
    ) then raise exception 'Anchor role is missing'; end if;
    if exists(
        select 1 from jsonb_to_recordset(p_credits) as c(movie_id integer)
        left join public.film_embeddings_v3 f on f.movie_id=c.movie_id
        where f.movie_id is null or f.year is null or f.year>2025
    ) then raise exception 'Snapshot contains out-of-scope catalog films'; end if;

    insert into public.film_people(person_id,name,display_name,profile_path,pilot_role,published,anchor_movie_id)
    values(person_key,p_person->>'name',p_person->>'display_name',p_person->>'profile_path',primary_role,true,(p_person->>'anchor_movie_id')::integer)
    on conflict(person_id) do update set name=excluded.name,display_name=excluded.display_name,
        profile_path=excluded.profile_path,pilot_role=excluded.pilot_role,published=true,
        anchor_movie_id=excluded.anchor_movie_id,updated_at=now();
    -- Replacement and validation share one transaction; any failure preserves the old snapshot.
    delete from public.film_person_credits where person_id=person_key;
    insert into public.film_person_credits(person_id,credit_key,movie_id,credit_id,kind,job,department,character_name,cast_order)
    select person_key,c.credit_key,c.movie_id,c.credit_id,c.kind,c.job,c.department,c.character_name,c.cast_order
    from jsonb_to_recordset(p_credits) as c(credit_key text,movie_id integer,credit_id text,kind text,job text,department text,character_name text,cast_order integer);
    get diagnostics stored = row_count;
    select pg_total_relation_size('public.film_people'::regclass)+pg_total_relation_size('public.film_person_credits'::regclass) into pilot_bytes;
    if pilot_bytes>10000000 then raise exception 'Pilot metadata exceeds 10 MB'; end if;
    return jsonb_build_object('person_id',person_key,'credit_rows',stored,'role_films',role_films,'pilot_bytes',pilot_bytes);
end;
$$;
revoke all on function public.replace_pilot_person_snapshot(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.replace_pilot_person_snapshot(jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
