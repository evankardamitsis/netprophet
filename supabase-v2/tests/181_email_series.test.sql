-- The email series and the weekly emails: each kind's trigger, its Athens slot (DST too), idempotency, the weekly cap
-- (when queueing and when sending), no backfill for old accounts, medal winners never get month_close, deleted
-- profiles and a results push the same day hold the email back. The sweep takes the time as an argument, so the
-- dates below are fixed: start_at is 26 Feb 2027; 1 Mar 2027 is a Monday and a 1st (Athens is UTC+2 until 28 Mar).
begin;
select plan(45);

update core.email_settings set mode = 'on', allowlist = '{}', start_at = '2027-02-26 00:00Z', kinds_off = '{}';

-- an open match on 1 Mar (18:00 Athens) and two players for it
select tests.mk_player('Γιώργος', 'Μέμμος') as p1 \gset
select tests.mk_player('Ηλίας', 'Λάππας') as p2 \gset
select tests.mk_match(:'p1'::uuid, :'p2'::uuid, '2027-03-01 16:00Z') as m_open \gset

-- ── day1_vote ──
select tests.create_user('es-day1@example.com') as a \gset
update core.profiles set created_at = '2027-02-27 12:00Z' where user_id = :'a'::uuid;
select tests.create_user('es-day1-voted@example.com') as a2 \gset
update core.profiles set created_at = '2027-02-27 12:00Z' where user_id = :'a2'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'a2'::uuid, 'match', :'m_open'::uuid, 1, '2027-02-27 13:00Z', '2027-02-27');

select is(core.email_series_sweep('2027-03-01 06:30Z') >= 0, true, 'the sweep runs before 10:00');
select is((select count(*)::int from core.emails where user_id = :'a'::uuid), 0, 'day1 waits for 10:00 Athens');
select core.email_series_sweep('2027-03-01 08:30Z');
select is((select (payload ->> 'open')::int from core.emails where dedupe_key = 'day1:' || :'a'), 1,
          'day1 is queued the next morning with the matches open today');
select is((select payload -> 'matches' -> 0 ->> 'a' from core.emails where dedupe_key = 'day1:' || :'a'), 'Γιώργος Μέμμος',
          'it carries the match with the names');
select is((select payload -> 'matches' -> 0 ->> 'time' from core.emails where dedupe_key = 'day1:' || :'a'), '18:00',
          'the time is Athens time');
select is((select count(*)::int from core.emails where dedupe_key = 'day1:' || :'a2'), 0, 'no day1 for someone who already voted');
select core.email_series_sweep('2027-03-01 09:30Z');
select is((select count(*)::int from core.emails where user_id = :'a'::uuid), 1, 'a second run queues nothing again');

-- a day with nothing to vote: no day1
select tests.create_user('es-day1-empty@example.com') as a3 \gset
update core.profiles set created_at = '2027-03-04 12:00Z' where user_id = :'a3'::uuid;
select core.email_series_sweep('2027-03-06 08:30Z');
select is((select count(*)::int from core.emails where user_id = :'a3'::uuid), 0, 'no day1 on a day without matches');

-- ── day3_follow ──
select tests.create_user('es-day3@example.com') as b \gset
update core.profiles set created_at = '2027-02-26 10:00Z' where user_id = :'b'::uuid;
select tests.create_user('es-day3-follows@example.com') as b2 \gset
update core.profiles set created_at = '2027-02-26 10:00Z' where user_id = :'b2'::uuid;
insert into core.follows (user_id, player_id) values (:'b2'::uuid, :'p1'::uuid);
select tests.create_user('es-day3-old@example.com') as bo \gset
update core.profiles set created_at = '2027-02-25 23:00Z' where user_id = :'bo'::uuid;
select tests.create_user('es-day3-deleted@example.com') as bd \gset
update core.profiles set created_at = '2027-02-26 10:00Z', deleted_at = '2027-02-28 10:00Z' where user_id = :'bd'::uuid;
select tests.mk_player('Μικρός', 'Παίκτης') as minor \gset
update core.players set is_minor = true where id = :'minor'::uuid;
select core.email_series_sweep('2027-03-01 08:30Z');
select ok((select jsonb_array_length(payload -> 'players') between 1 and 3 from core.emails where dedupe_key = 'day3:' || :'b'),
          'day3 is queued on day 3 with up to 3 players');
