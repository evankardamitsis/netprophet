-- The admin's Users tab and the roster's totals: who can read them, what they count, and the two new actions.
begin;
select plan(19);

select tests.create_user('au-a@test.local') as a \gset
select tests.create_user('au-b@test.local') as b \gset
select tests.create_user('au-ed@test.local', 'editor') as ed \gset
select tests.create_user('au-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Τοτάλ', 'Ένας') as p1 \gset
select tests.mk_player('Τοτάλ', 'Δύο') as p2 \gset
update core.players set status = 'merged', merged_into = :'p1'::uuid where id = :'p2'::uuid;
update core.players set claimed_by_user_id = :'a'::uuid where id = :'p1'::uuid;
insert into core.push_tokens (token, user_id, platform, last_seen_at) values ('ExponentPushToken[au-a]', :'a'::uuid, 'ios', now());
-- b came back to a suspended app, with no device registered; ed last opened long ago
insert into auth.sessions (user_id, created_at, updated_at) values
  (:'b'::uuid, now() - interval '60 days', now() - interval '2 days'),
  (:'ed'::uuid, now() - interval '90 days', now() - interval '60 days');
select (select count(*)::int from core.players where status <> 'merged') as players \gset
select (select count(*)::int from core.profiles where deleted_at is null) as accounts \gset

select tests.login(:'a'::uuid);
select throws_ok($$select api.admin_players_summary()$$, '42501', null, 'a user cannot read the roster totals');
select throws_ok($$select api.admin_users()$$, '42501', null, 'nor the accounts');
select tests.login(:'ed'::uuid);
select is((api.admin_players_summary() ->> 'total')::int, :players, 'an editor sees the total, merged entries left out');
select throws_ok($$select api.admin_users()$$, '42501', null, 'but not the accounts, which show emails');
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.admin_revoke_pro(%L)$$, :'a'), '42501', null, 'a user cannot end Pro');
select throws_ok(format($$select api.admin_set_user_hidden(%L, true)$$, :'a'), '42501', null, 'nor hide anyone');

select tests.login(:'adm'::uuid);
select is((api.admin_users() -> 'stats' ->> 'total')::int, :accounts, 'the total is every account');
select is((select r ->> 'email' from jsonb_array_elements(api.admin_users() -> 'rows') r where r ->> 'user_id' = :'a'), 'au-a@test.local', 'a row has the email');
select is((select r ->> 'player' from jsonb_array_elements(api.admin_users() -> 'rows') r where r ->> 'user_id' = :'a'), 'Τοτάλ Ένας', 'and the claimed player');
select is((select r ->> 'devices' from jsonb_array_elements(api.admin_users() -> 'rows') r where r ->> 'user_id' = :'a'), 'ios', 'and the device');
select ok((select r ->> 'last_opened' is not null from jsonb_array_elements(api.admin_users() -> 'rows') r where r ->> 'user_id' = :'b'), 'a refreshed sign-in counts as opening the app');
select ok((select jsonb_array_length(api.admin_users(null, 'gone') -> 'rows') >= 1), 'someone away for 30 days shows under its filter');
select ok(exists (select 1 from jsonb_array_elements(api.admin_users(null, 'gone') -> 'rows') r where r ->> 'user_id' = :'ed'), 'it is who it should be');
select is(jsonb_array_length(api.admin_users('au-b@test') -> 'rows'), 1, 'search finds by email');

-- Pro: what an admin gave ends, a subscription does not
select api.admin_grant_pro(:'a'::uuid, 30);
select is((api.admin_revoke_pro(:'a'::uuid) ->> 'still_pro')::boolean, false, 'the given Pro ends');
reset role;
insert into core.entitlements (user_id, key, source, status) values (:'b'::uuid, 'pro', 'subscription', 'active');
select tests.login(:'adm'::uuid);
select is((api.admin_revoke_pro(:'b'::uuid) ->> 'still_pro')::boolean, true, 'a paid subscription stays');

select api.admin_set_user_hidden(:'a'::uuid, true);
reset role;
select ok((select hidden from core.profiles where user_id = :'a'::uuid), 'hidden from the Ladder');
select tests.login(:'adm'::uuid);
select api.admin_set_user_hidden(:'a'::uuid, false);
reset role;
select ok(not (select hidden from core.profiles where user_id = :'a'::uuid), 'and back');
select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_set_user_hidden(%L, true)$$, gen_random_uuid()), 'P0002', null, 'nobody there');

select * from finish();
rollback;
