-- The Users desk on summaries and retention: admins only, the summary follows changes, paging, segments, sorting,
-- one person's story, and who still played a week after joining.
begin;
select plan(17);

select tests.create_user('ur-a@test.local', 'user', 'Άννα Αλφα') as a \gset
select tests.create_user('ur-b@test.local', 'user', 'Βασίλης Βήτα') as b \gset
select tests.create_user('ur-ed@test.local', 'editor') as ed \gset
select tests.create_user('ur-adm@test.local', 'admin') as adm \gset
-- a joined three weeks ago through the flow and voted in their second week; b came over from v1
update core.profiles set created_at = date_trunc('week', now() - interval '21 days') + interval '1 hour',
       onboarding_state = '{"via": "flow", "done": true}'::jsonb where user_id = :'a'::uuid;
update core.profiles set onboarding_state = '{"via": "before-onboarding", "done": true}'::jsonb where user_id = :'b'::uuid;
insert into core.push_tokens (token, user_id, platform, last_seen_at) values ('ExponentPushToken[ur-a]', :'a'::uuid, 'ios', now());
insert into core.votes (user_id, subject_type, subject_id, option, day_key)
values (:'a'::uuid, 'card', gen_random_uuid(), 1,
        (date_trunc('week', now() - interval '21 days') at time zone 'Europe/Athens')::date + 8);

select ok(core.user_rollup_refresh() >= 4, 'the summary takes in everyone');
select is((select platforms from core.user_rollup where user_id = :'a'::uuid), 'ios', 'with their devices');
select is(core.user_rollup_refresh(), 0, 'a second refresh with nothing new writes nothing');

select tests.login(:'a'::uuid);
select throws_ok($$select api.admin_users_page()$$, '42501', null, 'a user cannot list people');
select throws_ok(format('select api.admin_user_timeline(%L)', :'b'), '42501', null, 'nor read someone''s story');
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_retention()$$, '42501', null, 'an editor cannot read retention');

select tests.login(:'adm'::uuid);
select is((api.admin_users_page(p_size => 10) ->> 'size')::int, 10, 'a page has the size asked for');
select ok(jsonb_array_length(api.admin_users_page(p_size => 10) -> 'rows') <= 10, 'and no more rows than that');
select is((api.admin_users_page('ur-a@test') ->> 'total')::int, 1, 'search finds by email');
select is((api.admin_users_page('αννα') -> 'rows' -> 0 ->> 'user_id'), :'a', 'and by name, without accents');
select ok((api.admin_users_page(p_platform => 'ios') ->> 'total')::int >= 1, 'the device filter works');
select ok((api.admin_users_page(p_segment => 'active') -> 'counts' ->> 'active')::int >= 1, 'who opened this week counts as active');
select is((api.admin_users_page(p_query => 'ur-', p_sort => 'votes') -> 'rows' -> 0 ->> 'user_id'), :'a', 'sorting by votes puts the voter first');
select is((api.admin_users_page(p_query => 'ur-', p_sort => 'votes', p_desc => false) -> 'rows' -> 0 ->> 'votes')::int, 0, 'and turned around last');

-- an admin action shows at once
reset role;
insert into core.entitlements (user_id, key, source, status) values (:'b'::uuid, 'pro', 'promo', 'active');
select tests.login(:'adm'::uuid);
select api.admin_user_refresh(:'b'::uuid);
select ok((api.admin_users_page('ur-b@test') -> 'rows' -> 0 ->> 'pro')::boolean, 'given Pro shows straight after the refresh');
select ok(jsonb_array_length(api.admin_user_timeline(:'a'::uuid)) >= 2, 'the story has the account and the vote');

reset role;
select core.retention_refresh();
select tests.login(:'adm'::uuid);
select is((select (w ->> 'w1')::int from jsonb_array_elements(api.admin_retention() -> 'weeks') w
            where (w ->> 'cohort_week')::date = date_trunc('week', now() - interval '21 days')::date), 1,
          'a vote in the second week counts as still playing in week 1');

select * from finish();
rollback;
