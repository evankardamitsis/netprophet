-- Users desk on summaries, and retention (founder, 25 Nov 2026).
--   core.user_rollup:        one row per live account with everything the Users desk lists. pg_cron refreshes it every
--                            15 minutes (rows only rewritten when something changed); an admin action refreshes that one
--                            person at once (api.admin_user_refresh).
--   api.admin_users_page:    50 at a time, searched, filtered, sorted and counted by the database, from the summary only.
--   api.admin_user_timeline: one person's story: joined, onboarding, player, votes, quizzes, Pro, purchases, emails.
--   core.retention_weekly:   accounts grouped by the week they joined (Monday, Athens), and how many still played
--                            (voted or did the quiz) in week 1, 2, 4 and 8 after. Refreshed nightly. Accounts brought
--                            over from v1 are left out. A week not reached yet stays empty.

create table core.user_rollup (
  user_id     uuid primary key references core.profiles (user_id) on delete cascade,
  email       text,
  name        text,
  baller_name text,
  search      text not null default '',
  role        text,
  hidden      boolean not null default false,
  locale      text,
  via         text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null,
  last_opened timestamptz,
  last_played date,
  platforms   text,
  pro         boolean not null default false,
  pro_source  text,
  pro_until   timestamptz,
  player_id   uuid,
  player      text,
  points      int not null default 0,
  streak      int not null default 0,
  streak_best int not null default 0,
  votes       int not null default 0,
  correct     int not null default 0,
  active_days int not null default 0,
  quizzes     int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table core.user_rollup enable row level security;
create index user_rollup_last_opened_idx on core.user_rollup (last_opened desc nulls last);
create index user_rollup_created_idx on core.user_rollup (created_at desc);
create index if not exists quiz_sets_user_awarded_idx on core.quiz_sets (user_id) where awarded_at is not null;

-- everyone (p_user null) or one person; rows rewritten only when something changed, gone accounts removed
create or replace function core.user_rollup_refresh(p_user uuid default null)
returns int
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_n int;
begin
  delete from core.user_rollup r
   where (p_user is null or r.user_id = p_user)
     and not exists (select 1 from core.profiles p where p.user_id = r.user_id and p.deleted_at is null);

  insert into core.user_rollup as r (user_id, email, name, baller_name, search, role, hidden, locale, via, onboarded,
                                     created_at, last_opened, last_played, platforms, pro, pro_source, pro_until,
                                     player_id, player, points, streak, streak_best, votes, correct, active_days, quizzes,
                                     updated_at)
  select x.user_id, x.email, x.name, x.baller_name,
         core.normalize_search(concat_ws(' ', x.name, x.baller_name, x.email)),
         x.role, x.hidden, x.locale, x.via, x.onboarded, x.created_at, x.last_opened, x.last_played, x.platforms,
         x.pro_source is not null, x.pro_source, x.pro_until, x.player_id, x.player,
         x.points, x.streak, x.streak_best, x.votes, x.correct, x.active_days, x.quizzes, now()
    from (
      select pr.user_id, u.email::text as email,
             coalesce(nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''), nullif(btrim(pr.display_name), '')) as name,
             pr.baller_name, pr.role, coalesce(pr.hidden, false) as hidden, pr.locale,
             pr.onboarding_state ->> 'via' as via,
             coalesce((pr.onboarding_state ->> 'done')::boolean, false) as onboarded,
             pr.created_at,
             greatest((select max(pt.last_seen_at) from core.push_tokens pt where pt.user_id = pr.user_id),
                      (select max(se.updated_at) from auth.sessions se where se.user_id = pr.user_id)) as last_opened,
             greatest((select max(v.day_key) from core.votes v where v.user_id = pr.user_id),
                      (select max(q.quiz_day) from core.quiz_sets q where q.user_id = pr.user_id and q.awarded_at is not null)) as last_played,
             (select string_agg(distinct pt.platform, ', ' order by pt.platform) from core.push_tokens pt where pt.user_id = pr.user_id) as platforms,
             ent.source as pro_source, ent.ends_at as pro_until,
             pl.id as player_id, nullif(concat_ws(' ', pl.first_name, pl.surname), '') as player,
             coalesce(g.total_points, 0) as points, coalesce(g.streak, 0) as streak, coalesce(g.streak_best, 0) as streak_best,
             (select count(*)::int from core.votes v where v.user_id = pr.user_id) as votes,
             (select count(*)::int from core.votes v where v.user_id = pr.user_id and v.outcome = 'correct') as correct,
             coalesce(g.active_days, 0) as active_days,
             (select count(*)::int from core.quiz_sets q where q.user_id = pr.user_id and q.awarded_at is not null) as quizzes
        from core.profiles pr
        join auth.users u on u.id = pr.user_id
        left join core.user_game_state g on g.user_id = pr.user_id
        left join lateral (select e.source, e.ends_at from core.entitlements e
                            where e.user_id = pr.user_id and e.key = 'pro' and e.status = 'active' and e.starts_at <= now()
                              and (e.ends_at is null or e.ends_at > now())
                            order by e.ends_at desc nulls first limit 1) ent on true
        left join lateral (select p2.id, p2.first_name, p2.surname from core.players p2
                            where p2.claimed_by_user_id = pr.user_id limit 1) pl on true
       where pr.deleted_at is null and (p_user is null or pr.user_id = p_user)
    ) x
  on conflict (user_id) do update set
    email = excluded.email, name = excluded.name, baller_name = excluded.baller_name, search = excluded.search,
    role = excluded.role, hidden = excluded.hidden, locale = excluded.locale, via = excluded.via,
    onboarded = excluded.onboarded, created_at = excluded.created_at, last_opened = excluded.last_opened,
    last_played = excluded.last_played, platforms = excluded.platforms, pro = excluded.pro,
    pro_source = excluded.pro_source, pro_until = excluded.pro_until, player_id = excluded.player_id,
    player = excluded.player, points = excluded.points, streak = excluded.streak, streak_best = excluded.streak_best,
    votes = excluded.votes, correct = excluded.correct, active_days = excluded.active_days, quizzes = excluded.quizzes,
    updated_at = now()
  where (r.email, r.name, r.baller_name, r.role, r.hidden, r.locale, r.via, r.onboarded, r.created_at, r.last_opened,
         r.last_played, r.platforms, r.pro, r.pro_source, r.pro_until, r.player_id, r.player, r.points, r.streak,
         r.streak_best, r.votes, r.correct, r.active_days, r.quizzes)
        is distinct from
        (excluded.email, excluded.name, excluded.baller_name, excluded.role, excluded.hidden, excluded.locale,
         excluded.via, excluded.onboarded, excluded.created_at, excluded.last_opened, excluded.last_played,
         excluded.platforms, excluded.pro, excluded.pro_source, excluded.pro_until, excluded.player_id, excluded.player,
         excluded.points, excluded.streak, excluded.streak_best, excluded.votes, excluded.correct, excluded.active_days,
         excluded.quizzes);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.user_rollup_refresh(uuid) from public, anon, authenticated;

