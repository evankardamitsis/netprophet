-- cast_vote: only before lock, one vote per user and match, idempotent replays.
begin;
select plan(24);

select tests.create_user('cv-a@test.local') as a \gset
select tests.create_user('cv-b@test.local') as b \gset
select tests.mk_match_fresh() as m1 \gset
select tests.mk_match_fresh() as m2 \gset
select tests.mk_match_fresh() as m3 \gset

-- unauthenticated callers cannot vote
select tests.as_anon();
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'m1'), '42501', null, 'anon cannot call cast_vote');
select tests.logout();

select tests.login(:'a'::uuid);
select is((api.cast_vote(:'m1'::uuid, 1) ->> 'replayed')::boolean, false, 'first vote is stored');
select is((select count(*)::int from core.votes where user_id = :'a'::uuid), 1, 'one vote row');
select is((select votes_cast from core.user_game_state where user_id = :'a'::uuid), 1, 'votes_cast counter went up');
select is((api.cast_vote(:'m1'::uuid, 1) ->> 'replayed')::boolean, true, 'same vote again is a replay');
select is((select count(*)::int from core.votes where user_id = :'a'::uuid), 1, 'replay did not add a row');
select is((select votes_cast from core.user_game_state where user_id = :'a'::uuid), 1, 'replay did not double count');
select throws_ok(format($$select api.cast_vote(%L, 2)$$, :'m1'), '23505', null, 'a vote cannot be switched to the other side');
select throws_ok(format($$select api.cast_vote(%L, 3)$$, :'m2'), '22023', null, 'side must be 1 or 2');
select throws_ok($$select api.cast_vote(gen_random_uuid(), 1)$$, 'P0002', null, 'unknown match');

-- the split is only returned to someone who voted, and reflects other voters
select tests.login(:'b'::uuid);
select is((api.cast_vote(:'m1'::uuid, 2) -> 'split' ->> 'pct1')::int, 50, 'split after a second voter on the other side: 50 percent');
select is((api.cast_vote(:'m1'::uuid, 2) -> 'split' ->> 'total')::int, 2, 'split total is 2');

-- lock rules
select tests.logout();
insert into core.matches (id, sport_id, format, status, starts_at, source) values
  ('32000000-0000-0000-0000-000000000001', 'tennis', 'singles', 'scheduled', now() - interval '1 minute', 'admin'),   -- already started
  ('32000000-0000-0000-0000-000000000002', 'tennis', 'singles', 'played', now() - interval '2 hours', 'admin'),       -- played
  ('32000000-0000-0000-0000-000000000003', 'tennis', 'singles', 'void', now() + interval '1 day', 'admin'),          -- void
  ('32000000-0000-0000-0000-000000000004', 'tennis', 'singles', 'announced', null, 'admin');                          -- announced, no start time yet
update core.matches set locked_at = now() - interval '1 second' where id = :'m3'::uuid;                                -- admin early lock
insert into core.matches (id, sport_id, format, status, starts_at, source, logged_by, approved) values
  ('32000000-0000-0000-0000-000000000005', 'tennis', 'singles', 'scheduled', now() + interval '1 day', 'user', :'b'::uuid, false);  -- awaiting approval

select tests.login(:'a'::uuid);
select throws_ok($$select api.cast_vote('32000000-0000-0000-0000-000000000001', 1)$$, '55000', null, 'locked: start time passed');
select throws_ok($$select api.cast_vote('32000000-0000-0000-0000-000000000002', 1)$$, '55000', null, 'locked: match already played');
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'m3'), '55000', null, 'locked: admin lock (locked_at)');
select throws_ok($$select api.cast_vote('32000000-0000-0000-0000-000000000003', 1)$$, 'P0002', null, 'void match is not found');
select throws_ok($$select api.cast_vote('32000000-0000-0000-0000-000000000005', 1)$$, 'P0002', null, 'unapproved user match is not found');
select lives_ok($$select api.cast_vote('32000000-0000-0000-0000-000000000004', 1)$$, 'announced match without a start time is open');

-- a retry after the lock still returns the original vote instead of an error
select tests.logout();
update core.matches set starts_at = now() - interval '1 minute' where id = :'m1'::uuid;
select tests.login(:'a'::uuid);
select is((api.cast_vote(:'m1'::uuid, 1) ->> 'replayed')::boolean, true, 'retry of an existing vote after lock is a harmless replay');
select tests.logout();
select tests.create_user('cv-d@test.local') as d \gset
select tests.login(:'d'::uuid);
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'m1'), '55000', null, 'a NEW vote after lock is refused');

-- own match
select tests.logout();
select tests.mk_player('Own', 'Player') as p \gset
select tests.mk_match(:'p'::uuid, tests.mk_player('Opp', 'Onent')) as mo \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'p'::uuid;
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'mo'), '42501', null, 'you cannot vote on your own match');

-- a result already entered closes voting even if the clock has not passed
select tests.logout();
select tests.mk_match_fresh() as mr \gset
insert into core.match_results (match_id, winner_side, sets) values (:'mr'::uuid, 1, '[{"w":6,"l":1},{"w":6,"l":1}]');
select tests.login(:'b'::uuid);
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'mr'), '55000', null, 'voting is closed once a result exists');

-- active day = 3 cards voted in a day
select tests.logout();
select tests.create_user('cv-c@test.local') as c \gset
select tests.mk_match_fresh() as x1 \gset
select tests.mk_match_fresh() as x2 \gset
select tests.mk_match_fresh() as x3 \gset
select tests.login(:'c'::uuid);
select api.cast_vote(:'x1'::uuid, 1) is not null as v1 \gset
select api.cast_vote(:'x2'::uuid, 1) is not null as v2 \gset
select is((select active_days from core.user_game_state where user_id = :'c'::uuid), 0, 'two votes do not make an active day');
select api.cast_vote(:'x3'::uuid, 2) is not null as v3 \gset
select is((select active_days from core.user_game_state where user_id = :'c'::uuid), 1, 'the third vote of the day makes it an active day');

select * from finish();
rollback;
