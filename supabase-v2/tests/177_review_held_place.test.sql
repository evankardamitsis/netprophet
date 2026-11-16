-- A doubles side with one surname twice (family plays together): the run holds only the place it is unsure of. The
-- card answers that place; the other place, the one the run was sure of, does not count as unanswered.
begin;
select plan(5);

select tests.create_user('hp-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Λουκάς', 'Μπότας') as b1 \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Held Place Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/hp", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'hp1', $j${"row": {"fingerprint": "hp1", "date": "2026-11-20", "time": "20:30", "discipline": "MD", "level": "OPEN",
  "side1": [{"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": ""}, {"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": ""}],
  "side2": [{"raw": "ΦΛΑΜΠΟΥΡΑΣ", "surname": "ΦΛΑΜΠΟΥΡΑΣ", "first": ""}, {"raw": "ΣΑΝΙΔΑΣ", "surname": "ΣΑΝΙΔΑΣ", "first": ""}], "result": null},
  "unclear": [{"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": "", "slot": "1:1"}]}$j$::jsonb)
returning id as rv \gset

select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": []}')$$, :'rv'),
                 '22023', 'person_undecided', 'the held place still needs an answer');
select lives_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": [{"raw": "ΜΠΟΤΑΣ", "slot": "1:1", "new": true}]}')$$, :'rv'),
                'answering only the held place saves');
select tests.logout();
select is((select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id where m.source_ref = 'hp1'), 4,
          'the match has its four players');
select is((select mp.player_id from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 'hp1' and mp.side = 1 and mp.position = 1), :'b1'::uuid, 'the sure place is the roster player');
select isnt((select mp.player_id from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 'hp1' and mp.side = 1 and mp.position = 2), :'b1'::uuid, 'the held place is the new player');

select * from finish();
rollback;