-- after an admin changes someone (Pro, hidden, name, player), their row is fresh at once
create or replace function api.admin_user_refresh(p_user uuid)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  perform core.user_rollup_refresh(p_user);
end;
$$;
revoke all on function api.admin_user_refresh(uuid) from public, anon;
grant execute on function api.admin_user_refresh(uuid) to authenticated, service_role;

-- the desk: one page of people, the count per segment, and when the summary was last refreshed
create or replace function api.admin_users_page(
  p_query    text default null,
  p_segment  text default 'all',
  p_platform text default null,
  p_lang     text default null,
  p_sort     text default 'opened',
  p_desc     boolean default true,
  p_page     int default 0,
  p_size     int default 50
)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_q    text := core.normalize_search(coalesce(p_query, ''));
  v_seg  text := coalesce(p_segment, 'all');
  v_size int  := least(greatest(coalesce(p_size, 50), 10), 200);
  v_page int  := greatest(coalesce(p_page, 0), 0);
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    with base as (
      select r.*,
             r.created_at > now() - interval '7 days' as is_new,
             r.last_opened > now() - interval '7 days' as is_active,
             r.last_opened <= now() - interval '7 days' and r.last_opened > now() - interval '30 days' as is_risk,
             r.last_opened is null or r.last_opened <= now() - interval '30 days' as is_gone
        from core.user_rollup r
       where (v_q = '' or r.search like '%' || v_q || '%')
         and (p_platform is null
              or (p_platform = 'none' and r.platforms is null)
              or (p_platform <> 'none' and r.platforms like '%' || p_platform || '%'))
         and (p_lang is null or coalesce(r.locale, 'el') = p_lang)
    ), shown as (
      select * from base b
       where case v_seg
               when 'new' then b.is_new
               when 'active' then coalesce(b.is_active, false)
               when 'at_risk' then coalesce(b.is_risk, false)
               when 'gone' then b.is_gone
               when 'pro' then b.pro
               when 'paying' then b.pro_source = 'subscription'
               when 'claimed' then b.player_id is not null
               when 'hidden' then b.hidden
               else true end
    )
    select jsonb_build_object(
      'refreshed_at', (select max(updated_at) from core.user_rollup),
      'counts', (select jsonb_build_object(
                   'all', count(*),
                   'new', count(*) filter (where is_new),
                   'active', count(*) filter (where is_active),
                   'at_risk', count(*) filter (where is_risk),
                   'gone', count(*) filter (where is_gone),
                   'pro', count(*) filter (where pro),
                   'paying', count(*) filter (where pro_source = 'subscription'),
                   'claimed', count(*) filter (where player_id is not null),
                   'hidden', count(*) filter (where hidden),
                   'devices', count(*) filter (where platforms is not null))
                   from base),
      'total', (select count(*) from shown),
      'page', v_page,
      'size', v_size,
      'rows', coalesce((
        select jsonb_agg(to_jsonb(s) - 'search' - 'is_new' - 'is_active' - 'is_risk' - 'is_gone' - 'updated_at' - 'k1' - 'k2'
                         order by s.k1 desc nulls last, s.k2, s.created_at desc)
          from (select sh.*,
                       -- the number to sort on, turned around for oldest or least first; empty sorts last either way
                       case coalesce(p_sort, 'opened')
                         when 'joined' then extract(epoch from sh.created_at)
                         when 'votes' then sh.votes
                         when 'points' then sh.points
                         when 'streak' then sh.streak
                         when 'played' then extract(epoch from sh.last_played::timestamp)
                         when 'name' then null
                         else extract(epoch from sh.last_opened) end
                         * case when p_desc then 1 else -1 end as k1,
                       case when p_sort = 'name' then lower(coalesce(sh.name, sh.baller_name, sh.email, '')) end as k2
                  from shown sh
                 order by k1 desc nulls last, k2, sh.created_at desc
                 offset v_page * v_size limit v_size) s), '[]'::jsonb)));
