-- Names: initials are not words to spell, a proposal that changes nothing is not listed, staff can leave a name as it
-- is or rename it by hand (the old name stays an alias), «Fix» names what it skipped, a wrong word can be removed,
-- and the words loaded on 15 Oct spell names.
begin;
select plan(12);

select tests.create_user('nf-staff@test.local', 'admin') as s \gset
select tests.mk_player('Α', 'Γκόργκα', 'f') as initial \gset
select tests.mk_player('1', 'ΠΡΟΚΡΙΜΑΤΙΚΑ', 'm') as placeholder \gset
select tests.mk_player('ΑΝΡΕΑΣ', 'ΜΑΝΟΠΟΥΛΟΣ', 'm') as typo \gset
select tests.mk_player('ΔΗΜ', 'ΣΑΡΛΗ', 'f') as loaded \gset

select ok(not core.name_is_caps('Α') and not core.name_is_caps('Κ.') and core.name_is_caps('ΝΤ'), 'a single letter is an initial, two are a word');
select ok(not exists (select 1 from core.name_proposals() where player_id = :'initial'), 'a proposal that changes nothing is not listed');
select is((select proposed_surname from core.name_proposals() where player_id = :'loaded'), 'Σαρλή', 'the loaded words spell a name');
select is((select proposed_first from core.name_proposals() where player_id = :'loaded'), 'Δημ', 'an abbreviation keeps its letters');
select ok(exists (select 1 from core.name_proposals() where player_id = :'placeholder'), 'a placeholder is listed');

select tests.as_anon();
select throws_ok(format('select api.admin_dismiss_name(%L)', :'placeholder'), '42501', null, 'only staff leave a name as it is');
select tests.login(:'s'::uuid);
select api.admin_dismiss_name(:'placeholder'::uuid);
select tests.logout();
select ok(not exists (select 1 from core.name_proposals() where player_id = :'placeholder'), 'left as it is: off the list');

select tests.login(:'s'::uuid);
select api.admin_rename_player(:'typo'::uuid, 'Ανδρέας', 'Μανόπουλος');
select tests.logout();
select is((select first_name || ' ' || surname from core.players where id = :'typo'), 'Ανδρέας Μανόπουλος', 'renamed by hand, letters and all');
select ok(exists (select 1 from core.player_aliases where player_id = :'typo' and alias_norm = core.normalize_search('ΜΑΝΟΠΟΥΛΟΣ ΑΝΡΕΑΣ')),
          'the old name stays an alias');

-- renamed after the list was read: «Fix» names it instead of counting it
update core.players set surname = 'Σαρλής' where id = :'loaded';
update core.name_spellings set confidence = 'high' where caps_key in ('ΔΗΜ', 'ΣΑΡΛΗ');
update core.players set surname = 'ΣΑΡΛΗ' where id = :'loaded';
update core.name_spellings set spelling = 'Σαρλής' where kind = 'surname' and caps_key = 'ΣΑΡΛΗ';
select tests.login(:'s'::uuid);
select is(api.admin_apply_names(array[:'loaded'::uuid]) -> 'skipped' -> 0 ->> 'player_id', :'loaded', 'a name it cannot fix comes back by name');

select is(api.admin_forget_spelling('surname', 'ΣΑΡΛΗ') ->> 'removed', '1', 'a wrong word is removed');
select tests.logout();
select is((select confidence from core.name_proposals() where player_id = :'loaded'), 'missing', 'and its names wait for a spelling again');

select * from finish();
rollback;
