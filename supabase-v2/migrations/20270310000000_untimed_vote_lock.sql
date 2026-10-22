-- Matches with no start time take votes until the afternoon of their day (founder, 22 Oct 2026).
--
-- The sheet import stores a row with no time at 00:00 Athens on its day (core.ingest_apply: date + coalesce(time,
-- '00:00')). Voting closed at starts_at, so those matches closed at midnight and nobody could vote on them on the day
-- they were played. No real match starts at midnight (the latest start is 22:30), so 00:00 Athens means «the day is
-- known, the time is not» (the app reads it the same way, hasTime() in apps/app/src/lib/tournaments.ts).
--
-- One notion of the lock instant, mirrored in packages/core (lockInstant / voteLockInstant, vectors in votes.json):
--   lock_at = matches.locked_at when staff set an early lock,
--             else, when the start is 00:00 Athens, that Athens day at the tournament's untimed_lock_time (default
--             14:00, DST-correct: the wall clock time on that day, not starts_at + 14 hours),
--             else starts_at.
--   * core.tournaments.untimed_lock_time: the per-tournament setting, edited on the admin Tournaments page;
--   * core.lock_instant(starts_at, locked_at, untimed time): the pure rule (immutable, no table access);
--   * core.match_lock_at(m): the rule for one match row, with its tournament's setting (14:00 outside a tournament);
--   * core.match_is_open and core.match_vote_closed pass core.match_lock_at(m) to core.vote_gate as the lock. Every
--     reader of «open for votes» goes through these two (api.cast_vote, get_feed, get_tournament, get_ladder,
--     get_me_page, the quiz pool), so all of them follow. match_is_open still refuses a match with a result, so a
--     result that comes in before 14:00 closes the voting at once. The closed card's eight hours on Σήμερα count
--     from the lock, so an untimed match stays on its day after 14:00 like any started match;
--   * get_feed: match cards carry lock_at. Body otherwise as in 20270222000000_results_day_end.sql;
--   * admin_tournaments returns untimed_lock_time ('HH:MM'); admin_save_tournament takes it (absent or empty:
--     unchanged, the default on a new tournament). Bodies otherwise as in 20270212000000_logos.sql and
--     20270201000000_next_tournament.sql.
-- A computed lock rather than a stored column: the lock follows from starts_at, locked_at and the tournament's
-- setting, all of which change (imports move matches, staff edit the setting), so a stored copy would need triggers
-- on three tables to stay right. The lookup is one primary key read per match.

alter table core.tournaments add column untimed_lock_time time not null default '14:00';
comment on column core.tournaments.untimed_lock_time is
  'Athens wall clock time at which voting closes on a match of this tournament with no start time (stored at 00:00 Athens), on the match''s day.';

comment on column core.matches.locked_at is
  'Staff early lock: voting closes at this instant when set, else at core.match_lock_at (starts_at, or for a 00:00 Athens start that day at the tournament''s untimed_lock_time). A vote at exactly the lock instant is rejected (packages/core lockInstant).';

-- the rule, pure: the twin of packages/core voteLockInstant
create or replace function core.lock_instant(p_starts_at timestamptz, p_locked_at timestamptz,
                                             p_untimed time default '14:00')
returns timestamptz language sql immutable parallel safe set search_path = ''
as $$
  select coalesce(p_locked_at,
                  case when (p_starts_at at time zone 'Europe/Athens')::time = time '00:00'
                       then ((p_starts_at at time zone 'Europe/Athens')::date + coalesce(p_untimed, time '14:00'))
                              at time zone 'Europe/Athens'
                       else p_starts_at end)
$$;

-- one match: its tournament's setting, 14:00 outside a tournament
create or replace function core.match_lock_at(m core.matches)
returns timestamptz language sql stable set search_path = core, pg_temp
as $$
  select core.lock_instant(m.starts_at, m.locked_at,
                           coalesce((select t.untimed_lock_time from core.tournaments t where t.id = m.tournament_id),
                                    time '14:00'))
$$;

revoke all on function core.lock_instant(timestamptz, timestamptz, time) from public, anon, authenticated;
revoke all on function core.match_lock_at(core.matches) from public, anon, authenticated;

-- from 20261215000000_m4_postponed.sql, with the lock from core.match_lock_at
create or replace function core.match_is_open(m core.matches)
returns boolean language sql stable set search_path = core, pg_temp
as $$
  select m.postponed_at is null
     and core.vote_gate(m.status, m.starts_at, core.match_lock_at(m), 1, now()) = 'ok'
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
$$;

