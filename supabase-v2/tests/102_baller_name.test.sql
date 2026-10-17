-- A Baller's name (17 Oct): 2 to 16 letters, Greek or Latin; rude words refused in any spelling; staff can reset.
begin;
select plan(11);

select tests.create_user('bn-a@test.local') as a \gset
select tests.create_user('bn-ed@test.local', 'editor') as ed \gset

select tests.login(:'a'::uuid);
select is((api.set_baller_name('  Σερβίτσας  ') ->> 'name'), 'Σερβίτσας', 'a name is saved, trimmed');
select is((api.get_baller() ->> 'name'), 'Σερβίτσας', 'and read back');
select ok((api.get_baller() ->> 'met')::boolean, 'naming means you met your Baller');
select is((api.set_baller_name('Ace   Rocket') ->> 'name'), 'Ace Rocket', 'Latin works, spaces collapse');
select throws_ok($$select api.set_baller_name('Α')$$, '22023', 'bad_name', 'one letter is too short');
select throws_ok($$select api.set_baller_name('Ρακέτα123')$$, '22023', 'bad_name', 'digits are not a name');
select throws_ok($$select api.set_baller_name('Μαλάκας')$$, '22023', 'name_not_allowed', 'a rude word is refused');
select throws_ok($$select api.set_baller_name('malakas')$$, '22023', 'name_not_allowed', 'in Greeklish too');
select throws_ok($$select api.admin_reset_baller_name(auth.uid())$$, '42501', null, 'a player cannot reset names');

select tests.login(:'ed'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.admin_baller_names(50)) e where e ->> 'name' = 'Ace Rocket'), 1, 'staff see the names given');
select api.admin_reset_baller_name(:'a'::uuid) is not null as x \gset
reset role;
select is((select baller_name from core.profiles where user_id = :'a'::uuid), null, 'and can reset one');

select * from finish();
rollback;
