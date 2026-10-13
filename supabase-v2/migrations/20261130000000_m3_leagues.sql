-- M3 part 6: leagues (Κατηγορία) and the month close. Monthly, as in the spec (the prototype's Monday roll is a
-- demo shortcut). A player joins a group of 20 on their first vote of the month: their tier comes from last month's
-- close (up, down or the same; Χάλκινη the first time), into the newest group of that tier with room, else a new
-- one. On the 1st the past month closes: core.league_close_group (a copy of closeGroup in packages/core, checked
-- on test-vectors/leaderboard.json) ranks each group, top 5 with points go up (not above Χρυσή), 16 to 20 go down
-- (not below Χάλκινη), the top 3 with points get Frame «Κορυφαίος του μήνα» and count towards the month_top badge,
-- and everyone with points gets the «Κατάταξη · …» moment. The feed_inbox kind 'month_close' stays unused: the
-- moment is a celebration (payload.type 'league'). No countdown line on the screen (founder, 12 Oct).

alter table core.leagues add column closed_at timestamptz;
alter table core.league_members add column final_points int;

-- ---------------------------------------------------------------------------
-- The rule (parity with closeGroup)
-- ---------------------------------------------------------------------------
-- entries: [{userId, points, lastPointAt, league, groupId}] → [{userId, groupId, position, league, movement,
-- nextLeague, topThreeAward}] in position order
create or replace function core.league_close_group(p_group jsonb)
returns jsonb
language sql immutable set search_path = core, pg_temp
as $$
  with e as (
    select x ->> 'userId' as user_id, (x ->> 'points')::int as points, (x ->> 'lastPointAt')::timestamptz as last_at,
           x ->> 'league' as league, x ->> 'groupId' as group_id
      from jsonb_array_elements(p_group) x
  ),
  r as (
    select e.*, row_number() over (order by points desc, last_at asc nulls last, user_id collate "C")::int as position
      from e
  ),
  m as (
    select r.*,
           case when position <= 5 and points > 0 and league <> 'gold' then 'promote'
                when position >= 16 and league <> 'bronze' then 'relegate'
                else 'stay' end as movement
      from r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', user_id, 'groupId', group_id, 'position', position, 'league', league, 'movement', movement,
           'nextLeague', case movement when 'promote' then case league when 'bronze' then 'silver' else 'gold' end
                                       when 'relegate' then case league when 'gold' then 'silver' else 'bronze' end
                                       else league end,
           'topThreeAward', position <= 3 and points > 0) order by position), '[]'::jsonb)
    from m
$$;

-- ---------------------------------------------------------------------------
-- Joining: the first vote of the month
-- ---------------------------------------------------------------------------
create or replace function core.league_join(p_user uuid, p_month text default core.month_key())
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_league uuid;
  v_tier   text;
  v_last   record;
begin
  select lm.league_id into v_league
    from core.league_members lm join core.leagues l on l.id = lm.league_id
   where lm.user_id = p_user and l.month_key = p_month;
  if v_league is not null then return v_league; end if;

  select l.tier, lm.outcome into v_last
    from core.league_members lm join core.leagues l on l.id = lm.league_id
   where lm.user_id = p_user and l.month_key < p_month
   order by l.month_key desc limit 1;
  v_tier := case
              when v_last.tier is null then 'bronze'
              when v_last.outcome = 'promoted' then case v_last.tier when 'bronze' then 'silver' else 'gold' end
              when v_last.outcome = 'relegated' then case v_last.tier when 'gold' then 'silver' else 'bronze' end
              else v_last.tier
            end;

  perform pg_advisory_xact_lock(hashtext('league:' || p_month || ':' || v_tier));
  select l.id into v_league
    from core.leagues l
   where l.month_key = p_month and l.tier = v_tier and l.closed_at is null
     and (select count(*) from core.league_members m where m.league_id = l.id) < 20
   order by l.group_no desc limit 1;
  if v_league is null then
    insert into core.leagues (month_key, tier, group_no)
    values (p_month, v_tier, coalesce((select max(group_no) from core.leagues where month_key = p_month and tier = v_tier), 0) + 1)
    returning id into v_league;
  end if;
  insert into core.league_members (league_id, user_id) values (v_league, p_user);
  return v_league;
