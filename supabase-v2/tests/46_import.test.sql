-- Admin import: tournaments, name matching with aliases, approved rows in, re-import changes nothing.
begin;
select plan(13);

select tests.create_user('im-a@test.local', 'admin') as a \gset
select tests.create_user('im-u@test.local') as u \gset
select tests.mk_player('Βαγγέλης', 'Καρδαμίτσης') as p \gset
select tests.mk_player('Νίκος', 'Ροδίτης') as q \gset

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_tournaments()$$, '42501', null, 'only staff import');

select tests.login(:'a'::uuid);
select api.admin_save_tournament('{"name": "TAF RACE 2026-2027", "venue": "TAF TENNIS CLUB PALLINI", "surface": "hard"}') as t \gset
select is((select e ->> 'surface' from jsonb_array_elements(api.admin_tournaments()) e where e ->> 'id' = :'t'),
          'hard', 'a tournament with its surface');

select is((api.admin_match_people('[{"surname": "ΚΑΡΔΑΜΙΤΣΗΣ", "first": "ΕΥΑΓΓΕΛΟΣ", "first_alt": "Βαγγέλης"}]') -> 0 -> 'candidates' -> 0 ->> 'id'),
          :'p', 'the sheet''s ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ finds Βαγγέλης Καρδαμίτσης');
select is((api.admin_match_people('[{"surname": "ΚΑΡΔΑΜΙΤΣΗΣ", "first": "ΕΥΑΓΓΕΛΟΣ", "first_alt": "Βαγγέλης"}]') -> 0 -> 'candidates' -> 0 ->> 'score')::numeric,
          1.00, 'a certain match');
select ok((api.admin_match_people('[{"surname": "ΚΑΡΔΑΜΙΤΣΗΣ", "first": ""}]') -> 0 -> 'candidates' -> 0 ->> 'score')::numeric < 0.92,
          'a surname alone never looks certain');

-- one match still to play against a new surname-only player, one finished with the organiser's score
select format($j$[
  {"fingerprint": "2099-01-10|MS|MED/ADV|a|b", "date": "2099-01-10", "time": "20:30", "discipline": "MS", "level": "MED/ADV",
   "category_raw": "M MED/ADV", "tab": "ΣΑΒ 10/01", "row": 5, "flags": ["first_name_missing"],
   "side1": [{"player_id": "%1$s", "raw": "ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ"}], "side2": [{"new": {"surname": "ΑΦΑΛΩΝΙΑΤΗΣ", "first": ""}, "raw": "ΑΦΑΛΩΝΙΑΤΗΣ"}],
   "result": null},
  {"fingerprint": "2026-09-16|MS|ADV|c|d", "date": "2026-09-16", "time": "21:00", "discipline": "MS", "level": "ADV",
   "category_raw": "M ADV", "tab": "ΤΕΤ 16/09", "row": 4, "flags": [],
   "side1": [{"player_id": "%1$s", "raw": "ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ"}], "side2": [{"player_id": "%2$s", "raw": "ΡΟΔΙΤΗΣ ΝΙΚΟΣ"}],
   "result": {"winner_side": 1, "sets": [{"w": 6, "l": 3}, {"w": 7, "l": 6, "tb": true}], "walkover": false}}
]$j$, :'p', :'q') as rows \gset

select api.admin_import_matches(:'t'::uuid, :'rows'::jsonb) as first_run \gset
select is((:'first_run'::jsonb ->> 'created')::int, 2, 'two matches in');
select is((:'first_run'::jsonb ->> 'new_players')::int, 1, 'one new player');
select is((:'first_run'::jsonb ->> 'results')::int, 1, 'the organiser''s score is the result');

select api.admin_import_matches(:'t'::uuid, :'rows'::jsonb) as second_run \gset
select ok(:'second_run'::jsonb @> '{"created": 0, "results": 0, "results_skipped": 0, "new_players": 0, "held_for_review": 0, "walkovers_to_decide": 0}'::jsonb,
          'the same sheet again changes nothing');

select is((api.admin_match_people('[{"surname": "ΑΦΑΛΩΝΙΑΤΗΣ", "first": ""}]') -> 0 ->> 'alias')::uuid,
          (select id from core.players where surname = 'ΑΦΑΛΩΝΙΑΤΗΣ'), 'the confirmed spelling is remembered');

select tests.logout();
select is((select first_name from core.players where surname = 'ΑΦΑΛΩΝΙΑΤΗΣ'), '', 'an imported player may wait for a first name');
select is((select count(*)::int from core.tournament_events where tournament_id = :'t'::uuid), 2, 'one event per category');
select is((select status from core.matches where source_ref = '2026-09-16|MS|ADV|c|d'), 'confirmed', 'the finished match is confirmed');

select * from finish();
rollback;
