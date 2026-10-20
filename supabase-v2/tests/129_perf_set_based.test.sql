-- Set-based get_feed, get_results and get_tournament (20270220000000_perf_set_based.sql): the replies are the same
-- as before, byte for byte, for singles and doubles, avatars, hidden players and minors, closed, locked, postponed
-- and blocked matches, sponsored cards and tournament days. The previous bodies are kept here as tests.old_* for
-- the comparison. Then the two privacy fixes: no minors' event in the feed, no minor's or hidden player's draw name
-- from get_tournament.
begin;
select plan(36);

-- ---------------------------------------------------------------------------
-- the previous definitions, verbatim (20270218000000_feed_whole_day.sql, 20270212000000_logos.sql)
-- ---------------------------------------------------------------------------
create function tests.old_get_feed(p_limit int default 20)
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
  v_out     jsonb := '[]'::jsonb;
  v_el      jsonb;
  v_i       int := 0;
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
       group by mp4.player_id)
    select jsonb_agg(q.card order by q.closed, q.voted, q.not_circle, q.score desc, q.starts_at nulls last, q.id)
      from (
      select q0.*, row_number() over (partition by q0.today order by q0.closed, q0.voted, q0.not_circle, q0.score desc, q0.starts_at nulls last, q0.id) as rn
        from (
        select m.id, m.starts_at,
               -- the feed's day (from 23:00 Athens it is already tomorrow, as on the app's Σήμερα)
               coalesce((m.starts_at at time zone 'Europe/Athens')::date
                          <= ((now() + interval '1 hour') at time zone 'Europe/Athens')::date, false) as today, (mv.id is not null) as voted, not c.in_circle as not_circle,
               not core.match_is_open(m) as closed,
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
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
                 'sides', core.match_sides_json(m.id),
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 -- started, no result yet: the card stays, without votes
                 'closed', not core.match_is_open(m),
                 'split', case when mv.id is not null or not core.match_is_open(m) then core.vote_split(m.id) end,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'club_logo', cl.logo_path, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
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
         where m.sport_id = v_sport and m.approved and (core.match_is_open(m) or core.match_vote_closed(m))
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           and not core.is_blocked(v_uid, m.logged_by)
        ) q0) q
     -- every match of the day comes, whoever plays (founder, 19 Oct: «Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που
     -- ίσως δεν ξέρεις»); the limit only trims the later days, most relevant first, as many as p_limit
     where q.today or q.rn <= v_limit), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
             'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
             'sides', core.match_sides_json(m.id), 'my_vote', mv.option) order by m.starts_at)
      from core.matches m
      left join core.tournaments t on t.id = m.tournament_id
      left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
     where m.sport_id = v_sport and m.postponed_at is not null and m.postponed_at > now() - interval '2 days'
       and m.status in ('announced', 'scheduled')
       and (mv.id is not null or exists (select 1 from core.match_participants mp
                                          join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                                         where mp.match_id = m.id))
       and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                        where mp.match_id = m.id and (p.hidden or p.is_minor))), '[]'::jsonb);

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

  for v_el in select * from jsonb_array_elements(v_content) loop
    v_out := v_out || jsonb_build_array(v_el);
    v_i := v_i + 1;
    if v_ad_n > 0 and v_i % 4 = 0 then
      v_out := v_out || jsonb_build_array(v_ads -> (((v_i / 4) - 1 + v_offset) % v_ad_n));
    end if;
  end loop;

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out),
    -- celebrations wait for the result cards, then play one by one (prototype celOn)
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                                               order by i.created_at)
                                from core.feed_inbox i
                               where i.user_id = v_uid and i.kind = 'celebration' and i.seen_at is null), '[]'::jsonb));
end;
$$;

