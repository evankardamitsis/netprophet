-- The Numbers desk, live and light (founder, 25 Nov 2026): fresh every 15 minutes, pushed to the open page, and the
-- page never touches the big tables.
--   core.numbers_daily: one row per Athens day (new accounts, voters, votes, quizzes). Filled back once here; after that
--                       the refresh rewrites only today and yesterday.
--   core.numbers_now:   one row with the totals right now (accounts, who opened, Pro, the path from download to coming
--                       back). The admin page subscribes to it over Realtime and reloads when it changes.
--   core.numbers_refresh(): run by pg_cron every 15 minutes. A row is only written when its numbers changed, so a quiet
--                       quarter sends nothing to the page.
--   api.admin_numbers:  reads only the summaries now.
-- The path («funnel») counts accounts made since the stores' numbers start (1 Nov 2026) through the app's own flow, so
-- v1 accounts brought over do not swamp it. «Came back» = voted or played the quiz on a later day within 7 days of
-- joining, counted for those who joined 7 or more days ago.

create index if not exists votes_day_key_idx on core.votes (day_key);
create index if not exists quiz_sets_quiz_day_idx on core.quiz_sets (quiz_day) where awarded_at is not null;

create table core.numbers_daily (
  day        date primary key,
  signups    int not null default 0,
  voters     int not null default 0,
  votes      int not null default 0,
  quizzes    int not null default 0,
  updated_at timestamptz not null default now()
);
alter table core.numbers_daily enable row level security;

create table core.numbers_now (
  id           smallint primary key default 1 check (id = 1),
  data         jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);
