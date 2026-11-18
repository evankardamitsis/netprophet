-- The daily σερί against the tables: the switch (off = today's behaviour), the switch-on with starting values from
-- real history, day counting (vote, quiz, both, Athens midnight and DST), a wrong vote never breaks it, a missed day
-- breaks it, a freeze covers one day and is spent once, freezes at day 3 and every 7th day (max 2), milestones and
-- Frames once, the pushes (who, when, the cap, never after 22:00) and the emails (7+ only, no device only, the gate,
-- the Monday line). Times are passed in, so the dates below are fixed; the switch-on backfill uses today.
begin;
select plan(79);

update core.email_settings set mode = 'on', allowlist = '{}', start_at = '2026-01-01 00:00Z', kinds_off = '{}';

create or replace function pg_temp.g(p_u uuid) returns core.user_game_state language sql as $$
  select * from core.user_game_state where user_id = p_u
$$;
-- a match vote at an instant (the trigger counts it)
create or replace function pg_temp.vote(p_u uuid, p_at timestamptz) returns uuid language plpgsql as $$
declare v_m uuid := tests.mk_match_fresh(p_at + interval '1 day'); v uuid;
begin
  insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
  values (p_u, 'match', v_m, 1, p_at, core.athens_day(p_at)) returning id into v;
  return v_m;
end $$;
-- a quiz set of p_cards with p_done answers at p_at
create or replace function pg_temp.quiz(p_u uuid, p_day date, p_cards int, p_done int, p_at timestamptz) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into core.quiz_sets (user_id, quiz_day, sport_id) values (p_u, p_day, 'tennis') returning id into v;
  insert into core.quiz_set_cards (set_id, position, family, content) select v, g, 'o', '{}' from generate_series(1, p_cards) g;
  insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
    select p_u, 'card', c.id, 1, p_at, core.athens_day(p_at) from core.quiz_set_cards c where c.set_id = v and c.position <= p_done;
  return v;
end $$;
create or replace function pg_temp.answer(p_u uuid, p_set uuid, p_pos int, p_at timestamptz) returns void language sql as $$
  insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
  select p_u, 'card', c.id, 1, p_at, core.athens_day(p_at) from core.quiz_set_cards c where c.set_id = p_set and c.position = p_pos
$$;
-- Athens wall clock
create or replace function pg_temp.at(p_day date, p_time text) returns timestamptz language sql as $$
  select (p_day + p_time::time) at time zone 'Europe/Athens'
$$;

-- ── switch off: today's behaviour ──
select is(core.daily_streak_on(), false, 'the daily σερί starts off');
select tests.create_user('ds-off@test.local') as off \gset
select pg_temp.vote(:'off'::uuid, '2027-01-04 10:00Z');
select is((pg_temp.g(:'off'::uuid)).streak, 0, 'off: a vote alone does not move the σερί (it waits for the result)');
select is((select count(*)::int from core.streak_days where user_id = :'off'::uuid), 0, 'off: no day is recorded');
select tests.play(:'off'::uuid, true);
select tests.play(:'off'::uuid, true);
select is(((pg_temp.g(:'off'::uuid)).streak, (pg_temp.g(:'off'::uuid)).calls_streak, (pg_temp.g(:'off'::uuid)).calls_best)::text,
          '(2,2,2)', 'off: correct calls count as before, and the correct-calls columns follow');
select tests.play(:'off'::uuid, false);
select is((pg_temp.g(:'off'::uuid)).streak, 0, 'off: a wrong call still breaks the σερί');
select is(core.day_streak_nightly('2027-01-06 00:07+02') + core.streak_push_sweep('2027-01-05 20:10+02')
          + core.streak_email_sweep('2027-01-05 20:05+02'), 0, 'off: the jobs do nothing');
select is(core.record_vote_cast(:'off'::uuid), false, 'off: the cast counter still runs');
select is((pg_temp.g(:'off'::uuid)).votes_since_free_freeze, 4, 'off: every vote cast still counts toward the 15');

-- ── history for the switch-on (real dates: the backfill runs on today) ──
select core.athens_day() as today \gset
select tests.create_user('ds-run@test.local') as run \gset
select tests.create_user('ds-quiz@test.local') as qz \gset
select tests.create_user('ds-old@test.local') as old \gset
select tests.create_user('ds-calls@test.local') as calls \gset
select tests.create_user('ds-ed@test.local', 'editor') as ed \gset
select tests.create_user('ds-admin@test.local', 'admin') as adm \gset
-- run: an older run of 8 days and the last 3 days
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select :'run'::uuid, 'match', tests.mk_match_fresh(), 1, pg_temp.at(:'today'::date - k, '12:00'), :'today'::date - k
  from (select generate_series(0, 2) k union all select generate_series(20, 27)) x;
-- quiz: the quiz finished yesterday, a match vote today, and a quiz left half done the day before
select pg_temp.quiz(:'qz'::uuid, :'today'::date - 1, 6, 6, pg_temp.at(:'today'::date - 1, '10:00'));
select pg_temp.quiz(:'qz'::uuid, :'today'::date - 2, 6, 3, pg_temp.at(:'today'::date - 2, '10:00'));
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'qz'::uuid, 'match', tests.mk_match_fresh(), 1, pg_temp.at(:'today'::date, '08:00'), :'today'::date);
-- old: 4 days ending three days ago
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select :'old'::uuid, 'match', tests.mk_match_fresh(), 1, pg_temp.at(:'today'::date - k, '12:00'), :'today'::date - k from generate_series(3, 6) k;
-- calls: a correct-calls σερί of 6 and nothing else
update core.user_game_state set streak = 6, streak_best = 9 where user_id = :'calls'::uuid;