-- from 20270127000000_feed_closed.sql, with the lock from core.match_lock_at (also for the eight hours)
create or replace function core.match_vote_closed(m core.matches)
returns boolean language sql stable set search_path = core, pg_temp
as $$
  select m.postponed_at is null
     and m.status in ('announced', 'scheduled')
     and core.vote_gate(m.status, m.starts_at, core.match_lock_at(m), 1, now()) = 'locked'
     and core.match_lock_at(m) > now() - interval '8 hours'
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
$$;

-- from 20270222000000_results_day_end.sql, with lock_at on match cards
create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_areas   text[];
  v_claimed uuid;
  v_level   numeric;
  v_limit   int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_content jsonb;
  v_ads     jsonb;
  v_ad_n    int;
  v_out     jsonb;
  v_offset  int := extract(doy from core.athens_day())::int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, area_id, claimed_player_id, array_remove(array[area_id] || area_ids, null)
    into v_sport, v_area, v_claimed, v_areas
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select ps.level_value into v_level from core.player_sports ps where ps.player_id = v_claimed and ps.sport_id = v_sport;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
               -- not the ones results_day_end closes (their close day is over), even before it runs
               and core.feed_day(now()) <= core.result_close_day(created_at)
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    with w as (select * from core.feed_weights()),
    -- where your claimed player plays
    mine as (
      select distinct m2.tournament_id, m2.club_id
        from core.match_participants mp2
        join core.matches m2 on m2.id = mp2.match_id
       where mp2.player_id = v_claimed and m2.status <> 'void'),
    -- your latest votes: what you choose to call
    hist as (
      select m3.id, m3.tournament_id, m3.club_id, e3.name as event
        from core.votes v3
        join core.matches m3 on m3.id = v3.subject_id
        left join core.tournament_events e3 on e3.id = m3.event_id
       where v3.user_id = v_uid and v3.subject_type = 'match'
       order by v3.created_at desc
       limit (select aff_history from w)),
    hist_players as (
      select mp4.player_id, count(*)::int as n
        from hist h join core.match_participants mp4 on mp4.match_id = h.id
       group by mp4.player_id),
    q as (
      select q0.*, row_number() over (partition by q0.today order by q0.closed, q0.voted, q0.not_circle, q0.score desc, q0.starts_at nulls last, q0.id) as rn
        from (
        select m.id, m.starts_at,
               -- the feed's day (from 23:00 Athens it is already tomorrow, as on the app's Σήμερα)
               coalesce((m.starts_at at time zone 'Europe/Athens')::date
                          <= ((now() + interval '1 hour') at time zone 'Europe/Athens')::date, false) as today, (mv.id is not null) as voted, not c.in_circle as not_circle,
               not g.is_open as closed,
               s.total, s.s1, s.s2,
               (  w.area * coalesce(coalesce(m.area_id, cl.area_id, t.area_id) = any (v_areas), false)::int
                + w.level * coalesce(greatest(0, 1 - abs(p.lvl - v_level) / w.level_span), 0)
                + w.my_tournament * (m.tournament_id is not null
                                     and exists (select 1 from mine where mine.tournament_id = m.tournament_id))::int
                + w.my_club * (m.club_id is not null
                               and exists (select 1 from mine where mine.club_id = m.club_id))::int
                + w.hot_volume * least(s.total, w.hot_votes)::numeric / w.hot_votes
                + case when s.total >= w.close_min_votes
                       then w.hot_close * greatest(0, 1 - abs(s.s1 - s.s2)::numeric / s.total / 0.4) else 0 end
                + w.rematch * p.rematch::int
                + w.upset * coalesce(abs(p.lvl1 - p.lvl2) >= w.upset_gap, false)::int
                + w.aff_tournament * least((select count(*) from hist h where h.tournament_id = m.tournament_id), w.aff_cap)
                + w.aff_player * least(p.aff_players, w.aff_cap)
                + w.aff_club * least((select count(*) from hist h where h.club_id = m.club_id), w.aff_cap)
                + w.aff_event * least((select count(*) from hist h where h.event = e.name), w.aff_cap)
                + w.soon * coalesce(greatest(0, least(1, 1 - extract(epoch from (m.starts_at - now())) / 3600 / w.soon_hours)), 0)
               ) as score,
               -- sides and split are added once the cards are picked
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 -- when voting closes (core.match_lock_at): the start, or for a start with no time that day's lock time
                 'lock_at', g.lock_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 -- started, no result yet: the card stays, without votes
                 'closed', not g.is_open,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'club_logo', cl.logo_path, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
          -- the two gates, once per match (offset 0 keeps the planner from copying the calls into every use)
          cross join lateral (select core.match_is_open(m) as is_open, core.match_vote_closed(m) as vote_closed,
                                    core.match_lock_at(m) as lock_at offset 0) g
          cross join w
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.clubs cl on cl.id = m.club_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
          -- the crowd so far
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as s1,
                   count(*) filter (where vv.option = 2)::int as s2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id) s
          -- the players: hidden levels per side, how often you voted on them, whether these sides met before
          cross join lateral (
            select avg(ps.level_value) as lvl,
                   avg(ps.level_value) filter (where mp.side = 1) as lvl1,
                   avg(ps.level_value) filter (where mp.side = 2) as lvl2,
                   coalesce(sum(hp.n), 0)::int as aff_players,
                   exists (select 1
                             from core.match_participants a1
                             join core.match_participants a2 on a2.match_id = m.id and a2.side = 2
                             join core.match_participants o1 on o1.player_id = a1.player_id and o1.match_id <> m.id
                             join core.match_participants o2 on o2.match_id = o1.match_id and o2.player_id = a2.player_id
                                                             and o2.side <> o1.side
                             join core.matches pm on pm.id = o1.match_id and pm.status <> 'void'
                            where a1.match_id = m.id and a1.side = 1) as rematch
              from core.match_participants mp
              left join core.player_sports ps on ps.player_id = mp.player_id and ps.sport_id = m.sport_id
              left join hist_players hp on hp.player_id = mp.player_id
             where mp.match_id = m.id) p
         where m.sport_id = v_sport and m.approved
           -- what both gates ask anyway, written so matches_open_idx can narrow the scan
           and m.status in ('announced', 'scheduled') and m.postponed_at is null
           and not exists (select 1 from core.match_results r where r.match_id = m.id)
           and (g.is_open or g.vote_closed)
           -- never a match of a minors' event
           and not coalesce(t.is_minor_event, false)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           -- core.is_blocked, inline
           and not exists (select 1 from core.blocks b where b.user_id = v_uid and b.blocked_user_id = m.logged_by)
        ) q0),
    -- every match of the day comes, whoever plays (founder, 19 Oct: «Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που
    -- ίσως δεν ξέρεις»); the limit only trims the later days, most relevant first, as many as p_limit
    picked as (select * from q where q.today or q.rn <= v_limit),
    sd as (select * from core.match_sides_for(array(select id from picked)))
    select jsonb_agg(
             q.card || jsonb_build_object(
               'sides', coalesce(sd.sides, '[]'::jsonb),
               -- as core.vote_split, from the same counts
               'split', case when q.voted or q.closed then jsonb_build_object(
                          'total', q.total, 'side1', q.s1, 'side2', q.s2,
                          'pct1', case when q.total = 0 then 0 else round(100.0 * q.s1 / q.total)::int end,
                          'pct2', case when q.total = 0 then 0 else 100 - round(100.0 * q.s1 / q.total)::int end) end)
             order by q.closed, q.voted, q.not_circle, q.score desc, q.starts_at nulls last, q.id)
      from picked q
      left join sd on sd.match_id = q.id), '[]'::jsonb);

  v_content := v_content || coalesce((
    with pp as (
      select m.id, m.format, m.starts_at, t.id as t_id, t.name as t_name, t.logo_path as t_logo, mv.option
        from core.matches m
        left join core.tournaments t on t.id = m.tournament_id
        left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
       where m.sport_id = v_sport and m.postponed_at is not null and m.postponed_at > now() - interval '2 days'
         and m.status in ('announced', 'scheduled')
         and not coalesce(t.is_minor_event, false)
         and (mv.id is not null or exists (select 1 from core.match_participants mp
                                            join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                                           where mp.match_id = m.id))
         and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                          where mp.match_id = m.id and (p.hidden or p.is_minor))),
    sd as (select * from core.match_sides_for(array(select id from pp)))
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', pp.id, 'format', pp.format, 'starts_at', pp.starts_at,
             'tournament', case when pp.t_id is not null then jsonb_build_object('id', pp.t_id, 'name', pp.t_name, 'logo', pp.t_logo) end,
             'sides', coalesce(sd.sides, '[]'::jsonb), 'my_vote', pp.option) order by pp.starts_at)
      from pp left join sd on sd.match_id = pp.id), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', 'Χορηγούμενο',
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url,
                                               'image_url', s.image_url, 'art', s.art) order by s.weight desc, s.id), '[]'::jsonb)
    into v_ads
    from core.sponsored_cards s
   where s.status = 'active' and s.placement = 'feed'
     and (s.starts_at is null or s.starts_at <= now()) and (s.ends_at is null or s.ends_at > now())
     and (cardinality(s.area_ids) = 0 or v_area = any (s.area_ids));
  v_ad_n := jsonb_array_length(v_ads);

  -- a sponsored card after every 4th item, rotating by the day of the year
  v_out := coalesce((
    select jsonb_agg(x.el order by x.i, x.ad)
      from (
        select e.el, e.i, 0 as ad from jsonb_array_elements(v_content) with ordinality e(el, i)
        union all
        select v_ads -> ((((e.i / 4) - 1 + v_offset) % v_ad_n)::int), e.i, 1
          from jsonb_array_elements(v_content) with ordinality e(el, i)
         where v_ad_n > 0 and e.i % 4 = 0
      ) x), '[]'::jsonb);

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out),
    -- celebrations wait for the result cards, then play one by one (prototype celOn)
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                                               order by i.created_at)
                                from core.feed_inbox i
                               where i.user_id = v_uid and i.kind = 'celebration' and i.seen_at is null), '[]'::jsonb));
