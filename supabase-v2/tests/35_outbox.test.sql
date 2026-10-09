-- Outbox worker: admin_set_result queues a resolve job; core.process_outbox resolves it without a user session
-- (as pg_cron runs it), once only; a failing job stays open with its error. Result cards carry the sides.
begin;
select plan(15);

select tests.create_user('ob-a@test.local') as a \gset
select tests.create_user('ob-b@test.local') as b \gset
select tests.mk_player('Νίκος', 'Ροδίτης') as p1 \gset
select tests.mk_player('Ηλίας', 'Μέμμος') as p2 \gset
select tests.mk_match(:'p1'::uuid, :'p2'::uuid) as m \gset

select tests.login(:'a'::uuid); select api.cast_vote(:'m'::uuid, 1) is not null as x \gset
select tests.login(:'b'::uuid); select api.cast_vote(:'m'::uuid, 2) is not null as x \gset

select tests.as_service();
select api.admin_set_result(:'m'::uuid, 1, '[{"w":6,"l":3},{"w":7,"l":5}]') is not null as x \gset
select is((select count(*)::int from core.outbox where kind = 'resolve_match' and payload ->> 'match_id' = :'m' and done_at is null),
          1, 'entering a result queues one resolve job');
select is((select count(*)::int from core.votes where subject_id = :'m'::uuid and resolved_at is null), 2, 'votes wait for the worker');

-- the worker, with no JWT at all (pg_cron)
select tests.logout();
reset role;
select set_config('request.jwt.claims', '', true);
select is((core.process_outbox(10) ->> 'processed')::int, 1, 'the worker resolves the queued job without a session');
select isnt((select done_at from core.outbox where kind = 'resolve_match' and payload ->> 'match_id' = :'m'), null, 'the job is marked done');
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), 10, 'the correct voter got +10');
select is((select outcome from core.votes where subject_id = :'m'::uuid and user_id = :'b'::uuid), 'wrong', 'the other vote is wrong');

-- the result card says who played
select is((select jsonb_array_length(payload -> 'sides') from core.feed_inbox where user_id = :'a'::uuid and kind = 'result'),
          2, 'the result card carries both sides');
select is((select payload #>> '{sides,0,players,0,surname}' from core.feed_inbox where user_id = :'a'::uuid and kind = 'result'),
          'Ροδίτης', 'with the player names');
select is((select payload #>> '{streak_event,kind}' from core.feed_inbox where user_id = :'a'::uuid and kind = 'result'),
          'advanced', 'and the σερί event, so the app can play the change');

-- idempotent
select is((core.process_outbox(10) ->> 'processed')::int, 0, 'nothing left to process');
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), 10, 'running again pays nothing twice');

-- a failing job stays open, records the error and backs off
select tests.mk_match_fresh() as m2 \gset
insert into core.outbox (kind, payload, idempotency_key)
values ('resolve_match', jsonb_build_object('match_id', :'m2'), 'resolve:test-fail');
select is((core.process_outbox(10) ->> 'failed')::int, 1, 'a job for a match without a result fails');
select ok((select done_at is null and attempts = 1 and last_error like 'no_result%' and run_after > now()
             from core.outbox where idempotency_key = 'resolve:test-fail'),
          'it stays open with the error and a later retry time');

-- the wrapper still guards the API
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), '42501', null, 'a normal user still cannot resolve');
select throws_ok($$select core.process_outbox(1)$$, '42501', null, 'clients cannot run the worker');

select * from finish();
rollback;
