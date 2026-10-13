-- M4 part 1: sheet runs. One write path for the desk and the runs; people resolved on their own (alias or a certain
-- match links, an unclear name near an active user holds the row, anyone else is a new player); dry runs write
-- nothing but the log; walkovers wait for staff; re-runs never duplicate; the scheduled entry is service-only.
begin;
select plan(17);

select tests.create_user('m4-adm@test.local', 'admin') as adm \gset
select tests.create_user('m4-fan@test.local') as fan \gset
select tests.mk_player('Νίκος', 'Παπαδάκης') as nik \gset
select tests.mk_player('Ορέστης', 'Αλιάσογλου') as ali \gset
update core.players set claimed_by_user_id = :'fan'::uuid where id = :'nik'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, day_key)
values (:'fan'::uuid, 'card', gen_random_uuid(), 1, core.athens_day(now()));
insert into core.player_aliases (alias_norm, player_id) values (core.normalize_search('ΑΛΙΑΣΟΓΛΟΥ ΟΡ'), :'ali'::uuid);

select tests.login(:'adm'::uuid);
select throws_ok($$select api.admin_save_tournament('{"name": "Χ", "ongoing": true}')$$, '22023', 'source_required',
                 'an ongoing tournament needs its sheet');
select api.admin_save_tournament('{"name": "TAF RACE δοκιμή", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/x", "ongoing": true, "season_start_year": 2026}') as t \gset

-- three rows: an alias vs a new person; an unclear name near an active user; a walkover
create temp table rows_ as select $j$[
 {"fingerprint": "fp1", "date": "2026-10-20", "time": "20:30", "discipline": "MS", "level": "MED/ADV", "tab": "ΤΡ 20/10", "row": 3,
  "side1": [{"raw": "ΑΛΙΑΣΟΓΛΟΥ ΟΡ", "surname": "ΑΛΙΑΣΟΓΛΟΥ", "first": "ΟΡ"}],
  "side2": [{"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΤΑΚΗΣ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΤΑΚΗΣ"}],
  "result": {"winner_side": 1, "sets": [{"w":6,"l":3},{"w":6,"l":4}]}},
 {"fingerprint": "fp2", "date": "2026-10-20", "time": "21:30", "discipline": "MS", "level": "MED/ADV", "tab": "ΤΡ 20/10", "row": 4,
  "side1": [{"raw": "ΠΑΠΑΔΑΚΗ ΝΙΚΟΣ", "surname": "ΠΑΠΑΔΑΚΗ", "first": "ΝΙΚΟΣ"}],
  "side2": [{"raw": "ΑΛΛΟΣ ΚΩΣΤΑΣ", "surname": "ΑΛΛΟΣ", "first": "ΚΩΣΤΑΣ"}], "result": null},
 {"fingerprint": "fp3", "date": "2026-10-21", "time": "19:00", "discipline": "MS", "level": "MED/ADV", "tab": "ΤΕΤ 21/10", "row": 2,
  "side1": [{"raw": "ΑΛΙΑΣΟΓΛΟΥ ΟΡ", "surname": "ΑΛΙΑΣΟΓΛΟΥ", "first": "ΟΡ"}],
  "side2": [{"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΤΑΚΗΣ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΤΑΚΗΣ"}],
  "result": {"walkover": true}}]$j$::jsonb as j;
grant select on rows_ to public;

select api.admin_ingest_run(:'t'::uuid, (select j from rows_), true) as dry \gset
select tests.logout();
select is((:'dry'::jsonb ->> 'created')::int, 2, 'dry run: two matches would be created');
select is((:'dry'::jsonb ->> 'held_for_review')::int, 1, 'dry run: one row held');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid), 0, 'dry run writes no match');
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid), 0, 'dry run holds nothing');
select is((select trigger from core.ingest_runs where tournament_id = :'t'::uuid), 'dry', 'but the dry run is logged');

select tests.login(:'adm'::uuid);
select api.admin_ingest_run(:'t'::uuid, (select j from rows_), false) as run \gset
select tests.logout();
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid), 2, 'a run creates the clear rows');
select ok(exists (select 1 from core.match_participants mp join core.matches m on m.id = mp.match_id
                   where m.source_ref = 'fp1' and mp.player_id = :'ali'::uuid), 'an alias links');
select is((select surname from core.players p join core.match_participants mp on mp.player_id = p.id
            join core.matches m on m.id = mp.match_id where m.source_ref = 'fp1' and mp.side = 2), 'ΚΑΙΝΟΥΡΓΙΟΣ',
          'an unknown name becomes a new player');
select ok(exists (select 1 from core.match_results x join core.matches m on m.id = x.match_id where m.source_ref = 'fp1'),
          'a completed score is the result');
select is((select payload -> 'unclear' -> 0 ->> 'raw' from core.ingest_reviews where kind = 'people' and fingerprint = 'fp2'),
          'ΠΑΠΑΔΑΚΗ ΝΙΚΟΣ', 'an unclear name near an active user waits for staff');
select ok(exists (select 1 from core.ingest_reviews where kind = 'walkover' and fingerprint = 'fp3' and status = 'open'),
          'a walkover waits for its winner');

-- again: nothing new
select tests.login(:'adm'::uuid);
select api.admin_ingest_run(:'t'::uuid, (select j from rows_), false) as again \gset
select tests.logout();
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid), 2, 'a re-run never duplicates');

-- staff decide
select id as r2 from core.ingest_reviews where fingerprint = 'fp2' and status = 'open' \gset
select id as r3 from core.ingest_reviews where fingerprint = 'fp3' and status = 'open' \gset
select tests.login(:'adm'::uuid);
select api.admin_resolve_ingest_review(:'r2'::uuid,
       jsonb_build_object('decisions', jsonb_build_array(jsonb_build_object('raw', 'ΠΑΠΑΔΑΚΗ ΝΙΚΟΣ', 'player_id', :'nik'::uuid))));
select api.admin_resolve_ingest_review(:'r3'::uuid, '{"winner_side": 2}');
select tests.logout();
select ok(exists (select 1 from core.match_participants mp join core.matches m on m.id = mp.match_id
                   where m.source_ref = 'fp2' and mp.player_id = :'nik'::uuid), 'the held row imports with the chosen player');
select is((select winner_side::int from core.match_results x join core.matches m on m.id = x.match_id where m.source_ref = 'fp3'), 2,
          'the walkover gets the winner staff picked');

-- the scheduled entry is for the service role only
select tests.login(:'fan'::uuid);
select throws_ok($$select api.ingest_due()$$, '42501', null, 'not for users');
select tests.logout();
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select ok(jsonb_array_length(api.ingest_due()) >= 1, 'the service role sees the ongoing tournaments');
reset role;

select * from finish();
rollback;
