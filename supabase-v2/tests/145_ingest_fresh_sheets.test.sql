-- Every read re-checks what waits on staff (founder, 22 Oct 2026): cards the fresh sheet no longer supports close with
-- the reason, cards that still hold stay; an unhealthy read closes nothing; the Results desk tells a match the sheet
-- dropped from an overdue one; and a guess is never evidence for the next guess (the Τζιότζιος case).
begin;
select plan(34);

select tests.create_user('fs-adm@test.local', 'admin') as adm \gset
select tests.create_user('fs-vas@test.local') as vas_user \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Fresh Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/f", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

select tests.mk_player('Πέτρος', 'Φρεσκάκης') as fr1 \gset
select tests.mk_player('Σωτήρης', 'Φρεσκάκης') as fr2 \gset
select tests.mk_player('Νίκος', 'Μενεκής') as me1 \gset
select tests.mk_player('Λάμπρος', 'Μενεκής') as me2 \gset

create function pg_temp.p(raw text, sur text, fst text) returns jsonb language sql as $$
  select jsonb_build_object('raw', raw, 'surname', sur, 'first', fst) $$;
create function pg_temp.row(fp text, d text, tm text, disc text, s1 jsonb, s2 jsonb, res jsonb default null) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', fp, 'date', d, 'time', tm, 'discipline', disc, 'level', 'OPEN', 'tab', 'Τ', 'row', 1,
                            'flags', '[]'::jsonb, 'side1', s1, 'side2', s2, 'result', res) $$;

-- ---------- 1. cards against the fresh read ----------
-- read 1: a bare «ΦΡΕΣΚΑΚΗΣ» (two players carry it) is held; a «wo» with no winner waits; a normal row goes in
select core.ingest_run(:'t'::uuid, jsonb_build_array(
  pg_temp.row('held1', '2026-10-20', '17:00', 'MS', jsonb_build_array(pg_temp.p('ΦΡΕΣΚΑΚΗΣ', 'ΦΡΕΣΚΑΚΗΣ', '')),
              jsonb_build_array(pg_temp.p('ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ', 'ΑΝΤΙΠΑΛΟΣ', 'ΕΝΑΣ'))),
  pg_temp.row('held2', '2026-10-20', '18:00', 'MS', jsonb_build_array(pg_temp.p('ΜΕΝΕΚΗΣ', 'ΜΕΝΕΚΗΣ', '')),
              jsonb_build_array(pg_temp.p('ΑΝΤΙΠΑΛΟΣ ΔΥΟ', 'ΑΝΤΙΠΑΛΟΣ', 'ΔΥΟ'))),
  pg_temp.row('wo1', '2026-10-20', '19:00', 'MS', jsonb_build_array(pg_temp.p('ΤΡΙΤΟΣ ΑΚΗΣ', 'ΤΡΙΤΟΣ', 'ΑΚΗΣ')),
              jsonb_build_array(pg_temp.p('ΤΕΤΑΡΤΟΣ ΜΑΚΗΣ', 'ΤΕΤΑΡΤΟΣ', 'ΜΑΚΗΣ')), '{"walkover": true}'),
  pg_temp.row('ok1', '2026-10-20', '20:00', 'MS', jsonb_build_array(pg_temp.p('ΠΕΜΠΤΟΣ ΛΑΚΗΣ', 'ΠΕΜΠΤΟΣ', 'ΛΑΚΗΣ')),
              jsonb_build_array(pg_temp.p('ΕΚΤΟΣ ΤΑΚΗΣ', 'ΕΚΤΟΣ', 'ΤΑΚΗΣ')))), 'staff', :'adm'::uuid) as run1 \gset
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and status = 'open'), 3, 'read 1: two names and a walkover wait');

-- a score conflict on the normal row (as a player-settled match would leave it)
insert into core.ingest_reviews (tournament_id, kind, fingerprint, match_id, payload)
select :'t'::uuid, 'score_conflict', 'ok1', id, '{"row": {}}'::jsonb from core.matches where source_ref = 'ok1';