end;
$$;
revoke all on function core.league_join(uuid, text) from public;

create or replace function core.league_on_vote()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.league_join(new.user_id, core.month_key(new.created_at));
  return null;
end;
$$;
create trigger league_on_vote after insert on core.votes for each row execute function core.league_on_vote();

-- ---------------------------------------------------------------------------
-- The month close
-- ---------------------------------------------------------------------------
create or replace function core.league_close(p_league uuid)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_l     core.leagues;
  v_res   jsonb;
  r       jsonb;
  v_pts   int;
  v_n     int := 0;
begin
  select * into v_l from core.leagues where id = p_league for update;
  if v_l.id is null or v_l.closed_at is not null then return 0; end if;

  v_res := core.league_close_group((
    select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'points', coalesce(p.points, 0),
                                                 'lastPointAt', p.last_at, 'league', v_l.tier, 'groupId', v_l.id)), '[]'::jsonb)
      from core.league_members m
      left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                   from core.points_ledger where month_key = v_l.month_key group by user_id) p on p.user_id = m.user_id
     where m.league_id = v_l.id));

  for r in select value from jsonb_array_elements(v_res) loop
    v_pts := coalesce((select sum(delta)::int from core.points_ledger
                        where user_id = (r ->> 'userId')::uuid and month_key = v_l.month_key), 0);
    update core.league_members
       set final_rank = (r ->> 'position')::int, final_points = v_pts,
           outcome = case r ->> 'movement' when 'promote' then 'promoted' when 'relegate' then 'relegated' else 'stayed' end
     where league_id = v_l.id and user_id = (r ->> 'userId')::uuid;
    if (r ->> 'topThreeAward')::boolean then
      insert into core.user_cosmetics (user_id, item_id, source)
      select (r ->> 'userId')::uuid, id, 'earned' from core.cosmetic_items where key = 'frame_month_top'
      on conflict do nothing;
    end if;
    if v_pts > 0 then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values ((r ->> 'userId')::uuid, 'celebration', 'league:' || v_l.id,
              jsonb_build_object('type', 'league', 'month', v_l.month_key, 'tier', v_l.tier,
                                 'position', (r ->> 'position')::int, 'movement', r ->> 'movement',
                                 'next_tier', r ->> 'nextLeague', 'award', (r ->> 'topThreeAward')::boolean))
      on conflict (user_id, kind, ref) do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  update core.leagues set closed_at = now() where id = v_l.id;
  -- the top 3 count towards «Κορυφαίος του μήνα»
  perform core.badges_refresh((x ->> 'userId')::uuid) from jsonb_array_elements(v_res) x;
  return v_n;
end;
$$;
revoke all on function core.league_close(uuid) from public;

-- every past month still open (self-healing if a night is missed); daily just after midnight Athens
create or replace function core.league_tick()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_id uuid; v_n int := 0;
begin
  for v_id in select id from core.leagues where month_key < core.month_key() and closed_at is null order by month_key, tier, group_no loop
    v_n := v_n + core.league_close(v_id);
  end loop;
  return v_n;
end;
$$;
revoke all on function core.league_tick() from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-league-close', '10 22 * * *', $c$select core.league_tick()$c$);
  end if;
end;
$$;

