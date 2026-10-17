-- Pro «Η σεζόν σου» (founder, 17 Oct 2026: Pro is «ο βοηθός της σεζόν σου»): a monthly recap of your own matches and
-- of your game, and a share card for every win. Pro never buys points, ranking or outcomes: these read facts only.
--
-- api.my_season(p_month): the signed-in user's month (Athens, '2026-10'; the current one when left out).
--   Free (the teaser): matches played, won and lost, and this month's points. Enough to see the month is there.
--   Pro (the whole recap): sets won and lost, the best win, the longest run of wins, the deciding set record, the
--   tie-break record (in sets), tournaments played, the best σερί of the month, the Ladder group position, and the
--   previous month with the same numbers for the ↑ ↓ comparison.
--   For a free user the Pro fields are null and 'prev' is null; the app shows them as the locked part.
--   The best win is the win over the opponent with the highest hidden level, but no level value ever leaves the
--   database: only the opponents' names, the score, the date and the tournament.
--   'free_card' is the match of your first win of the month (see win_card), so the screen can offer it.
-- api.win_card(p_match): the facts for a share card of one of the caller's own wins (names, score, tournament,
--   category, round, date). Only the caller's own won matches; never a walkover, a disputed or removed match, or one
--   with a minor or a hidden player in it (the card leaves the app).
--   Pro: a card for every win. Free: one taste a month, stateless: the first win of each Athens month (the earliest
--   shareable win by start time) is free, forever; any other win needs Pro ('pro_required').
-- Walkovers are not played matches, so they count nowhere here; retired matches count as played.

-- a win that may go on a card: no minor and no hidden player in it
create or replace function core.win_shareable(p_match uuid)
returns boolean
language sql stable set search_path = core, pg_temp
as $$
  select not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                      where mp.match_id = p_match and (p.is_minor or p.hidden))
$$;

-- your finished, non-walkover, undisputed matches in a month (Athens), from your side
create or replace function core.season_results(p_player uuid, p_sport text, p_month text)
returns table (match_id uuid, starts_at timestamptz, format text, side smallint, won boolean, sets jsonb,
               score_summary text, sw int, sl int, tournament_id uuid)
language sql stable set search_path = core, pg_temp
as $$
  select r.match_id, r.starts_at, r.format, r.side, r.won, r.sets, r.score_summary, mr.sets_won, mr.sets_lost,
         m.tournament_id
    from core.player_results(p_player, p_sport) r
    join core.matches m on m.id = r.match_id
    join core.match_results mr on mr.match_id = r.match_id
   where p_player is not null and not r.walkover and m.status <> 'disputed'
     and r.starts_at is not null and core.month_key(r.starts_at) = p_month
$$;

-- the first shareable win of a month: the free card
create or replace function core.first_win_of_month(p_player uuid, p_sport text, p_month text)
returns uuid
language sql stable set search_path = core, pg_temp
as $$
  select s.match_id from core.season_results(p_player, p_sport, p_month) s
   where s.won and core.win_shareable(s.match_id)
   order by s.starts_at, s.match_id
   limit 1
$$;

-- a person on a card or in the recap: the name only (never a level)
create or replace function core.season_people(p_match uuid, p_side int, p_same boolean)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                            order by mp.position), '[]'::jsonb)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and (mp.side = p_side) = p_same
$$;

-- one month's numbers; p_full adds the Pro ones
create or replace function core.season_numbers(p_uid uuid, p_player uuid, p_sport text, p_month text, p_full boolean)
returns jsonb
language plpgsql stable set search_path = core, pg_temp
as $$
declare
  v_base   jsonb;
  v_more   jsonb;
  v_league uuid;
  v_tier   text;
  v_closed timestamptz;
  v_rank   int;
  v_size   int;
  v_ladder jsonb;
