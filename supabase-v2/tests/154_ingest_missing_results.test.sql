-- Results the sheets post come over by themselves (founder, 25 Oct 2026). A schedule retirement lands as one; the
-- draw sheet's winners (walkovers too) fill the matches that wait with no result: the right way round, brothers by
-- surname, only matches from 26 Oct on, never over a result, never when two matches fit, one bad score skips only itself; a dry read writes
-- nothing; a second read adds nothing.
begin;
select plan(26);

select tests.create_user('mr-adm@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Missing Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/m", "draw_url": "https://docs.google.com/spreadsheets/d/md", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

select tests.mk_player('Αλέκος', 'Ζητάκης') as z1 \gset
select tests.mk_player('Βασίλης', 'Ζητάκης') as z2 \gset

create function pg_temp.p(sur text, fst text) returns jsonb language sql as $$
  select jsonb_build_object('raw', sur || ' ' || fst, 'surname', sur, 'first', fst) $$;
create function pg_temp.row(fp text, d text, tm text, disc text, s1 jsonb, s2 jsonb, res jsonb default null) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', fp, 'date', d, 'time', tm, 'discipline', disc, 'level', 'OPEN', 'tab', 'Τ', 'row', 1,
                            'flags', '[]'::jsonb, 'side1', s1, 'side2', s2, 'result', res) $$;
create function pg_temp.res(fp text) returns core.match_results language sql as $$
  select r.* from core.match_results r join core.matches m on m.id = r.match_id where m.source_ref = fp $$;

-- the schedule: a «wo» with no winner (its card waits), two matches still to play (one written the other way round from
-- the draw), brothers in doubles, a played match, a retirement («46 34 ret»), the same two people twice, one more
select core.ingest_run(:'t'::uuid, jsonb_build_array(
  pg_temp.row('wo', '2026-10-26', '17:00', 'MS', jsonb_build_array(pg_temp.p('ΑΛΦΑΣ', 'ΑΚΗΣ')), jsonb_build_array(pg_temp.p('ΒΗΤΑΣ', 'ΜΑΚΗΣ')), '{"walkover": true}'),
  pg_temp.row('cd', '2026-10-26', '18:00', 'MS', jsonb_build_array(pg_temp.p('ΔΕΛΤΑΣ', 'ΤΑΚΗΣ')), jsonb_build_array(pg_temp.p('ΓΑΜΑΣ', 'ΛΑΚΗΣ'))),
  pg_temp.row('br', '2026-10-26', '19:00', 'MD', jsonb_build_array(pg_temp.p('ΖΗΤΑΚΗΣ', 'ΑΛΕΚΟΣ'), pg_temp.p('ΖΗΤΑΚΗΣ', 'ΒΑΣΙΛΗΣ')),
              jsonb_build_array(pg_temp.p('ΕΨΙΛΟΝ', 'ΝΙΚΟΣ'), pg_temp.p('ΦΙΤΑΣ', 'ΠΕΤΡΟΣ'))),
  pg_temp.row('gh', '2026-10-20', '20:00', 'MS', jsonb_build_array(pg_temp.p('ΗΤΑΣ', 'ΣΑΚΗΣ')), jsonb_build_array(pg_temp.p('ΘΗΤΑΣ', 'ΚΩΣΤΗΣ')),
              '{"winner_side": 2, "sets": [{"w": 6, "l": 2}, {"w": 6, "l": 2}], "walkover": false}'),
  pg_temp.row('ij', '2026-10-20', '21:00', 'MD', jsonb_build_array(pg_temp.p('ΙΩΤΑΣ', 'ΑΡΗΣ'), pg_temp.p('ΚΑΠΠΑΣ', 'ΤΑΣΟΣ')),
              jsonb_build_array(pg_temp.p('ΛΑΜΔΑΣ', 'ΔΗΜΟΣ'), pg_temp.p('ΜΙΑΣ', 'ΓΙΩΡΓΟΣ')),
              '{"winner_side": 2, "sets": [{"w": 6, "l": 4}, {"w": 4, "l": 3}], "walkover": false, "retired": true}'),
  pg_temp.row('kl1', '2026-10-27', '17:00', 'MS', jsonb_build_array(pg_temp.p('ΝΙΑΣ', 'ΦΩΤΗΣ')), jsonb_build_array(pg_temp.p('ΞΙΑΣ', 'ΜΙΛΤΟΣ'))),
  pg_temp.row('kl2', '2026-10-28', '17:00', 'MS', jsonb_build_array(pg_temp.p('ΝΙΑΣ', 'ΦΩΤΗΣ')), jsonb_build_array(pg_temp.p('ΞΙΑΣ', 'ΜΙΛΤΟΣ'))),
  pg_temp.row('mn', '2026-10-27', '18:00', 'MS', jsonb_build_array(pg_temp.p('ΟΜΙΚΡΟΝΑΣ', 'ΗΛΙΑΣ')), jsonb_build_array(pg_temp.p('ΠΙΑΣ', 'ΣΤΑΘΗΣ'))),
  pg_temp.row('old', '2026-10-25', '18:00', 'MS', jsonb_build_array(pg_temp.p('ΡΩΣ', 'ΑΝΤΩΝΗΣ')), jsonb_build_array(pg_temp.p('ΣΙΓΜΑΣ', 'ΧΡΗΣΤΟΣ')))
), 'staff', :'adm'::uuid) as run1 \gset

