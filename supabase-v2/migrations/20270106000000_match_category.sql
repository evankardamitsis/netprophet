-- The category on the players' matches (founder, 15 Oct 2026: "we need to show the category on the players
-- matches"): the organiser's event («Μ 40+») and the discipline (MS, WS, MD, WD, XD) on the feed's match cards,
-- the results and a player's last and next matches, as the tournament page already has them
-- (core.tournament_match_json). Each function is the latest definition with only those two keys added.

create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_claimed uuid;
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
  select primary_sport, area_id, claimed_player_id into v_sport, v_area, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(q.card order by q.voted, q.not_circle, q.starts_at nulls last, q.id)
      from (
        select m.id, m.starts_at, (mv.id is not null) as voted, not c.in_circle as not_circle,
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end,
                 'sides', core.match_sides_json(m.id),
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 'split', case when mv.id is not null then core.vote_split(m.id) end,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.clubs cl on cl.id = m.club_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
         where m.sport_id = v_sport and m.approved and core.match_is_open(m)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           and not core.is_blocked(v_uid, m.logged_by)
         order by (mv.id is not null), c.in_circle desc, m.starts_at nulls last, m.id
         limit v_limit) q), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
             'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end,
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

create or replace function api.get_results(p_days int default 14, p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_days  int := least(greatest(coalesce(p_days, 14), 1), 90);
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.name as tournament, e.name as level, m.provenance ->> 'discipline' as discipline,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover,
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
         where m.approved
           and m.status <> 'void'
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

create or replace function api.get_player(p_player_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sport text;
  v_year  int := extract(year from core.athens_day())::int;
  v_out   jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid;
  v_sport := coalesce(v_sport, 'tennis');

  v_out := core.player_card_json(p_player_id, v_uid, v_sport);

  return v_out || jsonb_build_object(
    'is_me', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id = v_uid),
    -- «Φέτος»: wins and losses in the current Athens year
    'record_year', (
      select jsonb_build_object('w', count(*) filter (where mp.side = r.winner_side),
                                'l', count(*) filter (where mp.side <> r.winner_side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
         and extract(year from core.athens_day(m.starts_at)) = v_year),
    -- «Τελευταία ματς»: newest first
    'last_matches', coalesce((
      select jsonb_agg(x.j order by x.starts_at desc)
        from (
          select m.starts_at, jsonb_build_object(
                   'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
                   'won', mp.side = r.winner_side, 'score', r.score_summary,
                   'level', (select e.name from core.tournament_events e where e.id = m.event_id),
                   'discipline', m.provenance ->> 'discipline',
                   'retired', r.retired, 'walkover', r.walkover,
                   'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                 from core.match_participants o
                                where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
                   'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                   from core.match_participants o
                                  where o.match_id = m.id and o.side <> mp.side)) as j
            from core.match_participants mp
            join core.matches m on m.id = mp.match_id
            join core.match_results r on r.match_id = m.id
           where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
           order by m.starts_at desc
           limit 5
        ) x), '[]'::jsonb),
    -- «Επόμενο ματς»: the nearest one still to play
    'next_match', (
      select jsonb_build_object(
               'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
               'level', (select e.name from core.tournament_events e where e.id = m.event_id),
               'discipline', m.provenance ->> 'discipline',
               'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                             from core.match_participants o
                            where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
               'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                               from core.match_participants o
                              where o.match_id = m.id and o.side <> mp.side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
       where mp.player_id = p_player_id and m.approved and m.status in ('announced', 'scheduled')
         and m.starts_at > now()
       order by m.starts_at
       limit 1));
end;
$$;
