-- M1 Εγώ: the numbers the page shows beyond get_me and get_player.
--   record_year: this Athens year's wins and losses of your player, singles and doubles apart («Φέτος στα μονά»)
--   matches:     results of your player ever, for «Ματς · N από 3» while there is no level yet
--   votes:       resolved and correct («21/30»), waiting for a result and what they pay if they come in,
--                and the open matches you have not voted on
--   friends:     how many players you follow and the first five, newest first
-- An account without a player gets nulls for record_year and 0 matches.

-- what one user's votes still waiting for a result pay if they come in, with today's split
-- (the resolver's upset rule; get_ladder computes the same inline)
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
$$;

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