-- 1. a retirement from the schedule lands as one, with its unfinished set
select is((pg_temp.res('ij')).retired, true, 'a «ret» row is stored as a retirement');
select is((pg_temp.res('ij')).sets, '[{"w": 6, "l": 4}, {"w": 4, "l": 3}]'::jsonb, 'with the set where play stopped');
select is((pg_temp.res('ij')).winner_side, 2::smallint, 'and the side that was ahead');
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and kind = 'walkover' and status = 'open'), 1,
          'the bare «wo» waits for a winner');

-- the «wo» row then leaves the schedule (as ΑΟΚ does): the match is off the sheet
update core.matches set postponed_at = now(), provenance = provenance || '{"missing_runs": 2}' where source_ref = 'wo';

create temp table d_ as select $j$[
 {"tab": "OPEN", "title": "OPEN MAIN DRAW (8)", "discipline": "MS", "level": "OPEN", "format": "knockout", "size": 8, "flags": [],
  "entrants": [
    {"pos": 1, "raw": "ΑΛΦΑΣ ΑΚΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΑΛΦΑΣ", "first": "ΑΚΗΣ"}]},
    {"pos": 2, "raw": "ΒΗΤΑΣ ΜΑΚΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΒΗΤΑΣ", "first": "ΜΑΚΗΣ"}]},
    {"pos": 3, "raw": "ΓΑΜΑΣ ΛΑΚΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΓΑΜΑΣ", "first": "ΛΑΚΗΣ"}]},
    {"pos": 4, "raw": "ΔΕΛΤΑΣ ΤΑΚΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΔΕΛΤΑΣ", "first": "ΤΑΚΗΣ"}]},
    {"pos": 5, "raw": "ΗΤΑΣ ΣΑΚΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΗΤΑΣ", "first": "ΣΑΚΗΣ"}]},
    {"pos": 6, "raw": "ΘΗΤΑΣ ΚΩΣΤΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΘΗΤΑΣ", "first": "ΚΩΣΤΗΣ"}]},
    {"pos": 7, "raw": "ΝΙΑΣ ΦΩΤΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΝΙΑΣ", "first": "ΦΩΤΗΣ"}]},
    {"pos": 8, "raw": "ΞΙΑΣ ΜΙΛΤΟΣ", "seed": null, "bye": false, "people": [{"surname": "ΞΙΑΣ", "first": "ΜΙΛΤΟΣ"}]},
    {"pos": 9, "raw": "ΟΜΙΚΡΟΝΑΣ ΗΛΙΑΣ", "seed": null, "bye": false, "people": [{"surname": "ΟΜΙΚΡΟΝΑΣ", "first": "ΗΛΙΑΣ"}]},
    {"pos": 10, "raw": "ΠΙΑΣ ΣΤΑΘΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΠΙΑΣ", "first": "ΣΤΑΘΗΣ"}]},
    {"pos": 11, "raw": "ΡΩΣ ΑΝΤΩΝΗΣ", "seed": null, "bye": false, "people": [{"surname": "ΡΩΣ", "first": "ΑΝΤΩΝΗΣ"}]},
    {"pos": 12, "raw": "ΣΙΓΜΑΣ ΧΡΗΣΤΟΣ", "seed": null, "bye": false, "people": [{"surname": "ΣΙΓΜΑΣ", "first": "ΧΡΗΣΤΟΣ"}]}],
  "rounds": [[
    {"round": 1, "slot": 1, "side1": "ΑΛΦΑΣ ΑΚΗΣ", "side2": "ΒΗΤΑΣ ΜΑΚΗΣ", "winner": 2, "bye": false, "scoreRaw": "wo", "sets": [], "walkover": true, "retired": false},
    {"round": 1, "slot": 2, "side1": "ΓΑΜΑΣ ΛΑΚΗΣ", "side2": "ΔΕΛΤΑΣ ΤΑΚΗΣ", "winner": 1, "bye": false, "scoreRaw": "63 36 10-8",
     "sets": [{"g": [6, 3], "tb": false}, {"g": [3, 6], "tb": false}, {"g": [10, 8], "tb": true}], "walkover": false, "retired": false},
    {"round": 1, "slot": 3, "side1": "ΗΤΑΣ ΣΑΚΗΣ", "side2": "ΘΗΤΑΣ ΚΩΣΤΗΣ", "winner": 1, "bye": false, "scoreRaw": "61 61",
     "sets": [{"g": [6, 1], "tb": false}, {"g": [6, 1], "tb": false}], "walkover": false, "retired": false},
    {"round": 1, "slot": 4, "side1": "ΝΙΑΣ ΦΩΤΗΣ", "side2": "ΞΙΑΣ ΜΙΛΤΟΣ", "winner": 1, "bye": false, "scoreRaw": "wo", "sets": [], "walkover": true, "retired": false},
    {"round": 1, "slot": 5, "side1": "ΟΜΙΚΡΟΝΑΣ ΗΛΙΑΣ", "side2": "ΠΙΑΣ ΣΤΑΘΗΣ", "winner": 1, "bye": false, "scoreRaw": "66 64",
     "sets": [{"g": [6, 6], "tb": false}, {"g": [6, 4], "tb": false}], "walkover": false, "retired": false},
    {"round": 1, "slot": 6, "side1": "ΡΩΣ ΑΝΤΩΝΗΣ", "side2": "ΣΙΓΜΑΣ ΧΡΗΣΤΟΣ", "winner": 1, "bye": false, "scoreRaw": "wo", "sets": [], "walkover": true, "retired": false}]]},
 {"tab": "MD OPEN", "title": "MD OPEN MAIN DRAW (2)", "discipline": "MD", "level": "OPEN", "format": "knockout", "size": 2, "flags": [],
  "entrants": [
    {"pos": 1, "raw": "ΖΗΤΑΚΗΣ Α/ΖΗΤΑΚΗΣ Β", "seed": null, "bye": false, "people": [{"surname": "ΖΗΤΑΚΗΣ", "first": "Α"}, {"surname": "ΖΗΤΑΚΗΣ", "first": "Β"}]},
    {"pos": 2, "raw": "ΕΨΙΛΟΝ ΝΙΚ/ΦΙΤΑΣ ΠΕΤ", "seed": null, "bye": false, "people": [{"surname": "ΕΨΙΛΟΝ", "first": "ΝΙΚ"}, {"surname": "ΦΙΤΑΣ", "first": "ΠΕΤ"}]}],
  "rounds": [[
    {"round": 1, "slot": 1, "side1": "ΖΗΤΑΚΗΣ Α/ΖΗΤΑΚΗΣ Β", "side2": "ΕΨΙΛΟΝ ΝΙΚ/ΦΙΤΑΣ ΠΕΤ", "winner": 2, "bye": false, "scoreRaw": "46 76 10-6",
     "sets": [{"g": [6, 4], "tb": false}, {"g": [6, 7], "tb": false}, {"g": [6, 10], "tb": true}], "walkover": false, "retired": false}]]}
]$j$::jsonb as j;

