-- Results one by one (founder, 20 Oct): Σήμερα plays every result as its own card. What the player has not tapped
-- through by the end of the day is marked seen on its own; its points were counted when the result came in, so
-- nothing changes there. The feed's day turns at 23:00 Athens, as on the app's Σήμερα and in get_feed.
--   * core.feed_day(ts): the feed's day of a moment (from 23:00 Athens it is already tomorrow), the same expression
--     get_feed uses for its matches;
--   * core.result_close_day(created_at): the feed day after which a result closes on its own. A result gets 3 hours
--     of grace: one that arrives in the last 3 hours of its feed day (from 20:00 Athens) stays through that night and
--     the next day, and closes at the next 23:00; any other closes at the 23:00 of its own day. One expression, used
--     by both the job and get_feed;
--   * core.results_day_end(): marks seen every unseen result whose close day is over. It is idempotent at any hour,
--     so pg_cron (UTC) runs it at 20:00 and at 21:00 UTC: one of them is 23:00 Athens in summer (UTC+3), the other in
--     winter (UTC+2), and the other run finds nothing left to do;
--   * get_feed hides exactly the results the job would close, so yesterday's queue never shows, even before the job
--     runs. Nothing else in get_feed changes (body as in 20270220000000_perf_set_based.sql).

create or replace function core.feed_day(ts timestamptz default now())
returns date language sql immutable parallel safe set search_path = ''
as $$ select ((ts + interval '1 hour') at time zone 'Europe/Athens')::date $$;

create or replace function core.result_close_day(created_at timestamptz)
returns date language sql immutable parallel safe set search_path = ''
as $$ select core.feed_day(created_at + interval '3 hours') $$;

-- p_now only for tests; the cron calls it without
create or replace function core.results_day_end(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  update core.feed_inbox
     set seen_at = now()
   where kind = 'result' and seen_at is null
     and core.feed_day(p_now) > core.result_close_day(created_at);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.results_day_end(timestamptz) from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-results-day-end-summer', '0 20 * * *', $c$select core.results_day_end()$c$);
    perform cron.schedule('np-results-day-end-winter', '0 21 * * *', $c$select core.results_day_end()$c$);
  end if;
end;
$$;

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
          cross join lateral (select core.match_is_open(m) as is_open, core.match_vote_closed(m) as vote_closed offset 0) g
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
