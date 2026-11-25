-- The admin's Numbers desk (founder, 25 Nov 2026): store downloads, accounts, active users, Pro and daily play.
--   core.store_daily:    first-time downloads per store and day, written once a day by the admin's cron from Apple's
--                        sales reports and Play's install reports (api.admin_store_record, service role only).
--   core.activity_daily: one snapshot a day of how many people opened the app in the last 1, 7 and 30 days, since
--                        «last opened» only keeps the latest moment (api.admin_activity_snapshot, service role only).
--   api.admin_numbers:   everything the desk shows (admins only).
-- «Last opened» is the same as on the Users desk: a device check-in or a refreshed sign-in.

create table core.store_daily (
  store      text not null check (store in ('apple', 'google')),
  day        date not null,
  downloads  int not null default 0 check (downloads >= 0),
  fetched_at timestamptz not null default now(),
  primary key (store, day)
);
alter table core.store_daily enable row level security;

create table core.activity_daily (
  day        date primary key,
  opened_1d  int not null,
  opened_7d  int not null,
  opened_30d int not null,
  accounts   int not null,
  pro        int not null,
  taken_at   timestamptz not null default now()
);
alter table core.activity_daily enable row level security;

-- every live account with when it last opened the app and whether it has Pro now
create or replace function core.numbers_people()
returns table (user_id uuid, created_at timestamptz, last_opened timestamptz, pro boolean)
language sql stable security definer set search_path = core, pg_temp
as $$
  select pr.user_id, pr.created_at,
         greatest((select max(pt.last_seen_at) from core.push_tokens pt where pt.user_id = pr.user_id),
                  (select max(se.updated_at) from auth.sessions se where se.user_id = pr.user_id)),
         core.is_pro(pr.user_id)
    from core.profiles pr
   where pr.deleted_at is null
$$;
revoke all on function core.numbers_people() from public, anon, authenticated;

-- the cron's daily rows: [{store, day, downloads}]; a day sent again replaces the earlier count
create or replace function api.admin_store_record(p_rows jsonb)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into core.store_daily (store, day, downloads, fetched_at)
  select r ->> 'store', (r ->> 'day')::date, greatest(coalesce((r ->> 'downloads')::int, 0), 0), now()
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  on conflict (store, day) do update set downloads = excluded.downloads, fetched_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function api.admin_store_record(jsonb) from public, anon, authenticated;
grant execute on function api.admin_store_record(jsonb) to service_role;

-- today's (Athens) snapshot; taken again the same day it is replaced
create or replace function api.admin_activity_snapshot()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_row core.activity_daily;
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
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
  return to_jsonb(v_row);
end;
$$;
revoke all on function api.admin_activity_snapshot() from public, anon, authenticated;
grant execute on function api.admin_activity_snapshot() to service_role;

-- the desk: totals now, and the last p_days days (Athens) one row per day
create or replace function api.admin_numbers(p_days int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 60), 7), 400);
  v_today date := core.athens_day();
  v_from  date := core.athens_day() - (least(greatest(coalesce(p_days, 60), 7), 400) - 1);
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    with people as (select * from core.numbers_people()),
    days as (select d::date as day from generate_series(v_from, v_today, interval '1 day') d)
    select jsonb_build_object(
      'today', v_today,
      'store', (select jsonb_build_object(
                  'apple', coalesce(sum(downloads) filter (where store = 'apple'), 0),
                  'google', coalesce(sum(downloads) filter (where store = 'google'), 0),
                  'apple_7d', coalesce(sum(downloads) filter (where store = 'apple' and day > v_today - 7), 0),
                  'google_7d', coalesce(sum(downloads) filter (where store = 'google' and day > v_today - 7), 0),
                  'apple_through', max(day) filter (where store = 'apple'),
                  'google_through', max(day) filter (where store = 'google'),
                  'fetched_at', max(fetched_at))
                  from core.store_daily),
      'accounts', (select jsonb_build_object(
                     'total', count(*),
                     'new_1d', count(*) filter (where created_at > now() - interval '1 day'),
                     'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
                     'new_30d', count(*) filter (where created_at > now() - interval '30 days'),
                     'opened_1d', count(*) filter (where last_opened > now() - interval '1 day'),
                     'opened_7d', count(*) filter (where last_opened > now() - interval '7 days'),
                     'opened_30d', count(*) filter (where last_opened > now() - interval '30 days'))
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
      'days', (select coalesce(jsonb_agg(jsonb_build_object(
                  'day', d.day,
                  'apple', (select s.downloads from core.store_daily s where s.store = 'apple' and s.day = d.day),
                  'google', (select s.downloads from core.store_daily s where s.store = 'google' and s.day = d.day),
                  'signups', (select count(*) from people p where (p.created_at at time zone 'Europe/Athens')::date = d.day),
                  'voters', (select count(distinct v.user_id) from core.votes v where v.day_key = d.day),
                  'votes', (select count(*) from core.votes v where v.day_key = d.day),
                  'quizzes', (select count(*) from core.quiz_sets q where q.quiz_day = d.day and q.awarded_at is not null),
                  'opened_1d', (select a.opened_1d from core.activity_daily a where a.day = d.day),
                  'opened_7d', (select a.opened_7d from core.activity_daily a where a.day = d.day),
                  'opened_30d', (select a.opened_30d from core.activity_daily a where a.day = d.day))
                order by d.day desc), '[]'::jsonb)
                from days d),
      'days_shown', v_days);
end;
$$;
revoke all on function api.admin_numbers(int) from public, anon;
grant execute on function api.admin_numbers(int) to authenticated, service_role;