create function tests.old_get_results(p_days int default 14, p_limit int default 60,
                                               p_tournament uuid default null, p_query text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_q     text := nullif(core.normalize_search(btrim(coalesce(p_query, ''))), '');
  -- a tournament or a name looks further back: the whole tournament, a player's whole season so far
  v_days  int := case when p_tournament is not null or v_q is not null then 365
                      else least(greatest(coalesce(p_days, 14), 1), 90) end;
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.id as tournament_id, t.name as tournament, t.logo_path as tournament_logo, e.name as level, m.provenance ->> 'discipline' as discipline,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover, m.review,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where ((m.approved and m.review is distinct from 'pending') or (m.review = 'pending' and r.entered_by = v_uid))
           and m.status <> 'void'
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and (p_tournament is null or m.tournament_id = p_tournament)
           and (v_q is null or exists (
                 select 1 from core.match_participants mq join core.players pq on pq.id = mq.player_id
                  where mq.match_id = m.id and not pq.hidden
                    and (position(v_q in core.normalize_search(coalesce(pq.first_name, '') || ' ' || coalesce(pq.surname, ''))) > 0
                         or position(v_q in core.normalize_search(coalesce(pq.surname, '') || ' ' || coalesce(pq.first_name, ''))) > 0)))
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

create function tests.old_get_tournament(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_t   core.tournaments;
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_t from core.tournaments where id = p_id and not is_minor_event;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'id', v_t.id, 'name', v_t.name, 'logo', v_t.logo_path, 'venue', v_t.venue, 'area_id', v_t.area_id, 'surface', v_t.surface,
    'starts_on', v_t.starts_on, 'ends_on', v_t.ends_on, 'entry_deadline', v_t.entry_deadline,
    'state', core.tournament_state(v_t), 'me', v_me,
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object('tab', d.tab, 'title', d.title, 'discipline', d.discipline, 'level', d.level,
                                          'format', d.format, 'size', d.size, 'updated_at', d.updated_at,
                                          'entrants', d.draw -> 'entrants', 'rounds', d.draw -> 'rounds',
                                          'groups', coalesce(d.draw -> 'groups', '[]'::jsonb))
                       order by array_position(array['MS', 'WS', 'MD', 'WD', 'XD'], d.discipline), d.level, d.tab)
        from core.tournament_draws d where d.tournament_id = v_t.id), '[]'::jsonb),
    -- names in the draws that belong to hidden players or minors: the app masks them
    'masked', coalesce((
      select jsonb_agg(distinct pl ->> 'raw')
        from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
        join core.players p on p.id = (pl ->> 'player_id')::uuid
       where d.tournament_id = v_t.id and (p.hidden or p.is_minor)), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('date', x.day, 'matches', x.ms) order by x.day)
        from (
          select core.athens_day(m.starts_at) as day,
                 jsonb_agg(core.tournament_match_json(m) order by m.starts_at, m.id) as ms
            from core.matches m
           where m.tournament_id = v_t.id and m.status <> 'void' and m.starts_at is not null
             and core.tournament_match_visible(m.id)
           group by 1
        ) x), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- fixture
-- ---------------------------------------------------------------------------
select core.athens_day(now()) as today \gset
select tests.create_user('perf-u@test.local') as u \gset
select tests.create_user('perf-fr@test.local') as fr \gset
select tests.create_user('perf-df@test.local') as df \gset
select tests.create_user('perf-hd@test.local') as hd \gset
select tests.create_user('perf-bk@test.local') as bk \gset

