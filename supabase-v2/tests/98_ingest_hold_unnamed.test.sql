-- One row with a place that has no name never stops the run: the good row goes in, the bad one waits for staff with
-- the sheet's words.
begin;
select plan(4);

select tests.create_user('hu-adm@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Unnamed Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/z", "ongoing": true, "season_start_year": 2026}') as t \gset

select lives_ok(format($$select api.admin_ingest_run(%L, $j$[
 {"fingerprint": "hu1", "date": "2026-10-20", "time": "18:00", "discipline": "MS", "level": "OPEN", "tab": "Τ", "row": 2,
  "side1": [{"raw": "ΚΑΛΟΣ ΝΙΚΟΣ", "surname": "ΚΑΛΟΣ", "first": "ΝΙΚΟΣ"}],
  "side2": [{"raw": "ΑΛΛΟΣ ΚΩΣΤΑΣ", "surname": "ΑΛΛΟΣ", "first": "ΚΩΣΤΑΣ"}], "result": null},
 {"fingerprint": "hu2", "date": "2026-10-20", "time": "19:00", "discipline": "MD", "level": "OPEN", "tab": "Τ", "row": 3,
  "side1": [{"raw": "ΠΡΩΤΟΣ ΓΙΩΡΓΟΣ", "surname": "ΠΡΩΤΟΣ", "first": "ΓΙΩΡΓΟΣ"}, {"raw": "/", "surname": "", "first": ""}],
  "side2": [{"raw": "ΤΡΙΤΟΣ ΑΚΗΣ", "surname": "ΤΡΙΤΟΣ", "first": "ΑΚΗΣ"}, {"raw": "ΤΕΤΑΡΤΟΣ ΜΑΚΗΣ", "surname": "ΤΕΤΑΡΤΟΣ", "first": "ΜΑΚΗΣ"}], "result": null}
]$j$::jsonb, false)$$, :'t'), 'a row with an empty place does not stop the run');
select tests.logout();

select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 'hu1'), 1, 'the good row goes in');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 'hu2'), 0, 'the row with the empty place does not');
select is((select payload -> 'unclear' -> 0 ->> 'raw' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'hu2' and status = 'open'),
          '/', 'it waits for staff, showing what the sheet says');

select * from finish();
rollback;
