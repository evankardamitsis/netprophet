-- Head to head counts the same kind of match (founder, 12 Nov 2026: "singles vs singles, doubles vs doubles"). Before a
-- singles match the scout said 0-1 against an opponent met only across the net in doubles. Μεταξύ σας and the common
-- opponents now count only matches of the kind being previewed: singles for a singles match, doubles (mixed counts
-- with doubles, as in «Τα στατιστικά σου») for a doubles one. A player's card has no match, so it counts singles.
-- The record against the players you follow and the rest of the card stay as they were.

CREATE OR REPLACE FUNCTION core.scout_player_json(p_player uuid, p_me uuid, p_uid uuid, p_sport text, p_match uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'core', 'pg_temp'
AS $function$
  with res as (select * from core.player_results(p_player, p_sport)),
  -- the kind of match being previewed: doubles (mixed too) or singles; a card without a match counts singles
  kind as (select coalesce((select m.format <> 'singles' from core.matches m where m.id = p_match), false) as dbl),
  -- sets from the player's side: a set {w,l} is winner-first, so the match winner took it when w > l
  sets as (
    select r.won = ((s ->> 'w')::int > (s ->> 'l')::int) as set_won,
           (s ? 'tb') or (s ? 'stb') or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7
                                         and least((s ->> 'w')::int, (s ->> 'l')::int) = 6) as tiebreak
      from res r cross join lateral jsonb_array_elements(r.sets) s
     where not r.walkover
  ),
  -- the people on the other side of each of the player's results
  opp_all as (
    select r.match_id, r.starts_at, r.won, r.score_summary, o.player_id, r.format <> 'singles' as dbl
      from res r
      join core.match_participants o on o.match_id = r.match_id and o.side <> r.side
     where not r.walkover
  ),
  -- the same kind of match as the one previewed: head to head and common opponents
  opp as (select a.* from opp_all a, kind k where a.dbl = k.dbl),
  mine as (
    select o.player_id, r.won
      from core.player_results(p_me, p_sport) r
      join core.match_participants o on o.match_id = r.match_id and o.side <> r.side
      cross join kind k
     where not r.walkover and (r.format <> 'singles') = k.dbl
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
                                   where (r.format <> 'singles') = (select k.dbl from kind k)
                                     and exists (select 1 from core.match_participants o
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
                from opp_all o join core.follows f on f.player_id = o.player_id and f.user_id = p_uid),
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
