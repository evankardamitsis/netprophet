-- Demo data for the founder's phone demos (12 Oct 2026): upcoming matches and recent results between real roster
-- players of similar level, so a fresh account sees a full feed, Αποτελέσματα and Παίκτες. Every demo match carries
-- provenance.demo = true and leaves with core.seed_demo(false). Run with `scripts/v2-db-remote.sh demo on|off`
-- or from admin (api.admin_demo). Never meant for production.

create or replace function core.seed_demo(p_on boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_ids     uuid[];
  v_n       int;
  v_tours   uuid[];
  v_today   date := core.athens_day();
  v_match   uuid;
  v_at      timestamptz;
  v_i       int;
  v_up      int := 0;
  v_done    int := 0;
  v_win     int;
  v_sets    jsonb;
  v_hours   int[] := array[10, 11, 12, 13, 17, 18, 19, 20];
  v_scores  jsonb[] := array['[{"w":6,"l":4},{"w":6,"l":3}]', '[{"w":6,"l":2},{"w":7,"l":5}]', '[{"w":4,"l":6},{"w":6,"l":3},{"w":10,"l":7,"stb":true}]',
                               '[{"w":7,"l":6,"tb":[7,4]},{"w":6,"l":4}]', '[{"w":6,"l":1},{"w":6,"l":2}]', '[{"w":3,"l":6},{"w":6,"l":4},{"w":6,"l":3}]']::jsonb[];
begin
  -- remove what an earlier run made (votes and their result cards with it)
  delete from core.feed_inbox where kind = 'result' and (payload ->> 'match_id')::uuid in (select id from core.matches where provenance ? 'demo');
  delete from core.votes where subject_type = 'match' and subject_id in (select id from core.matches where provenance ? 'demo');
  delete from core.matches where provenance ? 'demo';
  if not p_on then
    perform core.recompute_levels('tennis');
    return jsonb_build_object('demo', false);
  end if;

  -- 64 rated roster players (men or unknown), sorted by level so neighbours make even matches
  select array_agg(id order by lvl, id) into v_ids
    from (select p.id, ps.initial_level as lvl
            from core.players p join core.player_sports ps on ps.player_id = p.id and ps.sport_id = 'tennis'
           where p.status = 'active' and not p.hidden and not p.is_minor and ps.initial_level is not null
             and p.gender is distinct from 'f'                -- singles never pair a man with a woman
           order by random() limit 64) x;
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 8 then raise exception 'not_enough_players' using errcode = 'P0002'; end if;
  select array_agg(id) into v_tours from core.tournaments where active;

  -- coming up: today (later hours only) and the next three days; every fourth is a doubles match
  for v_i in 0..15 loop
    v_at := ((v_today + (v_i / 4)) + make_time(v_hours[1 + (v_i * 3) % 8], case when v_i % 2 = 0 then 0 else 30 end, 0))
            at time zone 'Europe/Athens';
    if v_at < now() + interval '1 hour' then v_at := v_at + interval '1 day'; end if;
    insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, approved, provenance)
    values ('tennis', case when v_i % 4 = 3 then 'doubles' else 'singles' end, 'scheduled', v_at,
            case when v_i % 3 = 0 or v_tours is null then null else v_tours[1 + v_i % array_length(v_tours, 1)] end,
            'admin', true, jsonb_build_object('demo', true))
    returning id into v_match;
    if v_i % 4 = 3 then
      insert into core.match_participants (match_id, side, player_id, position) values
        (v_match, 1, v_ids[1 + (0 + v_i * 4) % v_n], 1), (v_match, 1, v_ids[1 + (1 + v_i * 4) % v_n], 2),
        (v_match, 2, v_ids[1 + (2 + v_i * 4) % v_n], 1), (v_match, 2, v_ids[1 + (3 + v_i * 4) % v_n], 2);
    else
      insert into core.match_participants (match_id, side, player_id, position) values
        (v_match, 1, v_ids[1 + (0 + v_i * 4) % v_n], 1), (v_match, 2, v_ids[1 + (1 + v_i * 4) % v_n], 1);
    end if;
    v_up := v_up + 1;
  end loop;

  -- played over the last week, with set scores
  for v_i in 0..13 loop
    v_at := ((v_today - (1 + v_i / 2)) + make_time(v_hours[1 + (v_i * 5) % 8], 0, 0)) at time zone 'Europe/Athens';
    insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, approved, counts_for_levels, provenance)
    values ('tennis', 'singles', 'scheduled', v_at,
            case when v_i % 3 = 0 or v_tours is null then null else v_tours[1 + v_i % array_length(v_tours, 1)] end,
            'admin', true, true, jsonb_build_object('demo', true))
    returning id into v_match;
    insert into core.match_participants (match_id, side, player_id, position) values
      (v_match, 1, v_ids[1 + (2 + v_i * 4) % v_n], 1), (v_match, 2, v_ids[1 + (3 + v_i * 4) % v_n], 1);
    v_win := case when random() < 0.65 then 2 else 1 end;     -- the higher-rated side (2) wins most often
    v_sets := v_scores[1 + v_i % 6];
    perform core.set_result(v_match, v_win, v_sets, null, null, false, false, null);
    v_done := v_done + 1;
  end loop;

  perform core.recompute_levels('tennis');
  return jsonb_build_object('demo', true, 'upcoming', v_up, 'results', v_done);
end;
$$;
revoke all on function core.seed_demo(boolean) from public;

create or replace function api.admin_demo(p_on boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.seed_demo(p_on);
end;
$$;
revoke all on function api.admin_demo(boolean) from public, anon;
grant execute on function api.admin_demo(boolean) to authenticated, service_role;
