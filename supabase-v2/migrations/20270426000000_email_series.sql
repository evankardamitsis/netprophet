-- The email series and the weekly emails (founder's email board, approved 17 Nov 2026). Slice 2 of the email system:
-- the database decides who gets which game email and when, and puts on each row everything the template needs
-- (apps/admin/src/lib/v2/mail/series.ts renders it). Nothing here sends: the queue, the switch, the allow-list and
-- each person's own switch work as in 20270422000000_email_core.
--
-- The seven kinds (group 'game', Athens time, the hourly sweep below queues them):
--   day1_vote     no match vote 24 hours after signing up: the first 10:00 after that, only when there are matches
--                 open to vote that day (anywhere; the examples prefer their area)
--   day3_follow   follows nobody on day 3, 10:00: up to 3 popular players of their area
--   day7_week     at least one match vote in the first 7 days: day 7, 10:00, the first week in numbers
--   day14_missed  away for the last 7 days on day 14 (10:00, tried up to day 16): the upsets and the followed
--                 players' results while away; once
--   monday        every Monday 09:00 to everyone with a match vote the week before (Monday to Sunday)
--   month_close   the 1st, 10:00, to everyone with points in the closed month who did not win a medal (the top 3 of
--                 each group get the medal email instead, never both)
--   away30        30 days without opening the app: once ever, and no other game email until they come back
--
-- Rules for all of them:
--   * at most 2 game emails per person in any 7 days (account emails do not count, the welcome does) and at most
--     one a day when queueing; the 2 in 7 days again when sending (core.email_gate, the hard limit)
--   * day14_missed and away30 wait for a day without a results push
--   * day1..day14 only for accounts made after core.email_settings.start_at; monday, month_close and away30 reach
--     everyone, but only from their first natural moment after start_at, never backfilled
--   * deleted profiles and people who turned the game emails off are never queued
--
-- "Opened the app" is what the admin's Χρήστες page uses: the latest of the device's push token refresh (every
-- launch) and the sign-in session refresh, plus the latest vote, and the signup itself as the floor.

insert into core.email_kinds (kind, grp, label) values
  ('day1_vote',    'game', 'Μέρα 1: η πρώτη ψήφος'),
  ('day3_follow',  'game', 'Μέρα 3: ακολούθησε την παρέα σου'),
  ('day7_week',    'game', 'Μέρα 7: η πρώτη σου εβδομάδα'),
  ('day14_missed', 'game', 'Μέρα 14: όσο έλειπες'),
  ('monday',       'game', 'Δευτέρα: η εβδομάδα σου'),
  ('month_close',  'game', 'Ο μήνας έκλεισε'),
  ('away30',       'game', 'Πάει καιρός (30 μέρες)')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;

-- ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

-- an Athens wall-clock time as an instant (DST included)
create or replace function core.email_slot(p_day date, p_hour int)
returns timestamptz
language sql stable set search_path = pg_temp
as $$
  select (p_day + make_time(p_hour, 0, 0)) at time zone 'Europe/Athens'
$$;

-- the last time this person opened the app (see the header)
create or replace function core.email_last_opened(p_user uuid)
returns timestamptz
language sql stable security definer set search_path = core, pg_temp
as $$
  select greatest(
    (select pr.created_at from core.profiles pr where pr.user_id = p_user),
    (select max(pt.last_seen_at) from core.push_tokens pt where pt.user_id = p_user),
    (select max(se.updated_at) from auth.sessions se where se.user_id = p_user),
    (select max(v.created_at) from core.votes v where v.user_id = p_user))
$$;
revoke all on function core.email_last_opened(uuid) from public, anon, authenticated;

-- may this person get one more game email now: game emails on, under 2 in the last 7 days, none today, and no
-- away30 since they last opened the app ("then nothing until they return"). On the allow-list only the listed
-- addresses are queued at all, so a test run never uses up anyone's once-only email.
create or replace function core.email_game_ok(p_user uuid, p_now timestamptz default now())
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.profiles pr join auth.users u on u.id = pr.user_id
                  cross join core.email_settings s
                  where pr.user_id = p_user and pr.deleted_at is null and u.email is not null
                    and coalesce(pr.notification_prefs ->> 'game_email', 'true') <> 'false'
                    and (s.mode = 'on'
                         or (s.mode = 'allowlist' and lower(u.email) = any (select lower(a) from unnest(s.allowlist) a))))
     and (select count(*) from core.emails e join core.email_kinds k on k.kind = e.kind
           where e.user_id = p_user and k.grp = 'game' and e.status in ('due', 'sending', 'sent')
             and e.dedupe_key not like 'test:%'
             and coalesce(e.sent_at, e.due_at) > p_now - interval '7 days') < 2
     and not exists (select 1 from core.emails e join core.email_kinds k on k.kind = e.kind
                      where e.user_id = p_user and k.grp = 'game' and e.status in ('due', 'sending', 'sent')
                        and e.dedupe_key not like 'test:%'
                        and core.athens_day(coalesce(e.sent_at, e.due_at)) = core.athens_day(p_now))
     and not exists (select 1 from core.emails e
                      where e.user_id = p_user and e.kind = 'away30' and e.status in ('due', 'sending', 'sent')
                        and coalesce(e.sent_at, e.due_at) > core.email_last_opened(p_user))
