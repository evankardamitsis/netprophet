-- A walkover was not played, so it is neither a win nor a loss (founder, 7 Nov 2026). The yearly record, the form, the
-- head to head, the common opponents and the matches on «Εγώ» leave it out; the match lists still show it, marked.
-- core.match_stats_part, core.season_results, core.my_result_payload and api.get_win_loss already did.

CREATE OR REPLACE FUNCTION core.player_form(p_player uuid, p_sport text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'core', 'pg_temp'
AS $function$
  select coalesce(jsonb_agg(x.res order by x.starts_at), '[]'::jsonb)
    from (
      select case when mp.side = r.winner_side then 'W' else 'L' end as res, m.starts_at
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player and m.sport_id = p_sport and m.approved and m.review is distinct from 'pending' and m.status <> 'void' and not r.walkover
       order by m.starts_at desc
       limit 5
    ) x
$function$;

CREATE OR REPLACE FUNCTION api.get_player(p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'core', 'extensions', 'pg_temp'
AS $function$
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
    -- an account holds this player (never which one)
    'claimed', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id is not null),
    'record_year', (
      select jsonb_build_object('w', count(*) filter (where r.won), 'l', count(*) filter (where not r.won))
        from core.player_results(p_player_id, v_sport) r
       where not r.walkover and extract(year from core.athens_day(r.starts_at)) = v_year),
    'last_matches', coalesce((
      select jsonb_agg(x.j order by x.starts_at desc)
        from (
          select r.starts_at, jsonb_build_object(
                   'match_id', r.match_id, 'starts_at', r.starts_at, 'format', r.format,
                   'won', r.won, 'score', r.score_summary, 'sets', coalesce(r.sets, '[]'::jsonb),
                   'tournament', (select t.name from core.tournaments t where t.id = m.tournament_id),
                   'round', nullif(btrim(coalesce(m.round, '')), ''),
                   'level', (select e.name from core.tournament_events e where e.id = m.event_id),
                   'discipline', m.provenance ->> 'discipline',
                   'retired', r.retired, 'walkover', r.walkover,
                   'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                 from core.match_participants o
                                where o.match_id = r.match_id and o.side = r.side and o.player_id <> p_player_id),
                   'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                   from core.match_participants o
                                  where o.match_id = r.match_id and o.side <> r.side)) as j
            from core.player_results(p_player_id, v_sport) r
            join core.matches m on m.id = r.match_id
           order by r.starts_at desc nulls last
           limit 5
        ) x), '[]'::jsonb),
    'next_match', (
      select jsonb_build_object(
               'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
               'tournament', (select t.name from core.tournaments t where t.id = m.tournament_id),
               'round', nullif(btrim(coalesce(m.round, '')), ''),
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
       where mp.player_id = p_player_id and m.approved and m.review is distinct from 'pending'
         and m.status in ('announced', 'scheduled')
         and m.starts_at > now()
       order by m.starts_at
       limit 1));
end;
$function$;

CREATE OR REPLACE FUNCTION api.get_me_page()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'core', 'extensions', 'pg_temp'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_claimed uuid;
  v_rules   jsonb;
  v_year    int := extract(year from core.athens_day())::int;
  v_waiting int;
  v_pending int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, claimed_player_id into v_sport, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_rules := core.sport_rules(v_sport);
  select waiting, points into v_waiting, v_pending from core.pending_vote_points(v_uid, v_rules);

  return jsonb_build_object(
    'record_year', case when v_claimed is not null then (
      select jsonb_build_object(
               'singles', jsonb_build_object(
                 'w', count(*) filter (where m.format = 'singles' and mp.side = r.winner_side),
                 'l', count(*) filter (where m.format = 'singles' and mp.side <> r.winner_side)),
               'doubles', jsonb_build_object(
                 'w', count(*) filter (where m.format <> 'singles' and mp.side = r.winner_side),
                 'l', count(*) filter (where m.format <> 'singles' and mp.side <> r.winner_side)))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = v_claimed and m.sport_id = v_sport and m.approved and m.status <> 'void' and not r.walkover
         and extract(year from core.athens_day(m.starts_at)) = v_year) end,
    'matches', case when v_claimed is null then 0 else (
      select count(*)::int
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = v_claimed and m.approved and m.status <> 'void' and not r.walkover) end,
    'votes', (
      select jsonb_build_object(
               'resolved', count(*) filter (where v.resolved_at is not null and v.outcome <> 'none'),
               'correct', count(*) filter (where v.outcome = 'correct'),
               'waiting', v_waiting,
               'pending_points', v_pending,
               'open', (select count(*)::int
                          from core.matches m
                         where m.sport_id = v_sport and m.approved and core.match_is_open(m)
                           and core.in_vote_window(m.starts_at)
                           and not exists (select 1 from core.votes mv
                                            where mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id)
                           and not exists (select 1 from core.match_participants mp
                                             join core.players p on p.id = mp.player_id
                                            where mp.match_id = m.id and (p.hidden or mp.player_id = v_claimed))))
        from core.votes v where v.user_id = v_uid and v.subject_type = 'match'),
    'friends', jsonb_build_object(
      'count', (select count(*) from core.follows f where f.user_id = v_uid),
      'first', coalesce((
        select jsonb_agg(core.player_ref_json(x.player_id) order by x.created_at desc)
          from (select f.player_id, f.created_at from core.follows f
                  join core.players p on p.id = f.player_id and not p.hidden
                 where f.user_id = v_uid order by f.created_at desc limit 5) x), '[]'::jsonb)));
