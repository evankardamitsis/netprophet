-- A sheet row keeps its match through an edit (18 Oct 2026: 28 matches stuck as «Αναβλήθηκε»): a substitute, a
-- category typo, a name typo, a Latin letter in a Greek name; a missing match whose slot was taken hands its votes over;
-- the ones already stuck are fixed by admin_fix_stale_twins (dry first).
begin;
select plan(35);

select tests.create_user('ri-adm@test.local', 'admin') as adm \gset
select tests.create_user('ri-v1@test.local') as u1 \gset
select tests.create_user('ri-v2@test.local') as u2 \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Ίδιο Open', 'import') returning id as t \gset

select tests.mk_player('Γιάννης', 'Δελληγιαννάκης') as d1 \gset
select tests.mk_player('Κώστας', 'Κορύλος') as d2 \gset
select tests.mk_player('Νίκος', 'Λιανός') as d3 \gset
select tests.mk_player('Πέτρος', 'Παλαιολόγος') as d4 \gset
select tests.mk_player('Μαρία', 'Καππάτου', 'f') as k1 \gset
select tests.mk_player('Ελένη', 'Αντωνίου', 'f') as k2 \gset
select tests.mk_player('Άρης', 'Γεωργούλας') as g1 \gset
select tests.mk_player('Τάσος', 'Παπαδημητρίου') as g2 \gset
select tests.mk_player('Πάολο', 'Σαριδάκης') as s1 \gset
select tests.mk_player('Χρήστος', 'Κρητικός') as s2 \gset
select tests.mk_player('Γιώργος', 'Ζάννης') as z1 \gset
select tests.mk_player('Δημήτρης', 'Μουρίκης') as z2 \gset

create function pg_temp.p(id uuid) returns jsonb language sql as $$ select jsonb_build_object('player_id', id, 'raw', '') $$;
create function pg_temp.row(fp text, d date, tm text, disc text, lvl text, a jsonb, b jsonb) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', fp, 'date', d, 'time', tm, 'discipline', disc, 'level', lvl, 'tab', 'Τ', 'row', 1, 'flags', '[]'::jsonb,
                            'side1', a, 'side2', b, 'result', null)
$$;
create function pg_temp.mid(fp text) returns uuid language sql as $$ select id from core.matches where source_ref = fp $$;

-- the first read of the day
select core.ingest_apply(:'t'::uuid, jsonb_build_array(
  pg_temp.row('a1', current_date + 2, '19:30', 'MD', 'MEDIUM', jsonb_build_array(pg_temp.p(:'d1'), pg_temp.p(:'d2')), jsonb_build_array(pg_temp.p(:'d3'), pg_temp.p(:'d4'))),
  pg_temp.row('b1', current_date + 2, '12:30', 'WS', 'OPEN', jsonb_build_array(pg_temp.p(:'k1')), jsonb_build_array(pg_temp.p(:'k2'))),
  pg_temp.row('c1', current_date + 2, '19:15', 'MS', 'MEDIUM', jsonb_build_array(pg_temp.p(:'g1')), jsonb_build_array(pg_temp.p(:'g2'))),
  pg_temp.row('d1', current_date + 2, '20:15', 'MS', 'MASTER', jsonb_build_array(pg_temp.p(:'s1')), jsonb_build_array(pg_temp.p(:'s2'))),
  pg_temp.row('e1', current_date + 2, '16:30', 'MS', '-40', jsonb_build_array(pg_temp.p(:'z1')), jsonb_build_array(pg_temp.p(:'z2')))), null, null);
insert into core.votes (user_id, subject_type, subject_id, option) values
  (:'u1'::uuid, 'match', pg_temp.mid('a1'), 1), (:'u1'::uuid, 'match', pg_temp.mid('b1'), 2);
select pg_temp.mid('a1') as ma \gset
select pg_temp.mid('b1') as mb \gset
select pg_temp.mid('c1') as mc \gset
select pg_temp.mid('d1') as md \gset
select pg_temp.mid('e1') as me \gset

