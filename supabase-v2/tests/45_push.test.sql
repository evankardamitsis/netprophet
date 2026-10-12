-- Push for results: device tokens, and one message per device per run, grouped per person.
begin;
select plan(10);

select tests.create_user('push-u@test.local') as u \gset
select tests.create_user('push-v@test.local') as v \gset

select tests.as_anon();
select throws_ok($$select api.register_push_token('ExponentPushToken[abc]', 'ios')$$, '42501', null, 'anonymous callers cannot register');

select tests.login(:'u'::uuid);
select throws_ok($$select api.register_push_token('not-a-token', 'ios')$$, '22023', 'bad_token', 'only Expo tokens');
select is(api.register_push_token('ExponentPushToken[abc]', 'ios'), true, 'a device registers');
select is(api.register_push_token('ExponentPushToken[abc]', 'ios'), true, 'twice is fine');

-- the same phone, someone else signs in: the token moves
select tests.login(:'v'::uuid);
select api.register_push_token('ExponentPushToken[abc]', 'ios') as x \gset
select tests.logout();
select is((select user_id from core.push_tokens where token = 'ExponentPushToken[abc]'), :'v'::uuid, 'the token follows the account');

-- u gets their own device back, then two results resolve for u and one for v (v has the old phone)
select tests.login(:'u'::uuid);
select api.register_push_token('ExponentPushToken[uuu]', 'android') as x \gset
select tests.logout();
select tests.play(:'u'::uuid, true) is not null as x \gset
select tests.play(:'u'::uuid, false) is not null as x \gset
select tests.play(:'v'::uuid, true) is not null as x \gset

select core.take_push_batch(200) as batch \gset
select is(jsonb_array_length(:'batch'::jsonb), 2, 'one message per device, not per result');
select is((select m ->> 'title' from jsonb_array_elements(:'batch'::jsonb) m where m ->> 'to' = 'ExponentPushToken[uuu]'),
          'Βγήκαν 2 αποτελέσματα', 'two results arrive as one');
select is((select m ->> 'title' from jsonb_array_elements(:'batch'::jsonb) m where m ->> 'to' = 'ExponentPushToken[abc]'),
          'Βγήκε αποτέλεσμα', 'one result');
select is((select count(*)::int from core.outbox where kind = 'push' and done_at is null), 0, 'the jobs are done');
select is(core.take_push_batch(200), '[]'::jsonb, 'nothing is sent twice');

select * from finish();
rollback;