$$;
revoke all on function core.email_game_ok(uuid, timestamptz) from public, anon, authenticated;

-- a results push already reached them today (Athens): the vote results and the followed players' results
create or replace function core.email_results_push_today(p_user uuid, p_now timestamptz default now())
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.notifications n
                  where n.user_id = p_user and n.channel = 'push'
                    and (n.type = 'result' or n.dedupe_key like 'personal:result:%')
                    and core.athens_day(coalesce(n.sent_at, n.scheduled_at, n.created_at)) = core.athens_day(p_now))
$$;
revoke all on function core.email_results_push_today(uuid, timestamptz) from public, anon, authenticated;

-- one side of a match as names: «Γιώργος Μέμμος», a doubles pair «Α Β / Γ Δ»
create or replace function core.email_side_name(p_match uuid, p_side int)
returns text
language sql stable security definer set search_path = core, pg_temp
as $$
  select string_agg(btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))), ' / ' order by mp.position)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and mp.side = p_side
$$;
revoke all on function core.email_side_name(uuid, int) from public, anon, authenticated;

-- a match anyone may see in an email: approved, not void, no minor or hidden player
create or replace function core.email_match_shown(p_match uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.matches m where m.id = p_match and m.approved and m.status <> 'void')
     and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                      where mp.match_id = p_match and (p.is_minor or p.hidden or p.status <> 'active'))
$$;
revoke all on function core.email_match_shown(uuid) from public, anon, authenticated;

-- the person's areas (as the app reads them)
create or replace function core.email_areas(p_user uuid)
returns text[]
language sql stable security definer set search_path = core, pg_temp
as $$
  select case when cardinality(pr.area_ids) > 0 then pr.area_ids when pr.area_id is not null then array[pr.area_id] else '{}'::text[] end
    from core.profiles pr where pr.user_id = p_user
$$;
revoke all on function core.email_areas(uuid) from public, anon, authenticated;

-- matches open to vote on an Athens day, as of p_now; with p_areas, the ones in those areas first
create or replace function core.email_open_matches(p_day date, p_now timestamptz, p_areas text[] default '{}')
returns table (match_id uuid, starts_at timestamptz, in_area boolean)
language sql stable security definer set search_path = core, pg_temp
as $$
  select m.id, m.starts_at, coalesce(m.area_id = any (p_areas), false)
    from core.matches m
   where m.approved and m.status in ('announced', 'scheduled') and m.postponed_at is null
     and m.starts_at is not null and core.athens_day(m.starts_at) = p_day
     and core.match_lock_at(m) > p_now
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
     and core.email_match_shown(m.id)
