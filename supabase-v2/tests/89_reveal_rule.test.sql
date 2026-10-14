-- The reveal rule: Pro opens on day 1, only three steps get a full-screen moment, and a quiet step queues nothing.
begin;
select plan(6);

select ok((select 'pro_sheet' = any (features) from core.unlock_defs where key = 'day1'), 'day 1 opens the Pro door');
select is((select features from core.unlock_defs where key = 'pro_first_view'), '{win_effect}'::text[], 'step 10 keeps only the win effect');
select is((select array_agg(key order by step) from core.unlock_defs where celebrate),
          array['level_bar', 'ladder_friends', 'badges_shelf'], 'three moments: level, Κατάταξη, first badge');

select tests.create_user('rv-u@test.local') as u \gset
-- twelve votes cast reach the quests step's backup: it opens quietly (the level step, also open now, gets its moment)
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select :'u'::uuid, 'match', tests.mk_match_fresh(), 1, now(), core.athens_day() from generate_series(1, 12);
select core.unlocks_refresh(:'u'::uuid) is not null as x \gset
select ok(exists (select 1 from core.unlock_progress where user_id = :'u'::uuid and unlock_key = 'daily_quests'), 'the quests step opened');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and ref = 'unlock:daily_quests'), 0, 'and queued no moment');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and ref = 'unlock:level_bar'), 1, 'the level step still has its moment');

select * from finish();
rollback;