end;
$$;
revoke all on function api.admin_users_page(text, text, text, text, text, boolean, int, int) from public, anon;
grant execute on function api.admin_users_page(text, text, text, text, text, boolean, int, int) to authenticated, service_role;

-- one person's story, newest first
create or replace function api.admin_user_timeline(p_user uuid, p_limit int default 80)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('at', t.at, 'kind', t.kind, 'text', t.text) order by t.at desc)
      from (
        select * from (
          select pr.created_at as at, 'joined' as kind, 'Made an account' as text
            from core.profiles pr where pr.user_id = p_user
          union all
          select (pr.onboarding_state ->> 'at')::timestamptz, 'onboarding', 'Finished onboarding'
            from core.profiles pr where pr.user_id = p_user and pr.onboarding_state ? 'at'
          union all
          select pr.claim_completed_at, 'player', 'Linked their player'
            from core.profiles pr where pr.user_id = p_user and pr.claim_completed_at is not null
          union all
          select v.created_at, 'vote',
                 'Voted on a ' || v.subject_type::text
                 || case when v.resolved_at is null then ', waiting for the result'
                         when v.outcome = 'correct' then ', got it right' || case when v.points > 0 then ' (+' || v.points || ')' else '' end
                         when v.outcome = 'wrong' then ', got it wrong'
                         else ', no result' end
            from core.votes v where v.user_id = p_user
          union all
          select coalesce(q.awarded_at, q.created_at), 'quiz',
                 case when q.awarded_at is not null then 'Finished the quiz' else 'Started the quiz' end
            from core.quiz_sets q where q.user_id = p_user
          union all
          select e.starts_at, 'pro',
                 'Pro started (' || e.source::text || ')' || case when e.ends_at is not null then ', until ' || to_char(e.ends_at at time zone 'Europe/Athens', 'DD Mon YYYY') else '' end
            from core.entitlements e where e.user_id = p_user and e.key = 'pro'
          union all
          select pu.created_at, 'purchase', 'Store: ' || replace(lower(pu.event_type::text), '_', ' ') || coalesce(' (' || pu.store::text || ')', '')
            from core.purchases pu where pu.user_id = p_user and coalesce(pu.environment::text, 'PRODUCTION') not ilike 'sandbox'
          union all
          select coalesce(m.sent_at, m.due_at), 'email', 'Email «' || m.kind::text || '» ' || m.status::text
            from core.emails m where m.user_id = p_user
        ) all_events
        where at is not null
        order by at desc
        limit least(greatest(coalesce(p_limit, 80), 10), 300)
      ) t), '[]'::jsonb);