$$;
revoke all on function core.email_open_matches(date, timestamptz, text[]) from public, anon, authenticated;

-- a match as the emails show it: time (Athens, null when untimed), the two sides, the tournament
create or replace function core.email_match_json(p_match uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'date', core.athens_day(m.starts_at),
           'time', case when (m.starts_at at time zone 'Europe/Athens')::time <> time '00:00'
                        then to_char(m.starts_at at time zone 'Europe/Athens', 'HH24:MI') end,
           'a', core.email_side_name(m.id, 1), 'b', core.email_side_name(m.id, 2),
           'tournament', t.name)
    from core.matches m left join core.tournaments t on t.id = m.tournament_id
   where m.id = p_match
$$;
revoke all on function core.email_match_json(uuid) from public, anon, authenticated;

-- the person's place in their Κατηγορία this month: tier, place and size (null when not in one)
create or replace function core.email_ladder(p_user uuid, p_month text)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with mine as (
    select l.id, l.tier from core.league_members lm join core.leagues l on l.id = lm.league_id
     where lm.user_id = p_user and l.month_key = p_month
     limit 1
  ), ranked as (
    select lm.user_id,
           row_number() over (order by coalesce(p.points, 0) desc, p.last_at asc nulls last, lm.user_id::text collate "C")::int as place
      from core.league_members lm
      left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                   from core.points_ledger where month_key = p_month group by user_id) p on p.user_id = lm.user_id
     where lm.league_id = (select id from mine)
  )
  select jsonb_build_object('tier', (select tier from mine),
                            'place', (select place from ranked where user_id = p_user),
                            'size', (select count(*)::int from ranked))
   where exists (select 1 from mine)
$$;
revoke all on function core.email_ladder(uuid, text) from public, anon, authenticated;

-- a result as the emails show it: the score from the winner's side («2-1»)
create or replace function core.email_result_json(p_match uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'date', core.athens_day(m.starts_at),
           'winner', core.email_side_name(m.id, res.winner_side),
           'loser', core.email_side_name(m.id, 3 - res.winner_side),
           'score', res.score_summary, 'walkover', res.walkover, 'tournament', t.name)
    from core.matches m join core.match_results res on res.match_id = m.id
    left join core.tournaments t on t.id = m.tournament_id
   where m.id = p_match
$$;
revoke all on function core.email_result_json(uuid) from public, anon, authenticated;

-- ── the sweep ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- Hourly. Each kind has an Athens slot and a 4 hour window after it, so a missed run still catches up that morning;
-- the dedupe key makes every later run do nothing. Returns how many emails it queued.
create or replace function core.email_series_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s        core.email_settings;
  v_today  date := core.athens_day(p_now);
  v_month  text := core.month_key(p_now);
  v_ten    timestamptz := core.email_slot(core.athens_day(p_now), 10);
  v_nine   timestamptz := core.email_slot(core.athens_day(p_now), 9);
  v_at10   boolean;
  r        record;
  v_n      int := 0;
  v_open   int;
  v_pay    jsonb;
  v_areas  text[];
  v_a      jsonb;
  v_b      jsonb;
  v_prev   text;