-- the organiser edits the sheet: held1 gets a first name (a new fingerprint), held2 is unchanged, the walkover gets
-- its winner, the normal row loses the score the conflict was about
select core.ingest_run(:'t'::uuid, jsonb_build_array(
  pg_temp.row('held1b', '2026-10-20', '17:00', 'MS', jsonb_build_array(pg_temp.p('ΦΡΕΣΚΑΚΗΣ ΠΕΤΡΟΣ', 'ΦΡΕΣΚΑΚΗΣ', 'ΠΕΤΡΟΣ')),
              jsonb_build_array(pg_temp.p('ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ', 'ΑΝΤΙΠΑΛΟΣ', 'ΕΝΑΣ'))),
  pg_temp.row('held2', '2026-10-20', '18:00', 'MS', jsonb_build_array(pg_temp.p('ΜΕΝΕΚΗΣ', 'ΜΕΝΕΚΗΣ', '')),
              jsonb_build_array(pg_temp.p('ΑΝΤΙΠΑΛΟΣ ΔΥΟ', 'ΑΝΤΙΠΑΛΟΣ', 'ΔΥΟ'))),
  pg_temp.row('wo1', '2026-10-20', '19:00', 'MS', jsonb_build_array(pg_temp.p('ΤΡΙΤΟΣ ΑΚΗΣ', 'ΤΡΙΤΟΣ', 'ΑΚΗΣ')),
              jsonb_build_array(pg_temp.p('ΤΕΤΑΡΤΟΣ ΜΑΚΗΣ', 'ΤΕΤΑΡΤΟΣ', 'ΜΑΚΗΣ')), '{"walkover": true, "winner_side": 1, "sets": []}'),
  pg_temp.row('ok1', '2026-10-20', '20:00', 'MS', jsonb_build_array(pg_temp.p('ΠΕΜΠΤΟΣ ΛΑΚΗΣ', 'ΠΕΜΠΤΟΣ', 'ΛΑΚΗΣ')),
              jsonb_build_array(pg_temp.p('ΕΚΤΟΣ ΤΑΚΗΣ', 'ΕΚΤΟΣ', 'ΤΑΚΗΣ')))), 'staff', :'adm'::uuid) as run2 \gset

