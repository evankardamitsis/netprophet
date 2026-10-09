-- Rule parity: the SQL rules must give exactly the results packages/core gives.
--
-- The fixtures are the language-neutral JSON vectors in packages/core/test-vectors/ (the same files
-- packages/core/src/vectors.test.ts runs). They are read from disk at run time, never copied:
--   points.json      pointsForVote, isUpset, quizCompletionPoints, quizDayKey
--   streak.json      streakSequence  (cast, outcome, buy_freeze)
--   votes.json       validateVote    (also run end to end through api.cast_vote)
--   resolution.json  resolveBatch
-- quests*.json and unlocks.json cover rules the database does not implement yet and are not loaded here.
--
-- Directory: $VECTORS_DIR (scripts/v2-db-test.sh exports it), default packages/core/test-vectors.
-- A vector group whose fn has no SQL mapping below FAILS (it never silently passes).
--
-- Representation differences handled in this file (the totals and states are compared, not the encoding):
--   * core reasons vote_correct / vote_upset / chain_bonus are the ledger reasons correct / upset / chain
--   * core sides are 0 and 1, the database sides are 1 and 2
--   * ids: vote ids from the vectors are mapped to uuids that keep their binary order (the id tie-break)
--   * freezes are compared as the ordered list of their kinds (free / paid)
\set ON_ERROR_STOP on
\set pts `cat "${VECTORS_DIR:-packages/core/test-vectors}/points.json"`
\set streak `cat "${VECTORS_DIR:-packages/core/test-vectors}/streak.json"`
\set votes `cat "${VECTORS_DIR:-packages/core/test-vectors}/votes.json"`
\set resolution `cat "${VECTORS_DIR:-packages/core/test-vectors}/resolution.json"`

begin;

create temp table vec (suite text primary key, doc jsonb not null);
insert into vec values
  ('points', :'pts'::jsonb), ('streak', :'streak'::jsonb), ('votes', :'votes'::jsonb), ('resolution', :'resolution'::jsonb);
grant select on vec to public;

select plan(
  (select count(*)::int from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c)   -- one per case
  + (select count(*)::int from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
      where g ->> 'fn' = 'validateVote')                                                                              -- plus the end to end run
  + 1);                                                                                                                -- version check

select is((select count(*)::int from vec where doc ->> 'version' = '1'), 4, 'all four vector files are version 1');

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create function tests.parity_cases(p_suite text)
returns table (fn text, name text, input jsonb, expected jsonb) language sql stable as $$
  select g ->> 'fn', c ->> 'name', c -> 'input', c -> 'expected'
    from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
   where v.suite = p_suite
$$;

-- core PointsReason name for a ledger reason
create function tests.core_reason(p text) returns text language sql immutable as $$
  select case p when 'correct' then 'vote_correct' when 'upset' then 'vote_upset' when 'chain' then 'chain_bonus' else p end
$$;