-- 2. a dry read says what it would bring and brings nothing
select core.ingest_draw_run(:'t'::uuid, (select j from d_), 'dry', :'adm'::uuid) as dry \gset
select is((:'dry'::jsonb ->> 'draw_results')::int, 3, 'a dry read counts the three results the draw has for waiting matches');
select ok(pg_temp.res('wo') is null, 'and writes none');

-- 3. the read
select core.ingest_draw_run(:'t'::uuid, (select j from d_), 'staff', :'adm'::uuid) as run \gset
select is((:'run'::jsonb ->> 'draw_results')::int, 3, 'three results from the draw');
select is((:'run'::jsonb ->> 'draw_results_unclear')::int, 1, 'the same two people on two waiting matches: none is guessed');
select is((:'run'::jsonb ->> 'draw_results_failed')::int, 1, 'a score the database refuses is skipped');

select is((pg_temp.res('wo')).winner_side, 2::smallint, 'the draw names the walkover''s winner');
select is((pg_temp.res('wo')).walkover, true, 'as a walkover');
select is((select status || ':' || (payload -> 'closed' ->> 'reason') from core.ingest_reviews
            where tournament_id = :'t'::uuid and kind = 'walkover' and fingerprint = 'wo'), 'done:draw_result', 'its waiting card closes');
