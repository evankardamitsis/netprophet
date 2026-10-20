-- Results one by one (founder, 20 Oct): what the player has not tapped through by the end of the feed's day (23:00
-- Athens) is marked seen by core.results_day_end, and get_feed never hands over yesterday's results, even before the
-- job runs. Today's results and every other inbox kind stay as they are.
begin;
select plan(14);

select tests.create_user('rde-u@test.local') as u \gset
select tests.create_user('rde-v@test.local') as v \gset

-- the feed's day turns at 23:00 Athens, as on the app's Σήμερα
select is(core.feed_day('2026-10-20 22:59:00 Europe/Athens'::timestamptz), '2026-10-20'::date, 'until 22:59 Athens it is today');
select is(core.feed_day('2026-10-20 23:00:00 Europe/Athens'::timestamptz), '2026-10-21'::date, 'from 23:00 Athens it is tomorrow');

-- the feed day's results (now) and the day before's (a day back); another user's old one; other kinds, old too
insert into core.feed_inbox (user_id, kind, ref, payload, created_at) values
  (:'u'::uuid, 'result', 'rde-today', '{}'::jsonb, now()),
  (:'u'::uuid, 'result', 'rde-old-1', '{}'::jsonb, now() - interval '1 day'),
  (:'u'::uuid, 'result', 'rde-old-2', '{}'::jsonb, now() - interval '3 days'),
  (:'u'::uuid, 'celebration', 'rde-cel', '{"type": "quest"}'::jsonb, now() - interval '2 days'),
  (:'u'::uuid, 'month_close', 'rde-month', '{}'::jsonb, now() - interval '2 days'),
  (:'v'::uuid, 'result', 'rde-v-old', '{}'::jsonb, now() - interval '1 day');

-- before the job: get_feed shows only the feed day's result, and the celebration as before
select tests.login(:'u'::uuid);
create temp table f as select api.get_feed(20) as doc;
grant select on f to public;
select tests.logout();
select is((select count(*)::int from f, jsonb_array_elements(doc -> 'items') c where c ->> 'kind' = 'result'),
          1, 'get_feed hands over only the feed day''s result');
select is((select c ->> 'id' from f, jsonb_array_elements(doc -> 'items') c where c ->> 'kind' = 'result'),
          (select id::text from core.feed_inbox where ref = 'rde-today'), 'and it is today''s');
select is((select count(*)::int from f, jsonb_array_elements(doc -> 'celebrations') c
            where c ->> 'id' = (select id::text from core.feed_inbox where ref = 'rde-cel')),
          1, 'an old celebration still comes');
select is((select count(*)::int from core.feed_inbox where ref like 'rde-%' and seen_at is not null), 0, 'get_feed marks nothing');

-- the job
select is(core.results_day_end() >= 3, true, 'the job marks the old results');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-old-1'), 'yesterday''s result is seen');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-old-2'), 'an older one too');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-v-old'), 'every user''s');
select ok((select seen_at is null from core.feed_inbox where ref = 'rde-today'), 'today''s result waits for the player');
select is((select count(*)::int from core.feed_inbox where ref in ('rde-cel', 'rde-month') and seen_at is null),
          2, 'other kinds are untouched');
select is(core.results_day_end(), 0, 'a second run finds nothing (20:00 and 21:00 UTC both run it)');

select ok(not has_function_privilege('authenticated', 'core.results_day_end()', 'execute'), 'players cannot run the job');

select * from finish();
rollback;