-- a StreakState (core shape) as stored in user_game_state + freezes
create function tests.parity_state(p_user uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'current', gs.streak, 'best', gs.streak_best, 'chain', gs.chain,
    'freezes', coalesce((select jsonb_agg(f.kind order by f.acquired_at, f.id) from core.freezes f
                          where f.user_id = gs.user_id and f.used_at is null), '[]'::jsonb),
    'votesSinceFreeFreeze', gs.votes_since_free_freeze,
    'firstFreeGranted', gs.first_free_at3_done,
    'brokeAt', case when gs.broke_at is null then null
               else to_char(gs.broke_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end)
  from core.user_game_state gs where gs.user_id = p_user
$$;

create function tests.parity_seed(p_user uuid, p_state jsonb) returns void language plpgsql as $$
declare k text; i int;
begin
  update core.user_game_state
     set streak = (p_state ->> 'current')::int, streak_best = (p_state ->> 'best')::int,
         chain = (p_state ->> 'chain')::int, votes_since_free_freeze = (p_state ->> 'votesSinceFreeFreeze')::int,
         first_free_at3_done = (p_state ->> 'firstFreeGranted')::boolean,
         broke_at = (p_state ->> 'brokeAt')::timestamptz
   where user_id = p_user;
  for k, i in select e, o::int from jsonb_array_elements_text(p_state -> 'freezes') with ordinality as t(e, o) loop
    insert into core.freezes (user_id, kind, source, acquired_at)
    values (p_user, k, case k when 'free' then 'gift' else 'purchase' end, timestamptz '2000-01-01 00:00:00+00' + i * interval '1 second');
  end loop;
end $$;

create function tests.parity_user(p_tag text) returns uuid language sql as $$
  select tests.create_user('parity-' || p_tag || '-' || gen_random_uuid() || '@test.local')
$$;

-- ---------------------------------------------------------------------------
-- points.json
-- ---------------------------------------------------------------------------
create function tests.parity_points() returns setof text language plpgsql as $$
declare c record; v_rules jsonb := core.sport_rules('tennis'); v_actual jsonb;
begin
  for c in select * from tests.parity_cases('points') loop
    v_actual := case c.fn
      when 'pointsForVote' then
        (select coalesce(jsonb_agg(jsonb_build_object('reason', tests.core_reason(p ->> 'reason'), 'delta', (p ->> 'delta')::int)), '[]'::jsonb)
           from jsonb_array_elements(core.vote_points((c.input ->> 'correct')::boolean, (c.input ->> 'upset')::boolean,
                                                      (c.input ->> 'chainBefore')::int, v_rules)) p)
      when 'isUpset' then
        to_jsonb(core.is_upset((c.input ->> 'votesForWinner')::int, (c.input ->> 'totalVotes')::int, v_rules))
      when 'quizCompletionPoints' then
        (select coalesce(jsonb_agg(jsonb_build_object('reason', p ->> 'reason', 'delta', (p ->> 'delta')::int)), '[]'::jsonb)
           from jsonb_array_elements(core.quiz_completion_points((c.input ->> 'answered')::int, (c.input ->> 'required')::int,
                                                                 (c.input ->> 'alreadyAwardedForDay')::boolean, v_rules)) p)
      when 'quizDayKey' then
        to_jsonb(to_char(core.quiz_day_key((c.input #>> '{}')::timestamptz), 'YYYY-MM-DD'))
      else null end;
    if c.fn not in ('pointsForVote', 'isUpset', 'quizCompletionPoints', 'quizDayKey') then
      return next fail('points: no SQL mapping for fn ' || c.fn || ' (' || c.name || ')');
    else
      return next is(v_actual, c.expected, 'points ' || c.fn || ': ' || c.name);
    end if;
  end loop;
end $$;
select * from tests.parity_points();

-- ---------------------------------------------------------------------------
-- streak.json: cast, outcome, buy_freeze against one user per case
-- ---------------------------------------------------------------------------
create function tests.parity_streak() returns setof text language plpgsql as $$
declare
  c record; step jsonb; k int; u uuid; m uuid; vote uuid; v_events jsonb; v_res jsonb; v_fid uuid;
begin
  for c in select * from tests.parity_cases('streak') loop
    if c.fn <> 'streakSequence' then
      return next fail('streak: no SQL mapping for fn ' || c.fn || ' (' || c.name || ')');
      continue;
    end if;
    u := tests.parity_user('streak');
    perform tests.parity_seed(u, c.input -> 'initial');
    v_events := '[]'::jsonb;
    for step in select * from jsonb_array_elements(c.input -> 'steps') loop
      for k in 1 .. coalesce((step ->> 'repeat')::int, 1) loop
        if step ->> 'op' = 'cast' then
          v_events := v_events || jsonb_build_object('kind', 'cast', 'freezeGranted', core.record_vote_cast(u, 'tennis'));
        elsif step ->> 'op' = 'buy_freeze' then
          v_fid := core.grant_freeze(u, 'paid', 'purchase', (core.sport_rules('tennis') ->> 'freeze_max')::int);
          v_events := v_events || case when v_fid is not null then jsonb_build_object('kind', 'bought')
                                       else jsonb_build_object('kind', 'rejected', 'reason', 'max_freezes') end;
        else
          -- an outcome belongs to a vote (a used freeze points at it): give it a throw-away match
          m := tests.mk_match_fresh();
          insert into core.votes (user_id, subject_type, subject_id, option) values (u, 'match', m, 1) returning id into vote;
          v_res := core.apply_outcome(u, vote, (step ->> 'correct')::boolean, (step ->> 'at')::timestamptz, 'tennis');
          v_events := v_events || (v_res -> 'event');
        end if;
      end loop;
    end loop;
    return next is(jsonb_build_object('events', v_events, 'final', tests.parity_state(u)), c.expected, 'streak: ' || c.name);
  end loop;
end $$;
select * from tests.parity_streak();

-- ---------------------------------------------------------------------------
-- votes.json: the gate function, then the same case through api.cast_vote with the clock shifted so castAt = now()
-- ---------------------------------------------------------------------------
create function tests.parity_votes() returns setof text language plpgsql as $$
declare
  c record; v_gate text; v_actual jsonb; u uuid := tests.parity_user('votes');
  v_shift interval; m uuid; v_side int; v_code text; v_want text; v_reason text;
begin
  for c in select * from tests.parity_cases('votes') loop
    if c.fn <> 'validateVote' then
      return next fail('votes: no SQL mapping for fn ' || c.fn || ' (' || c.name || ')');
      return next fail('votes: no SQL mapping for fn ' || c.fn || ' (' || c.name || ') end to end');
      continue;
    end if;
    v_side := (c.input ->> 'optionIndex')::int + 1;
    v_gate := core.vote_gate(c.input ->> 'matchStatus', (c.input ->> 'startsAt')::timestamptz, (c.input ->> 'lockAt')::timestamptz,
                             v_side, (c.input ->> 'castAt')::timestamptz, (c.input ->> 'alreadyVoted')::boolean);
    v_actual := case when v_gate = 'ok' then jsonb_build_object('ok', true) else jsonb_build_object('ok', false, 'reason', v_gate) end;
    return next is(v_actual, c.expected, 'votes gate: ' || c.name);

    -- end to end: move the whole timeline so the cast instant is the transaction's now()
    v_shift := now() - (c.input ->> 'castAt')::timestamptz;
    m := tests.mk_match(tests.mk_player('Π', 'A' || gen_random_uuid()), tests.mk_player('Π', 'B' || gen_random_uuid()),
                        (c.input ->> 'startsAt')::timestamptz + v_shift, c.input ->> 'matchStatus');
    if c.input ->> 'lockAt' is not null then
      update core.matches set locked_at = (c.input ->> 'lockAt')::timestamptz + v_shift where id = m;
    end if;
    if (c.input ->> 'alreadyVoted')::boolean then   -- a vote for the other side is already there
      insert into core.votes (user_id, subject_type, subject_id, option) values (u, 'match', m, case when v_side = 1 then 2 else 1 end);
    end if;
    v_code := 'ok';
    perform tests.login(u);
    begin
      perform api.cast_vote(m, v_side);
    exception when others then
      v_code := sqlstate;
    end;
    perform tests.logout();
    v_reason := c.expected ->> 'reason';
    v_want := case when (c.expected ->> 'ok')::boolean then 'ok'
                   when v_reason in ('not_open', 'locked') then '55000'      -- voting_closed
                   when v_reason = 'invalid_option' then '22023'
                   when v_reason = 'already_voted' then '23505'
                   else 'unmapped:' || v_reason end;
    return next is(v_code, v_want, 'votes cast_vote: ' || c.name);
  end loop;
end $$;
select * from tests.parity_votes();

-- ---------------------------------------------------------------------------
-- resolution.json: core.resolve_votes against matches, votes and a crowd built from the vector inputs
-- ---------------------------------------------------------------------------
create function tests.parity_resolution() returns setof text language plpgsql as $$
declare
  c record; n int := 0; u uuid; x jsonb; mid text; vid text; v_state jsonb;
  v_pool uuid[] := '{}'; i int; v_matches jsonb; v_votes jsonb; v_ids jsonb; v_rank int;
  m uuid; v_winner int; v_for int; v_total int; v_opt int; v_others_for int; v_others_against int; v_status text;
  v_items jsonb; v_res jsonb; v_entries jsonb; e jsonb; v_back jsonb;
begin
  for i in 1 .. 12 loop v_pool := v_pool || tests.parity_user('crowd'); end loop;   -- crowd voters, reused across matches

  for c in select * from tests.parity_cases('resolution') loop
    if c.fn <> 'resolveBatch' then
      return next fail('resolution: no SQL mapping for fn ' || c.fn || ' (' || c.name || ')');
      continue;
    end if;
    n := n + 1;
    u := tests.parity_user('resolve');
    perform tests.parity_seed(u, c.input -> 'streak');

    -- vote id (text) -> uuid in binary order of the ids; the case number keeps ids unique across cases
    v_ids := '{}'::jsonb;
    v_rank := 0;
    for vid in select t.id from (select distinct (i2 ->> 'voteId') as id from jsonb_array_elements(c.input -> 'items') i2) t order by t.id collate "C" loop
      v_rank := v_rank + 1;
      v_ids := v_ids || jsonb_build_object(vid, lpad(n::text, 8, '0') || '-0000-4000-8000-' || lpad(v_rank::text, 12, '0'));
    end loop;
    v_back := '{}'::jsonb;
    for vid in select jsonb_object_keys(v_ids) loop v_back := v_back || jsonb_build_object(v_ids ->> vid, vid); end loop;

    -- one match per matchId
    v_matches := '{}'::jsonb;
    for x in select distinct on (i2 ->> 'matchId') i2 from jsonb_array_elements(c.input -> 'items') i2 order by (i2 ->> 'matchId') loop
      mid := x ->> 'matchId';
      m := tests.mk_match_fresh();
      v_matches := v_matches || jsonb_build_object(mid, m);
      v_winner := case when x ->> 'winnerSide' is null then null else (x ->> 'winnerSide')::int + 1 end;
      if v_winner is not null then
        insert into core.match_results (match_id, winner_side, sets)
        values (m, v_winner, '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb);
      end if;
      update core.matches set status = x ->> 'matchStatus' where id = m;

      -- the crowd: this vote is one of totalVotes; votesForWinner of them backed the winner
      if v_winner is not null then
        v_opt := (x ->> 'option')::int + 1;
        v_for := (x ->> 'votesForWinner')::int;
        v_total := (x ->> 'totalVotes')::int;
        v_others_for := v_for - case when v_opt = v_winner then 1 else 0 end;
        v_others_against := v_total - v_for - case when v_opt <> v_winner then 1 else 0 end;
        if v_others_for < 0 or v_others_against < 0 or v_others_for + v_others_against > array_length(v_pool, 1) then
          raise exception 'parity: cannot build the crowd for case % (%)', c.name, mid;
        end if;
        for i in 1 .. v_others_for + v_others_against loop
          insert into core.votes (user_id, subject_type, subject_id, option, created_at)
          values (v_pool[i], 'match', m, case when i <= v_others_for then v_winner else 3 - v_winner end, '2026-10-09T09:00:00Z');
        end loop;
      end if;
    end loop;

    -- the vectors' votes (once per voteId)
    for x in select distinct on (i2 ->> 'voteId') i2 from jsonb_array_elements(c.input -> 'items') i2 order by (i2 ->> 'voteId') loop
      insert into core.votes (id, user_id, subject_type, subject_id, option, created_at, resolved_at, outcome)
      values ((v_ids ->> (x ->> 'voteId'))::uuid, u, 'match', (v_matches ->> (x ->> 'matchId'))::uuid, (x ->> 'option')::int + 1,
              (x ->> 'createdAt')::timestamptz,
              case when (x ->> 'alreadyResolved')::boolean then timestamptz '2026-10-08T00:00:00Z' end,
              case when (x ->> 'alreadyResolved')::boolean then 'correct' end);
    end loop;

    v_items := (select jsonb_agg(jsonb_build_object('vote_id', v_ids ->> (i2 ->> 'voteId'), 'resolved_at', i2 ->> 'resolvedAt'))
                  from jsonb_array_elements(c.input -> 'items') i2);
    v_res := core.resolve_votes(v_items);

    v_entries := '[]'::jsonb;
    for e in select * from jsonb_array_elements(v_res -> 'entries') loop
      v_entries := v_entries || jsonb_build_object(
        'voteId', v_back ->> (e ->> 'vote_id'), 'status', e ->> 'status', 'outcome', e -> 'outcome',
        'points', (e ->> 'points')::int, 'streakEvent', e -> 'streak_event', 'isUpsetCall', (e ->> 'is_upset_call')::boolean);
    end loop;
    return next is(jsonb_build_object('entries', v_entries, 'final', tests.parity_state(u)), c.expected, 'resolution: ' || c.name);
  end loop;
end $$;
select * from tests.parity_resolution();

select * from finish();
rollback;