-- the organiser edits the rows
select core.ingest_apply(:'t'::uuid, $j$[]$j$::jsonb || jsonb_build_array(
  pg_temp.row('a2', current_date + 2, '19:30', 'MD', 'MEDIUM', jsonb_build_array(pg_temp.p(:'d1'), pg_temp.p(:'d2')),
              '[{"raw": "ΛΙΑΝΟΣ ΝΙΚΟΣ", "surname": "ΛΙΑΝΟΣ", "first": "ΝΙΚΟΣ"}, {"raw": "BINJAKU", "surname": "BINJAKU", "first": ""}]'::jsonb),
  pg_temp.row('b2', current_date + 2, '12:30', 'WS', 'OPEN', jsonb_build_array(pg_temp.p(:'k1')),
              '[{"raw": "ΕΥΑΓΓΕΛΟΥ ΣΟΦΙΑ", "surname": "ΕΥΑΓΓΕΛΟΥ", "first": "ΣΟΦΙΑ"}]'::jsonb),
  pg_temp.row('c2', current_date + 2, '19:15', 'MS', 'MMEDIUM', jsonb_build_array(pg_temp.p(:'g1')), jsonb_build_array(pg_temp.p(:'g2'))),
  pg_temp.row('d2', current_date + 2, '20:15', 'MS', 'MASTER', '[{"raw": "ΣΑΡΔΑΚΗΣ ΠΑΟΛΟ", "surname": "ΣΑΡΔΑΚΗΣ", "first": "ΠΑΟΛΟ"}]'::jsonb,
              jsonb_build_array(pg_temp.p(:'s2'))),
  pg_temp.row('e2', current_date + 2, '16:30', 'MS', '-45', '[{"raw": "ΖΑΝNΗΣ ΓΙΩΡΓΟΣ", "surname": "ΖΑΝNΗΣ", "first": "ΓΙΩΡΓΟΣ"}]'::jsonb,
              jsonb_build_array(pg_temp.p(:'z2')))), null, null) as run \gset

-- a doubles partner changed: the same match, votes kept
select is(pg_temp.mid('a2'), :'ma'::uuid, 'a substitute in doubles: the same match takes the new row');
select ok(exists (select 1 from core.match_participants mp join core.players pl on pl.id = mp.player_id
                   where mp.match_id = :'ma'::uuid and mp.side = 2 and pl.surname = 'BINJAKU'), 'with the substitute in Παλαιολόγος''s place');
select ok(not exists (select 1 from core.match_participants where match_id = :'ma'::uuid and player_id = :'d4'::uuid), 'Παλαιολόγος is off the card');
select is((select count(*)::int from core.votes where subject_id = :'ma'::uuid and resolved_at is null), 1, 'its vote stays open');
select ok((select provenance -> 'row_identity' ? 'lineup_changed' from core.matches where id = :'ma'::uuid), 'lineup_changed in the provenance');

-- a singles player changed: another match; the old one voided, its votes close
select is((select status from core.matches where id = :'mb'::uuid), 'void', 'a substitute in singles: the old match is voided');
select is((select provenance ->> 'replaced_by_ref' from core.matches where id = :'mb'::uuid), 'b2', 'saying which row replaced it');
select ok(exists (select 1 from core.outbox where idempotency_key = 'resolve:' || :'mb' || ':void'), 'its votes close with no points');
select ok(pg_temp.mid('b2') is not null and pg_temp.mid('b2') <> :'mb'::uuid, 'a new match people can vote on');
select ok((select postponed_at is null from core.matches where id = :'mb'::uuid), 'never left postponed');

-- a category typo
select is(pg_temp.mid('c2'), :'mc'::uuid, '«MMEDIUM»: the same match');
select is((select count(*)::int from core.tournament_events where tournament_id = :'t'::uuid and format = 'singles' and core.norm_level(name) = 'MEDIUM'), 1,
          'no «MMEDIUM» category beside MEDIUM');
select is((select e.name from core.matches m join core.tournament_events e on e.id = m.event_id where m.id = :'mc'::uuid), 'MEDIUM', 'it stays in MEDIUM');

