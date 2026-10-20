-- Points in the air count today and tomorrow only (founder, 20 Oct): votes on a match three days ahead do not count in
-- Κατάταξη pending / open_votes nor in Εγώ votes.waiting / pending_points / open; today's, tomorrow's and a started
-- match still waiting for its result do.
begin;
select plan(16);

select tests.create_user('pw-u@test.local') as u \gset

-- the window: the match's Athens date against the feed's day, plus one
select ok(core.in_vote_window('2026-10-21 23:30:00 Europe/Athens'::timestamptz, '2026-10-20 12:00:00 Europe/Athens'::timestamptz),
          'tomorrow, late: in');
select ok(not core.in_vote_window('2026-10-22 00:30:00 Europe/Athens'::timestamptz, '2026-10-20 22:59:00 Europe/Athens'::timestamptz),
          'the day after tomorrow: out');
select ok(core.in_vote_window('2026-10-22 00:30:00 Europe/Athens'::timestamptz, '2026-10-20 23:00:00 Europe/Athens'::timestamptz),
          'from 23:00 Athens the day after tomorrow is tomorrow');
select ok(core.in_vote_window(now() - interval '5 days'), 'a match that already started: in');
select ok(not core.in_vote_window(null), 'no start time: out');

-- before any vote: how many open matches the user sees
select tests.login(:'u'::uuid);
select (api.get_ladder('all', 20) ->> 'open_votes')::int as open0 \gset
select (api.get_me_page() -> 'votes' ->> 'open')::int as me_open0 \gset
select tests.logout();

-- votes (alone on each, so +10 apiece): one today, one tomorrow, one started and waiting, one three days ahead
select tests.mk_match_fresh(now() + interval '1 hour') as m_today \gset
select tests.mk_match_fresh(now() + interval '1 day') as m_tomorrow \gset
select tests.mk_match_fresh(now() - interval '2 hours') as m_started \gset
select tests.mk_match_fresh(now() + interval '3 days') as m_far \gset
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'u'::uuid, 'match', :'m_today'::uuid, 1, now(), core.athens_day()),
       (:'u'::uuid, 'match', :'m_tomorrow'::uuid, 1, now(), core.athens_day()),
       (:'u'::uuid, 'match', :'m_started'::uuid, 1, now() - interval '3 hours', core.athens_day()),
       (:'u'::uuid, 'match', :'m_far'::uuid, 1, now(), core.athens_day());

-- an open match three days ahead, nobody voted
select tests.mk_match_fresh(now() + interval '3 days') as m_far_open \gset

select tests.login(:'u'::uuid);
select is((api.get_ladder('all', 20) ->> 'pending')::int, 30, 'Κατάταξη: today, tomorrow and the started match, not the one in 3 days');
select is((api.get_me_page() -> 'votes' ->> 'pending_points')::int, 30, 'Εγώ: the same points in the air');
select is((api.get_me_page() -> 'votes' ->> 'waiting')::int, 3, 'Εγώ: three votes waiting');
select is((api.get_ladder('all', 20) ->> 'open_votes')::int, :open0, 'Κατάταξη: an open match in 3 days does not count');
select is((api.get_me_page() -> 'votes' ->> 'open')::int, :me_open0, 'Εγώ: nor there');
select tests.logout();

-- an open match tomorrow and one today count
select tests.mk_match_fresh(now() + interval '1 day') as m_open_tomorrow \gset
select tests.mk_match_fresh(now() + interval '30 minutes') as m_open_today \gset
select tests.login(:'u'::uuid);
select is((api.get_ladder('all', 20) ->> 'open_votes')::int, :open0 + 2, 'Κατάταξη: today''s and tomorrow''s open matches count');
select is((api.get_me_page() -> 'votes' ->> 'open')::int, :me_open0 + 2, 'Εγώ: the same');
select tests.logout();

-- the far match comes into the window: it counts again
update core.matches set starts_at = now() + interval '20 hours' where id = :'m_far'::uuid;
select tests.login(:'u'::uuid);
select is((api.get_ladder('all', 20) ->> 'pending')::int, 40, 'once its day is tomorrow the vote counts');
select is((api.get_me_page() -> 'votes' ->> 'pending_points')::int, 40, 'on Εγώ too');
select tests.logout();

-- no one else can call the helper directly
select ok(not has_function_privilege('anon', 'core.in_vote_window(timestamptz, timestamptz)', 'execute'), 'anon cannot run the window');
select ok(not has_function_privilege('authenticated', 'core.in_vote_window(timestamptz, timestamptz)', 'execute'), 'nor a signed-in user');

select * from finish();
rollback;