select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_daily_streak(true)$$, '42501', 'forbidden', 'an editor cannot switch it');
select is((api.admin_daily_streak() ->> 'on')::boolean, false, 'an editor sees where it stands');
select tests.logout();
select tests.login(:'adm'::uuid);
select is((api.admin_daily_streak(true) ->> 'on')::boolean, true, 'an admin switches it on');
select is((api.admin_daily_streak(true) ->> 'backfilled'), null, 'switching on twice does nothing more');
select tests.logout();

select is(((pg_temp.g(:'run'::uuid)).streak, (pg_temp.g(:'run'::uuid)).streak_best)::text, '(3,8)',
          'backfill: the run ending today, the longest run as the ΠΡ');
select is((pg_temp.g(:'run'::uuid)).day_last, :'today'::date, 'backfill: today is already counted');
select ok(exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                   where uc.user_id = :'run'::uuid and c.key = 'frame_seven'), 'backfill: a past run of 8 days gives Frame Επτά quietly');
select ok(not exists (select 1 from core.feed_inbox where user_id = :'run'::uuid and kind = 'celebration'
                       and payload ->> 'type' in ('streak_milestone', 'streak_record')), 'backfill: no moment for the past');
select is((pg_temp.g(:'qz'::uuid)).streak, 2, 'backfill: a finished quiz counts its day, a half one does not');
select is(((pg_temp.g(:'old'::uuid)).streak, (pg_temp.g(:'old'::uuid)).streak_best)::text, '(0,4)', 'backfill: a run that ended 3 days ago is 0');
select is(((pg_temp.g(:'calls'::uuid)).streak, (pg_temp.g(:'calls'::uuid)).calls_streak, (pg_temp.g(:'calls'::uuid)).calls_best)::text,
          '(0,6,9)', 'backfill: the correct calls move to their own columns');
select is((select active from core.cosmetic_items where key = 'frame_month'), true, 'switch-on: Frame Μήνας joins the catalogue');
select is((select earn_rule_text from core.cosmetic_items where key = 'frame_seven'), 'Το κερδίζεις με 7 μέρες στη σειρά', 'and Επτά is earned in days');
select is((select (core.badge_counters(:'calls'::uuid) ->> 'in_a_row')::int), 9, 'badge Στη σειρά keeps counting correct calls');
select is((select (core.unlock_counters(:'calls'::uuid) ->> 'bestStreak')::int), 9, 'the unlock counter keeps counting correct calls');