select ok(not exists (select 1 from core.emails e, jsonb_array_elements(e.payload -> 'players') x
                       where e.dedupe_key = 'day3:' || :'b' and x ->> 'name' = 'Μικρός Παίκτης'), 'a minor is never suggested');
select is((select count(*)::int from core.emails where user_id = :'b2'::uuid), 0, 'no day3 for someone who follows a player');
select is((select count(*)::int from core.emails where user_id = :'bo'::uuid), 0, 'no day3 for an account from before the start');
select is((select count(*)::int from core.emails where user_id = :'bd'::uuid), 0, 'a deleted profile gets nothing');

-- ── day14_missed ──
select tests.create_user('es-day14@example.com') as d \gset
update core.profiles set created_at = '2027-03-01 10:00Z' where user_id = :'d'::uuid;
insert into core.follows (user_id, player_id) values (:'d'::uuid, :'p1'::uuid);
select tests.create_user('es-day14-active@example.com') as d2 \gset
update core.profiles set created_at = '2027-03-01 10:00Z' where user_id = :'d2'::uuid;
insert into core.follows (user_id, player_id) values (:'d2'::uuid, :'p1'::uuid);
insert into core.push_tokens (token, user_id, platform, last_seen_at) values ('ExpoPushToken[es-d2]', :'d2'::uuid, 'ios', '2027-03-14 18:00Z');
select tests.create_user('es-day14-push@example.com') as d3 \gset
update core.profiles set created_at = '2027-03-01 10:00Z' where user_id = :'d3'::uuid;
insert into core.follows (user_id, player_id) values (:'d3'::uuid, :'p1'::uuid);
insert into core.notifications (user_id, type, channel, dedupe_key, scheduled_at, sent_at, created_at)
values (:'d3'::uuid, 'result', 'push', 'result:es-d3', '2027-03-15 06:00Z', '2027-03-15 06:00Z', '2027-03-15 06:00Z');
-- what happened while they were away: Μέμμος won on 5 Mar
select tests.mk_player('Σπύρος', 'Βλάσσης') as p3 \gset
select tests.mk_match(:'p1'::uuid, :'p3'::uuid, '2027-03-05 15:00Z', 'played') as m_past \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m_past'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');
select core.email_series_sweep('2027-03-15 08:30Z');
select is((select payload -> 'followed' -> 0 ->> 'player' || ':' || (payload -> 'followed' -> 0 ->> 'won')
             from core.emails where dedupe_key = 'day14:' || :'d'), 'Γιώργος Μέμμος:true',
          'day14 tells the followed player''s result while away');
select is((select count(*)::int from core.emails where user_id = :'d2'::uuid), 0, 'no day14 for someone who opened the app');
select is((select count(*)::int from core.emails where user_id = :'d3'::uuid), 0, 'no day14 on a day a results push went');
select core.email_series_sweep('2027-03-16 08:30Z');
select is((select count(*)::int from core.emails where dedupe_key = 'day14:' || :'d3'), 1, 'it goes the next day instead');
select is((select count(*)::int from core.emails where dedupe_key = 'day14:' || :'d'), 1, 'and only once');

-- ── day7_week, with a place in the Κατηγορία ──
select tests.create_user('es-day7@example.com') as c \gset
update core.profiles set created_at = '2027-03-03 10:00Z' where user_id = :'c'::uuid;
select tests.create_user('es-day7-none@example.com') as c2 \gset
update core.profiles set created_at = '2027-03-03 10:00Z' where user_id = :'c2'::uuid;
select tests.create_user('es-rival@example.com') as rival \gset
update core.profiles set created_at = '2026-12-01 10:00Z' where user_id = :'rival'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key, outcome, resolved_at)
values (:'c'::uuid, 'match', :'m_past'::uuid, 1, '2027-03-04 10:00Z', '2027-03-04', 'correct', '2027-03-04 18:00Z');
-- the vote put them in a Κατηγορία for March; a rival with more points joins it
select lm.league_id as lg from core.league_members lm join core.leagues l on l.id = lm.league_id
 where lm.user_id = :'c'::uuid and l.month_key = '2027-03' \gset
