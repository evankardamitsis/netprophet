-- M1 Κατάταξη: this month's points, ranked, in two scopes.
--   friends: the viewer and the accounts behind the players they follow (either relation), even at 0 points
--   all:     everyone with points this month, and the viewer
-- Ranking mirrors packages/core leaderboard compareEntries: points desc, then who reached them first (the time of
-- their last point this month), then user id. Positions are unique (row_number), not shared like
-- api.leaderboard_monthly. Leagues (Κατηγορία), their bands and the month close come with M3.
--
-- Also returns what the screen says around the board: days left in the month (Athens), the points to pass the
-- row above (core pointsToNextPosition: the gap plus one), the points «στον αέρα» on votes still waiting for a
-- result (with today's split, the resolver's upset rule) and how many open matches you have not voted on yet.

create or replace function api.get_ladder(p_scope text default 'friends', p_limit int default 20)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_limit   int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_month   text := core.month_key();
  v_today   date := core.athens_day();
  v_sport   text;
  v_claimed uuid;
  v_rules   jsonb;
  v_board   jsonb;
  v_pending int;
  v_open    int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_scope is null or p_scope not in ('friends', 'all') then
    raise exception 'bad_scope' using errcode = '22023';
  end if;
  select primary_sport, claimed_player_id into v_sport, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_rules := core.sport_rules(v_sport);

  with pts as (
    select l.user_id, sum(l.delta)::int as points, max(l.created_at) as last_point_at
      from core.points_ledger l
     where l.month_key = v_month
     group by l.user_id
  ),
  pool as (
    select v_uid as user_id
    union
    select p.claimed_by_user_id
      from core.follows f
      join core.players p on p.id = f.player_id
     where p_scope = 'friends' and f.user_id = v_uid and p.claimed_by_user_id is not null
    union
    select pts.user_id from pts where p_scope = 'all' and pts.points > 0
  ),
  ranked as (
    select pool.user_id, coalesce(pts.points, 0) as points, pts.last_point_at,
           row_number() over (order by coalesce(pts.points, 0) desc, pts.last_point_at asc nulls last,
                                       pool.user_id::text collate "C")::int as position
      from pool
      join core.profiles pr on pr.user_id = pool.user_id and pr.deleted_at is null
      left join pts on pts.user_id = pool.user_id
  ),
  named as (
    select r.*, coalesce(pl.first_name, pr.first_name) as first_name, coalesce(pl.surname, pr.surname) as surname,
           pr.display_name, r.user_id = v_uid as is_me
      from ranked r
      join core.profiles pr on pr.user_id = r.user_id
      left join core.players pl on pl.id = pr.claimed_player_id
  )
  select jsonb_build_object(
           'total', (select count(*) from named),
           'rows', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'position', n.position, 'user_id', n.user_id, 'first_name', n.first_name, 'surname', n.surname,
                      'display_name', n.display_name, 'points', n.points, 'last_point_at', n.last_point_at,
                      'is_me', n.is_me) order by n.position)
               from named n where n.position <= v_limit or n.is_me), '[]'::jsonb),
           'me', (select jsonb_build_object(
                    'position', me.position, 'points', me.points,
                    'to_next', case when ab.user_id is not null then ab.points - me.points + 1 end,
                    'above', case when ab.user_id is not null then jsonb_build_object(
                               'first_name', ab.first_name, 'surname', ab.surname, 'display_name', ab.display_name) end)
                    from named me
                    left join named ab on ab.position = me.position - 1
                   where me.is_me))
    into v_board;

  -- votes still waiting for a result: what they pay if they come in, with the split as it is now
  select coalesce(sum(case when core.is_upset(case v.option when 1 then s.side1 else s.side2 end, s.total, v_rules)
                           then (v_rules ->> 'upset')::int else (v_rules ->> 'correct')::int end), 0)::int
    into v_pending
    from core.votes v
    join core.matches m on m.id = v.subject_id
    cross join lateral (
      select count(*)::int as total,
             count(*) filter (where vv.option = 1)::int as side1,
             count(*) filter (where vv.option = 2)::int as side2
        from core.votes vv where vv.subject_type = 'match' and vv.subject_id = m.id
    ) s
   where v.user_id = v_uid and v.subject_type = 'match' and v.resolved_at is null and m.status <> 'void'
     and not exists (select 1 from core.match_results r where r.match_id = m.id);

  -- open matches you can still vote on (same filter as get_feed)
  select count(*)::int into v_open
    from core.matches m
   where m.sport_id = v_sport and m.approved and core.match_is_open(m)
     and not exists (select 1 from core.votes mv
                      where mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id)
     and not exists (select 1 from core.match_participants mp
                       join core.players p on p.id = mp.player_id
                      where mp.match_id = m.id and (p.hidden or mp.player_id = v_claimed));

  return v_board || jsonb_build_object(
    'scope', p_scope,
    'month_key', v_month,
    'days_left', ((date_trunc('month', v_today) + interval '1 month')::date - v_today),
    'streak', coalesce((select gs.streak from core.user_game_state gs where gs.user_id = v_uid), 0),
    'pending', v_pending,
    'open_votes', v_open);
end;
$$;

revoke all on function api.get_ladder(text, int) from public, anon;
grant execute on function api.get_ladder(text, int) to authenticated, service_role;