-- ── counting days (fixed dates from here on; 2027-01-11 is a Monday, Athens is UTC+2) ──
select tests.create_user('ds-a@test.local') as a \gset
select pg_temp.vote(:'a'::uuid, '2027-01-11 08:00Z');
select is((pg_temp.g(:'a'::uuid)).streak, 1, 'a match vote counts at once');
select pg_temp.vote(:'a'::uuid, '2027-01-11 09:00Z');
select is((select count(*)::int from core.streak_events where user_id = :'a'::uuid and kind = 'played'), 1, 'a second vote the same day changes nothing');
select pg_temp.quiz(:'a'::uuid, '2027-01-11', 6, 6, '2027-01-11 21:59Z');
select is((pg_temp.g(:'a'::uuid)).streak, 1, 'the quiz the same day too (both count once)');
-- 23:59 and 00:01 Athens are two days
select pg_temp.vote(:'a'::uuid, '2027-01-11 22:01Z');
select is(((pg_temp.g(:'a'::uuid)).streak, (pg_temp.g(:'a'::uuid)).day_last)::text, '(2,2027-01-12)', '23:59 and 00:01 Athens are two days');

select tests.create_user('ds-q@test.local') as q \gset
select pg_temp.quiz(:'q'::uuid, '2027-01-11', 6, 5, '2027-01-11 10:00Z') as qset \gset
select is((pg_temp.g(:'q'::uuid)).streak, 0, 'five of six quiz answers do not count');
select pg_temp.answer(:'q'::uuid, :'qset'::uuid, 6, '2027-01-11 11:00Z');
select is((pg_temp.g(:'q'::uuid)).streak, 1, 'the last quiz answer counts the day');
select tests.create_user('ds-qpro@test.local') as qp \gset
select pg_temp.quiz(:'qp'::uuid, '2027-01-11', 12, 6, '2027-01-11 10:00Z');
select is((pg_temp.g(:'qp'::uuid)).streak, 0, 'Pro: six of twelve is not finished');

-- the DST night: 31 Oct 2027 has 25 hours; 00:30 and 23:30 Athens are one day
select tests.create_user('ds-dst@test.local') as dst \gset
select pg_temp.vote(:'dst'::uuid, '2027-10-30 21:30Z');
select pg_temp.vote(:'dst'::uuid, '2027-10-31 21:30Z');
select is(((pg_temp.g(:'dst'::uuid)).streak, (pg_temp.g(:'dst'::uuid)).day_last)::text, '(1,2027-10-31)', 'DST: one Athens day, counted once');

-- ── a wrong call never breaks it; the result card keeps build 39's shape ──
select pg_temp.vote(:'a'::uuid, '2027-01-13 08:00Z') as mw \gset
select tests.finish_match(:'mw'::uuid, 2);
select is((pg_temp.g(:'a'::uuid)).streak, 3, 'a wrong call keeps the σερί');
select is((select payload -> 'streak_event' from core.feed_inbox where user_id = :'a'::uuid and kind = 'result' and ref = 'match:' || :'mw'),
          '{"kind": "frozen", "kept": true, "calls": 0, "freezeUsed": null}'::jsonb, 'its card reads «κράτησες το σερί» on build 39');
select is((select (payload ->> 'streak')::int from core.feed_inbox where user_id = :'a'::uuid and kind = 'result' and ref = 'match:' || :'mw'),
          3, 'and carries the days');
select pg_temp.vote(:'a'::uuid, '2027-01-13 08:30Z') as mr \gset
select tests.finish_match(:'mr'::uuid, 1);
select is(((pg_temp.g(:'a'::uuid)).streak, (pg_temp.g(:'a'::uuid)).calls_streak, (pg_temp.g(:'a'::uuid)).chain)::text, '(3,1,1)',
          'a correct call moves the correct calls and the chain, not the days');
select is((select count(*)::int from core.feed_inbox where user_id = :'a'::uuid and kind = 'celebration'
            and payload ->> 'type' in ('streak_milestone', 'streak_record') and payload ->> 'unit' is null), 0, 'no σερί moment from calls');

-- ── a missed day: broken without a freeze, covered once with one ──
select tests.create_user('ds-b@test.local') as b \gset
select pg_temp.vote(:'b'::uuid, '2027-01-11 10:00Z');
select pg_temp.vote(:'b'::uuid, '2027-01-12 10:00Z');
select core.day_streak_nightly('2027-01-14 00:07+02');
select is(((pg_temp.g(:'b'::uuid)).streak, (pg_temp.g(:'b'::uuid)).streak_best)::text, '(0,2)', 'a fully missed day breaks it (no freeze)');
select is((select streak_before from core.streak_events where user_id = :'b'::uuid and kind = 'broke'), 2, 'the break is logged with what was lost');