insert into core.league_members (league_id, user_id) values (:'lg'::uuid, :'rival'::uuid);
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key, created_at) values
  (:'c'::uuid, 10, 'correct', 'match', :'m_past'::uuid, '2027-03', 'es-c', '2027-03-05 10:00Z'),
  (:'rival'::uuid, 30, 'correct', 'match', :'m_past'::uuid, '2027-03', 'es-rival', '2027-03-05 10:00Z');
select core.email_series_sweep('2027-03-10 08:30Z');
select is((select (payload ->> 'votes') || '/' || (payload ->> 'correct') from core.emails where dedupe_key = 'day7:' || :'c'), '1/1',
          'day7 is queued on day 7 with the first week''s votes');
select is((select payload -> 'ladder' from core.emails where dedupe_key = 'day7:' || :'c'),
          '{"tier": "bronze", "place": 2, "size": 2}'::jsonb, 'and the place in the Κατηγορία');
select is((select count(*)::int from core.emails where user_id = :'c2'::uuid), 0, 'no day7 without a vote');

-- ── monday ──
select tests.create_user('es-monday@example.com') as e \gset
update core.profiles set created_at = '2026-12-01 10:00Z' where user_id = :'e'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key, outcome, resolved_at)
values (:'e'::uuid, 'match', :'m_past'::uuid, 1, '2027-03-03 10:00Z', '2027-03-03', 'correct', '2027-03-03 18:00Z');
insert into core.follows (user_id, player_id) values (:'e'::uuid, :'p2'::uuid);
select tests.mk_match(:'p2'::uuid, :'p3'::uuid, '2027-03-11 15:00Z') as m_week \gset
select core.email_series_sweep('2027-03-08 06:30Z');
select is((select count(*)::int from core.emails where user_id = :'e'::uuid), 0, 'monday waits for 09:00 Athens');
select core.email_series_sweep('2027-03-08 07:30Z');
select is((select (payload ->> 'correct') || '/' || (payload ->> 'resolved') from core.emails where dedupe_key = 'monday:' || :'e' || ':2027-10'),
          '1/1', 'monday is queued to an old account that voted last week');
select is((select payload -> 'followed' -> 0 ->> 'a' from core.emails where dedupe_key = 'monday:' || :'e' || ':2027-10'),
          'Ηλίας Λάππας', 'with the followed players'' matches this week');
select core.email_series_sweep('2027-03-08 08:30Z');
select is((select count(*)::int from core.emails where user_id = :'e'::uuid), 1, 'one monday a week');

-- a Monday before the start: never backfilled
select tests.create_user('es-monday-early@example.com') as e0 \gset
update core.profiles set created_at = '2027-02-01 10:00Z' where user_id = :'e0'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'e0'::uuid, 'match', :'m_past'::uuid, 1, '2027-02-17 10:00Z', '2027-02-17');
select core.email_series_sweep('2027-02-22 07:30Z');
select is((select count(*)::int from core.emails where user_id = :'e0'::uuid), 0, 'no monday from before the start');

-- summer time: 09:00 Athens is 06:00 UTC
select tests.create_user('es-monday-summer@example.com') as es \gset
update core.profiles set created_at = '2027-05-01 10:00Z' where user_id = :'es'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'es'::uuid, 'match', :'m_week'::uuid, 1, '2027-06-09 10:00Z', '2027-06-09');
select core.email_series_sweep('2027-06-14 05:30Z');
select is((select count(*)::int from core.emails where user_id = :'es'::uuid), 0, 'in summer 05:30 UTC is still 08:30 Athens');
select core.email_series_sweep('2027-06-14 06:10Z');
select is((select count(*)::int from core.emails where dedupe_key = 'monday:' || :'es' || ':2027-24'), 1, 'and 06:10 UTC is 09:10');