begin
  select jsonb_build_object(
           'played', count(*)::int,
           'won', count(*) filter (where s.won)::int,
           'lost', count(*) filter (where not s.won)::int,
           'points', coalesce((select sum(l.delta)::int from core.points_ledger l
                                where l.user_id = p_uid and l.month_key = p_month), 0))
    into v_base
    from core.season_results(p_player, p_sport, p_month) s;
  if not p_full then return v_base; end if;

  -- the Ladder group this month: the final rank once the month closed, else the live one (get_ladder's order)
  select l.id, l.tier, l.closed_at, lm.final_rank into v_league, v_tier, v_closed, v_rank
    from core.league_members lm join core.leagues l on l.id = lm.league_id
   where lm.user_id = p_uid and l.month_key = p_month;
  if v_league is not null then
    select count(*)::int into v_size from core.league_members where league_id = v_league;
    if v_closed is null or v_rank is null then
      select x.pos into v_rank
        from (select lm.user_id,
                     row_number() over (order by coalesce(p.points, 0) desc, p.last_at asc nulls last,
                                                 lm.user_id::text collate "C")::int as pos
                from core.league_members lm
                join core.profiles pr on pr.user_id = lm.user_id and pr.deleted_at is null
                left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                             from core.points_ledger where month_key = p_month group by user_id) p
                       on p.user_id = lm.user_id
               where lm.league_id = v_league) x
       where x.user_id = p_uid;
    end if;
    v_ladder := jsonb_build_object('tier', v_tier, 'position', v_rank, 'size', v_size, 'closed', v_closed is not null);
  end if;

  with res as (select * from core.season_results(p_player, p_sport, p_month)),
  sets as (
    select r.match_id,
           case when jsonb_array_length(r.sets) > 0
                then (select count(*) from jsonb_array_elements(r.sets) s
                       where (r.won and (s ->> 'w')::int > (s ->> 'l')::int) or (not r.won and (s ->> 'w')::int < (s ->> 'l')::int))
                else case when r.won then coalesce(r.sw, 0) else coalesce(r.sl, 0) end end as mine,
           case when jsonb_array_length(r.sets) > 0
                then (select count(*) from jsonb_array_elements(r.sets) s
                       where (r.won and (s ->> 'w')::int < (s ->> 'l')::int) or (not r.won and (s ->> 'w')::int > (s ->> 'l')::int))
                else case when r.won then coalesce(r.sl, 0) else coalesce(r.sw, 0) end end as theirs
      from res r
  ),
  tb as (
    -- as in get_win_loss: a tie-break set is marked, or ended 7-6
    select r.won = ((s ->> 'w')::int > (s ->> 'l')::int) as set_won
      from res r cross join lateral jsonb_array_elements(r.sets) s
     where (s ? 'tb') or (s ? 'stb')
        or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7 and least((s ->> 'w')::int, (s ->> 'l')::int) = 6)
  ),
  runs as (
    select r.won, sum(case when r.won then 0 else 1 end) over (order by r.starts_at, r.match_id) as grp from res r
  ),
  best as (
    select r.match_id, r.starts_at, r.side, r.sets, r.score_summary, r.tournament_id
      from res r
     where r.won and core.win_shareable(r.match_id)
     order by (select avg(coalesce(ps.level_value, ps.level_tier, ps.initial_level))
                 from core.match_participants o
                 left join core.player_sports ps on ps.player_id = o.player_id and ps.sport_id = p_sport
                where o.match_id = r.match_id and o.side <> r.side) desc nulls last,
              r.starts_at desc, r.match_id
     limit 1
  )
  select jsonb_build_object(
           'sets_won', coalesce((select sum(mine)::int from sets), 0),
           'sets_lost', coalesce((select sum(theirs)::int from sets), 0),
           'win_run', coalesce((select max(n)::int from (select count(*) as n from runs where won group by grp) x), 0),
           'deciding', (select jsonb_build_object('w', count(*) filter (where r.won), 'l', count(*) filter (where not r.won))
                          from res r
                         where jsonb_array_length(r.sets) >= 3 or coalesce(r.sw, 0) + coalesce(r.sl, 0) >= 3),
           'tiebreaks', (select jsonb_build_object('w', count(*) filter (where set_won), 'l', count(*) filter (where not set_won)) from tb),
           'tournaments', (select count(distinct r.tournament_id)::int from res r),
           'best_streak', coalesce((select max(e.streak_after)::int from core.streak_events e
                                     where e.user_id = p_uid and e.kind = 'correct' and core.month_key(e.created_at) = p_month), 0),
           'best_win', (select jsonb_build_object('match_id', b.match_id, 'starts_at', b.starts_at, 'sets', b.sets,
                                                  'score_summary', b.score_summary,
                                                  'opponents', core.season_people(b.match_id, b.side, false),
                                                  'tournament', (select t.name from core.tournaments t where t.id = b.tournament_id))
                          from best b),
           'ladder', v_ladder)
    into v_more;
  return v_base || v_more;
