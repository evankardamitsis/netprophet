-- The Numbers desk: who can read and write it, store days replaced not added, the daily snapshot, the totals.
begin;
select plan(14);

select tests.create_user('an-a@test.local') as a \gset
select tests.create_user('an-ed@test.local', 'editor') as ed \gset
select tests.create_user('an-adm@test.local', 'admin') as adm \gset
insert into core.push_tokens (token, user_id, platform, last_seen_at) values ('ExponentPushToken[an-a]', :'a'::uuid, 'ios', now());
insert into core.entitlements (user_id, key, source, status) values (:'a'::uuid, 'pro', 'subscription', 'active');
insert into core.votes (user_id, subject_type, subject_id, option) values (:'a'::uuid, 'card', gen_random_uuid(), 1);
select (select count(*)::int from core.profiles where deleted_at is null) as accounts \gset

select tests.login(:'a'::uuid);
select throws_ok($$select api.admin_numbers()$$, '42501', null, 'a user cannot read the numbers');
select throws_ok($$select api.admin_store_record('[]')$$, '42501', null, 'nor write store days');
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_numbers()$$, '42501', null, 'an editor cannot either');
select tests.login(:'adm'::uuid);
select throws_ok($$select api.admin_store_record('[]')$$, '42501', null, 'an admin cannot write store days, only the cron');
select throws_ok($$select api.admin_activity_snapshot()$$, '42501', null, 'nor take the snapshot');

reset role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select is(api.admin_store_record(format('[{"store":"apple","day":"%s","downloads":3},{"store":"google","day":"%s","downloads":5}]',
                                        core.athens_day() - 1, core.athens_day() - 1)::jsonb), 2, 'the cron writes two store days');
select api.admin_store_record(format('[{"store":"apple","day":"%s","downloads":4}]', core.athens_day() - 1)::jsonb);
select is((api.admin_activity_snapshot() ->> 'accounts')::int, :accounts, 'the snapshot counts every account');
select ok((api.admin_activity_snapshot() ->> 'opened_1d')::int >= 1, 'and who opened today, taken twice without a clash');

reset role;
select tests.login(:'adm'::uuid);
select is((api.admin_numbers() -> 'store' ->> 'apple')::int, 4, 'a day sent again replaces its count');
select is((api.admin_numbers() -> 'store' ->> 'google_7d')::int, 5, 'the week sums the store days');
select ok((api.admin_numbers() -> 'pro' ->> 'paid')::int >= 1, 'a subscription counts as paid Pro');
select is(jsonb_array_length(api.admin_numbers(14) -> 'days'), 14, 'one row per day asked for');
select ok((api.admin_numbers() -> 'days' -> 0 ->> 'votes')::int >= 1, 'today shows the vote');
select ok((api.admin_numbers() -> 'days' -> 0 ->> 'opened_1d') is not null, 'and today''s snapshot');

select * from finish();
rollback;
