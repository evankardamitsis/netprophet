-- σερί in the order the matches were played (founder, 22 Oct: «the σερί is strange, isn't it supposed to show the
-- correct voting streak?»).
--
-- The σερί follows resolution time (packages/core README, rule 8): a result that comes in later counts later, and a
-- σερί already shown is never rewritten. A sheet run brings many results at once, though, and the worker resolved
-- them in outbox id order, which is the order the sheets listed their rows. Inside one pass the σερί then went by
-- the sheet, not by the courts: on 22 Oct 08:01 the founder's 20:30 win counted before his 20:00 loss (σερί 3, then
-- 0, then 1, 2) where the matches as played read 0, 1, 2, 3. His stored σερί is 2; in match order it is 3.
--
--   1. core.process_outbox takes the oldest due jobs as before (by id, up to the limit) and resolves them in the
--      order their matches started (then job id; a match with no start time last). Every vote gets its own
--      clock_timestamp() as resolved_at, so resolution time now follows match time inside one pass.
--   2. core.resolve_votes orders a batch by resolved_at, then match starts_at, then vote created_at, then vote id:
--      the same order as core's compareResolutions (shared vector in packages/core/test-vectors/resolution.json,
--      pgTAP 80 and 143). It also queues a σερί moment only as core's streakMoment says (3 below). Body otherwise as
--      in 20261102000000_m1_result_cards.sql.
--   3. core.streak_moment(event): a milestone (3, 5, 7, 10) is a full-screen moment only when it is a new personal
--      record, which is the first time the user ever reaches it, or when it gives the first free freeze (retried at
--      a later 3 while both slots were full). Coming back to 3 or 5 after a reset is not a moment (founder, 22 Oct).
--      The rewards (freeze, Frame Επτά, Frame Δέκα, the lime headband) were already one-off; they ride on the same
--      first moment. Otherwise a «Νέο ρεκόρ» moment (feed_inbox payload type 'streak_record'): once per run, on the
--      card where σερί first goes past the ΠΡ the run started from (σερί = old ΠΡ + 1), never when the old ΠΡ was 0;
--      a milestone on the same card wins. core.user_game_state.record_run remembers that this run already did it
--      (core StreakState.recordRun) and core.apply_outcome, otherwise as in 20261101000800_core_rules_parity.sql,
--      keeps it and adds `record` to the advanced event. Shared vectors: packages/core/test-vectors/streak.json
--      (streakSequence, streakMoment), pgTAP 80 and 143.
--
-- No backfill (founder, 22 Oct). Replaying the past in match order would change which freezes were spent and which
-- +5 chain bonuses were paid, and the README's rule 15 keeps a σερί the player has seen. The order holds from the
-- next pass on.

-- 3 ---------------------------------------------------------------------------------------------------------
-- this run already went past the ΠΡ it started from (core StreakState.recordRun); false when σερί breaks
alter table core.user_game_state add column if not exists record_run boolean not null default false;