-- ── month_close ──
select tests.create_user('es-gold@example.com') as f1 \gset
select tests.create_user('es-fifth@example.com') as f2 \gset
select tests.create_user('es-zero@example.com') as f3 \gset
update core.profiles set created_at = '2026-12-01 10:00Z' where user_id in (:'f1'::uuid, :'f2'::uuid, :'f3'::uuid);
insert into core.leagues (month_key, tier, group_no, closed_at) values ('2027-02', 'bronze', 902, '2027-02-28 22:10Z') returning id as lf \gset
insert into core.league_members (league_id, user_id, final_rank, final_points, outcome) values
  (:'lf'::uuid, :'f1'::uuid, 1, 80, 'promoted'), (:'lf'::uuid, :'f2'::uuid, 5, 10, 'promoted'), (:'lf'::uuid, :'f3'::uuid, 6, 0, 'stayed');
insert into core.month_medals (user_id, league_id, month_key, tier, place, points) values (:'f1'::uuid, :'lf'::uuid, '2027-02', 'bronze', 1, 80);
select core.email_series_sweep('2027-03-01 08:30Z');
select is((select payload - 'points' from core.emails where dedupe_key = 'month_close:' || :'f2' || ':2027-02'),
          '{"month": "2027-02", "tier": "bronze", "place": 5, "size": 3, "outcome": "promoted", "next_tier": "silver", "next_month": "2027-03"}'::jsonb,
          'month_close carries the place, the size and the next Κατηγορία');
select is((select count(*)::int from core.emails where user_id = :'f1'::uuid), 0, 'a medal winner gets the medal email, never month_close');
select is((select count(*)::int from core.emails where user_id = :'f3'::uuid), 0, 'no month_close without points');

-- ── away30 ──
select tests.create_user('es-away@example.com') as g \gset
select tests.create_user('es-away-long@example.com') as g2 \gset
update core.profiles set created_at = '2026-12-01 10:00Z' where user_id in (:'g'::uuid, :'g2'::uuid);
insert into core.push_tokens (token, user_id, platform, last_seen_at) values
  ('ExpoPushToken[es-g]', :'g'::uuid, 'android', '2027-01-30 08:00Z'),
  ('ExpoPushToken[es-g2]', :'g2'::uuid, 'android', '2026-12-15 08:00Z');
select core.email_series_sweep('2027-03-01 08:30Z');
select is((select (payload ->> 'days')::int from core.emails where dedupe_key = 'away30:' || :'g'), 30, 'away30 on the 30th day away');
select is((select count(*)::int from core.emails where user_id = :'g2'::uuid), 0, 'no away30 for someone already away before the start');
select core.email_series_sweep('2027-03-05 08:30Z');
select is((select count(*)::int from core.emails where user_id = :'g'::uuid), 1, 'away30 once');
select ok(not core.email_game_ok(:'g'::uuid, '2027-03-05 08:30Z'), 'and no other game email until they come back');
update core.push_tokens set last_seen_at = '2027-03-06 08:00Z' where user_id = :'g'::uuid;
select ok(core.email_game_ok(:'g'::uuid, '2027-03-09 08:30Z'), 'once they open the app, game emails can go again');

-- ── the cap when queueing: 2 game emails in 7 days already, so day3 waits ──
select tests.create_user('es-cap-queue@example.com') as l \gset
update core.profiles set created_at = '2027-02-26 10:00Z' where user_id = :'l'::uuid;
insert into core.emails (user_id, kind, dedupe_key, status, sent_at, due_at) values
  (:'l'::uuid, 'welcome', 'es:l:1', 'sent', '2027-02-26 10:30Z', '2027-02-26 10:30Z'),
  (:'l'::uuid, 'day1_vote', 'es:l:2', 'sent', '2027-02-27 08:30Z', '2027-02-27 08:30Z');
