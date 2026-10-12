-- Pro foundations: is_pro, the Pro screen, the waitlist and the staff grant.
begin;
select plan(10);

select tests.create_user('pro-u@test.local') as u \gset
select tests.create_user('pro-a@test.local', 'admin') as a \gset

select tests.as_anon();
select throws_ok($$select api.get_pro()$$, '42501', null, 'anonymous callers have no Pro screen');

select tests.login(:'u'::uuid);
select is((api.get_pro() ->> 'pro')::boolean, false, 'nobody starts with Pro');
select is(api.join_pro_waitlist(), true, 'Γίνε μέλος puts you on the list');
select is(api.join_pro_waitlist(), false, 'only once');
select is((api.get_pro() ->> 'waitlisted')::boolean, true, 'the screen knows you are on the list');
select is((api.get_pro() ->> 'pro')::boolean, false, 'the list grants nothing');
select throws_ok(format($$select api.admin_grant_pro(%L, 30)$$, :'u'), '42501', null, 'a user cannot grant Pro');

select tests.login(:'a'::uuid);
select ok((api.admin_grant_pro(:'u'::uuid, 30) ->> 'ends_at') is not null, 'an admin grants Pro for 30 days');
select api.admin_grant_pro(:'u'::uuid, 7) is not null as x \gset
select is((select count(*)::int from core.entitlements where user_id = :'u'::uuid and source = 'promo' and status = 'active'),
          1, 'a new grant replaces the earlier one');

select tests.login(:'u'::uuid);
select is((api.get_pro() -> 'current' ->> 'source'), 'promo', 'now you have Pro, from a promo');

select * from finish();
rollback;
