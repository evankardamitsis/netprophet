-- M1 result cards: names on the card, resolution callable without a user session, a queue worker.
--   1. core.resolve_votes: the result card payload carries the sides (core.match_sides_json) so the app can say
--      who won without another query.
--   2. core.resolve_match holds the resolution; api.resolve_match is the admin/service wrapper. The worker runs
--      under pg_cron with no JWT, so it calls the core function.
--   3. core.process_outbox(limit): claims resolve_match jobs (written by api.admin_set_result) with
--      for update skip locked; a failing job keeps done_at null, counts attempts, records the error and backs off.
--      Scheduled every minute where pg_cron exists (hosted, local stack); the CI image has no pg_cron.

-- 1 ---------------------------------------------------------------------------------------------------------
create or replace function core.resolve_votes(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  it        record;
  v         core.votes;
  m         core.matches;
  r         core.match_results;
  v_rules   jsonb;
  v_total   int;
  v_win     int;
  v_ok      boolean;
  v_upset   boolean;
  v_res     jsonb;
  v_ev      jsonb;
  v_pts     int;
  v_part    jsonb;
  v_streak  int;
  v_seen    uuid[] := '{}';
  v_entries jsonb := '[]'::jsonb;
begin
  for it in
    select (i ->> 'vote_id')::uuid as vote_id, (i ->> 'resolved_at')::timestamptz as resolved_at, vt.created_at
      from jsonb_array_elements(p_items) i
      join core.votes vt on vt.id = (i ->> 'vote_id')::uuid
     order by 2, 3, 1
  loop
    select * into v from core.votes where id = it.vote_id;

    if it.vote_id = any (v_seen) or v.resolved_at is not null then
      v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'already_resolved', 'outcome', null,
                                                   'points', 0, 'streak_event', null, 'is_upset_call', false);
      continue;
    end if;
    if v.subject_type <> 'match' then
      v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'invalid', 'outcome', null,
                                                   'points', 0, 'streak_event', null, 'is_upset_call', false);
      continue;
    end if;
    select * into m from core.matches where id = v.subject_id;
    if not found then
      v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'invalid', 'outcome', null,
                                                   'points', 0, 'streak_event', null, 'is_upset_call', false);
      continue;
    end if;

    -- cancelled or void: the vote closes with outcome 'none'; no points, sigma, chain or freezes change
    if m.status in ('cancelled', 'void') then
      update core.votes set resolved_at = it.resolved_at, outcome = 'none', is_upset_call = false, points = 0
       where id = v.id;
      v_seen := v_seen || v.id;
      v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'void', 'outcome', 'none',
                                                   'points', 0, 'streak_event', null, 'is_upset_call', false);
      continue;
    end if;

    -- only a confirmed match with a result resolves; played, disputed and the rest stay pending
    select * into r from core.match_results where match_id = m.id;
    if m.status <> 'confirmed' or not found then
      v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'pending', 'outcome', null,
                                                   'points', 0, 'streak_event', null, 'is_upset_call', false);
      continue;
    end if;

    v_rules := core.sport_rules(m.sport_id);
    v_ok := (v.option = r.winner_side);
    select count(*)::int, (count(*) filter (where option = r.winner_side))::int into v_total, v_win
      from core.votes where subject_type = 'match' and subject_id = m.id;
    v_upset := v_ok and core.is_upset(v_win, v_total, v_rules);

    perform pg_advisory_xact_lock(hashtextextended('user:' || v.user_id::text, 0));
    v_res := core.apply_outcome(v.user_id, v.id, v_ok, it.resolved_at, m.sport_id);
    v_ev := v_res -> 'event';

    v_pts := 0;
    for v_part in select * from jsonb_array_elements(core.vote_points(v_ok, v_upset, (v_res ->> 'chain_before')::int, v_rules)) loop
      v_pts := v_pts + core.award_points(v.user_id, (v_part ->> 'delta')::int, v_part ->> 'reason', 'match', m.id,
                                         'resolve:' || m.id || ':' || v.user_id || ':' || (v_part ->> 'reason'),
                                         it.resolved_at);
    end loop;

    if v_ev ->> 'kind' = 'advanced' and v_ev ->> 'milestone' is not null then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values (v.user_id, 'celebration', 'streak:' || v.id,
              jsonb_build_object('type', 'streak_milestone', 'streak', (v_ev ->> 'milestone')::int, 'match_id', m.id))
      on conflict do nothing;
    end if;

    update core.votes
       set resolved_at = it.resolved_at, outcome = case when v_ok then 'correct' else 'wrong' end,
           is_upset_call = v_upset, points = v_pts
     where id = v.id;
    v_seen := v_seen || v.id;

    select streak into v_streak from core.user_game_state where user_id = v.user_id;

    insert into core.feed_inbox (user_id, kind, ref, payload)
    values (v.user_id, 'result', 'match:' || m.id,
            jsonb_build_object('match_id', m.id, 'vote_id', v.id,
                               'outcome', case when v_ok then 'correct' else 'wrong' end,
                               'points', v_pts, 'upset', v_upset,
                               'streak', v_streak, 'freeze_used', v_ev ->> 'kind' = 'frozen',
                               'winner_side', r.winner_side, 'score', r.score_summary, 'sets', r.sets,
                               'sides', core.match_sides_json(m.id)))
    on conflict do nothing;

    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v.user_id, 'result', jsonb_build_object('match_id', m.id, 'outcome', case when v_ok then 'correct' else 'wrong' end,
                                                    'points', v_pts, 'streak', v_streak),
            'push', 'result:' || v.user_id || ':' || m.id)
    on conflict (dedupe_key) do nothing;
    insert into core.outbox (kind, payload, idempotency_key)
    values ('push', jsonb_build_object('user_id', v.user_id, 'dedupe_key', 'result:' || v.user_id || ':' || m.id),
            'push:result:' || v.user_id || ':' || m.id)
    on conflict (idempotency_key) do nothing;

    v_entries := v_entries || jsonb_build_object('vote_id', v.id, 'status', 'resolved',
                                                 'outcome', case when v_ok then 'correct' else 'wrong' end,
                                                 'points', v_pts, 'streak_event', v_ev, 'is_upset_call', v_upset);
  end loop;
  return jsonb_build_object('entries', v_entries);
