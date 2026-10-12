-- Pro: «Ο αντίπαλος πριν το ματς». Scouting the other side of YOUR next match, and only that match: it opens for
-- a Pro whose own player plays in an upcoming match, never for someone else's match, so votes stay fair.
-- Everything comes from results already in the database (no surfaces: v1 never carried them over).
--   card:      the player's card (level, area, form)
--   hand:      R / L when known
--   year:      this Athens year's record
--   deciding:  record in matches that went to a deciding set
--   tiebreaks: sets won and lost in a tie-break (7-6 or a tb / super tie-break)
--   h2h:       you against them: record and the last meeting
--   common:    players you both played: your record and theirs against each (up to 5)
--   known:     their record against the players you follow

-- one row per result of a player in a sport: whether they won and the sets turned to their side
create or replace function core.player_results(p_player uuid, p_sport text)
returns table (match_id uuid, starts_at timestamptz, format text, side smallint, won boolean, sets jsonb,
               score_summary text, retired boolean, walkover boolean)
language sql stable set search_path = core, pg_temp
as $$
  select m.id, m.starts_at, m.format, mp.side, mp.side = r.winner_side, r.sets, r.score_summary, r.retired, r.walkover
    from core.match_participants mp
    join core.matches m on m.id = mp.match_id
    join core.match_results r on r.match_id = m.id
   where mp.player_id = p_player and m.sport_id = p_sport and m.approved and m.status <> 'void'
$$;

create or replace function core.scout_player_json(p_player uuid, p_me uuid, p_uid uuid, p_sport text)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
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
  ),
  mine as (
    select o.player_id, r.won
      from core.player_results(p_me, p_sport) r
      join core.match_participants o on o.match_id = r.match_id and o.side <> r.side
  )
  select core.player_card_json(p_player, p_uid, p_sport) || jsonb_build_object(
    'hand', (select ps.hand from core.player_sports ps where ps.player_id = p_player and ps.sport_id = p_sport),
    'year', (select jsonb_build_object('w', count(*) filter (where won), 'l', count(*) filter (where not won))
               from res where extract(year from core.athens_day(starts_at)) = extract(year from core.athens_day())),
    'deciding', (select jsonb_build_object('w', count(*) filter (where won), 'l', count(*) filter (where not won))
                   from res where not walkover and jsonb_array_length(sets) >= 3),
    'tiebreaks', (select jsonb_build_object('w', count(*) filter (where set_won), 'l', count(*) filter (where not set_won))
                    from sets where tiebreak),
    'h2h', (select jsonb_build_object(
                     'w', count(*) filter (where not o.won), 'l', count(*) filter (where o.won),
                     'last', (select jsonb_build_object('won', not x.won, 'score', x.score_summary, 'starts_at', x.starts_at)
                                from opp x where x.player_id = p_me order by x.starts_at desc limit 1))
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
            join core.players p on p.id = t.player_id and not p.hidden
           order by n desc, p.surname
           limit 5
        ) c), '[]'::jsonb),
    'known', (select jsonb_build_object('w', count(*) filter (where o.won), 'l', count(*) filter (where not o.won))
                from opp o join core.follows f on f.player_id = o.player_id and f.user_id = p_uid))
$$;

create or replace function api.get_scout(p_match_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_claimed uuid;
  v_sport   text;
  v_side    smallint;
  v_m       core.matches;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_claimed from core.profiles where user_id = v_uid and deleted_at is null;
  if v_claimed is null then raise exception 'no_player' using errcode = '42501'; end if;
  select * into v_m from core.matches where id = p_match_id;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = v_claimed;
  -- the fairness rule: only your own match
  if v_side is null then raise exception 'not_your_match' using errcode = '42501'; end if;
  if v_m.status not in ('announced', 'scheduled')
     or exists (select 1 from core.match_results r where r.match_id = p_match_id) then
    raise exception 'match_over' using errcode = '22023';
  end if;
  if not core.is_pro(v_uid) then raise exception 'pro_required' using errcode = '42501'; end if;
  v_sport := v_m.sport_id;

  return jsonb_build_object(
    'match_id', v_m.id, 'starts_at', v_m.starts_at, 'format', v_m.format,
    'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                  from core.match_participants o
                 where o.match_id = p_match_id and o.side = v_side and o.player_id <> v_claimed),
    'opponents', (select coalesce(jsonb_agg(core.scout_player_json(o.player_id, v_claimed, v_uid, v_sport)
                                            order by o.position), '[]'::jsonb)
                    from core.match_participants o
                   where o.match_id = p_match_id and o.side <> v_side));
end;
$$;

revoke all on function api.get_scout(uuid) from public, anon;
grant execute on function api.get_scout(uuid) to authenticated, service_role;
