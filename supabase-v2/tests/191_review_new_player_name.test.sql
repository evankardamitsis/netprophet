-- «New player» on a review card can carry the name staff typed (founder, 19 Nov 2026: "i know the player, i need to add
-- them with their first name"). The family pair from 177: the sure place is the roster player, the held place is new.
begin;
select plan(4);

select tests.create_user('rn-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Λουκάς', 'Μπότας') as b1 \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "New Name Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/rn", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'rn1', $j${"row": {"fingerprint": "rn1", "date": "2026-11-20", "time": "20:30", "discipline": "MD", "level": "OPEN",
  "side1": [{"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": ""}, {"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": ""}],
  "side2": [{"raw": "ΦΛΑΜΠΟΥΡΑΣ", "surname": "ΦΛΑΜΠΟΥΡΑΣ", "first": ""}, {"raw": "ΣΑΝΙΔΑΣ", "surname": "ΣΑΝΙΔΑΣ", "first": ""}], "result": null},
  "unclear": [{"raw": "ΜΠΟΤΑΣ", "surname": "ΜΠΟΤΑΣ", "first": "", "slot": "1:1"}]}$j$::jsonb)
returning id as rv \gset

select tests.login(:'adm'::uuid);
select lives_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": [{"raw": "ΜΠΟΤΑΣ", "slot": "1:1", "new": true, "first": " Άρης ", "surname": "Μπότας"}]}')$$, :'rv'),
                'the held place is saved as a new player with the typed name');
select tests.logout();
select is((select p.first_name || ' ' || p.surname from core.match_participants mp join core.matches m on m.id = mp.match_id
            join core.players p on p.id = mp.player_id where m.source_ref = 'rn1' and mp.side = 1 and mp.position = 2),
          'Άρης Μπότας', 'the new player has the typed first name and surname');
select is((select mp.player_id from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 'rn1' and mp.side = 1 and mp.position = 1), :'b1'::uuid, 'the sure place is still the roster player');
select is((select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id where m.source_ref = 'rn1'), 4,
          'the match has its four players');

select * from finish();
rollback;
