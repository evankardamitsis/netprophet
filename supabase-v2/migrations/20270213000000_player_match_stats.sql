-- «Τα στατιστικά σου» are your matches (founder, 18 Oct 2026: "we need match statistics not votes statistics, and be
-- as detailed as possible"). Your own claimed player's real results, never votes, points or σερί.
--
-- api.my_match_stats(p_period): 'all' (default), 'year' (this calendar year, Athens) or '12m' (the last 12 months).
--   Counts approved, non-void, undisputed matches with a result that is not waiting for staff (core.player_results is
--   the one visibility rule). Singles and doubles apart ('mixed' goes with doubles).
--   Free (the teaser): played, won, lost and the win % for each, and the total.
--   Pro ('more', null for free): walkovers and retirements, the current and best run of wins, sets, games, tie-breaks,
--   super tie-breaks, deciding sets, after winning or losing the first set (comebacks), straight sets, by surface, by
--   category, tournament or friendly, by round, by month (last 12), the opponents you met most with the head-to-head,
--   the best wins, doubles partners, and the tournaments with how far you went.
--   Only what the results can tell: games, tie-breaks and the first set need game scores (player-logged results know
--   only the sets), so those blocks count only matches with games and are null when there are none. There is no
--   match length anywhere in the data, so there is no length here.
--   Walkovers are not played matches (as in «Η σεζόν σου»): they count only in 'walkovers'. Retired matches count.
--   Named lists (opponents, partners, best wins) never show a minor or a hidden player; their matches still count.
--   No level value leaves the database: the best wins are ordered by the opponents' hidden level, and no stat is split
--   by level (players' levels are hidden, founder 14 Oct 2026).
-- Own data only: there is no public version (a player's profile already shows their record).

-- one side's people, by name only (as core.season_people), leaving out minors and hidden players
create or replace function core.stats_people(p_match uuid, p_side int, p_same boolean, p_except uuid)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('player_id', p.id, 'first_name', p.first_name, 'surname', p.surname,
                                               'gender', p.gender) order by mp.position), '[]'::jsonb)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and (mp.side = p_side) = p_same and mp.player_id <> p_except
     and not p.is_minor and not p.hidden
$$;

-- your results in a format and period, from your side (sets from the games, else from the sets-only result)
create or replace function core.match_stats_rows(p_player uuid, p_sport text, p_from date, p_doubles boolean)
returns table (match_id uuid, starts_at timestamptz, side smallint, won boolean, sets jsonb, score_summary text,
               retired boolean, walkover boolean, tournament_id uuid, event_id uuid, round text, surface text,
               has_games boolean, mine int, theirs int, first_won boolean)
language sql stable set search_path = core, pg_temp
as $$
  select r.match_id, r.starts_at, r.side, r.won, r.sets, r.score_summary, r.retired, r.walkover,
         m.tournament_id, m.event_id, nullif(btrim(coalesce(m.round, '')), ''), t.surface,
         jsonb_array_length(r.sets) > 0,
         -- sets_won is the winner's when only the sets are known
         case when jsonb_array_length(r.sets) > 0
              then (select count(*) from jsonb_array_elements(r.sets) s
                     where r.won = ((s ->> 'w')::int > (s ->> 'l')::int))::int
              else case when r.won then coalesce(mr.sets_won, 0) else coalesce(mr.sets_lost, 0) end end,
         case when jsonb_array_length(r.sets) > 0
              then (select count(*) from jsonb_array_elements(r.sets) s
                     where r.won <> ((s ->> 'w')::int > (s ->> 'l')::int))::int
              else case when r.won then coalesce(mr.sets_lost, 0) else coalesce(mr.sets_won, 0) end end,
         case when jsonb_array_length(r.sets) > 0
              then r.won = (((r.sets -> 0) ->> 'w')::int > ((r.sets -> 0) ->> 'l')::int) end
    from core.player_results(p_player, p_sport) r
    join core.matches m on m.id = r.match_id
    join core.match_results mr on mr.match_id = r.match_id
    left join core.tournaments t on t.id = m.tournament_id
   where p_player is not null and m.status <> 'disputed'
     and (r.format <> 'singles') = p_doubles
     and (p_from is null or (r.starts_at is not null and core.athens_day(r.starts_at) >= p_from))
$$;

-- one format's numbers (singles, or doubles with mixed); p_full adds the Pro part as 'more'
create or replace function core.match_stats_part(p_player uuid, p_sport text, p_from date, p_doubles boolean, p_full boolean)
returns jsonb
language plpgsql stable set search_path = core, pg_temp
as $$
declare
  v_best int;
  v_base jsonb;
  v_more jsonb;
begin
  select coalesce((config ->> 'best_of_sets')::int, 3) into v_best from core.sports where id = p_sport;
  v_best := coalesce(v_best, 3);

  select jsonb_build_object(
           'played', count(*)::int,
           'won', count(*) filter (where won)::int,
           'lost', count(*) filter (where not won)::int,
           'win_pct', case when count(*) > 0 then round(100.0 * count(*) filter (where won) / count(*))::int end)
    into v_base
    from core.match_stats_rows(p_player, p_sport, p_from, p_doubles) where not walkover;
  if not p_full then return v_base || jsonb_build_object('more', null); end if;

  with allres as (select * from core.match_stats_rows(p_player, p_sport, p_from, p_doubles)),
  res as (select * from allres where not walkover),
  games as (
    select r.won = ((s ->> 'w')::int > (s ->> 'l')::int) as set_won,
           case when r.won then (s ->> 'w')::int else (s ->> 'l')::int end as g_mine,
           case when r.won then (s ->> 'l')::int else (s ->> 'w')::int end as g_theirs,
           coalesce((s ->> 'stb')::boolean, false) as stb,
           ((s ? 'tb') and (s ->> 'tb') is distinct from 'false')
             or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7 and least((s ->> 'w')::int, (s ->> 'l')::int) = 6) as tb
      from res r cross join lateral jsonb_array_elements(r.sets) s
     where r.has_games
  ),
  runs as (
    select r.won, sum(case when r.won then 0 else 1 end)
             over (order by r.starts_at nulls first, r.match_id) as grp
      from res r
  ),
  recent as (
    select r.won, row_number() over (order by r.starts_at desc nulls last, r.match_id desc) as rn from res r
  ),
  opp as (
    select p.id, p.first_name, p.surname, p.gender, r.won, r.starts_at
      from res r
      join core.match_participants mp on mp.match_id = r.match_id and mp.side <> r.side
      join core.players p on p.id = mp.player_id
     where not p.is_minor and not p.hidden
  ),
  mates as (
    select p.id, p.first_name, p.surname, p.gender, r.won, r.starts_at
      from res r
      join core.match_participants mp on mp.match_id = r.match_id and mp.side = r.side and mp.player_id <> p_player
      join core.players p on p.id = mp.player_id
     where not p.is_minor and not p.hidden
  ),
  best as (
    select r.match_id, r.starts_at, r.side, r.sets, r.score_summary, r.retired, r.tournament_id, r.round
      from res r
     where r.won and core.win_shareable(r.match_id)
     order by (select avg(coalesce(ps.level_value, ps.level_tier, ps.initial_level))
                 from core.match_participants o
                 left join core.player_sports ps on ps.player_id = o.player_id and ps.sport_id = p_sport
                where o.match_id = r.match_id and o.side <> r.side) desc nulls last,
              r.starts_at desc nulls last, r.match_id
     limit 3
  ),
  tours as (
    select r.tournament_id,
           count(*)::int as played, count(*) filter (where r.won)::int as won,
           min(r.starts_at) as first_at, max(r.starts_at) as last_at,
           (array_agg(r.round order by r.starts_at desc nulls last, r.match_id desc))[1] as last_round,
           (array_agg(r.won order by r.starts_at desc nulls last, r.match_id desc))[1] as last_won
      from res r
     where r.tournament_id is not null
     group by r.tournament_id
  )
  select jsonb_build_object(
    'walkovers', (select jsonb_build_object('won', count(*) filter (where won), 'lost', count(*) filter (where not won))
                    from allres where walkover),
    -- won: the opponent retired; lost: you did
    'retired', (select jsonb_build_object('won', count(*) filter (where won), 'lost', count(*) filter (where not won))
                  from res where retired),
    'runs', jsonb_build_object(
              'current', coalesce((select min(rn) - 1 from recent where not won), (select count(*) from recent))::int,
              'best', coalesce((select max(n) from (select count(*) as n from runs where won group by grp) x), 0)::int),
    'sets', (select jsonb_build_object('won', coalesce(sum(mine), 0)::int, 'lost', coalesce(sum(theirs), 0)::int,
                                       'pct', case when sum(mine + theirs) > 0
                                                   then round(100.0 * sum(mine) / sum(mine + theirs))::int end)
               from res),
    'games', (select case when count(*) > 0 then jsonb_build_object(
                       'won', sum(g_mine)::int, 'lost', sum(g_theirs)::int,
                       'pct', case when sum(g_mine + g_theirs) > 0
                                   then round(100.0 * sum(g_mine) / sum(g_mine + g_theirs))::int end,
                       'matches', (select count(*) from res where has_games)::int) end
                from games where not stb),
    'tiebreaks', case when exists (select 1 from res where has_games) then
                   (select jsonb_build_object('played', count(*), 'won', count(*) filter (where set_won))
                      from games where tb and not stb) end,
    'super_tiebreaks', case when exists (select 1 from res where has_games) then
                         (select jsonb_build_object('played', count(*), 'won', count(*) filter (where set_won))
                            from games where stb) end,
    -- the deciding set: the match went the whole distance (best of 3: a third set), from the games or the sets only
    'deciding', (select jsonb_build_object('played', count(*), 'won', count(*) filter (where won))
                   from res where mine + theirs >= v_best),
    'best_of', v_best,
    -- after the first set: lost it and won the match is a comeback (only matches with games know the first set)
    'first_set_lost', case when exists (select 1 from res where has_games) then
                        (select jsonb_build_object('played', count(*), 'won', count(*) filter (where won))
                           from res where has_games and not first_won) end,
    'first_set_won', case when exists (select 1 from res where has_games) then
                       (select jsonb_build_object('played', count(*), 'won', count(*) filter (where won))
                          from res where has_games and first_won) end,
    'straight', (select jsonb_build_object('won', count(*) filter (where won and theirs = 0),
                                           'lost', count(*) filter (where not won and mine = 0))
                   from res where not retired and mine + theirs > 0),
    'kinds', (select jsonb_build_object(
                       'tournament', jsonb_build_object('won', count(*) filter (where won and tournament_id is not null),
                                                        'lost', count(*) filter (where not won and tournament_id is not null)),
                       'friendly', jsonb_build_object('won', count(*) filter (where won and tournament_id is null),
                                                      'lost', count(*) filter (where not won and tournament_id is null)))
                from res),
    'by_surface', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'won', w, 'lost', l) order by w + l desc, k), '[]'::jsonb)
                     from (select surface as k, count(*) filter (where won)::int as w, count(*) filter (where not won)::int as l
                             from res where surface is not null group by surface) x),
    'by_category', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'won', w, 'lost', l) order by w + l desc, k), '[]'::jsonb)
                      from (select e.name as k, count(*) filter (where r.won)::int as w, count(*) filter (where not r.won)::int as l
                              from res r join core.tournament_events e on e.id = r.event_id group by e.name) x),
    'by_round', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'won', w, 'lost', l) order by w + l desc, k), '[]'::jsonb)
                   from (select round as k, count(*) filter (where won)::int as w, count(*) filter (where not won)::int as l
                           from res where round is not null group by round) x),
    'by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', k, 'won', w, 'lost', l) order by k), '[]'::jsonb)
                   from (select core.month_key(starts_at) as k, count(*) filter (where won)::int as w,
                                count(*) filter (where not won)::int as l
                           from res
                          where starts_at is not null
                            and core.athens_day(starts_at) >= (date_trunc('month', core.athens_day()) - interval '11 months')::date
                          group by 1) x),
    'opponents', (select coalesce(jsonb_agg(jsonb_build_object('player_id', id, 'first_name', first_name, 'surname', surname,
                                                               'gender', gender, 'played', n, 'won', w, 'lost', n - w)
                                            order by n desc, w desc, last_at desc nulls last, id), '[]'::jsonb)
                    from (select id, first_name, surname, gender, count(*)::int as n, count(*) filter (where won)::int as w,
                                 max(starts_at) as last_at
                            from opp group by id, first_name, surname, gender
                           order by n desc, w desc, last_at desc nulls last, id limit 5) x),
    'partners', case when p_doubles then
                  (select coalesce(jsonb_agg(jsonb_build_object('player_id', id, 'first_name', first_name, 'surname', surname,
                                                                'gender', gender, 'played', n, 'won', w, 'lost', n - w)
                                             order by n desc, w desc, last_at desc nulls last, id), '[]'::jsonb)
                     from (select id, first_name, surname, gender, count(*)::int as n, count(*) filter (where won)::int as w,
                                  max(starts_at) as last_at
                             from mates group by id, first_name, surname, gender
                            order by n desc, w desc, last_at desc nulls last, id limit 5) x) end,
    'best_wins', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'match_id', b.match_id, 'starts_at', b.starts_at, 'sets', b.sets,
                                    'score_summary', b.score_summary, 'retired', b.retired, 'round', b.round,
                                    'opponents', core.stats_people(b.match_id, b.side, false, p_player),
                                    'partners', core.stats_people(b.match_id, b.side, true, p_player),
                                    'tournament', (select t.name from core.tournaments t where t.id = b.tournament_id))), '[]'::jsonb)
                    from best b),
    'tournaments', jsonb_build_object(
                     'count', (select count(*)::int from tours),
                     'list', (select coalesce(jsonb_agg(jsonb_build_object(
                                        'tournament_id', x.tournament_id, 'name', t.name,
                                        'starts_on', coalesce(t.starts_on, core.athens_day(x.first_at)),
                                        'played', x.played, 'won', x.won, 'lost', x.played - x.won,
                                        'last_round', x.last_round, 'last_won', x.last_won)
                                      order by x.last_at desc nulls last, x.tournament_id), '[]'::jsonb)
                                from (select * from tours order by last_at desc nulls last, tournament_id limit 12) x
                                join core.tournaments t on t.id = x.tournament_id)))
    into v_more;
  return v_base || jsonb_build_object('more', v_more);
