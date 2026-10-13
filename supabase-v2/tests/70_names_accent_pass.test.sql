-- The v1 names accent pass: capital names get a proposal from the spelling dictionary, word by word; staff apply
-- the sure ones in bulk and the rest one by one; only case and accents change; approved words spell new imports.
begin;
select plan(14);

select tests.create_user('nm-adm@test.local', 'admin') as adm \gset
select tests.create_user('nm-u@test.local') as u \gset
select tests.mk_player('ΓΙΩΡΓΟΣ', 'ΠΑΠΑΔΟΠΟΥΛΟΣ') as p1 \gset
select tests.mk_player('ΜΑΡΙΑ', 'ΠΑΠΑΔΟΠΟΥΛΟΥ-ΒΑΪΟΥ', 'f') as p2 \gset
select tests.mk_player('ΒΑΪΟΣ', 'ΚΑΡΑΓΙΑΝΝΗΣ') as p3 \gset
select tests.mk_player('ΞΥΖΩ', 'ΑΓΝΩΣΤΟΠΟΥΛΟΣ') as p4 \gset
select tests.mk_player('Ελένη', 'Γεωργίου', 'f') as p5 \gset

insert into core.name_spellings (kind, caps_key, spelling, confidence) values
  ('first', 'ΓΙΩΡΓΟΣ', 'Γιώργος', 'high'), ('first', 'ΜΑΡΙΑ', 'Μαρία', 'high'), ('first', 'ΒΑΙΟΣ', 'Βαΐος', 'high'),
  ('surname', 'ΠΑΠΑΔΟΠΟΥΛΟΣ', 'Παπαδόπουλος', 'high'), ('surname', 'ΠΑΠΑΔΟΠΟΥΛΟΥ', 'Παπαδοπούλου', 'high'),
  ('surname', 'ΒΑΙΟΥ', 'Βαΐου', 'high'), ('surname', 'ΚΑΡΑΓΙΑΝΝΗΣ', 'Καραγιάννης', 'review');

select is(core.name_caps_key('Βαΐος'), core.name_caps_key('ΒΑΪΟΣ'), 'dialytika and accents file under one key');
select is((select proposed_first || ' ' || proposed_surname || ' ' || confidence from core.name_proposals() where player_id = :'p2'::uuid),
          'Μαρία Παπαδοπούλου-Βαΐου high', 'word by word, the hyphen kept');
select is((select confidence from core.name_proposals() where player_id = :'p3'::uuid), 'review', 'one unsure word: review');
select is((select confidence from core.name_proposals() where player_id = :'p4'::uuid), 'missing', 'an unknown word: missing');
select ok(not exists (select 1 from core.name_proposals() where player_id = :'p5'::uuid), 'a written name is left alone');

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_name_pass()$$, '42501', 'forbidden', 'staff only');
select tests.logout();

select tests.login(:'adm'::uuid);
select ok((api.admin_name_pass('review') -> 'words') @> '[{"word": "ΚΑΡΑΓΙΑΝΝΗΣ", "spelling": "Καραγιάννης"}]', 'the desk names the unsure word');
select throws_ok($$select api.admin_apply_names(null, 'review')$$, '22023', 'pick_players', 'review rows are picked, not applied blind');
select ok((api.admin_apply_names() ->> 'applied')::int >= 2, 'apply every sure proposal');
select is((select first_name || ' ' || surname from core.players where id = :'p1'::uuid), 'Γιώργος Παπαδόπουλος', 'spelled');
select is((select surname from core.players where id = :'p3'::uuid), 'ΚΑΡΑΓΙΑΝΝΗΣ', 'the unsure one waits');
select throws_ok($$select api.admin_save_spelling('surname', 'ΚΑΡΑΓΙΑΝΝΗΣ', 'Καραγιάννος')$$, '22023', 'not_same_letters',
                 'only case and accents');
select api.admin_save_spelling('first', 'ΞΥΖΩ', 'Ξυζώ');
select api.admin_save_spelling('surname', 'ΑΓΝΩΣΤΟΠΟΥΛΟΣ', 'Αγνωστόπουλος');
select is((api.admin_apply_names(array[:'p3'::uuid, :'p4'::uuid]) ->> 'applied')::int, 2, 'picked rows apply');
select tests.logout();

-- a new import in capitals is spelled with approved words
select tests.mk_player('ΓΙΩΡΓΟΣ', 'ΑΓΝΩΣΤΟΠΟΥΛΟΣ') as p6 \gset
select is((select first_name || ' ' || surname from core.players where id = :'p6'::uuid), 'Γιώργος Αγνωστόπουλος',
          'new capitals spelled on arrival');

select * from finish();
rollback;
