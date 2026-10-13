-- M3 acceptance (docs/v2/implementation-plan.md, M3 row): a new player reaches the full experience in about six
-- engaged days (here: ten answers a day for six days), and «Οι 6 της ημέρας» builds a full set every day for 14 days
-- with nothing done by hand. The month close dry run is covered in 66_admin_game.
begin;
select plan(5);

select tests.create_user('m3-new@test.local') as u \gset
select is((select count(*)::int from core.unlock_progress where user_id = :'u'::uuid), 1, 'day 0: step 1 only');

-- six engaged days: ten card answers a day (as the daily game and the feed would)
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select :'u'::uuid, 'card', gen_random_uuid(), 1,
       now() - ((5 - d) || ' days')::interval + (n || ' minutes')::interval,
       core.athens_day(now() - ((5 - d) || ' days')::interval)
  from generate_series(0, 5) d, generate_series(1, 10) n;
select core.unlocks_refresh(:'u'::uuid);
select is((select count(*)::int from core.unlock_progress where user_id = :'u'::uuid), 13, 'six engaged days: all 13 steps open');
select is((core.unlock_counters(:'u'::uuid) ->> 'activeDays')::int, 6, 'six active days');

-- the daily game for 14 days in a row: always a full set, for a free and a Pro build
create temp table built as
select i, core.quiz_build_set(:'u'::uuid, core.quiz_day_key(now()) + i, false) as free_set from generate_series(0, 13) i;
select tests.create_user('m3-pro@test.local') as p \gset
create temp table built_pro as
select i, core.quiz_build_set(:'p'::uuid, core.quiz_day_key(now()) + i, true) as pro_set from generate_series(0, 13) i;
select is((select count(*)::int from built where (select count(*) from core.quiz_set_cards c where c.set_id = free_set) = 6),
          14, '14 days of six cards');
select is((select count(*)::int from built_pro where (select count(*) from core.quiz_set_cards c where c.set_id = pro_set) = 12),
          14, '14 days of twelve cards for Pro');

select * from finish();
rollback;