end;
$$;
revoke all on function core.match_stats_part(uuid, text, date, boolean, boolean) from public;
revoke all on function core.match_stats_rows(uuid, text, date, boolean) from public;
revoke all on function core.stats_people(uuid, int, boolean, uuid) from public;

create or replace function api.my_match_stats(p_period text default 'all')
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_period text := coalesce(nullif(btrim(coalesce(p_period, '')), ''), 'all');
  v_from   date;
  v_player uuid;
  v_sport  text;
  v_pro    boolean;
  v_s      jsonb;
  v_d      jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_period not in ('all', 'year', '12m') then raise exception 'bad_period' using errcode = '22023'; end if;
  select claimed_player_id, primary_sport into v_player, v_sport
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_from := case v_period
              when 'year' then date_trunc('year', core.athens_day())::date
              when '12m' then (core.athens_day() - interval '1 year')::date + 1
            end;
  v_pro := core.is_pro(v_uid);
  v_s := core.match_stats_part(v_player, v_sport, v_from, false, v_pro);
  v_d := core.match_stats_part(v_player, v_sport, v_from, true, v_pro);

  return jsonb_build_object(
    'period', v_period,
    'from', v_from,
    'pro', v_pro,
    'has_player', v_player is not null,
    'sport', v_sport,
    'total', jsonb_build_object(
               'played', (v_s ->> 'played')::int + (v_d ->> 'played')::int,
               'won', (v_s ->> 'won')::int + (v_d ->> 'won')::int,
               'lost', (v_s ->> 'lost')::int + (v_d ->> 'lost')::int,
               'win_pct', case when (v_s ->> 'played')::int + (v_d ->> 'played')::int > 0
                               then round(100.0 * ((v_s ->> 'won')::int + (v_d ->> 'won')::int)
                                          / ((v_s ->> 'played')::int + (v_d ->> 'played')::int))::int end),
    'singles', v_s,
    'doubles', v_d);
end;
$$;

revoke all on function api.my_match_stats(text) from public, anon;
grant execute on function api.my_match_stats(text) to authenticated, service_role;
