-- Results one by one (founder, 20 Oct): what the player has not tapped through closes on its own at the end of the
-- feed's day (23:00 Athens), with 3 hours of grace: a result that arrives after 20:00 stays that night and the next
-- day and closes at the next 23:00. core.results_day_end marks them seen, and get_feed never hands them over, even
-- before the job runs. Results still open and every other inbox kind stay as they are.
begin;
select plan(21);

select tests.create_user('rde-u@test.local') as u \gset
select tests.create_user('rde-v@test.local') as v \gset
select tests.create_user('rde-w@test.local') as w \gset

-- the feed's day turns at 23:00 Athens, as on the app's Σήμερα
select is(core.feed_day('2026-10-20 22:59:00 Europe/Athens'::timestamptz), '2026-10-20'::date, 'until 22:59 Athens it is today');
select is(core.feed_day('2026-10-20 23:00:00 Europe/Athens'::timestamptz), '2026-10-21'::date, 'from 23:00 Athens it is tomorrow');
select is(core.result_close_day('2026-10-20 15:00:00 Europe/Athens'::timestamptz), '2026-10-20'::date, 'a 15:00 result closes with its day');
select is(core.result_close_day('2026-10-20 22:40:00 Europe/Athens'::timestamptz), '2026-10-21'::date, 'a 22:40 result closes with the next one');

-- now: one just in, one an hour old, two from days back; another user's old one; other kinds, old too
insert into core.feed_inbox (user_id, kind, ref, payload, created_at) values
  (:'u'::uuid, 'result', 'rde-now', '{}'::jsonb, now()),
  (:'u'::uuid, 'result', 'rde-hour', '{}'::jsonb, now() - interval '1 hour'),
  (:'u'::uuid, 'result', 'rde-old-2', '{}'::jsonb, now() - interval '2 days'),
  (:'u'::uuid, 'result', 'rde-old-3', '{}'::jsonb, now() - interval '3 days'),
  (:'u'::uuid, 'celebration', 'rde-cel', '{"type": "quest"}'::jsonb, now() - interval '3 days'),
  (:'u'::uuid, 'month_close', 'rde-month', '{}'::jsonb, now() - interval '3 days'),
  (:'v'::uuid, 'result', 'rde-v-old', '{}'::jsonb, now() - interval '2 days');

-- before the job: get_feed shows only the open results, and the celebration as before
select tests.login(:'u'::uuid);
create temp table f as select api.get_feed(20) as doc;
grant select on f to public;
select tests.logout();
select is((select array_agg(c ->> 'id' order by c ->> 'id') from f, jsonb_array_elements(doc -> 'items') c where c ->> 'kind' = 'result'),
          (select array_agg(id::text order by id::text) from core.feed_inbox where ref in ('rde-now', 'rde-hour')),
          'get_feed hands over only the open results');
select is((select count(*)::int from f, jsonb_array_elements(doc -> 'celebrations') c
            where c ->> 'id' = (select id::text from core.feed_inbox where ref = 'rde-cel')),
          1, 'an old celebration still comes');
select is((select count(*)::int from core.feed_inbox where ref like 'rde-%' and seen_at is not null), 0, 'get_feed marks nothing');

-- the job, now
select ok(core.results_day_end() >= 3, 'the job marks the old results');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-old-2'), 'a result from two days back is seen');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-old-3'), 'an older one too');
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-v-old'), 'every user''s');
select is((select count(*)::int from core.feed_inbox where ref in ('rde-now', 'rde-hour') and seen_at is null),
          2, 'open results wait for the player');
select is((select count(*)::int from core.feed_inbox where ref in ('rde-cel', 'rde-month') and seen_at is null),
          2, 'other kinds are untouched');
select is(core.results_day_end(), 0, 'a second run finds nothing (20:00 and 21:00 UTC both run it)');

-- a fixed day: one result at 15:00, one at 22:40 (Athens)
insert into core.feed_inbox (user_id, kind, ref, payload, created_at) values
  (:'w'::uuid, 'result', 'rde-1500', '{}'::jsonb, '2026-10-20 15:00:00 Europe/Athens'::timestamptz),
  (:'w'::uuid, 'result', 'rde-2240', '{}'::jsonb, '2026-10-20 22:40:00 Europe/Athens'::timestamptz);

select core.results_day_end('2026-10-20 22:30:00 Europe/Athens'::timestamptz);
select is((select count(*)::int from core.feed_inbox where ref = 'rde-1500' and seen_at is null), 1, 'before 23:00 the 15:00 result is open');

select core.results_day_end('2026-10-20 23:00:30 Europe/Athens'::timestamptz);
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-1500'), 'the 15:00 result closes at 23:00 the same day');
select ok((select seen_at is null from core.feed_inbox where ref = 'rde-2240'), 'the 22:40 result survives that night''s run');

select core.results_day_end('2026-10-21 09:00:00 Europe/Athens'::timestamptz);
select ok((select seen_at is null from core.feed_inbox where ref = 'rde-2240'), 'and the next morning');
-- what get_feed shows uses the same test: open the next morning, closed after the next 23:00
select ok(core.feed_day('2026-10-21 09:00:00 Europe/Athens'::timestamptz)
            <= core.result_close_day('2026-10-20 22:40:00 Europe/Athens'::timestamptz), 'get_feed still shows it the next morning');

select core.results_day_end('2026-10-21 23:00:30 Europe/Athens'::timestamptz);
select ok((select seen_at is not null from core.feed_inbox where ref = 'rde-2240'), 'it closes at the next 23:00');

select ok(not has_function_privilege('authenticated', 'core.results_day_end(timestamptz)', 'execute'), 'players cannot run the job');

select * from finish();
rollback;