-- staff: close a month now (demos before the 1st)
create or replace function api.admin_league_close(p_month text default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_id uuid; v_n int := 0; v_month text := coalesce(p_month, core.month_key());
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  for v_id in select id from core.leagues where month_key = v_month and closed_at is null loop
    v_n := v_n + core.league_close(v_id);
  end loop;
  return jsonb_build_object('month', v_month, 'closed_players', v_n);
end;
$$;
revoke all on function api.admin_league_close(text) from public, anon;
grant execute on function api.admin_league_close(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Badges: «Κορυφαίος του μήνα» now counts (top 3 with points)
-- ---------------------------------------------------------------------------
create or replace function core.badge_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  played as (   -- matches with a result the player was in, and their side
    select m.id, m.format, m.starts_at, mp.side
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id and mp.player_id in (select id from me)
     where m.status <> 'void' and exists (select 1 from core.match_results r where r.match_id = m.id)
  ),
  weeks as (    -- the Mondays of the weeks with a played match
    select distinct (d - (extract(isodow from d)::int - 1)) as wk
      from (select core.athens_day(starts_at) as d from played where starts_at is not null) x
  ),
  runs as (     -- consecutive weeks share wk - 7·rank
    select count(*) as n from (select wk, wk - (7 * row_number() over (order by wk))::int as grp from weeks) w group by grp
  ),
  vote_weeks as (
    select (day_key - (extract(isodow from day_key)::int - 1)) as wk, count(distinct day_key) as days
      from core.votes where user_id = p_user group by 1
  ),
  facts as (
    select 'first_serve' as k, (select count(*) from core.matches
                                 where logged_by = p_user and source = 'user' and status <> 'void')::int as n
    union all
    select 'nice_player', (select count(*) from core.match_confirmations c join core.matches m on m.id = c.match_id
                            where m.logged_by = p_user and m.status <> 'void' and c.state = 'confirmed'
                              and c.player_id not in (select id from me))::int
    union all
    select 'gentleman', (select count(*) from core.kudos where from_user_id = p_user)::int
    union all
    select 'beloved', (select count(distinct from_user_id) from core.kudos where to_player_id in (select id from me))::int
    union all
    select 'club_oracle', (select count(*) from core.votes where user_id = p_user and outcome = 'correct')::int
    union all
    select 'upset', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and is_upset_call)::int
    union all
    select 'in_a_row', coalesce((select streak_best from core.user_game_state where user_id = p_user), 0)
    union all
    select 'whole_week', (select count(*) from vote_weeks where days = 7)::int
    union all
    select 'doubles_player', (select count(*) from played p where p.format <> 'singles'
                               and exists (select 1 from core.match_confirmations c join core.match_participants mp
                                             on mp.match_id = c.match_id and mp.player_id = c.player_id
                                            where c.match_id = p.id and c.state = 'confirmed' and mp.side = p.side
                                              and c.player_id not in (select id from me)))::int
    union all
    select 'variety', (select count(distinct mp.player_id) from played p
                         join core.match_participants mp on mp.match_id = p.id and mp.side <> p.side)::int
    union all
    select 'steady', coalesce((select max(n) from runs), 0)::int
    union all
    select 'many_votes', (select count(*) from core.votes where user_id = p_user)::int
    union all
    select 'month_top', (select count(*) from core.league_members lm
                          where lm.user_id = p_user and lm.final_rank <= 3 and lm.final_points > 0)::int
  ),
  bonus as (    -- what quests gave: «+5 στο badge …»
    select reward ->> 'key' as k, sum((reward ->> 'amount')::int)::int as n
      from core.user_quest_progress where user_id = p_user and reward ->> 'kind' = 'badge' group by 1
  )
  select jsonb_object_agg(d.key, coalesce(f.n, 0) + coalesce(b.n, 0))
    from core.badge_defs d
    left join facts f on f.k = d.key
    left join bonus b on b.k = d.key
$$;


-- ---------------------------------------------------------------------------
-- Κατάταξη: the «Κατηγορία» scope (the 20261107 get_ladder plus the league)
-- ---------------------------------------------------------------------------
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

-- this month so far: everyone with points joins a Χάλκινη group, the most points first; the rest join on their next vote
do $$
declare v_u uuid;
begin
  for v_u in
    select user_id from core.points_ledger where month_key = core.month_key()
     group by user_id having sum(delta) > 0 order by sum(delta) desc, max(created_at), user_id::text collate "C"
  loop
    perform core.league_join(v_u);
  end loop;
end;
$$;
