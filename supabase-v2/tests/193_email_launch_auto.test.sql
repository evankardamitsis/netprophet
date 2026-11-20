-- The launch email goes by itself (founder, 20 Nov 2026): from core.email_settings.launch_at, once to every account made
-- before launch_before, never to a deleted one, and the gate lets it through the before-launch rule and the cap.
begin;
select plan(10);

update core.email_settings set mode = 'on', allowlist = '{}', start_at = '2027-02-26 00:00Z', kinds_off = '{}',
                               launch_at = null, launch_before = '2027-01-01 00:00Z';

select tests.create_user('la-old@example.com') as old \gset
update core.profiles set created_at = '2026-04-10 12:00Z' where user_id = :'old'::uuid;
select tests.create_user('la-gone@example.com') as gone \gset
update core.profiles set created_at = '2026-04-11 12:00Z', deleted_at = now() where user_id = :'gone'::uuid;
select tests.create_user('la-early@example.com') as early \gset
update core.profiles set created_at = '2027-01-20 12:00Z' where user_id = :'early'::uuid;

-- not set: nothing
select is(core.email_launch_sweep(), 0, 'no launch_at: the sweep queues nothing');
-- set for later: still nothing
update core.email_settings set launch_at = now() + interval '1 day';
select is(core.email_launch_sweep(), 0, 'launch_at in the future: nothing yet');

-- the day: one each for the old accounts
update core.email_settings set launch_at = now() - interval '1 minute';
select core.email_launch_sweep();
select is((select count(*)::int from core.emails where kind = 'launch_v1' and user_id = :'old'::uuid), 1, 'an old account gets it');
select is((select count(*)::int from core.emails where kind = 'launch_v1' and user_id = :'gone'::uuid), 0, 'a deleted account never');
select is((select count(*)::int from core.emails where kind = 'launch_v1' and user_id = :'early'::uuid), 0, 'an account after launch_before not');
select is(core.email_launch_sweep(), 0, 'the next hour queues nothing again');
select is((select count(*)::int from core.emails where kind = 'launch_v1' and user_id = :'old'::uuid), 1, 'still once');

-- the gate: through the before-launch rule and the weekly cap, while the other game emails stay held
select is(core.email_gate('launch_v1', :'old'::uuid, '{}'), null, 'the gate lets the launch email through');
select is(core.email_gate('monday', :'old'::uuid, '{}'), '{"skip": "before_launch"}'::jsonb, 'other game emails still held');
insert into core.emails (user_id, kind, dedupe_key, status, sent_at)
values (:'old'::uuid, 'monday', 'la-cap-1', 'sent', now()), (:'old'::uuid, 'monday', 'la-cap-2', 'sent', now());
select is(core.email_gate('launch_v1', :'old'::uuid, '{}'), null, 'two game emails this week: the launch email still goes');

select * from finish();
rollback;