-- a name typo keeps the player
select is(pg_temp.mid('d2'), :'md'::uuid, 'Σαρδάκης for Σαριδάκης: the same match');
select ok(exists (select 1 from core.match_participants where match_id = :'md'::uuid and player_id = :'s1'::uuid), 'with Σαριδάκης still on it');
select ok(not exists (select 1 from core.players where surname_norm = core.normalize_search('Σαρδάκης')), 'no new player for the typo');

-- a Latin N and a category one edit away
select is(core.fold_lookalikes('ΖΑΝNΗΣ ΓΙΩΡΓΟΣ'), 'ΖΑΝΝΗΣ ΓΙΩΡΓΟΣ', 'a Latin N inside a Greek name is Greek');
select is(core.fold_lookalikes('BINJAKU ΑΛΕΞ'), 'BINJAKU ΑΛΕΞ', 'a Latin name stays Latin');
select is(pg_temp.mid('e2'), :'me'::uuid, '«ΖΑΝNΗΣ» in -45 for -40: the same match');
select ok((select provenance -> 'row_identity' -> 'category_changed' ->> 'from' = '-40' from core.matches where id = :'me'::uuid), 'category_changed in the provenance');
select is((:'run'::jsonb ->> 'relinked')::int + (:'run'::jsonb ->> 'moved')::int, 4,
          'the run counts the matches that kept their row (the category typo with everyone linked goes the «moved» way)');
select is((:'run'::jsonb ->> 'replaced')::int, 1, 'and the one replaced');

-- a played match re-sent under a new fingerprint (the Latin A folded): the same match, the result not applied twice
select tests.mk_player('Στράτος', 'Αφαλωνιάτης') as af \gset
select core.ingest_apply(:'t'::uuid, jsonb_build_array(
  pg_temp.row('f1', current_date + 2, '21:00', 'MS', 'OPEN', jsonb_build_array(pg_temp.p(:'af')), jsonb_build_array(pg_temp.p(:'g2')))), null, null);
select pg_temp.mid('f1') as mf \gset
select tests.finish_match(:'mf'::uuid, 1);
select core.ingest_apply(:'t'::uuid, jsonb_build_array(
  pg_temp.row('f2', current_date + 2, '21:00', 'MS', 'OPEN', '[{"raw": "AΦΑΛΩΝΙΑΤΗΣ ΣΤΡΑΤΟΣ", "surname": "AΦΑΛΩΝΙΑΤΗΣ", "first": "ΣΤΡΑΤΟΣ"}]'::jsonb,
              jsonb_build_array(pg_temp.p(:'g2'))) || '{"result": {"winner_side": 1, "sets": [{"w": 6, "l": 3}, {"w": 6, "l": 4}], "walkover": false}}'::jsonb),
  null, null);
select is(pg_temp.mid('f2'), :'mf'::uuid, 'a played match under a new spelling keeps its match');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and starts_at = (select starts_at from core.matches where id = :'mf'::uuid)
             and status <> 'void'), 1, 'no second copy of it');
select is((select count(*)::int from core.match_results where match_id = :'mf'::uuid), 1, 'and one result');

-- missing, with its slot taken: no postponement, the votes go over
insert into core.matches (sport_id, format, status, starts_at, tournament_id, event_id, source, source_ref, provenance)
select sport_id, format, status, starts_at, tournament_id, event_id, 'import', 'c3', '{}'::jsonb from core.matches where id = :'mc'::uuid
returning id as mc3 \gset
insert into core.match_participants (match_id, side, player_id, position) values (:'mc3'::uuid, 1, :'g1'::uuid, 1), (:'mc3'::uuid, 2, :'g2'::uuid, 1);
insert into core.votes (user_id, subject_type, subject_id, option) values (:'u2'::uuid, 'match', :'mc'::uuid, 1);
select core.ingest_missing(:'t'::uuid, '[{"fingerprint": "c3"}, {"fingerprint": "a2"}, {"fingerprint": "b2"}, {"fingerprint": "d2"}, {"fingerprint": "e2"}]'::jsonb);
select core.ingest_missing(:'t'::uuid, '[{"fingerprint": "c3"}, {"fingerprint": "a2"}, {"fingerprint": "b2"}, {"fingerprint": "d2"}, {"fingerprint": "e2"}]'::jsonb) as miss \gset
select is((select status from core.matches where id = :'mc'::uuid), 'void', 'missing twice with a twin on the sheet: voided, not postponed');
select is((select subject_id from core.votes where user_id = :'u2'::uuid), :'mc3'::uuid, 'its vote went to the twin');
select is((:'miss'::jsonb ->> 'replaced')::int, 1, 'the run says so');