select tests.mk_player('Πέρφ', 'Άλφα') as pa \gset
select tests.mk_player('Πέρφ', 'Βήτα') as pb \gset
select tests.mk_player('Πέρφ', 'Γάμμα') as pc \gset
select tests.mk_player('Πέρφ', 'Δέλτα') as pd \gset
select tests.mk_player('Πέρφ', 'Φίλος') as pf \gset
select tests.mk_player('Πέρφ', 'Ντιφόλτ') as pdef \gset
select tests.mk_player('Πέρφ', 'Κρυφοπροφίλ') as ph \gset
select tests.mk_player('Πέρφ', 'Κρυμμένος') as phid \gset
select tests.mk_player('Πέρφ', 'Μικρός') as pmin \gset
select tests.mk_player('Πέρφ', 'Εγώ') as pme \gset
update core.players set hidden = true where id = :'phid'::uuid;
update core.players set birth_year = extract(year from now())::int - 12, is_minor = true where id = :'pmin'::uuid;
-- claimed players: one with a drawn avatar, one on the default, one behind a hidden profile
update core.players set claimed_by_user_id = :'fr'::uuid where id = :'pf'::uuid;
update core.players set claimed_by_user_id = :'df'::uuid where id = :'pdef'::uuid;
update core.players set claimed_by_user_id = :'hd'::uuid where id = :'ph'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'pme'::uuid;
update core.profiles set avatar = 'm3' where user_id = :'fr'::uuid;
update core.profiles set hidden = true where user_id = :'hd'::uuid;
update core.profiles set claimed_player_id = :'pme'::uuid where user_id = :'u'::uuid;
insert into core.player_sports (player_id, sport_id, level_value, level_tier) values
  (:'pa'::uuid, 'tennis', 3.5, 3.5), (:'pb'::uuid, 'tennis', 4.0, 4.0), (:'pme'::uuid, 'tennis', 3.5, 3.5);
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'pa'::uuid);
insert into core.blocks (user_id, blocked_user_id) values (:'u'::uuid, :'bk'::uuid);

insert into core.tournaments (id, sport_id, name, starts_on, ends_on, surface) values
  ('00000000-0000-0000-0000-0000000020a1', 'tennis', 'Πέρφ Open', :'today'::date - 3, :'today'::date + 5, 'clay');
insert into core.clubs (id, name) values ('00000000-0000-0000-0000-0000000020c1', 'Όμιλος Πέρφ');
insert into core.tournament_events (id, tournament_id, name, format) values
  ('00000000-0000-0000-0000-0000000020e1', '00000000-0000-0000-0000-0000000020a1', 'Β', 'singles');
