-- «Quiz της ημέρας» push: Tuesday and Friday at 17:00 Athens, to whoever has a device and has not finished today's quiz.
begin;
select plan(12);

select tests.create_user('qn-new@test.local') as fresh \gset
select tests.create_user('qn-half@test.local') as half \gset
select tests.create_user('qn-done@test.local') as done \gset
select tests.create_user('qn-off@test.local') as off \gset
select tests.create_user('qn-full@test.local') as full_ \gset
select tests.create_user('qn-none@test.local') as none \gset
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[qn-new]', :'fresh'::uuid, 'ios'), ('ExponentPushToken[qn-half]', :'half'::uuid, 'android'),
  ('ExponentPushToken[qn-done]', :'done'::uuid, 'ios'), ('ExponentPushToken[qn-off]', :'off'::uuid, 'ios'),
  ('ExponentPushToken[qn-full]', :'full_'::uuid, 'ios');
update core.profiles set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || '{"quiz": false}' where user_id = :'off'::uuid;

create or replace function pg_temp.got(p_u uuid) returns int language sql as $$
  select count(*)::int from core.notifications where user_id = p_u and dedupe_key like 'personal:quiz:%'
$$;

-- 10 Nov 2026 is a Tuesday. half answered two of today's six, done finished, full_ already had 3 personal pushes
insert into core.quiz_sets (user_id, quiz_day, sport_id) values (:'half'::uuid, '2026-11-10', 'tennis') returning id as hs \gset
insert into core.quiz_set_cards (set_id, position, family, content) values
  (:'hs'::uuid, 1, 'o', '{}'), (:'hs'::uuid, 2, 'o', '{}'), (:'hs'::uuid, 3, 'o', '{}');
insert into core.votes (user_id, subject_type, subject_id, option, day_key)
  select :'half'::uuid, 'card', c.id, 1, '2026-11-10' from core.quiz_set_cards c where c.set_id = :'hs'::uuid and c.position <= 2;
insert into core.quiz_sets (user_id, quiz_day, sport_id, awarded_at) values (:'done'::uuid, '2026-11-10', 'tennis', now());
insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
  select :'full_'::uuid, 'personal', '{}', 'push', 'personal:test:' || g, '2026-11-10 12:00+02' from generate_series(1, 3) g;

-- not the hour, not the day
select core.quiz_nudge_sweep('2026-11-10 16:55+02');
select is(pg_temp.got(:'fresh'), 0, 'not before 17:00');
select core.quiz_nudge_sweep('2026-11-11 17:05+02');
select is(pg_temp.got(:'fresh'), 0, 'not on a Wednesday');

select core.quiz_nudge_sweep('2026-11-10 17:05+02');
select is((select payload ->> 'title' from core.notifications where user_id = :'fresh'::uuid and dedupe_key like 'personal:quiz:%'),
          'Quiz της ημέρας', 'not started: the plain line');
select is((select payload ->> 'title' from core.notifications where user_id = :'half'::uuid and dedupe_key like 'personal:quiz:%'),
          'Έχεις κάνει 2 από τα 6', 'halfway: how far you got');
select is((select payload -> 'message' -> 'data' ->> 'url' from core.outbox where idempotency_key = 'push:personal:quiz:' || :'fresh' || ':2026-11-10'),
          '/quiz', 'the tap opens the quiz');
select is(pg_temp.got(:'done'), 0, 'finished: nothing');
select is(pg_temp.got(:'off'), 0, 'switched off: nothing');
select is(pg_temp.got(:'none'), 0, 'no device: nothing');
select is(pg_temp.got(:'full_'), 0, 'a day already at the cap skips it');

select core.quiz_nudge_sweep('2026-11-10 17:15+02');
select is(pg_temp.got(:'fresh'), 1, 'once a day');

-- Friday is a new quiz day
select core.quiz_nudge_sweep('2026-11-13 17:05+02');
select is(pg_temp.got(:'fresh'), 2, 'and again on Friday');
select is(pg_temp.got(:'done'), 1, 'finishing Tuesday says nothing about Friday');

select * from finish();
rollback;
