-- M3 part 1: level algorithm v1 (docs/v2/level-algorithm.md).
--   core.level_compute(jsonb) is the pure math, the same as packages/core/src/rules/level.ts; both run
--   packages/core/test-vectors/levels.json. core.recompute_levels(sport) builds the input from the database
--   (start values, counting matches oldest first, the accuracy-weighted vote split), writes player_sports and one
--   level_snapshots row per active player per Athens day. Nightly at 00:30 UTC; staff can run it from admin.
--   The defaults live in sports.config.rules.level (camelCase, as in TS) and can be tuned there.
--   Founder, 12 Oct 2026: levels go in halves and never round up (4.37 is level 4, 4.5 is 4,5), so the shown level
--   becomes numeric; every win counts the same (2-1 like 2-0).

-- the shown level in halves
drop view api.player_sports;
alter table core.player_sports alter column level_tier type numeric(3, 1);
alter table core.level_snapshots alter column tier type numeric(3, 1);
create view api.player_sports with (security_invoker = true) as
  select player_id, sport_id, hand, level_tier, level_direction, level_status, record, form
    from core.player_sports;
grant select on api.player_sports to authenticated, service_role;

drop function api.search_players(text, int);
create function api.search_players(p_query text, p_limit int default 20)
returns table (id uuid, first_name text, surname text, area_id text, photo_path text,
               level_tier numeric, level_direction text, is_claimed boolean, is_followed boolean)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $f$
declare
  v_uid uuid := auth.uid();
  v_q   text := core.normalize_search(p_query);
  v_tokens text[];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_q = '' then return; end if;
  v_tokens := string_to_array(v_q, ' ');
  return query
  select p.id, p.first_name, p.surname, p.area_id, p.photo_path, ps.level_tier, ps.level_direction,
         (p.claimed_by_user_id is not null),
         exists (select 1 from core.follows f where f.user_id = v_uid and f.player_id = p.id)
    from core.players p
    left join core.player_sports ps
           on ps.player_id = p.id
          and ps.sport_id = (select primary_sport from core.profiles where user_id = v_uid)
   where not p.hidden and not p.is_minor and p.status = 'active'
     and (select bool_and(p.search_norm like '%' || t || '%') from unnest(v_tokens) t)
   order by (p.surname_norm = v_q) desc, similarity(p.search_norm, v_q) desc, p.surname, p.first_name
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$f$;
revoke all on function api.search_players(text, int) from public, anon;
grant execute on function api.search_players(text, int) to authenticated, service_role;

update core.sports
   set config = jsonb_set(config, '{rules,level}', $lv${
     "defaultLevel": 3, "min": 1, "max": 7, "scale": 0.6, "kStart": 0.4, "kEnd": 0.1, "kMatches": 10,
     "twoOneScore": 1, "crowdWeight": 0.25, "crowdMinVotes": 10, "pendingMatches": 3, "pendingVotes": 10,
     "directionDelta": 0.1, "algoVersion": 1
   }$lv$::jsonb, true)
 where id = 'tennis';

