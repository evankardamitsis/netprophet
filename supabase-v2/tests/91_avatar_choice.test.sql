-- The drawn avatar choice: set and clear your own, never an unknown key, never anonymously; get_me returns it.
begin;
select plan(6);

select tests.create_user('av-u@test.local') as u \gset
select tests.as_anon();
select throws_ok($$select api.set_avatar('f2')$$, '42501', null, 'anonymous callers cannot set one');

select tests.login(:'u'::uuid);
select is(api.get_me() -> 'profile' -> 'avatar', 'null'::jsonb, 'none picked: the app draws the default');
select is(api.set_avatar('f2') ->> 'avatar', 'f2', 'pick one of the twelve');
select is(api.get_me() -> 'profile' ->> 'avatar', 'f2', 'get_me returns it');
select throws_ok($$select api.set_avatar('dragon')$$, '22023', null, 'an unknown key is refused');
select api.set_avatar(null);
select is(api.get_me() -> 'profile' -> 'avatar', 'null'::jsonb, 'back to the default');

select * from finish();
rollback;