-- core streakMoment: {type: 'milestone' | 'record', streak} or null
create or replace function core.streak_moment(p_event jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select case
    when p_event ->> 'kind' is distinct from 'advanced' then null
    when p_event ->> 'milestone' is not null
         and (coalesce((p_event ->> 'newBest')::boolean, false) or coalesce((p_event ->> 'freezeGranted')::boolean, false))
      then jsonb_build_object('type', 'milestone', 'streak', (p_event ->> 'milestone')::int)
    when p_event ->> 'record' is not null
      then jsonb_build_object('type', 'record', 'streak', (p_event ->> 'record')::int)
  end
$$;

-- core applyOutcome: one resolved match vote (correct or wrong) against the user's sigma, chain and freezes.
-- Returns {event, chain_before} where event has the shape of core's StreakEvent:
--   {kind:'advanced', milestone, newBest, freezeGranted, record} | {kind:'frozen', freezeUsed} | {kind:'broken', lostStreak} | {kind:'idle'}
create or replace function core.apply_outcome(p_user uuid, p_vote uuid, p_correct boolean, p_at timestamptz,
                                              p_sport text default 'tennis')
returns jsonb language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_rules    jsonb := core.sport_rules(p_sport);
  v_fmax     int := (v_rules ->> 'freeze_max')::int;
  v_first_at int := (v_rules ->> 'first_free_freeze_at_streak')::int;
  gs         core.user_game_state;
  v_chain_before int;
  v_best_before  int;
  v_fid      uuid;
  v_free     record;
  v_granted  boolean := false;
  v_milestone int;
  v_event    jsonb;
  v_record   int;
begin
  perform core.ensure_game_state(p_user);
  select * into gs from core.user_game_state where user_id = p_user for update;
  v_chain_before := gs.chain;
  v_best_before := gs.streak_best;

  if p_correct then
    insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
    values (p_user, p_vote, gs.streak, gs.streak + 1, 'correct');
    gs.streak := gs.streak + 1;
    gs.chain := gs.chain + 1;
    gs.votes_correct := gs.votes_correct + 1;
    gs.streak_best := greatest(gs.streak_best, gs.streak);
    -- «Νέο ρεκόρ»: the first card of this run past the ΠΡ it started from (nothing to beat when that was 0)
    if gs.streak_best > v_best_before and not gs.record_run and v_best_before > 0 then
      v_record := gs.streak;
    end if;
    gs.record_run := gs.record_run or gs.streak_best > v_best_before;

    -- the first free freeze: when sigma reaches exactly 3, once, only if a slot is free
    if gs.streak = v_first_at and not gs.first_free_at3_done then
      v_fid := core.grant_freeze(p_user, 'free', 'streak3', v_fmax);
      if v_fid is not null then
        gs.first_free_at3_done := true;
        v_granted := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      end if;
    end if;

    if gs.streak = any (select jsonb_array_elements_text(v_rules -> 'streak_milestones')::int) then
      v_milestone := gs.streak;
    end if;
    v_event := jsonb_build_object('kind', 'advanced', 'milestone', v_milestone,
                                  'newBest', gs.streak_best > v_best_before, 'freezeGranted', v_granted,
                                  'record', v_record);

  elsif gs.streak = 0 then
    -- a wrong vote with no sigma to protect: nothing is spent, nothing is logged
    gs.chain := 0;
    v_event := jsonb_build_object('kind', 'idle');

  else
    -- a freeze absorbs the wrong vote: the free one first (keeps number and chain), then the oldest paid one
    -- (keeps the number only, the chain restarts)
    select f.id, f.kind into v_free
      from core.freezes f where f.user_id = p_user and f.used_at is null
     order by (f.kind = 'free') desc, f.acquired_at, f.id limit 1 for update;
    if found then
      update core.freezes set used_at = clock_timestamp(), used_on_vote_id = p_vote where id = v_free.id;
      if v_free.kind = 'paid' then gs.chain := 0; end if;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
      values (p_user, p_vote, gs.streak, gs.streak, v_free.id, 'freeze_used');
      v_event := jsonb_build_object('kind', 'frozen', 'freezeUsed', v_free.kind);
    else
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
      values (p_user, p_vote, gs.streak, 0, 'broke');
      v_event := jsonb_build_object('kind', 'broken', 'lostStreak', gs.streak);
      gs.streak := 0;
      gs.chain := 0;
      gs.broke_at := p_at;
      gs.record_run := false;
    end if;
  end if;

  update core.user_game_state
     set streak = gs.streak, streak_best = gs.streak_best, chain = gs.chain, votes_correct = gs.votes_correct,
         first_free_at3_done = gs.first_free_at3_done, broke_at = gs.broke_at, record_run = gs.record_run,
         version = version + 1, updated_at = now()
   where user_id = p_user;

  return jsonb_build_object('event', v_event, 'chain_before', v_chain_before);
end;
$$;


-- 2 ---------------------------------------------------------------------------------------------------------
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
  v_moment  jsonb;
begin
  for it in
    select (i ->> 'vote_id')::uuid as vote_id, (i ->> 'resolved_at')::timestamptz as resolved_at, vt.created_at
      from jsonb_array_elements(p_items) i
      join core.votes vt on vt.id = (i ->> 'vote_id')::uuid
      left join core.matches mt on vt.subject_type = 'match' and mt.id = vt.subject_id
     -- core compareResolutions: resolution time, then the match's start, then vote time, then vote id
     order by 2, mt.starts_at nulls last, 3, 1
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

    -- core streakMoment: a milestone only the first time (or when it gives the first free freeze), else «Νέο ρεκόρ»
    -- once per run past the old ΠΡ
    v_moment := core.streak_moment(v_ev);
    if v_moment is not null then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values (v.user_id, 'celebration', 'streak:' || v.id,
              jsonb_build_object('type', case v_moment ->> 'type' when 'milestone' then 'streak_milestone' else 'streak_record' end,
                                 'streak', (v_moment ->> 'streak')::int, 'match_id', m.id))
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
                               'sides', core.match_sides_json(m.id), 'streak_event', v_ev))
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

-- 1 ---------------------------------------------------------------------------------------------------------
create or replace function core.process_outbox(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  j       record;
  v_ok    int := 0;
  v_fail  int := 0;
begin
  for j in
    select o.id, o.payload
      from (select * from core.outbox
             where kind = 'resolve_match' and done_at is null and run_after <= now()
             order by id
             limit greatest(coalesce(p_limit, 50), 1)
             for update skip locked) o
      left join core.matches m on m.id = (o.payload ->> 'match_id')::uuid
     -- the matches of one pass count in the order they were played, not in the order the sheet listed them
     order by m.starts_at nulls last, o.id
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
