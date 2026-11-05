-- The quiz push stops after 30 days without opening the app and starts again when they come back.
begin;
select plan(6);

select tests.create_user('qd-gone@test.local') as gone \gset
select tests.create_user('qd-launch@test.local') as launch \gset
select tests.create_user('qd-second@test.local') as second \gset
select tests.create_user('qd-resume@test.local') as resume \gset
insert into core.push_tokens (token, user_id, platform, last_seen_at) values
  ('ExponentPushToken[qd-gone]', :'gone'::uuid, 'ios', '2026-10-10 12:00+03'),
  ('ExponentPushToken[qd-launch]', :'launch'::uuid, 'ios', '2026-10-12 12:00+03'),
  ('ExponentPushToken[qd-second-old]', :'second'::uuid, 'ios', '2026-09-01 12:00+03'),
  ('ExponentPushToken[qd-second-new]', :'second'::uuid, 'android', '2026-11-01 12:00+02'),
  ('ExponentPushToken[qd-resume]', :'resume'::uuid, 'ios', '2026-09-01 12:00+03');
-- gone's sign-in was last refreshed before the 30 days too; resume came back to a suspended app without a launch
insert into auth.sessions (id, user_id, created_at, updated_at) values
  (gen_random_uuid(), :'gone'::uuid, '2026-09-01 12:00+03', '2026-10-10 12:00+03'),
  (gen_random_uuid(), :'resume'::uuid, '2026-09-01 12:00+03', '2026-11-08 12:00+02');

create or replace function pg_temp.got(p_u uuid) returns int language sql as $$
  select count(*)::int from core.notifications where user_id = p_u and dedupe_key like 'personal:quiz:%'
$$;

-- Tuesday 10 Nov: 30 days back is 11 Oct
select core.quiz_nudge_sweep('2026-11-10 17:05+02');
select is(pg_temp.got(:'gone'), 0, 'more than 30 days without opening: nothing');
select is(pg_temp.got(:'launch'), 1, 'inside the 30 days by the last launch');
select is(pg_temp.got(:'second'), 1, 'one device opened is enough');
select is(pg_temp.got(:'resume'), 1, 'back to a suspended app counts, with no launch');

-- Friday 13 Nov: launch has now slipped out; gone opened the app and is back in
update core.push_tokens set last_seen_at = '2026-11-12 12:00+02' where user_id = :'gone'::uuid;
select core.quiz_nudge_sweep('2026-11-13 17:05+02');
select is(pg_temp.got(:'gone'), 1, 'opening the app starts it again');
select is(pg_temp.got(:'launch'), 1, 'and 30 days of silence stops it');

select * from finish();
rollback;
