-- Founder, 22 Oct: «the σερί is strange». A sheet run queues its results in the sheet's row order, and the worker
-- resolved them in that order, so inside one pass the σερί went by the sheet, not by the courts (his 20:30 win
-- counted before his 20:00 loss). The worker now resolves one pass in the order the matches started.
begin;
select plan(8);

select tests.create_user('so-u@test.local') as u \gset
select tests.mk_match_fresh(timestamptz '2026-10-21 17:00:00+00') as m2000 \gset
select tests.mk_match_fresh(timestamptz '2026-10-21 17:30:00+00') as m2030 \gset
select tests.mk_match_fresh(timestamptz '2026-10-21 18:00:00+00') as m2100 \gset

-- side 1 on all three, voted in the morning (the 20:30 one first)
insert into core.votes (user_id, subject_type, subject_id, option, created_at)
values (:'u'::uuid, 'match', :'m2030'::uuid, 1, '2026-10-21 07:21:00+00'),
       (:'u'::uuid, 'match', :'m2000'::uuid, 1, '2026-10-21 07:22:00+00'),
       (:'u'::uuid, 'match', :'m2100'::uuid, 1, '2026-10-21 07:23:00+00');

-- the sheet lists 21:00, then 20:30, then 20:00: the jobs are queued in that order. 20:00 went the other way.
select tests.as_service();
select api.admin_set_result(:'m2100'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]') is not null as x \gset
select api.admin_set_result(:'m2030'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]') is not null as x \gset
select api.admin_set_result(:'m2000'::uuid, 2, '[{"w":6,"l":3},{"w":6,"l":4}]') is not null as x \gset
select tests.logout();
select ok((select array_agg((payload ->> 'match_id')::uuid order by id) from core.outbox
            where kind = 'resolve_match' and done_at is null)
          = array[:'m2100'::uuid, :'m2030'::uuid, :'m2000'::uuid], 'the jobs are queued in the sheet''s order');

-- one worker pass, as pg_cron runs it
reset role;
select set_config('request.jwt.claims', '', true);
select is((core.process_outbox(50) ->> 'processed')::int, 3, 'one pass resolves all three');

select is((select streak from core.user_game_state where user_id = :'u'::uuid), 2,
          'σερί 2: the 20:00 loss, then the 20:30 and 21:00 wins (sheet order would leave 0)');
select is((select string_agg(e.kind || ':' || e.streak_after, ',' order by e.id) from core.streak_events e
            where e.user_id = :'u'::uuid), 'correct:1,correct:2',
          'the loss came at σερί 0 (nothing to break), then 1 and 2');
select ok((select bool_and(ok) from (
             select v.resolved_at < lead(v.resolved_at) over (order by m.starts_at) or lead(v.resolved_at) over (order by m.starts_at) is null as ok
               from core.votes v join core.matches m on m.id = v.subject_id where v.user_id = :'u'::uuid) t),
          'resolution time follows match time inside the pass');
select is((select chain from core.user_game_state where user_id = :'u'::uuid), 2, 'the +5 chain follows the same order');
select is((select sum(points)::int from core.votes where user_id = :'u'::uuid), 25, '+10, then +10 +5 for the second win in a row');

-- the cards play in that order and each says the σερί it left
select tests.login(:'u'::uuid);
select is((select string_agg(i -> 'payload' ->> 'streak', ',' order by n)
             from jsonb_array_elements(api.get_feed(30) -> 'items') with ordinality x(i, n) where i ->> 'kind' = 'result'),
          '0,1,2', 'the result cards come as σερί 0, 1, 2');

select * from finish();
rollback;