select tests.create_user('ds-f@test.local') as f \gset
select core.grant_freeze(:'f'::uuid, 'paid', 'purchase', 2);
select pg_temp.vote(:'f'::uuid, '2027-01-11 10:00Z');
select pg_temp.vote(:'f'::uuid, '2027-01-12 10:00Z');
select core.day_streak_nightly('2027-01-14 00:07+02');
select core.day_streak_nightly('2027-01-14 01:07+02');
select is((pg_temp.g(:'f'::uuid)).streak, 2, 'a freeze covers the missed day');
select is((select count(*)::int from core.freezes where user_id = :'f'::uuid and used_on_day = '2027-01-13'), 1, 'and is spent once, on that day');
select is((select kind from core.streak_days where user_id = :'f'::uuid and day = '2027-01-13'), 'frozen', 'the day is kept as frozen');
select pg_temp.vote(:'f'::uuid, '2027-01-14 10:00Z');
select is((pg_temp.g(:'f'::uuid)).streak, 3, 'the next day is +1');

-- no nightly run: the next vote closes the missed day first
select tests.create_user('ds-lazy@test.local') as lz \gset
select pg_temp.vote(:'lz'::uuid, '2027-01-11 10:00Z');
select pg_temp.vote(:'lz'::uuid, '2027-01-13 10:00Z');
select is((pg_temp.g(:'lz'::uuid)).streak, 1, 'a late vote after a missed day starts again at 1');

-- ── freezes at day 3 and every 7th day, max 2; milestones and Frames once ──
select tests.create_user('ds-m@test.local') as m \gset
select pg_temp.vote(:'m'::uuid, ('2027-02-01'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 6) k;
select is((select array_agg(source order by acquired_at) from core.freezes where user_id = :'m'::uuid), '{day3,day7}'::text[],
          'a free freeze at day 3 and at day 7');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'m'::uuid and ref = 'streakday:2027-02-07'),
          '{"freeze": true, "frame": "frame_seven", "frame_key": "frame_seven", "gear": null}'::jsonb, 'day 7: the moment, Frame Επτά and the freeze');
select is((select count(*)::int from core.feed_inbox where user_id = :'m'::uuid and kind = 'celebration' and payload ->> 'type' = 'streak_milestone'),
          2, 'moments at 3 and 7');
select pg_temp.vote(:'m'::uuid, ('2027-02-08'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 6) k;
select is((select count(*)::int from core.freezes where user_id = :'m'::uuid and used_at is null), 2, 'day 14 with both slots full gives nothing (max 2)');
select is((pg_temp.g(:'m'::uuid)).streak, 14, '14 days in a row');
select pg_temp.vote(:'m'::uuid, ('2027-02-15'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 15) k;
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'m'::uuid and ref = 'streakday:2027-03-02'),
          '{"freeze": false, "frame": null, "frame_key": "frame_month", "gear": null}'::jsonb,
          'day 30: Frame Μήνας, named only where 1.0.1 reads it');
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where uc.user_id = :'m'::uuid and c.key in ('frame_seven', 'frame_ten', 'frame_month')), 3, 'Επτά, Δέκα and Μήνας are owned');
-- break and come back: 7 again is no new Frame and no moment without a freeze to give
update core.user_game_state set streak = 0, day_last = '2027-03-02', day_through = null, record_run = false where user_id = :'m'::uuid;
select pg_temp.vote(:'m'::uuid, ('2027-03-10'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 6) k;
select is((select count(*)::int from core.feed_inbox where user_id = :'m'::uuid and kind = 'celebration'
            and payload ->> 'type' in ('streak_milestone', 'streak_record') and (payload ->> 'day')::date >= '2027-03-10'), 0, 'reaching 3 and 7 again with full slots: no moment');
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where uc.user_id = :'m'::uuid and c.key = 'frame_seven'), 1, 'and the Frame is not given twice');

-- ── get_me ──
select tests.login(:'f'::uuid);
select is((api.get_me() -> 'game' ->> 'daily_streak')::boolean, true, 'get_me says the daily σερί is on');
select is((api.get_me() -> 'game' ->> 'streak')::int, 3, 'get_me: the top bar reads the days');
select tests.logout();

