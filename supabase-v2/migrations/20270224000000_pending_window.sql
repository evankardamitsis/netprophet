-- Points in the air count today and tomorrow only (founder, 20 Oct): a vote on a match days ahead no longer inflates
-- «Έχεις +{n} στον αέρα» on Κατάταξη, nor «αν πέσεις μέσα σε όλα» on Εγώ, and the open matches waiting for your vote
-- count only today's and tomorrow's.
--   * core.in_vote_window(starts_at): the match starts on or before the end of tomorrow, with the day split exactly as
--     get_feed splits Σήμερα (the match's Athens date against core.feed_day, so from 23:00 Athens tomorrow is already
--     today). No lower bound: a vote on a match that already started and still waits for its result counts. A match
--     with no start time is outside the window;
--   * get_ladder: pending and open_votes use it, body otherwise as in 20261130000000_m3_leagues.sql;
--   * core.pending_vote_points (behind get_me_page votes.waiting and votes.pending_points) uses it;
--   * get_me_page: votes.open uses it, body otherwise as in 20261108000000_m1_me.sql.
-- Grants as before.

create or replace function core.in_vote_window(p_starts_at timestamptz, p_now timestamptz default now())
returns boolean language sql stable parallel safe set search_path = ''
as $$ select coalesce((p_starts_at at time zone 'Europe/Athens')::date <= core.feed_day(p_now) + 1, false) $$;
revoke all on function core.in_vote_window(timestamptz, timestamptz) from public, anon, authenticated;

-- what one user's votes still waiting for a result pay if they come in, today's and tomorrow's matches only
create or replace function core.pending_vote_points(p_user uuid, p_rules jsonb)
returns table (waiting int, points int)
language sql stable set search_path = core, pg_temp
as $$
  select count(*)::int,
         coalesce(sum(case when core.is_upset(case v.option when 1 then s.side1 else s.side2 end, s.total, p_rules)
                           then (p_rules ->> 'upset')::int else (p_rules ->> 'correct')::int end), 0)::int
    from core.votes v
    join core.matches m on m.id = v.subject_id
    cross join lateral (
      select count(*)::int as total,
             count(*) filter (where vv.option = 1)::int as side1,
             count(*) filter (where vv.option = 2)::int as side2
        from core.votes vv where vv.subject_type = 'match' and vv.subject_id = m.id
    ) s
   where v.user_id = p_user and v.subject_type = 'match' and v.resolved_at is null and m.status <> 'void'
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
     and core.in_vote_window(m.starts_at)
$$;

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
  v_league  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_scope is null or p_scope not in ('league', 'friends', 'all') then
    raise exception 'bad_scope' using errcode = '22023';
  end if;
  select primary_sport, claimed_player_id into v_sport, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  v_rules := core.sport_rules(v_sport);
  -- my Κατηγορία this month (joined on the first vote of the month)
  select lm.league_id into v_league
    from core.league_members lm join core.leagues l on l.id = lm.league_id
   where lm.user_id = v_uid and l.month_key = v_month;

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
    union
    select lm.user_id from core.league_members lm where p_scope = 'league' and lm.league_id = v_league
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
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
     and core.in_vote_window(m.starts_at);

  -- open matches you can still vote on (same filter as get_feed), today's and tomorrow's only
  select count(*)::int into v_open
    from core.matches m
   where m.sport_id = v_sport and m.approved and core.match_is_open(m) and core.in_vote_window(m.starts_at)
     and not exists (select 1 from core.votes mv
                      where mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id)
     and not exists (select 1 from core.match_participants mp
                       join core.players p on p.id = mp.player_id
                      where mp.match_id = m.id and (p.hidden or mp.player_id = v_claimed));

  return v_board || jsonb_build_object(
    'scope', p_scope,
    'has_league', v_league is not null,
    'league', (select jsonb_build_object('tier', l.tier, 'group_no', l.group_no,
                                         'size', (select count(*) from core.league_members m where m.league_id = l.id),
                                         'promote_top', 5, 'relegate_from', 16, 'award_top', 3)
                 from core.leagues l where l.id = v_league),
    'month_key', v_month,
    'days_left', ((date_trunc('month', v_today) + interval '1 month')::date - v_today),
    'streak', coalesce((select gs.streak from core.user_game_state gs where gs.user_id = v_uid), 0),
    'pending', v_pending,
    'open_votes', v_open);
end;
$$;

revoke all on function api.get_ladder(text, int) from public, anon;
grant execute on function api.get_ladder(text, int) to authenticated, service_role;

create or replace function api.get_me_page()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
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
       where mp.player_id = v_claimed and m.sport_id = v_sport and m.approved and m.status <> 'void'
         and extract(year from core.athens_day(m.starts_at)) = v_year) end,
    'matches', case when v_claimed is null then 0 else (
      select count(*)::int
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = v_claimed and m.approved and m.status <> 'void') end,
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
$$;

revoke all on function api.get_me_page() from public, anon;
grant execute on function api.get_me_page() to authenticated, service_role;
