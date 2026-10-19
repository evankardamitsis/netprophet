-- The admin Team page: only admins change roles, nobody changes their own, the last admin stays, every change is
-- written down; the email lookup is for the server only.
begin;
select plan(32);

-- a known starting point: no admins but ours
update core.profiles set role = 'user' where role = 'admin';
select tests.create_user('team-boss@test.local', 'admin', 'Άννα Μπος') as boss \gset
select tests.create_user('team-ed@test.local', 'editor') as ed \gset
select tests.create_user('team-user@test.local') as usr \gset
select tests.create_user('team-new@test.local') as nu \gset

-- refused for a player and for an editor
select tests.login(:'usr'::uuid);
select throws_ok($$select api.admin_team()$$, '42501', null, 'a player cannot see the team');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'nu', 'editor'), '42501', null, 'a player cannot change roles');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'usr', 'admin'), '42501', null, 'a player cannot promote themselves');
select tests.logout();
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_team()$$, '42501', null, 'an editor cannot see the team');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'nu', 'editor'), '42501', null, 'an editor cannot add staff');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'ed', 'admin'), '42501', null, 'an editor cannot promote themselves');
select tests.logout();
select is((select role from core.profiles where user_id = :'ed'::uuid), 'editor', 'the editor is still an editor');

-- the admin
select tests.login(:'boss'::uuid);
select is(jsonb_array_length(api.admin_team()), 2, 'the team lists the admin and the editor');
select is(api.admin_team() -> 0 ->> 'email', 'team-boss@test.local', 'admins first, with their email');
select is((api.admin_team() -> 0 ->> 'is_me')::boolean, true, 'and the viewer is marked');
select throws_ok($$select api.admin_set_staff_role(gen_random_uuid(), 'editor')$$, 'P0002', 'profile_not_found', 'an unknown account is refused');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'nu', 'owner'), '22023', 'invalid_role', 'an unknown role is refused');

select is(api.admin_set_staff_role(:'nu'::uuid, 'editor') ->> 'role', 'editor', 'the admin adds an editor');
select is(api.admin_set_staff_role(:'nu'::uuid, 'admin') ->> 'role', 'admin', 'and makes them admin');
select is((api.admin_set_staff_role(:'nu'::uuid, 'admin') ->> 'changed')::boolean, false, 'the same role again changes nothing');
select is(api.admin_set_staff_role(:'nu'::uuid, 'editor') ->> 'role', 'editor', 'demotes them to editor');
select is((select m ->> 'added_by' from jsonb_array_elements(api.admin_team()) m where m ->> 'user_id' = :'nu'),
          'Άννα Μπος', 'the team says who added them');
select is(api.admin_set_staff_role(:'nu'::uuid, 'user') ->> 'role', 'user', 'and removes them');
select is(jsonb_array_length(api.admin_team()), 2, 'a removed member leaves the list');

select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'boss', 'editor'), '42501', 'cannot_change_self', 'nobody changes their own role');
select tests.logout();

select is((select count(*)::int from core.staff_changes where user_id = :'nu'::uuid), 4, 'every change is written down, the no-op is not');
select ok(exists (select 1 from core.staff_changes where user_id = :'nu'::uuid and old_role = 'editor' and new_role = 'user'
                  and changed_by = :'boss'::uuid), 'with the old and new role and who did it');

-- the last admin: with two admins one can remove the other; then the one left cannot be changed by anyone
select tests.login(:'boss'::uuid);
select api.admin_set_staff_role(:'ed'::uuid, 'admin');
select tests.logout();
select tests.login(:'ed'::uuid);
select is(api.admin_set_staff_role(:'boss'::uuid, 'editor') ->> 'role', 'editor', 'two admins: one can demote the other');
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'ed', 'user'), '42501', 'cannot_change_self', 'the last admin cannot remove themselves');
select tests.logout();
select tests.login(:'boss'::uuid);
select throws_ok(format('select api.admin_set_staff_role(%L, %L)', :'ed', 'user'), '42501', 'forbidden', 'and the demoted one cannot act any more');
select tests.logout();
-- the rule itself (what a race between two admins meets after the lock): never zero admins
select throws_ok(format('select core.assert_admin_remains(%L, %L, %L)', :'ed', 'admin', 'user'), '42501', 'last_admin', 'removing the last admin is refused');
select throws_ok(format('select core.assert_admin_remains(%L, %L, %L)', :'ed', 'admin', 'editor'), '42501', 'last_admin', 'and so is demoting them');
-- a deleted admin is no safety net
update core.profiles set role = 'admin', deleted_at = now() where user_id = :'boss'::uuid;
select throws_ok(format('select core.assert_admin_remains(%L, %L, %L)', :'ed', 'admin', 'user'), '42501', 'last_admin', 'a deleted admin does not count');
update core.profiles set deleted_at = null where user_id = :'boss'::uuid;
select lives_ok(format('select core.assert_admin_remains(%L, %L, %L)', :'ed', 'admin', 'user'), 'with another admin it is fine');

-- the email lookup: server only
select tests.login(:'boss'::uuid);
select throws_ok($$select api.admin_staff_by_email('team-ed@test.local')$$, '42501', null, 'not for a signed-in user');
select tests.logout();
select tests.as_service();
select is(api.admin_staff_by_email('  Team-Ed@Test.local ') ->> 'role', 'admin', 'the server finds the role, any case');
select is(api.admin_staff_by_email('nobody@test.local'), null, 'and null for an unknown email');
select tests.logout();

select * from finish();
rollback;