insert into core.tournament_draws (tournament_id, tab, discipline, level, format, size, draw)
values ('00000000-0000-0000-0000-0000000020a1', 'Μ Β', 'MS', 'Β', 'knockout', 2, jsonb_build_object(
  'entrants', jsonb_build_array(
    jsonb_build_object('pos', 1, 'raw', 'ΑΛΦΑ ΠΕΡΦ', 'seed', 1, 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΛΦΑ ΠΕΡΦ', 'player_id', :'pa'::uuid))),
    jsonb_build_object('pos', 2, 'raw', 'ΒΗΤΑ ΠΕΡΦ', 'seed', null, 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΒΗΤΑ ΠΕΡΦ', 'player_id', :'pb'::uuid)))),
  'rounds', jsonb_build_array(jsonb_build_array(jsonb_build_object('round', 1, 'slot', 1, 'side1', 'ΑΛΦΑ ΠΕΡΦ', 'side2', 'ΒΗΤΑ ΠΕΡΦ')))));

-- singles at the tournament and club, moved two days ago; a doubles today; the crowd on both
select tests.mk_match(:'pa'::uuid, :'pf'::uuid, now() + interval '1 day') as m_open \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000020a1', club_id = '00000000-0000-0000-0000-0000000020c1',
       event_id = '00000000-0000-0000-0000-0000000020e1', round = 'R16', court = '2',
       provenance = jsonb_build_object('discipline', 'MS', 'moved_at', now() - interval '2 days', 'moved_from_at', now() - interval '1 day')
 where id = :'m_open'::uuid;
select tests.mk_match(:'pa'::uuid, :'pc'::uuid, now() + interval '20 minutes') as m_dbl \gset
update core.matches set format = 'doubles' where id = :'m_dbl'::uuid;
insert into core.match_participants (match_id, side, player_id, position) values
  (:'m_dbl'::uuid, 1, :'pb'::uuid, 2), (:'m_dbl'::uuid, 2, :'pdef'::uuid, 2);
-- started two hours ago, no result: closed, still on the feed; I voted on it
select tests.mk_match(:'pb'::uuid, :'pc'::uuid, now() - interval '2 hours') as m_closed \gset
-- locked early by staff; no start time at all; a hidden player; a minor; postponed (I voted); void; blocked
select tests.mk_match(:'pc'::uuid, :'pd'::uuid, now() + interval '1 day') as m_locked \gset
update core.matches set locked_at = now() - interval '1 hour' where id = :'m_locked'::uuid;
select tests.mk_match(:'pd'::uuid, :'ph'::uuid, null) as m_nostart \gset
select tests.mk_match(:'phid'::uuid, :'pa'::uuid, now() + interval '1 day') as m_hidden \gset
select tests.mk_match(:'pmin'::uuid, :'pb'::uuid, now() + interval '1 day') as m_minor \gset
select tests.mk_match(:'pa'::uuid, :'pc'::uuid, now() + interval '1 day') as m_post \gset
update core.matches set postponed_at = now() - interval '1 hour' where id = :'m_post'::uuid;
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() + interval '1 day', 'void') as m_void \gset
select tests.mk_match(:'pc'::uuid, :'pd'::uuid, now() + interval '1 day') as m_blk \gset
update core.matches set logged_by = :'bk'::uuid where id = :'m_blk'::uuid;
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000020a1'
 where id in (:'m_hidden'::uuid, :'m_minor'::uuid, :'m_void'::uuid, :'m_post'::uuid);
-- more open matches, so sponsored cards come in after every 4th item
create temp table more_m as select tests.mk_match_fresh(now() + interval '2 days' + make_interval(mins => g)) as id from generate_series(1, 8) g;
grant select on more_m to public;

insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key) values
  (:'u'::uuid, 'match', :'m_closed'::uuid, 1, now(), core.athens_day()),
  (:'u'::uuid, 'match', :'m_post'::uuid, 2, now(), core.athens_day()),
  (:'fr'::uuid, 'match', :'m_open'::uuid, 1, now(), core.athens_day()),
  (:'df'::uuid, 'match', :'m_open'::uuid, 2, now(), core.athens_day()),
  (:'hd'::uuid, 'match', :'m_open'::uuid, 1, now(), core.athens_day()),
  (:'fr'::uuid, 'match', :'m_closed'::uuid, 2, now(), core.athens_day());

-- results: one finished through the rpc, one walkover, one by the blocked user
select tests.mk_match(:'pa'::uuid, :'pf'::uuid, now() - interval '1 day') as m_done \gset
select tests.mk_match(:'pb'::uuid, :'pd'::uuid, now() - interval '2 days') as m_wo \gset
select tests.mk_match(:'pc'::uuid, :'pdef'::uuid, now() - interval '3 days') as m_bkdone \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000020a1', club_id = '00000000-0000-0000-0000-0000000020c1'
 where id in (:'m_done'::uuid, :'m_wo'::uuid);
update core.matches set logged_by = :'bk'::uuid where id = :'m_bkdone'::uuid;
select tests.finish_match(:'m_done'::uuid, 1) is not null as x \gset
select tests.finish_match(:'m_bkdone'::uuid, 2) is not null as x \gset
insert into core.match_results (match_id, winner_side, walkover) values (:'m_wo'::uuid, 2, true);
update core.matches set status = 'played' where id = :'m_wo'::uuid;

-- tournament days either side of midnight in Athens (21:30 and 20:30 UTC), and a match nobody is in yet
select tests.mk_match(:'pb'::uuid, :'pc'::uuid, ((:'today'::date + 2)::timestamp + interval '21 hours 30 minutes') at time zone 'UTC') as m_late1 \gset
select tests.mk_match(:'pd'::uuid, :'pdef'::uuid, ((:'today'::date + 2)::timestamp + interval '20 hours 30 minutes') at time zone 'UTC') as m_late2 \gset
insert into core.matches (sport_id, format, status, starts_at, source, tournament_id)
values ('tennis', 'singles', 'scheduled', now() + interval '3 days', 'admin', '00000000-0000-0000-0000-0000000020a1') returning id as m_empty \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000020a1' where id in (:'m_late1'::uuid, :'m_late2'::uuid);

-- two unseen result cards and a celebration on top; three sponsored cards, one for another area
insert into core.feed_inbox (user_id, kind, ref, payload, created_at) values
  (:'u'::uuid, 'result', 'perf-r1', '{"n": 1}', now() - interval '2 minutes'),
  (:'u'::uuid, 'result', 'perf-r2', '{"n": 2}', now() - interval '1 minute'),
  (:'u'::uuid, 'celebration', 'perf-c1', '{"c": 1}', now());
insert into core.sponsored_cards (sponsor, title, placement, weight, status, art) values
  ('Πέρφ Χορηγός Α', 'Πρώτη', 'feed', 5, 'active', 'court'),
  ('Πέρφ Χορηγός Β', 'Δεύτερη', 'feed', 3, 'active', 'coffee');
insert into core.sponsored_cards (sponsor, title, placement, weight, status, area_ids) values
  ('Πέρφ Αλλού', 'Αλλού', 'feed', 9, 'active', array['zz-nowhere']);

-- ---------------------------------------------------------------------------
-- the same replies as before
-- ---------------------------------------------------------------------------
select tests.login(:'u'::uuid);
create temp table cmp as
select 'feed20' as k, api.get_feed(20) as new, tests.old_get_feed(20) as old
union all select 'feed2', api.get_feed(2), tests.old_get_feed(2)
union all select 'feed100', api.get_feed(100), tests.old_get_feed(100)
union all select 'results', api.get_results(), tests.old_get_results()
union all select 'results_t', api.get_results(14, 60, '00000000-0000-0000-0000-0000000020a1'), tests.old_get_results(14, 60, '00000000-0000-0000-0000-0000000020a1')
union all select 'results_q', api.get_results(14, 60, null, 'φιλος'), tests.old_get_results(14, 60, null, 'φιλος')
union all select 'results_3', api.get_results(14, 3), tests.old_get_results(14, 3)
union all select 'tournament', api.get_tournament('00000000-0000-0000-0000-0000000020a1'), tests.old_get_tournament('00000000-0000-0000-0000-0000000020a1');
select tests.login(:'fr'::uuid);
insert into cmp select 'feed_fr', api.get_feed(20), tests.old_get_feed(20);
select tests.logout();
update core.sponsored_cards set status = 'paused' where sponsor like 'Πέρφ%';
select tests.login(:'u'::uuid);
insert into cmp select 'feed_no_ads', api.get_feed(20), tests.old_get_feed(20);
select tests.logout();
grant select on cmp to public;

select is((select new::text from cmp where k = 'feed20'), (select old::text from cmp where k = 'feed20'), 'get_feed(20): the same reply');
select is((select new::text from cmp where k = 'feed2'), (select old::text from cmp where k = 'feed2'), 'get_feed(2): the same reply');
select is((select new::text from cmp where k = 'feed100'), (select old::text from cmp where k = 'feed100'), 'get_feed(100): the same reply');
select is((select new::text from cmp where k = 'feed_fr'), (select old::text from cmp where k = 'feed_fr'), 'get_feed for another user: the same reply');
select is((select new::text from cmp where k = 'feed_no_ads'), (select old::text from cmp where k = 'feed_no_ads'), 'get_feed without sponsored cards: the same reply');
select is((select new::text from cmp where k = 'results'), (select old::text from cmp where k = 'results'), 'get_results: the same reply');
select is((select new::text from cmp where k = 'results_t'), (select old::text from cmp where k = 'results_t'), 'get_results for a tournament: the same reply');
select is((select new::text from cmp where k = 'results_q'), (select old::text from cmp where k = 'results_q'), 'get_results for a name: the same reply');
select is((select new::text from cmp where k = 'results_3'), (select old::text from cmp where k = 'results_3'), 'get_results with a small limit: the same reply');
select is((select new::text from cmp where k = 'tournament'), (select old::text from cmp where k = 'tournament'), 'get_tournament: the same reply');
select is((select count(*)::int from core.matches m
            left join core.match_sides_for(array(select id from core.matches)) s on s.match_id = m.id
           where coalesce(s.sides, '[]'::jsonb)::text <> core.match_sides_json(m.id)::text), 0,
          'core.match_sides_for gives every match the sides core.match_sides_json gives');

-- the fixture reaches every case (so the comparisons above are not empty)
create temp table f100 as select c.value as c, c.ordinality as i
  from cmp, jsonb_array_elements(cmp.new -> 'items') with ordinality c where cmp.k = 'feed100';
grant select on f100 to public;
select is((select jsonb_array_length(c -> 'sides' -> 0 -> 'players') + jsonb_array_length(c -> 'sides' -> 1 -> 'players') from f100 where c ->> 'match_id' = :'m_dbl'),
          4, 'a doubles card with both pairs');
select is((select c -> 'sides' -> 1 -> 'players' -> 1 ->> 'avatar' from f100 where c ->> 'match_id' = :'m_dbl'), 'default', 'a claimed player on the default avatar');
select is((select c -> 'sides' -> 1 -> 'players' -> 0 ->> 'avatar' from f100 where c ->> 'match_id' = :'m_open'), 'm3', 'a claimed player with a drawn avatar');
select is((select c -> 'sides' -> 1 -> 'players' -> 0 -> 'avatar' from f100 where c ->> 'match_id' = :'m_nostart'), 'null'::jsonb, 'a hidden profile shows no avatar');
select is((select c -> 'split' ->> 'total' from f100 where c ->> 'match_id' = :'m_closed' and (c ->> 'closed')::boolean), '2', 'a closed card with its split');
select ok(exists (select 1 from f100 where c ->> 'match_id' = :'m_locked' and (c ->> 'closed')::boolean), 'an early lock closes the card');
select ok(exists (select 1 from f100 where c ->> 'kind' = 'postponed' and c ->> 'match_id' = :'m_post'), 'a postponed card');
select ok(not exists (select 1 from f100 where c ->> 'match_id' in (:'m_hidden', :'m_minor', :'m_void', :'m_blk')),
          'no hidden player, minor, void or blocked match');
select is((select array_agg(i order by i)::int[] from f100 where c ->> 'kind' = 'sponsored'),
          (select array_agg(g * 5)::int[] from generate_series(1, (select count(*)::int from f100) / 5) g), 'a sponsored card after every 4th item');
select is((select array_agg(distinct c ->> 'sponsor' order by c ->> 'sponsor') from f100 where c ->> 'kind' = 'sponsored' and c ->> 'sponsor' like 'Πέρφ%'),
          array['Πέρφ Χορηγός Α', 'Πέρφ Χορηγός Β'], 'both sponsored cards in turn, not the other area''s');
select is((select count(distinct d ->> 'date')::int from cmp, jsonb_array_elements(new -> 'days') d, jsonb_array_elements(d -> 'matches') m
            where k = 'tournament' and m ->> 'match_id' in (:'m_late1', :'m_late2')), 2, 'tournament days split at midnight in Athens');
select ok((select bool_or(m -> 'sides' = '[]'::jsonb) from cmp, jsonb_array_elements(new -> 'days') d, jsonb_array_elements(d -> 'matches') m
            where k = 'tournament'), 'a tournament match nobody is in yet has no sides');
select ok((select bool_or((r ->> 'walkover')::boolean) and not bool_or(r ->> 'match_id' = :'m_bkdone')
             from cmp, jsonb_array_elements(new) r where k = 'results'), 'results with a walkover, none from a blocked user');

-- ---------------------------------------------------------------------------
-- privacy: no minors' event in the feed
-- ---------------------------------------------------------------------------
insert into core.tournaments (id, sport_id, name, starts_on, ends_on, is_minor_event) values
  ('00000000-0000-0000-0000-0000000020a2', 'tennis', 'Πέρφ Παίδων', :'today'::date, :'today'::date + 3, true);
select tests.mk_match(:'pa'::uuid, :'pd'::uuid, now() + interval '1 day') as m_kids \gset
select tests.mk_match(:'pa'::uuid, :'pc'::uuid, now() + interval '1 day') as m_kids_post \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000020a2' where id in (:'m_kids'::uuid, :'m_kids_post'::uuid);
update core.matches set postponed_at = now() - interval '1 hour' where id = :'m_kids_post'::uuid;
select tests.login(:'u'::uuid);
select ok(exists (select 1 from jsonb_array_elements(tests.old_get_feed(100) -> 'items') c where c ->> 'match_id' = :'m_kids'),
          'before: a minors'' event match reached the feed');
select ok(not exists (select 1 from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' in (:'m_kids', :'m_kids_post')),
          'now: no match of a minors'' event, open or postponed');
select tests.logout();

-- ---------------------------------------------------------------------------
-- privacy: draw names of minors and hidden players stay on the server
-- ---------------------------------------------------------------------------
insert into core.tournaments (id, sport_id, name, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000020a3', 'tennis', 'Πέρφ Ταμπλό', :'today'::date, :'today'::date + 3);
insert into core.tournament_draws (tournament_id, tab, discipline, level, format, size, draw)
values ('00000000-0000-0000-0000-0000000020a3', 'MD', 'MD', 'Α', 'knockout', 4, jsonb_build_object(
  'entrants', jsonb_build_array(
    jsonb_build_object('pos', 1, 'raw', 'ΑΛΦΑ ΠΕΡΦ', 'seed', 1, 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΛΦΑ ΠΕΡΦ', 'player_id', :'pa'::uuid))),
    jsonb_build_object('pos', 2, 'raw', 'ΜΙΚΡΟΣ ΠΕΡΦ', 'seed', 2, 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΜΙΚΡΟΣ ΠΕΡΦ', 'player_id', :'pmin'::uuid))),
    jsonb_build_object('pos', 3, 'raw', 'Κρυμμένος Πέρφ / ΒΗΤΑ ΠΕΡΦ', 'seed', null, 'bye', false, 'players', jsonb_build_array(
      jsonb_build_object('raw', 'Κρυμμένος Πέρφ', 'player_id', :'phid'::uuid), jsonb_build_object('raw', 'ΒΗΤΑ ΠΕΡΦ', 'player_id', :'pb'::uuid))),
    jsonb_build_object('pos', 4, 'raw', 'BYE', 'seed', null, 'bye', true, 'players', '[]'::jsonb)),
  'rounds', jsonb_build_array(jsonb_build_array(
    jsonb_build_object('round', 1, 'slot', 1, 'side1', 'ΑΛΦΑ ΠΕΡΦ', 'side2', 'μικρός  περφ'),
    jsonb_build_object('round', 1, 'slot', 2, 'side1', 'ΚΡΥΜΜΕΝΟΣ ΠΕΡΦ/ΒΗΤΑ ΠΕΡΦ', 'side2', 'BYE'))),
  'groups', jsonb_build_array(jsonb_build_object('name', 'Όμιλος 1',
    'teams', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΜΙΚΡΟΣ ΠΕΡΦ', 'people', jsonb_build_array(jsonb_build_object('surname', 'ΜΙΚΡΟΣ', 'first', 'ΠΕΡΦ', 'key', 'mikros perf'))),
      jsonb_build_object('pos', 2, 'raw', 'ΑΛΦΑ ΠΕΡΦ', 'people', jsonb_build_array(jsonb_build_object('surname', 'ΑΛΦΑ', 'first', 'ΠΕΡΦ', 'key', 'alfa perf'))))))));
select tests.login(:'u'::uuid);
create temp table tdoc as select api.get_tournament('00000000-0000-0000-0000-0000000020a3') as doc;
select tests.logout();
grant select on tdoc to public;

select ok((select position('ΜΙΚΡΟΣ' in upper(doc::text)) = 0 and position('ΚΡΥΜΜΕΝΟΣ' in upper(doc::text)) = 0
                  and position('MIKROS' in upper(doc::text)) = 0 from tdoc),
          'no minor''s or hidden player''s name leaves get_tournament');
select ok((select position(:'pmin' in doc::text) = 0 and position(:'phid' in doc::text) = 0 from tdoc),
          'nor their player ids');
select is((select doc -> 'masked' from tdoc), '["#1", "#2"]'::jsonb, 'masked lists the placeholders, not the names');
select is((select jsonb_agg(e ->> 'raw' order by (e ->> 'pos')::int) from tdoc, jsonb_array_elements(doc -> 'draws' -> 0 -> 'entrants') e),
          '["ΑΛΦΑ ΠΕΡΦ", "#2", "#1 / ΒΗΤΑ ΠΕΡΦ", "BYE"]'::jsonb, 'every entrant keeps its slot; only the masked names change');
select is((select doc -> 'draws' -> 0 -> 'entrants' -> 1 from tdoc),
          '{"pos": 2, "raw": "#2", "bye": false, "seed": 2, "players": [{"raw": "#2", "player_id": null}]}'::jsonb,
          'a masked entrant keeps its seed, without a name or player id');
select is((select doc -> 'draws' -> 0 -> 'entrants' -> 2 -> 'players' -> 1 ->> 'player_id' from tdoc), :'pb',
          'the partner of a masked player keeps their link');
select is((select doc -> 'draws' -> 0 -> 'rounds' from tdoc),
          '[[{"round": 1, "slot": 1, "side1": "ΑΛΦΑ ΠΕΡΦ", "side2": "#2"}, {"round": 1, "slot": 2, "side1": "#1 / ΒΗΤΑ ΠΕΡΦ", "side2": "BYE"}]]'::jsonb,
          'bracket sides read the placeholders, however the sheet wrote the name');
select is((select doc -> 'draws' -> 0 -> 'groups' -> 0 -> 'teams' from tdoc),
          '[{"pos": 1, "raw": "#2", "people": [{"key": "#2", "first": "", "surname": "#2"}]},
            {"pos": 2, "raw": "ΑΛΦΑ ΠΕΡΦ", "people": [{"key": "alfa perf", "first": "ΠΕΡΦ", "surname": "ΑΛΦΑ"}]}]'::jsonb,
          'group teams and people too');

-- ---------------------------------------------------------------------------
-- who may run them is unchanged
-- ---------------------------------------------------------------------------
select is((select array_agg(p.oid::regprocedure::text || ' ' || p.proacl::text || ' ' || p.prosecdef || ' ' || p.proconfig::text order by p.proname)
             from pg_proc p where p.oid in ('api.get_feed(int)'::regprocedure, 'api.get_results(int, int, uuid, text)'::regprocedure,
                                            'api.get_tournament(uuid)'::regprocedure)),
          array['api.get_feed(integer) {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} true {"search_path=core, extensions, pg_temp"}',
                'api.get_results(integer,integer,uuid,text) {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} true {"search_path=core, extensions, pg_temp"}',
                'api.get_tournament(uuid) {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} true {"search_path=core, pg_temp"}'],
          'the api functions keep their grants, security definer and search_path');
select ok(not has_function_privilege('anon', 'core.match_sides_for(uuid[])', 'execute')
          and has_function_privilege('authenticated', 'core.match_sides_for(uuid[])', 'execute')
          and not has_function_privilege('anon', 'core.draw_mask(jsonb, jsonb)', 'execute'),
          'the new helpers: signed-in users and the service only');

select * from finish();
rollback;