-- ── pushes ──
-- p1 and p2 have a σερί and a device; p1 plays on the 20th, p2 does not; p3 has no device; p4 switched it off
select tests.create_user('ds-p1@test.local') as p1 \gset
select tests.create_user('ds-p2@test.local') as p2 \gset
select tests.create_user('ds-p3@test.local') as p3 \gset
select tests.create_user('ds-p4@test.local') as p4 \gset
select tests.create_user('ds-p5@test.local') as p5 \gset
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[ds-p1]', :'p1'::uuid, 'ios'), ('ExponentPushToken[ds-p2]', :'p2'::uuid, 'ios'),
  ('ExponentPushToken[ds-p4]', :'p4'::uuid, 'ios'), ('ExponentPushToken[ds-p5]', :'p5'::uuid, 'ios');
update core.profiles set notification_prefs = '{"streak_reminder": false}' where user_id = :'p4'::uuid;
select pg_temp.vote(u, ('2027-01-18'::date + k + time '12:00') at time zone 'Europe/Athens')
  from unnest(array[:'p1'::uuid, :'p2'::uuid, :'p3'::uuid, :'p4'::uuid]) u, generate_series(0, 1) k;
select pg_temp.vote(:'p5'::uuid, '2027-01-19 10:00Z');
-- p5 already had 3 personal pushes on the 20th
insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
  select :'p5'::uuid, 'personal', '{}', 'push', 'personal:ds-cap:' || g, '2027-01-20 12:00+02' from generate_series(1, 3) g;
select pg_temp.vote(:'p1'::uuid, '2027-01-20 10:00Z');
select core.streak_push_sweep('2027-01-20 19:50+02');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_risk:%'), 0, 'no reminder before 20:00');
select core.streak_push_sweep('2027-01-20 20:00+02');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where dedupe_key = 'personal:streak_risk:' || :'p2' || ':2027-01-20'),
          'Το σερί σου κινδυνεύει|2 μέρες στη σειρά. Μία ψήφος ή το quiz και το κρατάς.', '20:00: the reminder to whoever has not played');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_risk:' || :'p1' || '%'), 0, 'not to who already played today');
select is((select count(*)::int from core.notifications where user_id in (:'p3'::uuid, :'p4'::uuid) and dedupe_key like 'personal:streak_risk:%'), 0,
          'not without a device, not with the switch off');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_risk:' || :'p5' || '%'), 0, 'not past the cap of 3');
select is((select body from core.ntext('streak_risk_one', '{}')), 'Ξεκίνησες σερί χθες. Παίξε και σήμερα να γίνει 2.', 'σερί 1 has its own line');
select core.streak_push_sweep('2027-01-20 20:30+02');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_risk:' || :'p2' || '%'), 1, 'once a day');
select tests.create_user('ds-late@test.local') as late \gset
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[ds-late]', :'late'::uuid, 'ios');
select pg_temp.vote(:'late'::uuid, '2027-01-19 10:00Z');
select core.streak_push_sweep('2027-01-20 22:00+02');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_risk:' || :'late' || '%'), 0, 'never after 22:00');

-- the 21st: p2 missed the 20th. Give p2 a freeze first; p4 and p3 lost theirs
select core.grant_freeze(:'p2'::uuid, 'paid', 'purchase', 2);
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[ds-p3]', :'p3'::uuid, 'ios');
select core.day_streak_nightly('2027-01-21 00:07+02');
select core.streak_push_sweep('2027-01-21 08:50+02');
select is((select count(*)::int from core.notifications where dedupe_key like 'personal:streak_morning:%'), 0, 'the morning push waits for 09:00');
select core.streak_push_sweep('2027-01-21 09:00+02');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where dedupe_key = 'personal:streak_morning:' || :'p2' || ':2027-01-21'),
          'Η Ασφάλεια έσωσε το σερί σου|Χθες δεν έπαιξες, το σερί σου μένει 2. Δεν σου έμεινε Ασφάλεια.', '09:00: the freeze saved it, none left');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where dedupe_key = 'personal:streak_morning:' || :'p3' || ':2027-01-21'),
          'Το σερί σου έσπασε στις 2|Ξεκίνα νέο σήμερα. Το ρεκόρ σου είναι 2.', '09:00: the σερί broke');
select is((select body from core.ntext('streak_saved', '{"n": 5, "left": 2}')), 'Χθες δεν έπαιξες, το σερί σου μένει 5. Σου μένουν 2 Ασφάλειες.', 'two left');
select is((select body from core.ntext('streak_saved_one', '{"n": 5}')), 'Χθες δεν έπαιξες, το σερί σου μένει 5. Σου μένει 1 Ασφάλεια.', 'one left');