end;
$function$;

CREATE OR REPLACE FUNCTION core.scout_player_json(p_player uuid, p_me uuid, p_uid uuid, p_sport text, p_match uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'core', 'pg_temp'
AS $function$
  with res as (select * from core.player_results(p_player, p_sport)),
  -- sets from the player's side: a set {w,l} is winner-first, so the match winner took it when w > l
  sets as (
    select r.won = ((s ->> 'w')::int > (s ->> 'l')::int) as set_won,
           (s ? 'tb') or (s ? 'stb') or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7
                                         and least((s ->> 'w')::int, (s ->> 'l')::int) = 6) as tiebreak
      from res r cross join lateral jsonb_array_elements(r.sets) s
     where not r.walkover
  ),
  -- the people on the other side of each of the player's results
  opp as (
    select r.match_id, r.starts_at, r.won, r.score_summary, o.player_id
      from res r
      join core.match_participants o on o.match_id = r.match_id and o.side <> r.side
     where not r.walkover
  ),
  mine as (
    select o.player_id, r.won
      from core.player_results(p_me, p_sport) r
      join core.match_participants o on o.match_id = r.match_id and o.side <> r.side
     where not r.walkover
  ),
  this as (select tournament_id, event_id from core.matches where id = p_match)
  select core.player_card_json(p_player, p_uid, p_sport) || jsonb_build_object(
    'hand', (select ps.hand from core.player_sports ps where ps.player_id = p_player and ps.sport_id = p_sport),
    'year', (select jsonb_build_object('w', count(*) filter (where won), 'l', count(*) filter (where not won))
               from res where not walkover and extract(year from core.athens_day(starts_at)) = extract(year from core.athens_day())),
    'deciding', (select jsonb_build_object('w', count(*) filter (where won), 'l', count(*) filter (where not won))
                   from res where not walkover and jsonb_array_length(sets) >= 3),
    'tiebreaks', (select jsonb_build_object('w', count(*) filter (where set_won), 'l', count(*) filter (where not set_won))
                    from sets where tiebreak),
    'form10', (select coalesce(jsonb_agg(x.r order by x.starts_at nulls first, x.match_id), '[]'::jsonb)
                 from (select case when won then 'W' else 'L' end as r, starts_at, match_id
                         from res where not walkover order by starts_at desc nulls last, match_id desc limit 10) x),
    'h2h', (select jsonb_build_object(
                     'w', count(*) filter (where not o.won), 'l', count(*) filter (where o.won),
                     'last', (select jsonb_build_object('won', not x.won, 'score', x.score_summary, 'starts_at', x.starts_at)
                                from opp x where x.player_id = p_me order by x.starts_at desc limit 1),
                     -- every meeting, from YOUR side (won = you won); the games stay winner first
                     'meetings', (select coalesce(jsonb_agg(jsonb_build_object(
                                           'match_id', r.match_id, 'starts_at', r.starts_at, 'format', r.format,
                                           'won', not r.won, 'sets', coalesce(r.sets, '[]'::jsonb), 'score', r.score_summary,
                                           'retired', r.retired, 'walkover', r.walkover,
                                           'tournament', (select t.name from core.tournaments t where t.id = mm.tournament_id),
                                           'round', nullif(btrim(coalesce(mm.round, '')), ''))
                                         order by r.starts_at desc nulls last, r.match_id), '[]'::jsonb)
                                    from res r join core.matches mm on mm.id = r.match_id
                                   where exists (select 1 from core.match_participants o
                                                  where o.match_id = r.match_id and o.side <> r.side and o.player_id = p_me)))
              from opp o where o.player_id = p_me),
    'common', coalesce((
      select jsonb_agg(c.j order by c.n desc, c.surname)
        from (
          select core.player_ref_json(t.player_id) || jsonb_build_object(
                   'me', jsonb_build_object('w', t.mw, 'l', t.ml), 'them', jsonb_build_object('w', t.tw, 'l', t.tl)) as j,
                 t.mw + t.ml + t.tw + t.tl as n, p.surname
            from (
              select a.player_id,
                     count(*) filter (where a.won) as tw, count(*) filter (where not a.won) as tl,
                     (select count(*) filter (where b.won) from mine b where b.player_id = a.player_id) as mw,
                     (select count(*) filter (where not b.won) from mine b where b.player_id = a.player_id) as ml
                from opp a
               where a.player_id <> p_me
                 and exists (select 1 from mine b where b.player_id = a.player_id)
               group by a.player_id
            ) t
            join core.players p on p.id = t.player_id and not p.hidden and not p.is_minor
           order by n desc, p.surname
           limit 5
        ) c), '[]'::jsonb),
    'known', (select jsonb_build_object('w', count(*) filter (where o.won), 'l', count(*) filter (where not o.won))
                from opp o join core.follows f on f.player_id = o.player_id and f.user_id = p_uid),
    -- the numbers of «Τα στατιστικά σου», for them, all time
    'singles', core.match_stats_part(p_player, p_sport, null, false, true),
    'doubles', core.match_stats_part(p_player, p_sport, null, true, true),
    'history_count', (select count(*) from res),
    'history', coalesce((
      select jsonb_agg(h.j order by h.starts_at desc nulls last, h.match_id)
        from (
          select r.starts_at, r.match_id, jsonb_build_object(
                   'match_id', r.match_id, 'starts_at', r.starts_at, 'format', r.format,
                   'won', r.won, 'sets', coalesce(r.sets, '[]'::jsonb), 'score', r.score_summary,
                   'retired', r.retired, 'walkover', r.walkover,
                   'tournament', t.name, 'round', nullif(btrim(coalesce(mm.round, '')), ''),
                   'level', (select e.name from core.tournament_events e where e.id = mm.event_id),
                   'discipline', mm.provenance ->> 'discipline',
                   'surface', t.surface,
                   'partner', core.stats_people(r.match_id, r.side, true, p_player),
                   'opponents', core.stats_people(r.match_id, r.side, false, p_player)) as j
            from res r
            join core.matches mm on mm.id = r.match_id
            left join core.tournaments t on t.id = mm.tournament_id
           order by r.starts_at desc nulls last, r.match_id
           limit 60
        ) h), '[]'::jsonb),
    -- this tournament so far (the same event), before this match
    'path', coalesce((
      select jsonb_agg(jsonb_build_object(
               'match_id', r.match_id, 'starts_at', r.starts_at, 'round', nullif(btrim(coalesce(mm.round, '')), ''),
               'won', r.won, 'sets', coalesce(r.sets, '[]'::jsonb), 'score', r.score_summary,
               'retired', r.retired, 'walkover', r.walkover,
               'opponents', core.stats_people(r.match_id, r.side, false, p_player))
             order by r.starts_at nulls first, r.match_id)
        from res r
        join core.matches mm on mm.id = r.match_id
        join this on this.tournament_id = mm.tournament_id and this.event_id is not distinct from mm.event_id
       where r.match_id <> p_match), '[]'::jsonb),
    -- «Πώς παίζει» with the counts, the most voted first (never who voted)
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'label_el', x.label_el, 'label_en', x.label_en, 'count', x.n)
                       order by x.n desc, x.id)
        from (select d.id, d.label_el, d.label_en, count(*)::int as n
                from core.trait_votes v join core.trait_defs d on d.id = v.trait_id and d.status = 'approved'
               where v.player_id = p_player and v.sport_id = p_sport
               group by d.id, d.label_el, d.label_en
               order by count(*) desc, d.id
               limit 6) x), '[]'::jsonb))
$function$;