-- already stuck: one with a twin that has a result, one alone
insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, source_ref, postponed_at, provenance)
values ('tennis', 'singles', 'scheduled', now() - interval '1 day', :'t'::uuid, 'import', 'old-stale', now() - interval '12 hours', '{"missing_runs": 2}')
returning id as stale \gset
insert into core.match_participants (match_id, side, player_id, position) values (:'stale'::uuid, 1, :'z1'::uuid, 1), (:'stale'::uuid, 2, :'z2'::uuid, 1);
insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, source_ref)
values ('tennis', 'singles', 'scheduled', now() - interval '1 day', :'t'::uuid, 'import', 'old-twin') returning id as twin \gset
insert into core.match_participants (match_id, side, player_id, position) values (:'twin'::uuid, 1, :'z1'::uuid, 1), (:'twin'::uuid, 2, :'z2'::uuid, 1);
insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, source_ref, postponed_at, provenance)
values ('tennis', 'singles', 'scheduled', now() - interval '2 days', :'t'::uuid, 'import', 'old-alone', now() - interval '1 day', '{"missing_runs": 2}')
returning id as alone \gset
insert into core.match_participants (match_id, side, player_id, position) values (:'alone'::uuid, 1, :'k1'::uuid, 1), (:'alone'::uuid, 2, :'k2'::uuid, 1);
insert into core.votes (user_id, subject_type, subject_id, option) values (:'u2'::uuid, 'match', :'stale'::uuid, 1);
-- the sheet itself said «αναβολή» for this one: not stuck, left alone
insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, source_ref, postponed_at, provenance)
values ('tennis', 'singles', 'scheduled', now() - interval '3 days', :'t'::uuid, 'import', 'sheet-postponed', now() - interval '4 days', '{}')
returning id as sheetpost \gset
insert into core.match_participants (match_id, side, player_id, position) values (:'sheetpost'::uuid, 1, :'g1'::uuid, 1), (:'sheetpost'::uuid, 2, :'s2'::uuid, 1);

select tests.finish_match(:'twin'::uuid, 1);

select tests.login(:'adm'::uuid);
select api.admin_fix_stale_twins(true, :'t'::uuid) as dry \gset
select tests.logout();
select is((:'dry'::jsonb ->> 'with_twin')::int, 1, 'dry run: one stuck match has a twin');
select is((:'dry'::jsonb ->> 'without_twin')::int, 1, 'and one is alone');
select is((select status from core.matches where id = :'stale'::uuid), 'scheduled', 'a dry run changes nothing');

select tests.login(:'adm'::uuid);
select api.admin_fix_stale_twins(false, :'t'::uuid) as fixed \gset
select tests.logout();
select core.resolve_match(:'twin'::uuid);
select is((select outcome from core.votes where user_id = :'u2'::uuid and subject_id = :'twin'::uuid), 'correct',
          'the moved vote settles against the twin''s result');
select is((select array_agg(status order by id) from core.matches where id in (:'stale'::uuid, :'alone'::uuid)), array['void', 'void'],
          'both stuck copies are voided');
select is((select status from core.matches where id = :'sheetpost'::uuid), 'scheduled', 'a postponement the sheet wrote is left alone');
select throws_ok(format($$select api.admin_fix_stale_twins(true, %L)$$, :'t'), '42501', null, 'only an admin');

select * from finish();
rollback;