alter table core.numbers_now enable row level security;
-- admins may read it, which is what lets Realtime tell an admin's open page that it changed; nobody writes it but the refresh
grant select on core.numbers_now to authenticated;
create policy numbers_now_admin_read on core.numbers_now for select to authenticated using (core.is_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table core.numbers_now;
  end if;
end;
$$;

-- the days from p_from to today (Athens), rewritten only where a number changed
create or replace function core.numbers_daily_fill(p_from date)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  insert into core.numbers_daily (day, signups, voters, votes, quizzes, updated_at)
  select d.day,
         (select count(*) from core.profiles p
           where p.deleted_at is null and (p.created_at at time zone 'Europe/Athens')::date = d.day),
         (select count(distinct v.user_id) from core.votes v where v.day_key = d.day),
         (select count(*) from core.votes v where v.day_key = d.day),
         (select count(*) from core.quiz_sets q where q.quiz_day = d.day and q.awarded_at is not null),
         now()
    from (select g::date as day from generate_series(p_from, core.athens_day(), interval '1 day') g) d
  on conflict (day) do update
     set signups = excluded.signups, voters = excluded.voters, votes = excluded.votes, quizzes = excluded.quizzes,
         updated_at = now()
   where (numbers_daily.signups, numbers_daily.voters, numbers_daily.votes, numbers_daily.quizzes)
         is distinct from (excluded.signups, excluded.voters, excluded.votes, excluded.quizzes);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.numbers_daily_fill(date) from public, anon, authenticated;

-- today's (Athens) snapshot of who opened the app; taken again the same day it is replaced
create or replace function core.numbers_snapshot()
returns core.activity_daily
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_row core.activity_daily;
begin
  insert into core.activity_daily (day, opened_1d, opened_7d, opened_30d, accounts, pro)
  select core.athens_day(),
         count(*) filter (where last_opened > now() - interval '1 day'),
         count(*) filter (where last_opened > now() - interval '7 days'),
         count(*) filter (where last_opened > now() - interval '30 days'),
         count(*),
         count(*) filter (where pro)
    from core.numbers_people()
  on conflict (day) do update set opened_1d = excluded.opened_1d, opened_7d = excluded.opened_7d,
                                  opened_30d = excluded.opened_30d, accounts = excluded.accounts, pro = excluded.pro,
                                  taken_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function core.numbers_snapshot() from public, anon, authenticated;

-- everything: today's and yesterday's day rows, today's snapshot, and the totals row (written only when it changed)
create or replace function core.numbers_refresh()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_since date := date '2026-11-01';
  v_today date := core.athens_day();
  v_snap  core.activity_daily;
  v_data  jsonb;
begin
  perform core.numbers_daily_fill(v_today - 1);
  v_snap := core.numbers_snapshot();

  with people as (select * from core.numbers_people()),
  cohort as (
    select p.user_id, (p.created_at at time zone 'Europe/Athens')::date as joined,
           coalesce((p.onboarding_state ->> 'done')::boolean, false) as onboarded
      from core.profiles p
     where p.deleted_at is null
       and (p.created_at at time zone 'Europe/Athens')::date >= v_since
       and coalesce(p.onboarding_state ->> 'via', '') <> 'before-onboarding'
  ),
  played as (
    select c.user_id, c.joined, c.onboarded,
           exists (select 1 from core.votes v where v.user_id = c.user_id) as voted,
           (exists (select 1 from core.votes v where v.user_id = c.user_id
                     and v.day_key > c.joined and v.day_key <= c.joined + 7)
            or exists (select 1 from core.quiz_sets q where q.user_id = c.user_id and q.awarded_at is not null
                        and q.quiz_day > c.joined and q.quiz_day <= c.joined + 7)) as returned
      from cohort c
  )
  select jsonb_build_object(
    'accounts', (select jsonb_build_object(
                   'total', count(*),
                   'new_1d', count(*) filter (where created_at > now() - interval '1 day'),
                   'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
                   'new_30d', count(*) filter (where created_at > now() - interval '30 days'),
                   'opened_15m', count(*) filter (where last_opened > now() - interval '15 minutes'),
                   'opened_1d', v_snap.opened_1d,
                   'opened_7d', v_snap.opened_7d,
                   'opened_30d', v_snap.opened_30d)
                   from people),
    'pro', (select jsonb_build_object(
              'total', count(distinct e.user_id),
              'paid', count(distinct e.user_id) filter (where e.source = 'subscription'),
              'trial', count(distinct e.user_id) filter (where e.source = 'trial'),
              'given', count(distinct e.user_id) filter (where e.source not in ('subscription', 'trial')))
              from core.entitlements e
              join core.profiles pr on pr.user_id = e.user_id and pr.deleted_at is null
             where e.key = 'pro' and e.status = 'active' and e.starts_at <= now()
               and (e.ends_at is null or e.ends_at > now())),
    'funnel', (select jsonb_build_object(
                 'since', v_since,
                 'downloads', (select coalesce(sum(s.downloads), 0) from core.store_daily s where s.day >= v_since),
                 'accounts', count(*),
                 'onboarded', count(*) filter (where onboarded),
                 'voted', count(*) filter (where voted),
                 'eligible_7d', count(*) filter (where joined <= v_today - 7),
                 'returned_7d', count(*) filter (where joined <= v_today - 7 and returned))
                 from played)
  ) into v_data;

  insert into core.numbers_now (id, data, refreshed_at) values (1, v_data, now())
  on conflict (id) do update set data = excluded.data, refreshed_at = now()
   where numbers_now.data is distinct from excluded.data;
  return v_data;
end;
$$;
revoke all on function core.numbers_refresh() from public, anon, authenticated;

-- the admin cron's daily call keeps working, and now refreshes everything
create or replace function api.admin_activity_snapshot()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform core.numbers_refresh();
  return (select to_jsonb(a) from core.activity_daily a where a.day = core.athens_day());
end;
$$;
revoke all on function api.admin_activity_snapshot() from public, anon, authenticated;
grant execute on function api.admin_activity_snapshot() to service_role;

-- the desk, from the summaries only
create or replace function api.admin_numbers(p_days int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 60), 7), 400);
  v_today date := core.athens_day();
  v_from  date := core.athens_day() - (least(greatest(coalesce(p_days, 60), 7), 400) - 1);
  v_now   core.numbers_now;
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_now from core.numbers_now where id = 1;
  return (
    with days as (select d::date as day from generate_series(v_from, v_today, interval '1 day') d)
    select jsonb_build_object(
      'today', v_today,
      'refreshed_at', v_now.refreshed_at,
      'store', (select jsonb_build_object(
                  'apple', coalesce(sum(downloads) filter (where store = 'apple'), 0),
                  'google', coalesce(sum(downloads) filter (where store = 'google'), 0),
                  'apple_7d', coalesce(sum(downloads) filter (where store = 'apple' and day > v_today - 7), 0),
                  'google_7d', coalesce(sum(downloads) filter (where store = 'google' and day > v_today - 7), 0),
                  'apple_through', max(day) filter (where store = 'apple'),
                  'google_through', max(day) filter (where store = 'google'),
                  'fetched_at', max(fetched_at))
                  from core.store_daily),
      'accounts', coalesce(v_now.data -> 'accounts', '{}'::jsonb),
      'pro', coalesce(v_now.data -> 'pro', '{}'::jsonb),
      'funnel', coalesce(v_now.data -> 'funnel', '{}'::jsonb),
      'days', (select coalesce(jsonb_agg(jsonb_build_object(
                  'day', d.day,
                  'apple', sa.downloads,
                  'google', sg.downloads,
                  'signups', coalesce(nd.signups, 0),
                  'voters', coalesce(nd.voters, 0),
                  'votes', coalesce(nd.votes, 0),
                  'quizzes', coalesce(nd.quizzes, 0),
                  'opened_1d', ad.opened_1d,
                  'opened_7d', ad.opened_7d,
                  'opened_30d', ad.opened_30d)
                order by d.day desc), '[]'::jsonb)
                from days d
                left join core.store_daily sa on sa.store = 'apple' and sa.day = d.day
                left join core.store_daily sg on sg.store = 'google' and sg.day = d.day
                left join core.numbers_daily nd on nd.day = d.day
                left join core.activity_daily ad on ad.day = d.day),
      'days_shown', v_days));
end;
$$;
revoke all on function api.admin_numbers(int) from public, anon;
grant execute on function api.admin_numbers(int) to authenticated, service_role;

-- fill the history once, then keep it fresh every 15 minutes
select core.numbers_daily_fill(coalesce(
  least((select min(day_key) from core.votes),
        (select min(quiz_day) from core.quiz_sets),
        (select min((created_at at time zone 'Europe/Athens')::date) from core.profiles)),
  core.athens_day()));
select core.numbers_refresh();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-numbers-refresh', '*/15 * * * *', $c$select core.numbers_refresh()$c$);
  end if;
end;
$$;