end;
$$;

-- 2 ---------------------------------------------------------------------------------------------------------
create or replace function core.resolve_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m       core.matches;
  v_r       core.match_results;
  v_rules   jsonb;
  v_items   jsonb;
  v_res     jsonb;
  v_before  int;
  v_total   int; v_win int; v_upset boolean := false;
  v_pending boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('resolve_match', 0));   -- serialise resolvers (stable lock order)

  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  select * into v_r from core.match_results where match_id = p_match_id;
  if not found and v_m.status not in ('cancelled', 'void') then
    raise exception 'no_result: enter the result first' using errcode = 'P0002';
  end if;

  v_pending := v_m.status not in ('confirmed', 'cancelled', 'void');
  v_rules := core.sport_rules(v_m.sport_id);

  select count(*) filter (where resolved_at is not null)::int into v_before
    from core.votes where subject_type = 'match' and subject_id = p_match_id;

  if v_m.status = 'confirmed' then
    select count(*)::int, (count(*) filter (where option = v_r.winner_side))::int into v_total, v_win
      from core.votes where subject_type = 'match' and subject_id = p_match_id;
    v_upset := core.is_upset(v_win, v_total, v_rules);
  end if;

  if v_pending then
    v_res := jsonb_build_object('entries', '[]'::jsonb);
  else
    select coalesce(jsonb_agg(jsonb_build_object('vote_id', id, 'resolved_at', clock_timestamp())), '[]'::jsonb)
      into v_items
      from core.votes where subject_type = 'match' and subject_id = p_match_id and resolved_at is null;
    v_res := core.resolve_votes(v_items);
    update core.matches set resolved_at = coalesce(resolved_at, now()) where id = p_match_id;
  end if;

  return jsonb_build_object(
    'match_id', p_match_id,
    'resolved', (select count(*) from jsonb_array_elements(v_res -> 'entries') e where e ->> 'status' = 'resolved'),
    'correct', (select count(*) from jsonb_array_elements(v_res -> 'entries') e where e ->> 'outcome' = 'correct'),
    'wrong', (select count(*) from jsonb_array_elements(v_res -> 'entries') e where e ->> 'outcome' = 'wrong'),
    'voided', (select count(*) from jsonb_array_elements(v_res -> 'entries') e where e ->> 'status' = 'void'),
    'freezes_used', (select count(*) from jsonb_array_elements(v_res -> 'entries') e where e -> 'streak_event' ->> 'kind' = 'frozen'),
    'points_awarded', (select coalesce(sum((e ->> 'points')::int), 0) from jsonb_array_elements(v_res -> 'entries') e),
    'upset', v_upset,
    'already_resolved', v_before,
    'pending', v_pending);
end;
$$;

create or replace function api.resolve_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not (core.is_service() or core.is_admin()) then
    raise exception 'forbidden: resolve_match is admin/service only' using errcode = '42501';
  end if;
  return core.resolve_match(p_match_id);
end;
$$;

-- 3 ---------------------------------------------------------------------------------------------------------
create or replace function core.process_outbox(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  j       core.outbox;
  v_ok    int := 0;
  v_fail  int := 0;
begin
  for j in
    select * from core.outbox
     where kind = 'resolve_match' and done_at is null and run_after <= now()
     order by id
     limit greatest(coalesce(p_limit, 50), 1)
     for update skip locked
  loop
    begin
      perform core.resolve_match((j.payload ->> 'match_id')::uuid);
      update core.outbox set done_at = now(), attempts = attempts + 1, last_error = null where id = j.id;
      v_ok := v_ok + 1;
    exception when others then
      -- the resolution rolled back to this block; the job stays open and retries later (2, 4, 8 ... 60 min)
      update core.outbox
         set attempts = attempts + 1, last_error = sqlerrm,
             run_after = now() + make_interval(mins => least(60, power(2, attempts + 1)::int))
       where id = j.id;
      v_fail := v_fail + 1;
    end;
  end loop;
  return jsonb_build_object('processed', v_ok, 'failed', v_fail);
end;
$$;

revoke all on function core.process_outbox(int) from public;
revoke all on function core.resolve_match(uuid) from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('np-process-outbox', '* * * * *', 'select core.process_outbox(50)');
  end if;
end;
$$;