-- the math: p = {config?, players: [{id, initial}], matches: [{id, sides: [[ids], [ids]], winner, setsLost, retired?,
-- crowd: {votes, w1, w2} | null}]}; returns [{id, value, tier, status, matches, votes, upsetIndex}] sorted by id
create or replace function core.level_compute(p jsonb)
returns jsonb
language plpgsql immutable set search_path = core, pg_temp
as $$
declare
  c        jsonb := jsonb_build_object('defaultLevel', 3, 'min', 1, 'max', 7, 'scale', 0.6, 'kStart', 0.4, 'kEnd', 0.1,
                                       'kMatches', 10, 'twoOneScore', 1, 'crowdWeight', 0.25, 'crowdMinVotes', 10,
                                       'pendingMatches', 3, 'pendingVotes', 10) || coalesce(p -> 'config', '{}'::jsonb);
  v_def    float8 := (c ->> 'defaultLevel')::float8;
  v_min    float8 := (c ->> 'min')::float8;
  v_max    float8 := (c ->> 'max')::float8;
  v_scale  float8 := (c ->> 'scale')::float8;
  v_k0     float8 := (c ->> 'kStart')::float8;
  v_k1     float8 := (c ->> 'kEnd')::float8;
  v_kn     float8 := (c ->> 'kMatches')::float8;
  v_two    float8 := (c ->> 'twoOneScore')::float8;
  v_cw     float8 := (c ->> 'crowdWeight')::float8;
  v_cmin   int := (c ->> 'crowdMinVotes')::int;
  v_pm     int := (c ->> 'pendingMatches')::int;
  v_pv     int := (c ->> 'pendingVotes')::int;
  -- per player: rating, has a start value, matches, votes, wins with a crowd, underdog wins
  r        jsonb := '{}'::jsonb;
  pl       jsonb;
  m        jsonb;
  v_avg1   float8;
  v_avg2   float8;
  v_e1     float8;
  v_win    float8;
  v_s1     float8;
  v_crowd  float8;
  v_moves  jsonb;
  v_side   int;
  v_pid    text;
  v_st     jsonb;
  v_k      float8;
  v_e      float8;
  v_s      float8;
  v_cr     float8;
  v_votes  int;
  v_out    jsonb := '[]'::jsonb;
  v_val    float8;
  v_active boolean;
begin
  for pl in select * from jsonb_array_elements(coalesce(p -> 'players', '[]'::jsonb)) loop
    r := r || jsonb_build_object(pl ->> 'id', jsonb_build_object(
           'r', coalesce((pl ->> 'initial')::float8, v_def), 'init', pl -> 'initial' is not null and jsonb_typeof(pl -> 'initial') <> 'null',
           'n', 0, 'v', 0, 'cw', 0, 'uw', 0));
  end loop;

  for m in select * from jsonb_array_elements(coalesce(p -> 'matches', '[]'::jsonb)) loop
    -- players first seen in a match start at the default
    for v_pid in select jsonb_array_elements_text(s) from jsonb_array_elements(m -> 'sides') s loop
      if not r ? v_pid then
        r := r || jsonb_build_object(v_pid, jsonb_build_object('r', v_def, 'init', false, 'n', 0, 'v', 0, 'cw', 0, 'uw', 0));
      end if;
    end loop;
    select avg((r -> x ->> 'r')::float8) into v_avg1 from jsonb_array_elements_text(m -> 'sides' -> 0) x;
    select avg((r -> x ->> 'r')::float8) into v_avg2 from jsonb_array_elements_text(m -> 'sides' -> 1) x;
    v_e1 := 1 / (1 + exp(-(v_avg1 - v_avg2) / v_scale));
    v_win := case when (m ->> 'setsLost')::int = 0 and not coalesce((m ->> 'retired')::boolean, false) then 1 else v_two end;
    v_s1 := case when (m ->> 'winner')::int = 1 then v_win else 1 - v_win end;
    v_votes := coalesce((m -> 'crowd' ->> 'votes')::int, 0);
    v_crowd := case when jsonb_typeof(m -> 'crowd') = 'object' and v_votes >= v_cmin
                         and (m -> 'crowd' ->> 'w1')::float8 + (m -> 'crowd' ->> 'w2')::float8 > 0
                    then (m -> 'crowd' ->> 'w1')::float8 / ((m -> 'crowd' ->> 'w1')::float8 + (m -> 'crowd' ->> 'w2')::float8) end;

    -- every move from the ratings before this match
    v_moves := '{}'::jsonb;
    for v_side in 0..1 loop
      v_e := case when v_side = 0 then v_e1 else 1 - v_e1 end;
      v_s := case when v_side = 0 then v_s1 else 1 - v_s1 end;
      v_cr := case when v_crowd is null then null when v_side = 0 then v_crowd else 1 - v_crowd end;
      for v_pid in select jsonb_array_elements_text(m -> 'sides' -> v_side) loop
        v_st := r -> v_pid;
        v_k := v_k1 + (v_k0 - v_k1) * greatest(0, 1 - (v_st ->> 'n')::float8 / v_kn);
        v_moves := v_moves || jsonb_build_object(v_pid,
                     v_k * (v_s - v_e) + case when v_cr is null then 0 else v_cw * v_k * (v_cr - v_e) end);
      end loop;
    end loop;
    for v_side in 0..1 loop
      for v_pid in select jsonb_array_elements_text(m -> 'sides' -> v_side) loop
        v_st := r -> v_pid;
        v_cr := case when v_crowd is null then null when v_side = 0 then v_crowd else 1 - v_crowd end;
        v_st := v_st || jsonb_build_object(
          'r', least(v_max, greatest(v_min, (v_st ->> 'r')::float8 + (v_moves ->> v_pid)::float8)),
          'n', (v_st ->> 'n')::int + 1,
          'v', (v_st ->> 'v')::int + v_votes,
          'cw', (v_st ->> 'cw')::int + case when (m ->> 'winner')::int = v_side + 1 and v_cr is not null then 1 else 0 end,
          'uw', (v_st ->> 'uw')::int + case when (m ->> 'winner')::int = v_side + 1 and v_cr is not null and v_cr < 0.5 then 1 else 0 end);
        r := r || jsonb_build_object(v_pid, v_st);
      end loop;
    end loop;
  end loop;

  for v_pid, v_st in select key, value from jsonb_each(r) order by key collate "C" loop
    v_active := (v_st ->> 'init')::boolean or (v_st ->> 'n')::int >= v_pm or (v_st ->> 'v')::int >= v_pv;
    v_val := round(((v_st ->> 'r')::float8 * 10000)::numeric) / 10000;
    v_out := v_out || jsonb_build_object(
      'id', v_pid, 'value', v_val,
      'tier', case when v_active then least(v_max, greatest(v_min, floor(v_val * 2) / 2)) end,
      'status', case when v_active then 'active' else 'pending' end,
      'matches', (v_st ->> 'n')::int, 'votes', (v_st ->> 'v')::int,
      'upsetIndex', case when (v_st ->> 'cw')::int > 0
                         then round((10000.0 * (v_st ->> 'uw')::int / (v_st ->> 'cw')::int)::numeric) / 100 end);
  end loop;
  return v_out;
