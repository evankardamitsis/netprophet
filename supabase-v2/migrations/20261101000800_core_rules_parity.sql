-- NetProphet v2 baseline 9: make the database rules match packages/core exactly (core wins).
-- Checked by supabase-v2/tests/80_parity.test.sql against packages/core/test-vectors/*.json.
--
-- What changes against migrations 1 to 8:
--   1. Upset share: under 40 percent (was 35), with at least 10 votes. Defaults live in core.sport_rules and in
--      sports.config -> rules, equal to the constants in packages/core/src/rules/points.ts.
--   2. The free freeze counts votes CAST (at cast time, in cast_vote), not votes resolved.
--   3. The first free freeze is granted only when sigma reaches exactly 3 AND a slot is free; otherwise the flag
--      stays unset and it is tried again the next time sigma reaches 3 (it used to be marked done even when lost).
--   4. A wrong vote at sigma 0 spends nothing and writes no 'broke' event (it used to spend a freeze).
--   5. Lock instant is lock_at when set, else starts_at (it used to be the earlier of the two); a vote at exactly
--      the lock instant is rejected. A cancelled or void match is "not open" instead of "not found".
--   6. Resolution runs in RESOLUTION order across matches: resolved_at, vote created_at, vote id.
--   7. Void and cancelled matches close their votes with outcome 'none' (no points, sigma, chain, freezes).
--      Only status 'confirmed' with a result resolves; played, disputed and the rest stay pending.
--   8. Points land in the Athens month of the resolution time, not of the clock at write time.
--   9. matches.status accepts 'cancelled'.
-- Chain bonus: core pays a flat +5 on a correct vote that follows a correct vote; the database writes it as its own
-- 'chain' ledger row. The total per vote is identical.

-- ---------------------------------------------------------------------------
-- 0. schema: cancelled matches, comment on the lock column
-- ---------------------------------------------------------------------------
alter table core.matches drop constraint matches_status_check;
alter table core.matches add constraint matches_status_check
  check (status in ('announced', 'scheduled', 'played', 'confirmed', 'disputed', 'cancelled', 'void'));
comment on column core.matches.locked_at is
  'Voting closes at this instant when set, else at starts_at. A vote at exactly the lock instant is rejected (packages/core lockInstant).';

-- ---------------------------------------------------------------------------
-- 1. rules: defaults equal to packages/core constants
-- ---------------------------------------------------------------------------
create or replace function core.sport_rules(p_sport text)
returns jsonb language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'correct', 10, 'upset', 30, 'chain', 5, 'daily_quiz', 30, 'freeze_max', 2,
           'free_freeze_every_votes', 15, 'first_free_freeze_at_streak', 3,
           'upset_share_max', 0.40, 'upset_min_votes', 10,
           'streak_milestones', jsonb_build_array(3, 5, 7, 10)
         ) || coalesce((select config -> 'rules' from core.sports where id = p_sport), '{}'::jsonb)
$$;

update core.sports
   set config = jsonb_set(config, '{rules,upset_share_max}', '0.40'::jsonb)
 where id = 'tennis' and config -> 'rules' ? 'upset_share_max';

-- ---------------------------------------------------------------------------
-- 2. pure rule helpers (no table access): the SQL twins of the core functions
-- ---------------------------------------------------------------------------
-- core isUpset: at least upset_min_votes cast and the winner under upset_share_max of them
create or replace function core.is_upset(p_for_winner int, p_total int, p_rules jsonb)
returns boolean language sql immutable set search_path = pg_temp
as $$
  select p_total >= (p_rules ->> 'upset_min_votes')::int
     and p_for_winner::numeric < p_total::numeric * (p_rules ->> 'upset_share_max')::numeric
$$;

-- core pointsForVote: ledger rows for one resolved match vote, as [{reason, delta}] with ledger reason names
-- (core: vote_correct = correct, vote_upset = upset, chain_bonus = chain)
create or replace function core.vote_points(p_correct boolean, p_upset boolean, p_chain_before int, p_rules jsonb)
returns jsonb language sql immutable set search_path = pg_temp
as $$
  select case when not p_correct then '[]'::jsonb else
    jsonb_build_array(jsonb_build_object(
      'reason', case when p_upset then 'upset' else 'correct' end,
      'delta', case when p_upset then (p_rules ->> 'upset')::int else (p_rules ->> 'correct')::int end))
    || case when p_chain_before >= 1
            then jsonb_build_array(jsonb_build_object('reason', 'chain', 'delta', (p_rules ->> 'chain')::int))
            else '[]'::jsonb end
  end
$$;

-- core quizDayKey: «Οι 6 της ημέρας» changes at 09:00 Athens
create or replace function core.quiz_day_key(p_at timestamptz)
returns date language sql immutable set search_path = pg_temp
as $$ select ((p_at at time zone 'Europe/Athens') - interval '9 hours')::date $$;

-- core quizCompletionPoints: +30 once per quiz day when the whole set is answered (Pro's 12-card set pays the same)
create or replace function core.quiz_completion_points(p_answered int, p_required int, p_already boolean, p_rules jsonb)
returns jsonb language sql immutable set search_path = pg_temp
as $$
  select case when p_already or p_required <= 0 or p_answered < p_required then '[]'::jsonb
              else jsonb_build_array(jsonb_build_object('reason', 'daily_quiz', 'delta', (p_rules ->> 'daily_quiz')::int))
         end
$$;

-- core validateVote: 'ok', 'not_open', 'locked', 'invalid_option' or 'already_voted', checked in that order.
-- Lock instant = lock_at when set, else starts_at; a vote at exactly that instant is locked.
-- With no lock instant at all (announced, no start time yet) the match stays open.
create or replace function core.vote_gate(p_status text, p_starts_at timestamptz, p_lock_at timestamptz,
                                          p_side int, p_at timestamptz, p_already boolean default false)
returns text language sql immutable set search_path = pg_temp
as $$
  select case
    when p_status is null or p_status not in ('announced', 'scheduled') then 'not_open'
    when coalesce(p_lock_at, p_starts_at) is not null and p_at >= coalesce(p_lock_at, p_starts_at) then 'locked'
    when p_side is null or p_side not in (1, 2) then 'invalid_option'
    when coalesce(p_already, false) then 'already_voted'
    else 'ok'
  end
$$;

create or replace function core.match_is_open(m core.matches)
returns boolean language sql stable set search_path = core, pg_temp
as $$
  select core.vote_gate(m.status, m.starts_at, m.locked_at, 1, now()) = 'ok'
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
$$;

-- ---------------------------------------------------------------------------
-- 3. ledger and freezes
-- ---------------------------------------------------------------------------
-- the points month is the Athens month of p_at (the resolution time)
drop function core.award_points(uuid, int, text, text, uuid, text);
create or replace function core.award_points(p_user uuid, p_delta int, p_reason text, p_ref_type text, p_ref uuid,
                                             p_key text, p_at timestamptz default now())
returns int language plpgsql security definer set search_path = core, pg_temp
as $$
declare n int;
begin
  if p_delta = 0 then return 0; end if;
  insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
  values (p_user, p_delta, p_reason, p_ref_type, p_ref, core.month_key(p_at), p_key)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 0; end if;
  update core.user_game_state set total_points = total_points + p_delta, updated_at = now() where user_id = p_user;
  return p_delta;
end;
$$;

-- grants a freeze unless the user already holds the maximum; returns the freeze id or null.
-- acquired_at uses the real clock so freezes granted in one transaction keep their order.
create or replace function core.grant_freeze(p_user uuid, p_kind text, p_source text, p_max int)
returns uuid language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_id uuid;
begin
  if (select count(*) from core.freezes where user_id = p_user and used_at is null) >= p_max then
    return null;
  end if;
  insert into core.freezes (user_id, kind, source, acquired_at)
  values (p_user, p_kind, p_source, clock_timestamp()) returning id into v_id;
  return v_id;
end;
$$;

-- core recordVoteCast: every 15th match vote cast grants a free freeze. With both slots full the counter waits at 15
-- and the freeze is granted on the first cast with a free slot (not lost). Returns true when a freeze was granted.
create or replace function core.record_vote_cast(p_user uuid, p_sport text default 'tennis', p_vote uuid default null)
returns boolean language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_rules jsonb := core.sport_rules(p_sport);
  v_every int := (v_rules ->> 'free_freeze_every_votes')::int;
  gs      core.user_game_state;
  v_n     int;
  v_fid   uuid;
begin
  perform core.ensure_game_state(p_user);
  select * into gs from core.user_game_state where user_id = p_user for update;
  v_n := least(gs.votes_since_free_freeze + 1, v_every);
  if v_n >= v_every then
    v_fid := core.grant_freeze(p_user, 'free', 'every15', (v_rules ->> 'freeze_max')::int);
    if v_fid is not null then
      update core.user_game_state set votes_since_free_freeze = 0, version = version + 1, updated_at = now()
       where user_id = p_user;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
      values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      return true;
    end if;
  end if;
  update core.user_game_state set votes_since_free_freeze = v_n, version = version + 1, updated_at = now()
   where user_id = p_user;
  return false;
end;
$$;

-- core applyOutcome: one resolved match vote (correct or wrong) against the user's sigma, chain and freezes.
-- Returns {event, chain_before} where event has the shape of core's StreakEvent:
--   {kind:'advanced', milestone, newBest, freezeGranted} | {kind:'frozen', freezeUsed} | {kind:'broken', lostStreak} | {kind:'idle'}
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
                                  'newBest', gs.streak_best > v_best_before, 'freezeGranted', v_granted);

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
    end if;
  end if;

  update core.user_game_state
     set streak = gs.streak, streak_best = gs.streak_best, chain = gs.chain, votes_correct = gs.votes_correct,
         first_free_at3_done = gs.first_free_at3_done, broke_at = gs.broke_at,
         version = version + 1, updated_at = now()
   where user_id = p_user;

  return jsonb_build_object('event', v_event, 'chain_before', v_chain_before);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. resolution: core resolveBatch
-- p_items = [{vote_id, resolved_at}]. Processed by resolved_at, then vote created_at, then vote id (the sigma follows
-- RESOLUTION time). A vote id repeated in the batch, or a vote that already has resolved_at, is 'already_resolved'.
-- Statuses per entry: resolved | void | pending | already_resolved | invalid.
-- Returns {entries: [{vote_id, status, outcome, points, streak_event, is_upset_call}]} in processing order.
-- ---------------------------------------------------------------------------
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
                               'winner_side', r.winner_side, 'score', r.score_summary, 'sets', r.sets))
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

-- ---------------------------------------------------------------------------
-- resolve_match(match_id): admin / service only. Safe to run twice.
--   Resolves every unresolved vote of one match through core.resolve_votes, all at the same resolution instant
--   (oldest vote first). Rules: see the header of this file and packages/core/README.md.
--   confirmed + result: +10 per correct vote (+30 instead for an upset call, +5 chain bonus), sigma and freezes;
--   cancelled or void: votes close with outcome 'none'; any other status: nothing changes ('pending').
-- ---------------------------------------------------------------------------
create or replace function api.resolve_match(p_match_id uuid)
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
  if not (core.is_service() or core.is_admin()) then
    raise exception 'forbidden: resolve_match is admin/service only' using errcode = '42501';
  end if;

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

-- ---------------------------------------------------------------------------
-- cast_vote(match_id, side): only before lock. Idempotent: the same vote again is a no-op replay.
-- Order of checks follows core validateVote: not open, locked, invalid option, already voted.
-- Counts the cast toward the free freeze (every 15th vote cast).
-- ---------------------------------------------------------------------------
create or replace function api.cast_vote(p_match_id uuid, p_side int, p_client_event_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_m       core.matches;
  v_vote    core.votes;
  v_claimed uuid;
  v_today   date := core.athens_day();
  v_today_n int;
  v_granted boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_match_id is null or p_side is null or p_side not in (1, 2) then
    raise exception 'invalid_argument: side must be 1 or 2' using errcode = '22023';
  end if;
  if not exists (select 1 from core.profiles where user_id = v_uid and deleted_at is null) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));

  select * into v_m from core.matches where id = p_match_id and approved;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;

  -- replay of an earlier vote (retry, double tap): same answer, nothing changes, even after lock
  select * into v_vote from core.votes
   where user_id = v_uid and subject_type = 'match' and subject_id = p_match_id;
  if found then
    if v_vote.option <> p_side then
      -- core order: a closed match is reported as closed before the vote is reported as already cast
      if not core.match_is_open(v_m) then
        raise exception 'voting_closed' using errcode = '55000';
      end if;
      raise exception 'already_voted: a vote cannot be changed' using errcode = '23505';
    end if;
    return jsonb_build_object('match_id', p_match_id, 'side', v_vote.option, 'replayed', true,
                              'split', core.vote_split(p_match_id));
  end if;

  if not core.match_is_open(v_m) then
    raise exception 'voting_closed' using errcode = '55000';
  end if;

  select claimed_player_id into v_claimed from core.profiles where user_id = v_uid;
  if v_claimed is not null and exists (
       select 1 from core.match_participants where match_id = p_match_id and player_id = v_claimed) then
    raise exception 'own_match: you cannot vote on your own match' using errcode = '42501';
  end if;

  insert into core.votes (user_id, subject_type, subject_id, option, client_event_id, day_key)
  values (v_uid, 'match', p_match_id, p_side::smallint, p_client_event_id, v_today)
  returning * into v_vote;

  perform core.ensure_game_state(v_uid);
  select count(*) into v_today_n from core.votes where user_id = v_uid and day_key = v_today;
  update core.user_game_state
     set votes_cast = votes_cast + 1,
         -- active day = 3 cards voted that day
         active_days = active_days + case when v_today_n = 3 then 1 else 0 end,
         last_active_day = case when v_today_n >= 3 then v_today else last_active_day end,
         version = version + 1, updated_at = now()
   where user_id = v_uid;

  -- every 15th vote cast earns a free freeze (counted here, at cast time)
  v_granted := core.record_vote_cast(v_uid, v_m.sport_id, v_vote.id);

  return jsonb_build_object('match_id', p_match_id, 'side', v_vote.option, 'replayed', false,
                            'split', core.vote_split(p_match_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges for the functions added or replaced here (same policy as migration 7): nobody by default,
-- api functions to authenticated + service_role, core helpers to service_role only.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
             from pg_proc p where p.pronamespace in ('api'::regnamespace, 'core'::regnamespace) loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'api'::regnamespace loop
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.pronamespace = 'core'::regnamespace and p.prokind = 'f' loop
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function core.is_admin(), core.is_staff(), core.is_service(),
                          core.match_sides_json(uuid), core.can_write_athlete_photo(text),
                          core.normalize_search(text), core.athens_day(timestamptz), core.month_key(timestamptz)
  to authenticated;