end;
$$;

create or replace function api.my_season(p_month text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_month   text := coalesce(nullif(btrim(coalesce(p_month, '')), ''), core.month_key());
  v_prev    text;
  v_player  uuid;
  v_sport   text;
  v_pro     boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'bad_month' using errcode = '22023'; end if;
  select claimed_player_id, primary_sport into v_player, v_sport
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_prev := to_char(to_date(v_month || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM');
  v_pro := core.is_pro(v_uid);

  return jsonb_build_object(
    'month', v_month,
    'prev_month', v_prev,
    'pro', v_pro,
    'has_player', v_player is not null,
    'now', core.season_numbers(v_uid, v_player, v_sport, v_month, v_pro),
    'prev', case when v_pro then core.season_numbers(v_uid, v_player, v_sport, v_prev, true) end,
    'free_card', core.first_win_of_month(v_player, v_sport, v_month));
end;
$$;

revoke all on function api.my_season(text) from public, anon;
grant execute on function api.my_season(text) to authenticated, service_role;

create or replace function api.win_card(p_match uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_player uuid;
  v_sport  text;
  v_side   smallint;
  v_m      core.matches;
  v_r      core.match_results;
  v_free   boolean;
  v_pro    boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id, primary_sport into v_player, v_sport
    from core.profiles where user_id = v_uid and deleted_at is null;
  select * into v_m from core.matches where id = p_match;
  select * into v_r from core.match_results where match_id = p_match;
  select side into v_side from core.match_participants where match_id = p_match and player_id = v_player;
  if v_player is null or v_m.id is null or v_r.match_id is null or v_side is null
     or not v_m.approved or v_m.status in ('void', 'disputed') or v_m.sport_id <> v_sport
     or v_r.walkover or v_r.winner_side <> v_side or v_m.starts_at is null then
    raise exception 'not_your_win' using errcode = '42501';
  end if;
  if not core.win_shareable(p_match) then raise exception 'not_shareable' using errcode = '42501'; end if;

  v_free := core.first_win_of_month(v_player, v_sport, core.month_key(v_m.starts_at)) = p_match;
  v_pro := core.is_pro(v_uid);
  if not v_pro and not coalesce(v_free, false) then raise exception 'pro_required' using errcode = '42501'; end if;

  return jsonb_build_object(
    'match_id', v_m.id,
    'starts_at', v_m.starts_at,
    'format', v_m.format,
    'tournament', (select t.name from core.tournaments t where t.id = v_m.tournament_id),
    'category', (select e.name from core.tournament_events e where e.id = v_m.event_id),
    'round', v_m.round,
    'sets', v_r.sets,
    'score_summary', v_r.score_summary,
    'retired', v_r.retired,
    'me', core.season_people(p_match, v_side, true),
    'opponents', core.season_people(p_match, v_side, false),
    'pro', v_pro,
    'free', coalesce(v_free, false));
end;
$$;

revoke all on function api.win_card(uuid) from public, anon;
grant execute on function api.win_card(uuid) to authenticated, service_role;