end;
$$;


-- from 20270212000000_logos.sql, with untimed_lock_time
create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'logo_path', t.logo_path, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active,
             'entry_deadline', t.entry_deadline, 'entry_link', t.entry_link,
             'untimed_lock_time', to_char(t.untimed_lock_time, 'HH24:MI'),
             'source_kind', t.source_kind, 'source_url', t.source_url, 'draw_url', t.draw_url, 'ongoing', t.ongoing,
             'season_start_year', t.season_start_year, 'last_run_at', t.last_run_at,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id),
             'open_reviews', (select count(*) from core.ingest_reviews r where r.tournament_id = t.id and r.status = 'open'),
             'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
             'last_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'schedule' order by r.started_at desc limit 1),
             'last_draw_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'draws' order by r.started_at desc limit 1))
           order by t.ongoing desc, t.active desc, t.starts_on desc nulls last, t.name)
      from core.tournaments t), '[]'::jsonb);
end;
$$;


-- from 20270201000000_next_tournament.sql, with untimed_lock_time
create or replace function api.admin_save_tournament(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_lock time;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  if coalesce((p ->> 'ongoing')::boolean, false) and coalesce(btrim(p ->> 'source_url'), '') = '' and coalesce(btrim(p ->> 'draw_url'), '') = '' then
    raise exception 'source_required' using errcode = '22023';
  end if;
  if coalesce(btrim(p ->> 'entry_link'), '') <> '' and btrim(p ->> 'entry_link') !~* '^https?://' then
    raise exception 'entry_link_invalid' using errcode = '22023';
  end if;
  if p ? 'untimed_lock_time' and coalesce(btrim(p ->> 'untimed_lock_time'), '') <> '' then
    begin
      v_lock := btrim(p ->> 'untimed_lock_time')::time;
    exception when others then
      raise exception 'untimed_lock_time_invalid' using errcode = '22023';
    end;
  end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source,
                                  source_kind, source_url, draw_url, ongoing, season_start_year, entry_deadline, entry_link)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import',
            nullif(p ->> 'source_kind', ''), nullif(btrim(p ->> 'source_url'), ''), nullif(btrim(p ->> 'draw_url'), ''),
            coalesce((p ->> 'ongoing')::boolean, false), nullif(p ->> 'season_start_year', '')::int,
            nullif(p ->> 'entry_deadline', '')::date, nullif(btrim(p ->> 'entry_link'), ''))
    returning id into v_id;
    if v_lock is not null then update core.tournaments set untimed_lock_time = v_lock where id = v_id; end if;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date,
           source_kind = case when p ? 'source_kind' then nullif(p ->> 'source_kind', '') else source_kind end,
           source_url = case when p ? 'source_url' then nullif(btrim(p ->> 'source_url'), '') else source_url end,
           draw_url = case when p ? 'draw_url' then nullif(btrim(p ->> 'draw_url'), '') else draw_url end,
           ongoing = case when p ? 'ongoing' then (p ->> 'ongoing')::boolean else ongoing end,
           season_start_year = case when p ? 'season_start_year' then nullif(p ->> 'season_start_year', '')::int else season_start_year end,
           entry_deadline = case when p ? 'entry_deadline' then nullif(p ->> 'entry_deadline', '')::date else entry_deadline end,
           entry_link = case when p ? 'entry_link' then nullif(btrim(p ->> 'entry_link'), '') else entry_link end,
           untimed_lock_time = coalesce(v_lock, untimed_lock_time)
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

