-- Players from before the launch get no game email and no winback (founder, 19 Nov 2026); account and the other Pro
-- emails still go, and players who join after the launch get everything.
begin;
select plan(5);

update core.email_settings set mode = 'on', allowlist = '{}', start_at = '2027-02-26 00:00Z', kinds_off = '{}';

select tests.create_user('ep-old@example.com') as old \gset
update core.profiles set created_at = '2027-01-10 12:00Z' where user_id = :'old'::uuid;
select tests.create_user('ep-new@example.com') as new \gset
update core.profiles set created_at = '2027-02-27 12:00Z' where user_id = :'new'::uuid;

select is(core.email_gate('monday', :'old'::uuid, '{}'), '{"skip": "before_launch"}'::jsonb, 'an old player: no Monday email');
select is(core.email_gate('pro_winback', :'old'::uuid, '{}'), '{"skip": "before_launch"}'::jsonb, 'an old player: no winback');
select is(core.email_gate('claim_ok', :'old'::uuid, '{}'), null, 'an old player: account emails still go');
select is(core.email_gate('monday', :'new'::uuid, '{}'), null, 'a new player: the Monday email goes');
select is(core.email_gate('monday', :'old'::uuid, '{"test": true}'), null, '«Send me a test» is never held');

select * from finish();
rollback;
