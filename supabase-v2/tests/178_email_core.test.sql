-- The email core: the welcome is queued once for new accounts only, the allow-list and the off switch skip instead of
-- keeping, the account emails (claims, deleted) are queued with what they need, unsubscribe works by token alone.
begin;
select plan(18);

update core.email_settings set mode = 'allowlist', allowlist = '{}', start_at = now() - interval '1 hour', kinds_off = '{}';

-- an account from before the start never gets a welcome
select tests.create_user('em-old@example.com') as old \gset
update core.profiles set created_at = now() - interval '30 days' where user_id = :'old'::uuid;
update core.profiles set onboarding_state = '{"done": true, "via": "flow"}' where user_id = :'old'::uuid;
select is((select count(*)::int from core.emails where user_id = :'old'::uuid), 0, 'an existing account gets no welcome');

-- a new account gets one welcome when onboarding is done, once
select tests.create_user('em-new@example.com') as new \gset
update core.profiles set onboarding_state = '{"via": "flow"}' where user_id = :'new'::uuid;
select is((select count(*)::int from core.emails where user_id = :'new'::uuid), 0, 'no welcome before onboarding is done');
update core.profiles set onboarding_state = '{"done": true, "via": "flow"}' where user_id = :'new'::uuid;
update core.profiles set onboarding_state = '{"done": true, "via": "flow", "tour": true}' where user_id = :'new'::uuid;
select is((select count(*)::int from core.emails where user_id = :'new'::uuid and kind = 'welcome'), 1, 'one welcome when onboarding is done');

-- on the allow-list with nobody on it, the welcome is skipped, never kept for later
select is(api.admin_emails_due(10), '[]'::jsonb, 'nothing goes out to an address not on the allow-list');
select is((select status || ':' || reason from core.emails where user_id = :'new'::uuid), 'skipped:not_allowlisted', 'it is skipped, not kept');

-- on the allow-list, it goes out and is marked sent
select tests.create_user('em-ok@example.com') as ok \gset
update core.email_settings set allowlist = array['em-ok@example.com'];
update core.profiles set onboarding_state = '{"done": true}' where user_id = :'ok'::uuid;
select is(jsonb_array_length(api.admin_emails_due(10)), 1, 'an allow-listed address gets its welcome');
select is((select status from core.emails where user_id = :'ok'::uuid), 'sending', 'it is taken while it is sent');
select is(api.admin_emails_due(10), '[]'::jsonb, 'a second run does not take it again');
select is(api.admin_emails_done(jsonb_build_array(jsonb_build_object('id', (select id from core.emails where user_id = :'ok'::uuid), 'ok', true))), 1, 'the route reports it sent');
select is((select status from core.emails where user_id = :'ok'::uuid), 'sent', 'and it is sent');

-- unsubscribe by the token alone, from the website (anon)
select email_token as tok from core.profiles where user_id = :'ok'::uuid \gset
select tests.as_anon();
select ok(api.email_unsubscribe(:'tok'::uuid), 'the link turns the game emails off without signing in');
select ok(not api.email_unsubscribe(gen_random_uuid()), 'a wrong token changes nothing');
select throws_ok('select api.admin_emails_due(10)', '42501', null, 'the website cannot read the queue');
select tests.logout();
select is((select notification_prefs ->> 'game_email' from core.profiles where user_id = :'ok'::uuid), 'false', 'the same switch as in the app');

-- a profile claim decided: the account email is queued with the player's name
select tests.mk_player('Νίκος', 'Παπαχρήστος') as pl \gset
insert into core.claim_requests (user_id, player_id, status) values (:'ok'::uuid, :'pl'::uuid, 'pending') returning id as cr \gset
update core.claim_requests set status = 'approved', decided_at = now() where id = :'cr'::uuid;
select is((select kind || ':' || (payload ->> 'player_name') from core.emails where dedupe_key = 'claim:' || :'cr'),
          'claim_ok:Νίκος Παπαχρήστος', 'an approved claim queues its email with the name');

-- account emails go even to someone who turned the game emails off
select is((select (x ->> 'kind') from jsonb_array_elements(api.admin_emails_due(10)) x limit 1), 'claim_ok', 'account emails ignore the game switch');

-- account deleted: the address rides on the row, since the user row is gone
delete from auth.users where id = :'new'::uuid;
select is((select to_email from core.emails where dedupe_key = 'deleted:' || :'new'), 'em-new@example.com', 'the deleted email keeps the address');

-- the switch off: everything due is skipped
update core.email_settings set mode = 'off';
select api.admin_emails_due(10);
select is((select count(*)::int from core.emails where status = 'due'), 0, 'off skips everything due, nothing waits for it');

select * from finish();
rollback;