select ok((select postponed_at is null and not provenance ? 'missing_runs' and provenance ? 'result_from_draw' from core.matches where source_ref = 'wo'),
          'it is no longer off the sheet, and says where its result came from');

select is((pg_temp.res('cd')).winner_side, 2::smallint, 'the schedule wrote the pair the other way round: the winner follows the people');
select is((pg_temp.res('cd')).sets, '[{"w": 6, "l": 3}, {"w": 3, "l": 6}, {"w": 10, "l": 8, "stb": true}]'::jsonb,
          'winner first, the match tie-break marked');
select is((pg_temp.res('br')).winner_side, 2::smallint, 'brothers on one side need no telling apart');
select is((pg_temp.res('br')).sets, '[{"w": 4, "l": 6}, {"w": 7, "l": 6, "tb": true}, {"w": 10, "l": 6, "stb": true}]'::jsonb,
          'a 7-6 set is a tie-break set');
select is((pg_temp.res('gh')).winner_side, 2::smallint, 'a match with a result keeps it, whatever the draw says');
select ok(pg_temp.res('kl1') is null and pg_temp.res('kl2') is null, 'neither of two matches that fit gets a result');
select ok(pg_temp.res('mn') is null, 'the refused score leaves its match waiting');
select ok(pg_temp.res('old') is null, 'a match before 26 Oct keeps waiting: past walkovers are ignored (founder, 25 Oct)');
select ok((select postponed_at is null from core.matches where source_ref = 'old'), 'and is left exactly as it was');
select ok(exists (select 1 from core.outbox where kind = 'resolve_match'
                   and payload ->> 'match_id' = (select id::text from core.matches where source_ref = 'cd')), 'the votes on it resolve');

-- 4. a second read adds nothing; an empty read decides nothing
select core.ingest_draw_run(:'t'::uuid, (select j from d_), 'staff', :'adm'::uuid) as again \gset
select is((:'again'::jsonb ->> 'draw_results')::int, 0, 'a second read adds nothing');
select is((select result_version from core.match_results r join core.matches m on m.id = r.match_id where m.source_ref = 'cd'), 1,
          'and rewrites nothing');
select ok(not (core.ingest_draw_run(:'t'::uuid, '[]'::jsonb, 'staff', :'adm'::uuid) ? 'draw_results'), 'an empty read decides nothing');

select * from finish();
rollback;
