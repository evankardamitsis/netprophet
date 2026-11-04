-- «Quiz της ημέρας» push: Tuesday and Friday at 17:00 Athens, to whoever has a device and questions left today: 6 free, 12 Pro.
begin;
select plan(17);

select tests.create_user('qn-new@test.local') as fresh \gset
select tests.create_user('qn-half@test.local') as half \gset
select tests.create_user('qn-done@test.local') as done \gset
select tests.create_user('qn-off@test.local') as off \gset
select tests.create_user('qn-full@test.local') as full_ \gset
select tests.create_user('qn-none@test.local') as none \gset
select tests.create_user('qn-pro-new@test.local') as pnew \gset
select tests.create_user('qn-pro-low@test.local') as plow \gset
select tests.create_user('qn-pro-rest@test.local') as prest \gset
select tests.create_user('qn-pro-all@test.local') as pall \gset
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[qn-new]', :'fresh'::uuid, 'ios'), ('ExponentPushToken[qn-half]', :'half'::uuid, 'android'),
  ('ExponentPushToken[qn-done]', :'done'::uuid, 'ios'), ('ExponentPushToken[qn-off]', :'off'::uuid, 'ios'),
  ('ExponentPushToken[qn-full]', :'full_'::uuid, 'ios'), ('ExponentPushToken[qn-pnew]', :'pnew'::uuid, 'ios'),
  ('ExponentPushToken[qn-plow]', :'plow'::uuid, 'ios'), ('ExponentPushToken[qn-prest]', :'prest'::uuid, 'ios'),
  ('ExponentPushToken[qn-pall]', :'pall'::uuid, 'ios');
insert into core.entitlements (user_id, source, status) values
  (:'pnew'::uuid, 'gift', 'active'), (:'plow'::uuid, 'gift', 'active'), (:'prest'::uuid, 'gift', 'active'), (:'pall'::uuid, 'gift', 'active');
update core.profiles set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || '{"quiz": false}' where user_id = :'off'::uuid;

create or replace function pg_temp.got(p_u uuid) returns int language sql as $$
  select count(*)::int from core.notifications where user_id = p_u and dedupe_key like 'personal:quiz:%'
$$;

-- a set of p_cards with p_done answered; the sixth answer is what pays
create or replace function pg_temp.set_(p_u uuid, p_cards int, p_done int) returns void language plpgsql as $$
declare v uuid;
begin
  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro, awarded_at)
  values (p_u, '2026-11-10', 'tennis', p_cards = 12, case when p_done >= 6 then now() end) returning id into v;
  insert into core.quiz_set_cards (set_id, position, family, content) select v, g, 'o', '{}' from generate_series(1, p_cards) g;
  insert into core.votes (user_id, subject_type, subject_id, option, day_key)
    select p_u, 'card', c.id, 1, '2026-11-10' from core.quiz_set_cards c where c.set_id = v and c.position <= p_done;
end $$;
create or replace function pg_temp.title(p_u uuid) returns text language sql as $$
  select payload ->> 'title' from core.notifications where user_id = p_u and dedupe_key like 'personal:quiz:%' limit 1
$$;
create or replace function pg_temp.body(p_u uuid) returns text language sql as $$
  select payload ->> 'body' from core.notifications where user_id = p_u and dedupe_key like 'personal:quiz:%' limit 1
$$;

-- 10 Nov 2026 is a Tuesday. full_ already had 3 personal pushes
select pg_temp.set_(:'half', 6, 2);
select pg_temp.set_(:'done', 6, 6);
select pg_temp.set_(:'plow', 12, 3);
select pg_temp.set_(:'prest', 12, 8);
select pg_temp.set_(:'pall', 12, 12);
insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
  select :'full_'::uuid, 'personal', '{}', 'push', 'personal:test:' || g, '2026-11-10 12:00+02' from generate_series(1, 3) g;

-- not the hour, not the day
select core.quiz_nudge_sweep('2026-11-10 16:55+02');
select is(pg_temp.got(:'fresh'), 0, 'not before 17:00');
select core.quiz_nudge_sweep('2026-11-11 17:05+02');
select is(pg_temp.got(:'fresh'), 0, 'not on a Wednesday');

select core.quiz_nudge_sweep('2026-11-10 17:05+02');
select is(pg_temp.body(:'fresh'), '6 γρήγορες ερωτήσεις και +30 πόντοι. Ακόμα προλαβαίνεις.', 'not started: the plain line');
select is(pg_temp.title(:'half'), 'Έχεις κάνει 2 από τα 6', 'halfway: how far you got');
select is(pg_temp.body(:'pnew'), '12 γρήγορες ερωτήσεις και +30 πόντοι. Ακόμα προλαβαίνεις.', 'Pro not started: twelve');
select is(pg_temp.title(:'plow'), 'Έχεις κάνει 3 από τα 12', 'Pro before the +30: out of twelve');
select is(pg_temp.body(:'plow'), 'Τελείωσε το quiz της ημέρας και πάρε +30.', 'and the +30 is still ahead');
select is(pg_temp.body(:'prest'), 'Το +30 το πήρες. Τελείωσε και τις υπόλοιπες.', 'Pro past six is not finished, and the line does not promise the +30 again');
select is(pg_temp.got(:'pall'), 0, 'Pro with all twelve: nothing');
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