end;
$$;

create or replace function core.level_direction(p_now float8, p_week_ago float8, p_threshold float8 default 0.1)
returns text language sql immutable set search_path = pg_temp
as $$
  select case when p_week_ago is null then 'same'
              when round(((p_now - p_week_ago) * 10000)::numeric) / 10000 >= p_threshold then 'up'
              when round(((p_now - p_week_ago) * 10000)::numeric) / 10000 <= -p_threshold then 'down'
              else 'same' end
$$;

-- the database's input: start values, counting matches (oldest first), the crowd weighted by voter accuracy
create or replace function core.level_input(p_sport text)
returns jsonb
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  with acc as (
    select user_id, (count(*) filter (where outcome = 'correct') + 1)::float8 / (count(*) filter (where outcome in ('correct', 'wrong')) + 2) as a
      from core.votes where subject_type = 'match' and resolved_at is not null group by user_id
  ), counting as (
    select m.id, m.starts_at, r.winner_side, r.retired,
           coalesce(r.sets_lost, (select count(*) from jsonb_array_elements(r.sets) s where (s ->> 'l')::int > (s ->> 'w')::int))::int as sets_lost
      from core.matches m join core.match_results r on r.match_id = m.id
     where m.sport_id = p_sport and m.status = 'confirmed' and m.counts_for_levels and m.approved and not r.walkover
  )
  select jsonb_build_object(
    'config', coalesce((select config -> 'rules' -> 'level' from core.sports where id = p_sport), '{}'::jsonb),
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', ps.player_id, 'initial', ps.initial_level))
                           from core.player_sports ps join core.players p on p.id = ps.player_id
                          where ps.sport_id = p_sport and p.status <> 'merged'), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'sides', jsonb_build_array(
                 (select jsonb_agg(mp.player_id order by mp.position) from core.match_participants mp where mp.match_id = c.id and mp.side = 1),
                 (select jsonb_agg(mp.player_id order by mp.position) from core.match_participants mp where mp.match_id = c.id and mp.side = 2)),
               'winner', c.winner_side, 'setsLost', c.sets_lost, 'retired', c.retired,
               'crowd', (select case when count(*) > 0 then jsonb_build_object(
                                   'votes', count(*),
                                   'w1', coalesce(sum(coalesce(acc.a, 0.5)) filter (where v.option = 1), 0),
                                   'w2', coalesce(sum(coalesce(acc.a, 0.5)) filter (where v.option = 2), 0)) end
                           from core.votes v left join acc on acc.user_id = v.user_id
                          where v.subject_type = 'match' and v.subject_id = c.id))
             order by c.starts_at, c.id)
        from counting c), '[]'::jsonb))