end;
$$;
revoke all on function api.admin_user_timeline(uuid, int) from public, anon;
grant execute on function api.admin_user_timeline(uuid, int) to authenticated, service_role;

-- retention: who still played 1, 2, 4 and 8 weeks after the week they joined
create table core.retention_weekly (
  cohort_week date primary key,
  joined      int not null,
  w1          int,
  w2          int,
  w4          int,
  w8          int,
  updated_at  timestamptz not null default now()
);
alter table core.retention_weekly enable row level security;

create or replace function core.retention_refresh()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_today date := core.athens_day();
  v_n     int;
begin
  with people as (
    select p.user_id, (p.created_at at time zone 'Europe/Athens')::date as joined
      from core.profiles p
     where p.deleted_at is null and coalesce(p.onboarding_state ->> 'via', '') <> 'before-onboarding'
  ), played as (
    select distinct v.user_id, v.day_key as day from core.votes v join people using (user_id)
    union
    select q.user_id, q.quiz_day from core.quiz_sets q join people using (user_id) where q.awarded_at is not null
  ), marks as (
    select pe.user_id, pe.joined, date_trunc('week', pe.joined)::date as cohort,
           bool_or(pl.day - pe.joined between 7 and 13) as w1,
           bool_or(pl.day - pe.joined between 14 and 20) as w2,
           bool_or(pl.day - pe.joined between 28 and 34) as w4,
           bool_or(pl.day - pe.joined between 56 and 62) as w8
      from people pe left join played pl using (user_id)
     group by pe.user_id, pe.joined
  ), weeks as (
    -- a week counts only when everyone in the cohort has lived through it
    select cohort, count(*)::int as joined,
           case when cohort + 6 + 13 <= v_today then count(*) filter (where w1)::int end as w1,
           case when cohort + 6 + 20 <= v_today then count(*) filter (where w2)::int end as w2,
           case when cohort + 6 + 34 <= v_today then count(*) filter (where w4)::int end as w4,
           case when cohort + 6 + 62 <= v_today then count(*) filter (where w8)::int end as w8
      from marks group by cohort
  )
  insert into core.retention_weekly as r (cohort_week, joined, w1, w2, w4, w8, updated_at)
  select cohort, joined, w1, w2, w4, w8, now() from weeks
  on conflict (cohort_week) do update set joined = excluded.joined, w1 = excluded.w1, w2 = excluded.w2,
                                          w4 = excluded.w4, w8 = excluded.w8, updated_at = now()
   where (r.joined, r.w1, r.w2, r.w4, r.w8) is distinct from (excluded.joined, excluded.w1, excluded.w2, excluded.w4, excluded.w8);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.retention_refresh() from public, anon, authenticated;

create or replace function api.admin_retention(p_weeks int default 16)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'refreshed_at', (select max(updated_at) from core.retention_weekly),
    'weeks', coalesce((select jsonb_agg(to_jsonb(w) - 'updated_at' order by w.cohort_week desc)
                         from (select * from core.retention_weekly
                                order by cohort_week desc limit least(greatest(coalesce(p_weeks, 16), 4), 104)) w), '[]'::jsonb));
end;
$$;
revoke all on function api.admin_retention(int) from public, anon;
grant execute on function api.admin_retention(int) to authenticated, service_role;

select core.user_rollup_refresh();
select core.retention_refresh();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-users-rollup', '7,22,37,52 * * * *', $c$select core.user_rollup_refresh()$c$);
    perform cron.schedule('np-retention', '50 0 * * *', $c$select core.retention_refresh()$c$);
  end if;
end;
$$;