begin
  select * into s from core.email_settings;
  if s.mode = 'off' then return 0; end if;
  v_at10 := p_now >= v_ten and p_now < v_ten + interval '4 hours';

  -- ── day1_vote: the first 10:00 at least 24 hours after signing up, no match vote, matches open today ──
  if v_at10 then
    select count(*) into v_open from core.email_open_matches(v_today, p_now);
    if v_open > 0 then
      for r in
        select pr.user_id from core.profiles pr
         where pr.deleted_at is null and pr.created_at >= s.start_at
           and pr.created_at > p_now - interval '3 days' and pr.created_at <= p_now - interval '24 hours'
           and (case when ((pr.created_at + interval '24 hours') at time zone 'Europe/Athens')::time <= time '10:00'
                     then core.athens_day(pr.created_at + interval '24 hours')
                     else core.athens_day(pr.created_at + interval '24 hours') + 1 end) = v_today
           and not exists (select 1 from core.votes v where v.user_id = pr.user_id and v.subject_type = 'match')
           and not exists (select 1 from core.emails e where e.dedupe_key = 'day1:' || pr.user_id)
      loop
        continue when not core.email_game_ok(r.user_id, p_now);
        v_areas := core.email_areas(r.user_id);
        perform core.email_queue(r.user_id, 'day1_vote', 'day1:' || r.user_id,
          jsonb_build_object('open', v_open,
            'matches', (select coalesce(jsonb_agg(core.email_match_json(x.match_id) order by x.in_area desc, x.starts_at, x.match_id), '[]'::jsonb)
                          from (select * from core.email_open_matches(v_today, p_now, v_areas) o
                                 order by o.in_area desc, o.starts_at, o.match_id limit 2) x)),
          p_now);
        v_n := v_n + 1;
      end loop;
    end if;
  end if;

  -- ── day3_follow: day 3, 10:00, follows nobody; up to 3 popular players of their area ──
  if v_at10 then
    for r in
      select pr.user_id, pr.claimed_player_id from core.profiles pr
       where pr.deleted_at is null and pr.created_at >= s.start_at
         and core.athens_day(pr.created_at) = v_today - 3
         and not exists (select 1 from core.follows f where f.user_id = pr.user_id)
         and not exists (select 1 from core.emails e where e.dedupe_key = 'day3:' || pr.user_id)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      v_areas := core.email_areas(r.user_id);
      -- the order of api.suggest_players: their area, then their region, then followers and matches
      select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'matches', x.season) order by x.rank), '[]'::jsonb)
        into v_a
        from (
          select btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))) as name,
                 (select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id
                   where mp.player_id = p.id and m.approved and m.status <> 'void' and m.starts_at is not null
                     and extract(year from core.athens_day(m.starts_at)) = extract(year from v_today)) as season,
                 row_number() over (
                   order by (p.area_id = any (v_areas)) desc,
                            (p.area_id in (select a.id from core.areas a
                                            where a.region in (select region from core.areas where id = any (v_areas)))) desc,
                            (select count(*) from core.follows x where x.player_id = p.id) desc,
                            (select count(*) from core.match_participants mp where mp.player_id = p.id) desc,
                            p.surname, p.first_name) as rank
            from core.players p
           where p.status = 'active' and not p.hidden and not p.is_minor and p.id is distinct from r.claimed_player_id
           order by rank
           limit 3) x;
      continue when jsonb_array_length(v_a) = 0;
      perform core.email_queue(r.user_id, 'day3_follow', 'day3:' || r.user_id, jsonb_build_object('players', v_a), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── day7_week: day 7, 10:00, at least one match vote in the first 7 days ──
  if v_at10 then
    for r in
      select pr.user_id from core.profiles pr
       where pr.deleted_at is null and pr.created_at >= s.start_at
         and core.athens_day(pr.created_at) = v_today - 7
         and exists (select 1 from core.votes v where v.user_id = pr.user_id and v.subject_type = 'match'
                       and v.created_at < pr.created_at + interval '7 days')
         and not exists (select 1 from core.emails e where e.dedupe_key = 'day7:' || pr.user_id)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      select jsonb_build_object(
               'votes', count(*)::int,
               'resolved', count(*) filter (where v.outcome in ('correct', 'wrong'))::int,
               'correct', count(*) filter (where v.outcome = 'correct')::int)
        into v_pay
        from core.votes v where v.user_id = r.user_id and v.subject_type = 'match';
      v_pay := v_pay || jsonb_build_object(
        'streak', coalesce((select g.streak from core.user_game_state g where g.user_id = r.user_id), 0),
        'points', coalesce((select g.total_points from core.user_game_state g where g.user_id = r.user_id), 0),
        'ladder', core.email_ladder(r.user_id, v_month));
      perform core.email_queue(r.user_id, 'day7_week', 'day7:' || r.user_id, v_pay, p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── day14_missed: day 14, 10:00 (days 15 and 16 when a results push or the cap held it), away for the last 7
  --    days, and something happened while away; once ──
  if v_at10 then
    for r in
      select x.user_id, x.since from (
        select pr.user_id, core.email_last_opened(pr.user_id) as since from core.profiles pr
         where pr.deleted_at is null and pr.created_at >= s.start_at
           and core.athens_day(pr.created_at) between v_today - 16 and v_today - 14
           and not exists (select 1 from core.emails e where e.dedupe_key = 'day14:' || pr.user_id)) x
       where x.since <= p_now - interval '7 days'
    loop
      continue when not core.email_game_ok(r.user_id, p_now) or core.email_results_push_today(r.user_id, p_now);
      -- the upsets while away: the winner had under the sport's share of the votes
      select count(*)::int,
             coalesce(jsonb_agg(core.email_result_json(u.id) || jsonb_build_object('share', u.share)
                                order by u.rn) filter (where u.rn <= 2), '[]'::jsonb)
        into v_open, v_a
        from (
          select m.id, round(100.0 * sp.for_winner / sp.total)::int as share,
                 row_number() over (order by sp.for_winner::numeric / sp.total, m.starts_at desc, m.id) as rn
            from core.matches m join core.match_results res on res.match_id = m.id
            cross join lateral (
              select count(*)::int as total, count(*) filter (where vv.option = res.winner_side)::int as for_winner
                from core.votes vv where vv.subject_type = 'match' and vv.subject_id = m.id) sp
           where m.starts_at between r.since and p_now and sp.total > 0
             and core.is_upset(sp.for_winner, sp.total, core.sport_rules(m.sport_id))
             and core.email_match_shown(m.id)) u;
      -- the players they follow: their results while away, the 3 newest
      select coalesce(jsonb_agg(core.email_result_json(f.id) || jsonb_build_object('player', f.player, 'won', f.won)
                                order by f.starts_at desc, f.id), '[]'::jsonb)
        into v_b
        from (
          select d.* from (
            select distinct on (m.id) m.id, m.starts_at, mp.side = res.winner_side as won,
                   btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))) as player
              from core.follows fo
              join core.match_participants mp on mp.player_id = fo.player_id
              join core.players p on p.id = fo.player_id
              join core.matches m on m.id = mp.match_id
              join core.match_results res on res.match_id = m.id
             where fo.user_id = r.user_id and m.starts_at between r.since and p_now and core.email_match_shown(m.id)
             order by m.id, p.surname, p.first_name) d
          order by d.starts_at desc, d.id
          limit 3) f;
      continue when v_open = 0 and jsonb_array_length(v_b) = 0;
      perform core.email_queue(r.user_id, 'day14_missed', 'day14:' || r.user_id,
        jsonb_build_object('upsets', v_open, 'upset_list', v_a, 'followed', v_b), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── monday: 09:00, everyone with a match vote last week (Monday to Sunday) ──
  if extract(isodow from v_today) = 1 and p_now >= v_nine and p_now < v_nine + interval '4 hours' and v_nine >= s.start_at then
    for r in
      select distinct v.user_id from core.votes v
        join core.profiles pr on pr.user_id = v.user_id and pr.deleted_at is null
       where v.subject_type = 'match' and v.day_key between v_today - 7 and v_today - 1
         and not exists (select 1 from core.emails e
                          where e.dedupe_key = 'monday:' || v.user_id || ':' || to_char(v_today, 'IYYY-IW'))
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      select jsonb_build_object(
               'date', v_today,
               'votes', count(*)::int,
               'resolved', count(*) filter (where v.outcome in ('correct', 'wrong'))::int,
               'correct', count(*) filter (where v.outcome = 'correct')::int)
        into v_pay
        from core.votes v
       where v.user_id = r.user_id and v.subject_type = 'match' and v.day_key between v_today - 7 and v_today - 1;
      -- the players they follow who play this week, as scheduled now
      select coalesce(jsonb_agg(core.email_match_json(w.id) order by w.starts_at, w.id), '[]'::jsonb)
        into v_a
        from (select m.id, m.starts_at from core.matches m
               where m.approved and m.status in ('announced', 'scheduled') and m.postponed_at is null
                 and m.starts_at is not null and m.starts_at > p_now
                 and core.athens_day(m.starts_at) between v_today and v_today + 6
                 and exists (select 1 from core.match_participants mp join core.follows fo on fo.player_id = mp.player_id
                              where mp.match_id = m.id and fo.user_id = r.user_id)
                 and core.email_match_shown(m.id)
               order by m.starts_at, m.id limit 3) w;
      v_pay := v_pay || jsonb_build_object(
        'streak', coalesce((select g.streak from core.user_game_state g where g.user_id = r.user_id), 0),
        'ladder', core.email_ladder(r.user_id, v_month),
        'followed', v_a);
      perform core.email_queue(r.user_id, 'monday', 'monday:' || r.user_id || ':' || to_char(v_today, 'IYYY-IW'), v_pay, p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── month_close: the 1st, 10:00, everyone with points in the closed month without a medal ──
  if extract(day from v_today) = 1 and v_at10 and v_ten >= s.start_at then
    v_prev := to_char(v_today - 1, 'YYYY-MM');
    for r in
      select lm.user_id, l.tier, lm.final_rank, lm.final_points, lm.outcome,
             (select count(*)::int from core.league_members x where x.league_id = l.id) as size
        from core.league_members lm
        join core.leagues l on l.id = lm.league_id
        join core.profiles pr on pr.user_id = lm.user_id and pr.deleted_at is null
       where l.month_key = v_prev and l.closed_at is not null
         and lm.final_rank is not null and coalesce(lm.final_points, 0) > 0
         and not exists (select 1 from core.month_medals mm where mm.user_id = lm.user_id and mm.month_key = v_prev)
         and not exists (select 1 from core.emails e where e.dedupe_key = 'month_close:' || lm.user_id || ':' || v_prev)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'month_close', 'month_close:' || r.user_id || ':' || v_prev,
        jsonb_build_object('month', v_prev, 'tier', r.tier, 'place', r.final_rank, 'size', r.size,
                           'points', r.final_points, 'outcome', r.outcome,
                           'next_tier', case r.outcome
                                          when 'promoted' then case r.tier when 'bronze' then 'silver' else 'gold' end
                                          when 'relegated' then case r.tier when 'gold' then 'silver' else 'bronze' end
                                          else r.tier end,
                           'next_month', to_char(v_today, 'YYYY-MM')),
        p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── away30: 10:00, 30 days without opening the app, reached after the start; once ever ──
  if v_at10 then
    for r in
      select x.user_id, x.since from (
        select pr.user_id, core.email_last_opened(pr.user_id) as since from core.profiles pr
         where pr.deleted_at is null
           and not exists (select 1 from core.emails e where e.user_id = pr.user_id and e.kind = 'away30')) x
       where x.since <= p_now - interval '30 days' and x.since + interval '30 days' >= s.start_at
    loop
      continue when not core.email_game_ok(r.user_id, p_now) or core.email_results_push_today(r.user_id, p_now);
      v_areas := core.email_areas(r.user_id);
      perform core.email_queue(r.user_id, 'away30', 'away30:' || r.user_id,
        jsonb_build_object(
          'days', floor(extract(epoch from p_now - r.since) / 86400)::int,
          'near', cardinality(v_areas) > 0,
          'tournaments', (select count(*)::int from core.tournaments t
                           where t.active and not t.is_minor_event
                             and t.starts_on between core.athens_day(r.since) and v_today
                             and (cardinality(v_areas) = 0
                                  or t.area_id in (select a.id from core.areas a
                                                    where a.region in (select region from core.areas where id = any (v_areas))))),
          'matches', (select count(*)::int from core.matches m join core.match_results res on res.match_id = m.id
                       where m.approved and m.status <> 'void' and m.starts_at between r.since and p_now)),
        p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  return v_n;
end;
$$;
revoke all on function core.email_series_sweep(timestamptz) from public, anon, authenticated;

-- hourly, a few minutes past: 09:00 and 10:00 Athens fall on different UTC hours in summer and winter
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-email-series', '5 * * * *', $c$select core.email_series_sweep()$c$);
  end if;
end;
$$;

-- ── the sender's side: the weekly cap, as the hard limit ──────────────────────────────────────────────────────────

-- core.email_gate as in 20270424000000_email_pro, plus the cap for every game kind before the per-kind checks.
-- api.admin_emails_due is not redefined: it already asks the gate for each row that passed the general rules.
create or replace function core.email_gate(p_kind text, p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_last  core.purchases;
  v_trial core.entitlements;
  v_prod  text;
begin
  if coalesce(p_payload ->> 'test', 'false') = 'true' then return null; end if;

  -- the weekly cap (20270426000000_email_series): a game email waits out the week when the person already had 2
  -- game emails sent in the last 7 days (account emails never count; «Send me a test» rows neither count nor wait)
  if (select grp from core.email_kinds where kind = p_kind) = 'game'
     and (select count(*) from core.emails e join core.email_kinds k on k.kind = e.kind
           where e.user_id = p_user and k.grp = 'game' and e.status in ('sent', 'sending')
             and e.dedupe_key not like 'test:%'
             and coalesce(e.sent_at, e.created_at) > now() - interval '7 days') >= 2 then
    return jsonb_build_object('skip', 'cap');
  end if;

  if p_kind = 'pro_welcome' then
    -- refunded or ended before it went out
    if not core.is_pro(p_user) then return jsonb_build_object('skip', 'not_pro'); end if;

  elsif p_kind = 'pro_trial_day5' then
    select * into v_trial from core.entitlements
     where user_id = p_user and key = 'pro' and source = 'trial' and status = 'active' and ends_at > now()
     order by ends_at desc limit 1;
    if v_trial.user_id is null then return jsonb_build_object('skip', 'not_on_trial'); end if;
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type = 'CANCELLATION' then return jsonb_build_object('skip', 'cancelled'); end if;
    -- the plan as it is now: a change inside the week names the new one
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'PRODUCT_CHANGE']);
    v_prod := coalesce(core.store_product_id(nullif(coalesce(v_last.raw -> 'event', v_last.raw) ->> 'new_product_id', '')),
                       v_last.product_id);
    return jsonb_build_object('payload',
      coalesce(core.email_plan(v_prod), '{}'::jsonb) || jsonb_build_object('ends_at', v_trial.ends_at));

  elsif p_kind = 'pro_cancel' then
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type in ('UNCANCELLATION', 'RENEWAL', 'INITIAL_PURCHASE') then
      return jsonb_build_object('skip', 'uncancelled');
    end if;
    -- ended already (a refund after the cancellation, or the date passed): the date in the email would be wrong
    if not core.is_pro(p_user) or (p_payload ->> 'ends_at')::timestamptz <= now() then
      return jsonb_build_object('skip', 'ended');
    end if;

  elsif p_kind = 'pro_winback' then
    if core.is_pro(p_user) then return jsonb_build_object('skip', 'pro_again'); end if;
  end if;
  return null;
end;
$$;
revoke all on function core.email_gate(text, uuid, jsonb) from public, anon, authenticated;

