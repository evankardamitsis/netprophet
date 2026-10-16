-- Deleting my account removes me and what is mine; my roster player stays, unclaimed; nobody else is touched.
begin;
select plan(7);

select tests.create_user('del-me@test.local') as u \gset
select tests.create_user('del-other@test.local') as o \gset
select tests.mk_player('Δια', 'Γραφή') as p \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'p'::uuid;
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'p'::uuid);

select tests.as_anon();
select throws_ok($$select api.delete_my_account()$$, '42501', null, 'not without signing in');

select tests.login(:'u'::uuid);
select is(api.delete_my_account() ->> 'deleted', 'true', 'the account is deleted');
select tests.logout();

select ok(not exists (select 1 from auth.users where id = :'u'::uuid), 'the user is gone');
select ok(not exists (select 1 from core.profiles where user_id = :'u'::uuid), 'and the profile');
select ok(not exists (select 1 from core.follows where user_id = :'u'::uuid), 'and what they followed');
select is((select claimed_by_user_id from core.players where id = :'p'::uuid), null, 'the roster player stays, unclaimed');
select ok(exists (select 1 from auth.users where id = :'o'::uuid), 'nobody else is touched');

select * from finish();
rollback;