select core.email_series_sweep('2027-03-01 08:30Z');
select is((select count(*)::int from core.emails where dedupe_key = 'day3:' || :'l'), 0, 'no third game email within 7 days');
select ok(core.email_game_ok(:'l'::uuid, '2027-03-05 11:00Z'), 'a week after the first one there is room again');
-- account emails do not count
insert into core.emails (user_id, kind, dedupe_key, status, sent_at, due_at) values
  (:'l'::uuid, 'claim_ok', 'es:l:3', 'sent', '2027-03-04 08:30Z', '2027-03-04 08:30Z');
select ok(core.email_game_ok(:'l'::uuid, '2027-03-05 11:00Z'), 'account emails do not count for the cap');
select tests.create_user('es-one-a-day@example.com') as l2 \gset
insert into core.emails (user_id, kind, dedupe_key, status, sent_at, due_at) values
  (:'l2'::uuid, 'monday', 'es:l2:1', 'sent', '2027-03-02 07:00Z', '2027-03-02 07:00Z');
select ok(not core.email_game_ok(:'l2'::uuid, '2027-03-02 12:00Z'), 'at most one game email a day');
select ok(core.email_game_ok(:'l2'::uuid, '2027-03-03 08:00Z'), 'the next day there is room');

-- ── the cap when sending (core.email_gate, asked by api.admin_emails_due) ──
select tests.create_user('es-cap-send@example.com') as k \gset
-- joined after the launch (20270429000000: players from before it get no game email)
update core.profiles set created_at = '2027-02-27 12:00Z' where user_id = :'k'::uuid;
insert into core.emails (user_id, kind, dedupe_key, status, sent_at, due_at) values
  (:'k'::uuid, 'welcome', 'es:k:1', 'sent', now() - interval '3 days', now() - interval '3 days'),
  (:'k'::uuid, 'day1_vote', 'es:k:2', 'sent', now() - interval '2 days', now() - interval '2 days');
insert into core.emails (user_id, kind, dedupe_key, payload, due_at) values
  (:'k'::uuid, 'day3_follow', 'es:k:3', '{}', now() - interval '1 minute'),
  (:'k'::uuid, 'claim_ok', 'es:k:4', '{}', now() - interval '1 minute'),
  (:'k'::uuid, 'monday', 'test:monday:es-k', '{"test": true}', now() - interval '1 minute');
select is((select string_agg(x ->> 'kind', ',' order by x ->> 'kind') from jsonb_array_elements(api.admin_emails_due(50)) x
            where x ->> 'to' = 'es-cap-send@example.com'), 'claim_ok,monday',
          'after 2 game emails in 7 days the account email and a test still go');
select is((select status || ':' || reason from core.emails where dedupe_key = 'es:k:3'), 'skipped:cap', 'the third game email is skipped for the cap');
select tests.create_user('es-cap-old@example.com') as k2 \gset
-- joined after the launch (20270429000000: players from before it get no game email)
update core.profiles set created_at = '2027-02-27 12:00Z' where user_id = :'k2'::uuid;
insert into core.emails (user_id, kind, dedupe_key, status, sent_at, due_at) values
  (:'k2'::uuid, 'welcome', 'es:k2:1', 'sent', now() - interval '9 days', now() - interval '9 days'),
  (:'k2'::uuid, 'day1_vote', 'es:k2:2', 'sent', now() - interval '2 days', now() - interval '2 days');
insert into core.emails (user_id, kind, dedupe_key, due_at) values (:'k2'::uuid, 'day7_week', 'es:k2:3', now() - interval '1 minute');
select is((select count(*)::int from jsonb_array_elements(api.admin_emails_due(50)) x where x ->> 'to' = 'es-cap-old@example.com'), 1,
          'one sent more than 7 days ago no longer counts');

-- the switch off: the sweep queues nothing
update core.email_settings set mode = 'off';
select is(core.email_series_sweep('2027-03-15 08:30Z'), 0, 'with the switch off the sweep queues nothing');

select * from finish();
rollback;