-- ── emails ──
-- e7 loses a σερί of 7, e6 one of 6; e3 has no device and has not played on the 20th
select tests.create_user('ds-e7@test.local') as e7 \gset
select tests.create_user('ds-e6@test.local') as e6 \gset
select pg_temp.vote(:'e7'::uuid, ('2027-01-13'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 6) k;
select pg_temp.vote(:'e6'::uuid, ('2027-01-14'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 5) k;
update core.freezes set used_at = now(), used_on_day = case source when 'day3' then date '2027-01-01' else date '2027-01-02' end
 where user_id in (:'e7'::uuid, :'e6'::uuid) and used_at is null;
select core.day_streak_nightly('2027-01-21 00:07+02');
select core.streak_email_sweep('2027-01-21 09:05+02');
select is((select count(*)::int from core.emails where kind = 'streak_lost'), 0, 'the lost email waits for 10:00');
select core.streak_email_sweep('2027-01-21 10:05+02');
select is((select payload - 'day' from core.emails where kind = 'streak_lost' and user_id = :'e7'::uuid), '{"n": 7, "best": 7}'::jsonb,
          'a lost σερί of 7: the email the next day at 10:00');
select is((select count(*)::int from core.emails where kind = 'streak_lost' and user_id = :'e6'::uuid), 0, 'a lost σερί of 6: no email');
-- the reminder email: p3 has a device now, so a new one without
select tests.create_user('ds-e3@test.local') as e3 \gset
select pg_temp.vote(:'e3'::uuid, ('2027-01-19'::date + k + time '12:00') at time zone 'Europe/Athens') from generate_series(0, 1) k;
select core.streak_email_sweep('2027-01-21 20:05+02');
select is((select payload ->> 'n' from core.emails where kind = 'streak_reminder_email' and user_id = :'e3'::uuid), '2',
          'the 20:00 reminder by email to whoever has no device');
select is((select count(*)::int from core.emails where kind = 'streak_reminder_email' and user_id = :'p2'::uuid), 0, 'not to whoever has a device');
select pg_temp.vote(:'e3'::uuid, '2027-01-21 19:00Z');
select is(core.email_gate('streak_reminder_email', :'e3'::uuid, (select payload from core.emails where kind = 'streak_reminder_email' and user_id = :'e3'::uuid)),
          '{"skip": "late"}'::jsonb, 'the gate drops a reminder that was not sent on its evening');
-- the milestone email: m reached 30 on 2 Mar
select core.streak_email_sweep('2027-03-02 11:05+02');
select is((select payload from core.emails where kind = 'streak_milestone' and user_id = :'m'::uuid), '{"n": 30, "frame": "frame_month"}'::jsonb,
          'the 30 days email');
select core.streak_email_sweep('2027-03-03 11:05+02');
select is((select count(*)::int from core.emails where kind = 'streak_milestone' and user_id = :'m'::uuid), 1, 'once');

-- the Monday line: 2027-03-08 is a Monday; m played 1 to 7 Mar except the 4th, which a freeze covered
select tests.create_user('ds-mon@test.local') as mon \gset
select core.grant_freeze(:'mon'::uuid, 'paid', 'purchase', 2);
select pg_temp.vote(:'mon'::uuid, ('2027-03-01'::date + k + time '12:00') at time zone 'Europe/Athens') from unnest(array[0, 1, 2, 4, 5, 6]) k;
select core.email_series_sweep('2027-03-08 09:05+02');
select is((select payload -> 'days' from core.emails where kind = 'monday' and user_id = :'mon'::uuid),
          '{"n": 6, "played": 6, "frozen": ["2027-03-04"]}'::jsonb, 'the Monday email carries the σερί line');

-- ── switching off: back to correct calls ──
select tests.login(:'adm'::uuid);
select is((api.admin_daily_streak(false) ->> 'on')::boolean, false, 'an admin switches it off');
select tests.logout();
select is(((pg_temp.g(:'calls'::uuid)).streak, (pg_temp.g(:'calls'::uuid)).streak_best)::text, '(6,9)', 'off again: the σερί is the correct calls');
select pg_temp.vote(:'q'::uuid, '2027-01-12 10:00Z');
select is((pg_temp.g(:'q'::uuid)).streak, 0, 'off again: votes do not count days');

select * from finish();
rollback;