select is((select status from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held1'), 'dismissed',
          'the card for a row the sheet no longer has is closed');
select is((select payload -> 'closed' ->> 'reason' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held1'), 'row_gone',
          'with the reason');
select is((select payload -> 'closed' ->> 'by' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held1'), 'sheet',
          'by the sheet, not by a person');
select is((select payload -> 'closed' ->> 'run_id' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held1'),
          :'run2'::jsonb ->> 'run_id', 'and the read that closed it');
select ok((select payload ? 'row' and payload ? 'unclear' from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held1'),
          'what the card said is kept');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 'held1b'), 1, 'the edited row goes in by itself');
select is((select status from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held2'), 'open', 'a card that still holds stays');
select is((select status || ':' || (payload -> 'closed' ->> 'reason') from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'wo1'),
          'done:result_in', 'the sheet named the walkover''s winner: its card is done');
select is((select status || ':' || (payload -> 'closed' ->> 'reason') from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'ok1' and kind = 'score_conflict'),
          'dismissed:no_score_on_sheet', 'a score conflict the sheet no longer has a score for closes');
select is((:'run2'::jsonb ->> 'stale_closed')::int, 3, 'the run counts what it closed');
select is((:'run2'::jsonb -> 'stale_reasons' ->> 'row_gone')::int, 1, 'by reason');

-- a dry run says what it would close and closes nothing
select core.ingest_run(:'t'::uuid, jsonb_build_array(
  pg_temp.row('ok1', '2026-10-20', '20:00', 'MS', jsonb_build_array(pg_temp.p('ΠΕΜΠΤΟΣ ΛΑΚΗΣ', 'ΠΕΜΠΤΟΣ', 'ΛΑΚΗΣ')),
              jsonb_build_array(pg_temp.p('ΕΚΤΟΣ ΤΑΚΗΣ', 'ΕΚΤΟΣ', 'ΤΑΚΗΣ')))), 'dry', :'adm'::uuid) as dry \gset
select is((:'dry'::jsonb ->> 'stale_closed')::int, 1, 'a dry run counts held2 as gone');
select is((select status from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held2'), 'open', 'and leaves it open');

-- an empty read (a sheet that could not be parsed) closes nothing
select core.ingest_run(:'t'::uuid, '[]'::jsonb, 'staff', :'adm'::uuid) as empty \gset
select is(:'empty'::jsonb ->> 'health', 'empty', 'an empty read');
select is((select status from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'held2'), 'open', 'closes nothing');

-- the score conflict closes when the sheet now agrees with the stored result
select id as m_ok1 from core.matches where source_ref = 'ok1' \gset
select core.set_result(:'m_ok1'::uuid, 1, '[{"w": 6, "l": 1}, {"w": 6, "l": 2}]'::jsonb, null, null, false, false, :'adm'::uuid);
insert into core.ingest_reviews (tournament_id, kind, fingerprint, match_id, payload)
values (:'t'::uuid, 'score_conflict', 'ok1', :'m_ok1'::uuid, '{"row": {}}'::jsonb) returning id as sc2 \gset
select core.ingest_close_stale_reviews(:'t'::uuid, jsonb_build_array(
  pg_temp.row('ok1', '2026-10-20', '20:00', 'MS', '[]'::jsonb, '[]'::jsonb,
              jsonb_build_object('winner_side', 1, 'sets', (select sets from core.match_results where match_id = :'m_ok1'::uuid)))), null);
select is((select status || ':' || (payload -> 'closed' ->> 'reason') from core.ingest_reviews where id = :'sc2'::uuid),
          'done:agrees', 'a score conflict the sheet now agrees with is done');
select is((select count(*)::int from core.match_results where match_id = :'m_ok1'::uuid), 1, 'and the result is untouched');

-- ---------- 2. Results desk: off the sheet is not overdue ----------
select tests.mk_player('Α', 'Παλιός') as old1 \gset
select tests.mk_player('Β', 'Παλιός') as old2 \gset
select tests.mk_match(:'old1'::uuid, :'old2'::uuid, now() - interval '3 days') as gone \gset
select tests.mk_match(:'old2'::uuid, :'old1'::uuid, now() - interval '3 days' + interval '1 hour') as late \gset
update core.matches set tournament_id = :'t'::uuid, source = 'import', source_ref = 'gone1',
                        provenance = provenance || '{"missing_runs": 2}', postponed_at = now() - interval '2 days' where id = :'gone'::uuid;
update core.matches set tournament_id = :'t'::uuid, source = 'import', source_ref = 'late1' where id = :'late'::uuid;
select tests.login(:'adm'::uuid);
select api.admin_desk(7) as desk \gset
select tests.logout();
select ok((select (x ->> 'off_sheet')::boolean from jsonb_array_elements(:'desk'::jsonb) x where x ->> 'match_id' = :'gone'), 'a match the sheet dropped is off the sheet');
select ok(not (select (x ->> 'overdue')::boolean from jsonb_array_elements(:'desk'::jsonb) x where x ->> 'match_id' = :'gone'), 'and not overdue');
select ok((select x ->> 'off_sheet_since' from jsonb_array_elements(:'desk'::jsonb) x where x ->> 'match_id' = :'gone') is not null, 'since when');
select ok((select (x ->> 'overdue')::boolean from jsonb_array_elements(:'desk'::jsonb) x where x ->> 'match_id' = :'late'), 'one still on the sheet is overdue');
select is((select status from core.matches where id = :'gone'::uuid), 'scheduled', 'nothing is voided by itself');

-- ---------- 3. a guess is never evidence (Θάνος / Βασίλης Τζιότζιος, ΑΟΚ 20 Oct) ----------
select tests.mk_player('Θάνος', 'Τζιότζιος') as thanos \gset
select tests.mk_player('Βασίλης', 'Τζιότζιος') as vasilis \gset
select tests.mk_player('Ηλίας', 'Τζιότζιος') as ilias \gset
select tests.mk_player('Σέργιος', 'Γεωργίουτεστ') as sergios \gset
select tests.mk_player('Αλέξανδρος', 'Μητρόπουλοςτεστ') as mitro \gset
select tests.mk_player('Γιώργος', 'Γκουζούλης') as gkou \gset
select tests.mk_player('Γιάννης', 'Μάλλιος') as mallios \gset
select tests.mk_player('Γιάννης', 'Αρτινός') as artinos \gset
select tests.mk_player('Κώστας', 'Ζαρειφόπουλος') as zar \gset
update core.players set claimed_by_user_id = :'vas_user'::uuid where id = :'vasilis'::uuid;
insert into core.tournaments (sport_id, name, source) values ('tennis', 'ΑΟΚ τεστ', 'import') returning id as aok \gset

create function pg_temp.idrow(fp text, d text, tm text, a uuid[], b uuid[]) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', fp, 'date', d, 'time', tm, 'discipline', 'MD', 'level', '50+', 'tab', 'Τ', 'row', 1, 'flags', '[]'::jsonb,
    'side1', (select jsonb_agg(jsonb_build_object('player_id', x, 'raw', '')) from unnest(a) x),
    'side2', (select jsonb_agg(jsonb_build_object('player_id', x, 'raw', '')) from unnest(b) x), 'result', null) $$;
-- the 17 Oct guess: the sheet wrote a bare «ΤΖΙΩΤΖΙΟΣ», an old alias put Θάνος there
select core.ingest_apply(:'aok'::uuid, jsonb_build_array(
  pg_temp.idrow('2026-10-20|MD|50+|γεωργιουτεστ σεργιοσ+τζιωτζιοσ|γκουζουλησ+μαλλιοσ', '2026-10-20', '18:30',
                array[:'thanos'::uuid, :'sergios'::uuid], array[:'gkou'::uuid, :'mallios'::uuid])), null, null);
select id as guess from core.matches where tournament_id = :'aok'::uuid \gset

select ok(not core.named_in_match(:'guess'::uuid, :'thanos'::uuid), 'a bare surname three players carry: Θάνος was not named on it');
select ok(core.named_in_match(:'guess'::uuid, :'sergios'::uuid), 'Σέργιος was (first name on the sheet)');
select is(core.played_together(:'thanos'::uuid, :'sergios'::uuid), 0, 'so it is no proof they play together');

-- the next row: «ΑΡΤΙΝΟΣ / ΖΑΡΕΙΦΟΠΟΥΛΟΣ vs ΤΖΙΩΤΖΙΟΣ / ΓΕΩΡΓΙΟΥΤΕΣΤ ΣΕΡΓΙΟΣ»
select core.ingest_apply(:'aok'::uuid, jsonb_build_array(jsonb_build_object(
  'fingerprint', '2026-10-20|MD|50+|αρτινοσ+ζαρειφοπουλοσ|γεωργιουτεστ σεργιοσ+τζιωτζιοσ', 'date', '2026-10-20', 'time', '22:15',
  'discipline', 'MD', 'level', '50+', 'tab', 'Τ', 'row', 2, 'flags', '[]'::jsonb,
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'artinos', 'raw', 'ΑΡΤΙΝΟΣ'), jsonb_build_object('player_id', :'zar', 'raw', 'ΖΑΡΕΙΦΟΠΟΥΛΟΣ')),
  'side2', jsonb_build_array(pg_temp.p('ΤΖΙΩΤΖΙΟΣ', 'ΤΖΙΩΤΖΙΟΣ', ''), jsonb_build_object('player_id', :'sergios', 'raw', 'ΓΕΩΡΓΙΟΥΤΕΣΤ ΣΕΡΓΙΟΣ')),
  'result', null)), null, null) as next \gset
select is((:'next'::jsonb ->> 'held_for_review')::int, 1, 'the bare «ΤΖΙΩΤΖΙΟΣ» waits for staff');
select is((:'next'::jsonb ->> 'auto_pair')::int, 0, 'no known pair from a guess');
select is((select count(*)::int from core.matches where tournament_id = :'aok'::uuid), 1, 'no match made on a guess');

-- a real partnership (the sheet wrote «ΤΖΙΩΤΖΙΟΣ Θ.»), then a bare «ΤΖΙΩΤΖΙΟΣ» with that partner
select core.ingest_apply(:'aok'::uuid, jsonb_build_array(
  pg_temp.idrow('2026-10-19|MD|40+|κλουδασ+σουλοσ|μητροπουλοστεστ+τζιωτζιοσ θ.', '2026-10-19', '18:00',
                array[:'mitro'::uuid, :'thanos'::uuid], array[:'artinos'::uuid, :'zar'::uuid])), null, null);
select is(core.played_together(:'mitro'::uuid, :'thanos'::uuid), 1, 'named on the sheet: that is a pair');
create function pg_temp.mitro_row() returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'fingerprint', '2026-10-23|MD|50+|μητροπουλοστεστ+τζιωτζιοσ|γκουζουλησ+μαλλιοσ', 'date', '2026-10-23', 'time', '18:00',
    'discipline', 'MD', 'level', '50+', 'tab', 'Τ', 'row', 3, 'flags', '[]'::jsonb,
    'side1', jsonb_build_array(jsonb_build_object('raw', 'ΜΗΤΡΟΠΟΥΛΟΣΤΕΣΤ', 'surname', 'ΜΗΤΡΟΠΟΥΛΟΣΤΕΣΤ', 'first', ''),
                               jsonb_build_object('raw', 'ΤΖΙΩΤΖΙΟΣ', 'surname', 'ΤΖΙΩΤΖΙΟΣ', 'first', '')),
    'side2', jsonb_build_array(jsonb_build_object('player_id', (select id from core.players where surname = 'Γκουζούλης'), 'raw', 'ΓΚΟΥΖΟΥΛΗΣ'),
                               jsonb_build_object('player_id', (select id from core.players where surname = 'Μάλλιος'), 'raw', 'ΜΑΛΛΙΟΣ')),
    'result', null)) $$;
select core.ingest_apply(:'aok'::uuid, pg_temp.mitro_row(), null, null) as held \gset
select is((:'held'::jsonb ->> 'held_for_review')::int, 1, 'an account holder (Βασίλης) carries the name: staff decide even with a known pair');
update core.players set claimed_by_user_id = null where id = :'vasilis'::uuid;
select core.ingest_apply(:'aok'::uuid, pg_temp.mitro_row(), null, null) as picked \gset
select is((select mp.player_id from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref like '2026-10-23|%' and mp.side = 1 and mp.player_id <> :'mitro'::uuid), :'thanos'::uuid,
          'without one, the named pair decides');

-- a bare surname's «the one in this tournament» counts only where the sheet named them
select is(core.ingest_person('{"raw": "ΤΖΙΩΤΖΙΟΣ", "surname": "ΤΖΙΩΤΖΙΟΣ", "first": ""}'::jsonb, :'aok'::uuid) ->> 'how', 'tournament',
          'named once here (Θ.), the only Τζιότζιος of this tournament');
update core.players set claimed_by_user_id = :'vas_user'::uuid where id = :'vasilis'::uuid;
select is(core.ingest_person('{"raw": "ΤΖΙΩΤΖΙΟΣ", "surname": "ΤΖΙΩΤΖΙΟΣ", "first": ""}'::jsonb, :'aok'::uuid) ->> 'how', 'review',
          'but never while an account holder carries the surname');

select * from finish();
rollback;
