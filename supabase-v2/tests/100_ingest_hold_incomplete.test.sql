-- A doubles row with one name on a side never stops the run (16 Oct, ΑΟΚ: «match_sides_incomplete»): the good row
-- goes in, the short one waits for staff with the sheet's words, and the commit-time side check passes.
begin;
select plan(5);

select tests.create_user('hi-adm@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Short Side Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/y", "ongoing": true, "season_start_year": 2026}') as t \gset

select lives_ok(format($$select api.admin_ingest_run(%L, $j$[
 {"fingerprint": "hi1", "date": "2026-10-20", "time": "18:00", "discipline": "MD", "level": "OPEN", "tab": "Τ", "row": 2,
  "side1": [{"raw": "ΚΑΛΟΣ ΝΙΚΟΣ", "surname": "ΚΑΛΟΣ", "first": "ΝΙΚΟΣ"}, {"raw": "ΦΙΛΟΣ ΤΑΚΗΣ", "surname": "ΦΙΛΟΣ", "first": "ΤΑΚΗΣ"}],
  "side2": [{"raw": "ΑΛΛΟΣ ΚΩΣΤΑΣ", "surname": "ΑΛΛΟΣ", "first": "ΚΩΣΤΑΣ"}, {"raw": "ΞΕΝΟΣ ΜΑΚΗΣ", "surname": "ΞΕΝΟΣ", "first": "ΜΑΚΗΣ"}], "result": null},
 {"fingerprint": "hi2", "date": "2026-10-20", "time": "19:00", "discipline": "MD", "level": "OPEN", "tab": "Τ", "row": 3,
  "side1": [{"raw": "ΠΡΩΤΟΣ ΓΙΩΡΓΟΣ", "surname": "ΠΡΩΤΟΣ", "first": "ΓΙΩΡΓΟΣ"}],
  "side2": [{"raw": "ΤΡΙΤΟΣ ΑΚΗΣ", "surname": "ΤΡΙΤΟΣ", "first": "ΑΚΗΣ"}, {"raw": "ΤΕΤΑΡΤΟΣ ΜΑΚΗΣ", "surname": "ΤΕΤΑΡΤΟΣ", "first": "ΜΑΚΗΣ"}], "result": null}
]$j$::jsonb, false)$$, :'t'), 'a doubles row with one name on a side does not stop the run');
select tests.logout();

-- the side check is deferred to commit; run it now, as the real run's commit would
select lives_ok($$set constraints all immediate$$, 'every stored match has full sides');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 'hi1'), 1, 'the good row goes in');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 'hi2'), 0, 'the short row does not');
select is((select payload -> 'unclear' -> 0 ->> 'reason' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'hi2' and status = 'open'),
          'side_incomplete', 'it waits for staff, marked as a short side');

select * from finish();
rollback;
