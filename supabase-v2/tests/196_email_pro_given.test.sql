-- Pro given from the admin queues the Pro welcome once, marked as given with its end date; never twice, never with
-- a store welcome already there.
begin;
select plan(5);

select tests.create_user('pg-a@test.local') as a \gset
select tests.create_user('pg-b@test.local') as b \gset
select tests.create_user('pg-adm@test.local', 'admin') as adm \gset

select tests.login(:'adm'::uuid);
select api.admin_grant_pro(:'a'::uuid, 365);
reset role;
select is((select count(*)::int from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'), 1, 'giving Pro queues the welcome');
select is((select payload ->> 'given' from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'), 'true', 'marked as given');
select ok((select (payload ->> 'ends_at')::timestamptz > now() + interval '360 days' from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'), 'with the end of the gift');

select tests.login(:'adm'::uuid);
select api.admin_grant_pro(:'a'::uuid, 30);
reset role;
select is((select count(*)::int from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'), 1, 'a second gift sends nothing more');

select core.email_queue(:'b'::uuid, 'pro_welcome', 'pro_welcome:' || :'b', '{"store":"APP_STORE"}'::jsonb);
select tests.login(:'adm'::uuid);
select api.admin_grant_pro(:'b'::uuid, 30);
reset role;
select is((select count(*)::int from core.emails where user_id = :'b'::uuid and kind = 'pro_welcome'), 1, 'nor after a store welcome');

select * from finish();
rollback;