$$;

-- recompute, write player_sports and today's snapshot; returns how many players got a value
create or replace function core.recompute_levels(p_sport text default 'tennis')
returns int
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_in    jsonb := core.level_input(p_sport);
  v_cfg   jsonb := v_in -> 'config';
  v_thr   float8 := coalesce((v_cfg ->> 'directionDelta')::float8, 0.1);
  v_ver   int := coalesce((v_cfg ->> 'algoVersion')::int, 1);
  v_today date := core.athens_day();
  v_n     int := 0;
  x       jsonb;
  v_week  float8;
  v_dir   text;
begin
  perform pg_advisory_xact_lock(hashtextextended('recompute_levels:' || p_sport, 0));
  delete from core.level_snapshots where sport_id = p_sport and core.athens_day(computed_at) = v_today;
  for x in select * from jsonb_array_elements(core.level_compute(v_in)) loop
    select value::float8 into v_week from core.level_snapshots
     where player_id = (x ->> 'id')::uuid and sport_id = p_sport and computed_at <= now() - interval '7 days'
     order by computed_at desc limit 1;
    v_dir := core.level_direction((x ->> 'value')::float8, v_week, v_thr);
    insert into core.player_sports (player_id, sport_id, level_value, level_tier, level_direction, level_status, upset_index, updated_at)
    values ((x ->> 'id')::uuid, p_sport, round((x ->> 'value')::numeric, 2), (x ->> 'tier')::numeric, v_dir, x ->> 'status',
            (x ->> 'upsetIndex')::numeric, now())
    on conflict (player_id, sport_id) do update
      set level_value = excluded.level_value, level_tier = excluded.level_tier, level_direction = excluded.level_direction,
          level_status = excluded.level_status, upset_index = excluded.upset_index, updated_at = now();
    if x ->> 'status' = 'active' then
      insert into core.level_snapshots (player_id, sport_id, value, tier, direction, inputs, algo_version)
      values ((x ->> 'id')::uuid, p_sport, round((x ->> 'value')::numeric, 2), (x ->> 'tier')::numeric, v_dir,
              jsonb_build_object('matches', x -> 'matches', 'votes', x -> 'votes'), v_ver);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.recompute_levels(text) from public;
revoke all on function core.level_input(text) from public;

-- staff: run it now
create or replace function api.admin_recompute_levels()
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not (core.is_staff() or core.is_service()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('players', core.recompute_levels('tennis'));
end;
$$;
revoke all on function api.admin_recompute_levels() from public, anon;
grant execute on function api.admin_recompute_levels() to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-recompute-levels', '30 0 * * *', $c$select core.recompute_levels('tennis')$c$);
  end if;
end;
$$;
