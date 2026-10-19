-- Smart names (founder, 18 Oct 2026): brothers on one side, a pair who played together, the only one who played this
-- category; nothing guessed beyond them; held names carry context, best first; likely duplicates flagged; a bare
-- surname two players carry is never an alias; the draw's category moves a known match; open decisions run again.
begin;
select plan(32);

select tests.create_user('sn-adm@test.local', 'admin') as adm \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Παλιό Open', 'import') returning id as past \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Τώρα Open', 'import') returning id as t \gset

select tests.mk_player('Νίκος', 'Χαμάμης') as ham1 \gset
select tests.mk_player('Γιώργος', 'Χαμάμης') as ham2 \gset
select tests.mk_player('Α.', 'Σαριδάκης') as sa \gset
select tests.mk_player('Αγγ.', 'Σαριδάκης') as sagg \gset
select tests.mk_player('Πάολο', 'Σαριδάκης') as spa \gset
select tests.mk_player('Θάνος', 'Τζαφλέρης') as tth \gset
select tests.mk_player('Στ.', 'Τζαφλέρης') as tst \gset
select tests.mk_player('Θαν', 'Τζαφλέρης') as tthan \gset
select tests.mk_player('Πέτρος', 'Σκιαδάς') as skp \gset
select tests.mk_player('Σωτήρης', 'Σκιαδάς') as sks \gset
select tests.mk_player('Ηλίας', 'Κούκος') as kil \gset
select tests.mk_player('Μάρκος', 'Κούκος') as kma \gset
select tests.mk_player('Κώστας', 'Μικρούλης') as mk1 \gset
select tests.mk_player('Λάκης', 'Μικρούλης') as mk2 \gset
update core.players set birth_year = extract(year from now())::int - 12 where id = :'mk2'::uuid;
select tests.mk_player('Ένας', 'Αντίπαλος') as o1 \gset
select tests.mk_player('Δύο', 'Αντίπαλος') as o2 \gset

-- history in another tournament: who played which category, and with whom
create function pg_temp.row(fp text, d date, disc text, lvl text, a uuid[], b uuid[]) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', fp, 'date', d, 'time', '18:00', 'discipline', disc, 'level', lvl, 'tab', 'Τ', 'row', 1,
    'side1', (select jsonb_agg(jsonb_build_object('player_id', x, 'raw', '')) from unnest(a) x),
    'side2', (select jsonb_agg(jsonb_build_object('player_id', x, 'raw', '')) from unnest(b) x), 'result', null)
$$;
select core.ingest_apply(:'past'::uuid, jsonb_build_array(
  pg_temp.row('h1', '2026-09-01', 'MD', 'MASTER', array[:'sa'::uuid, :'spa'::uuid], array[:'o1'::uuid, :'o2'::uuid]),
  pg_temp.row('h2', '2026-09-02', 'MS', 'MASTER', array[:'sagg'::uuid], array[:'o1'::uuid]),
  pg_temp.row('h3', '2026-09-03', 'MD', 'MEDIUM', array[:'tth'::uuid, :'tst'::uuid], array[:'o1'::uuid, :'o2'::uuid]),
  pg_temp.row('h4', '2026-09-04', 'MS', '40+', array[:'skp'::uuid], array[:'o1'::uuid]),
  pg_temp.row('h5', '2026-09-05', 'MS', 'MASTER', array[:'sks'::uuid], array[:'o2'::uuid]),
  pg_temp.row('h6', '2026-09-06', 'MS', '50+', array[:'kil'::uuid], array[:'o1'::uuid]),
  pg_temp.row('h7', '2026-09-07', 'MS', 'MASTER', array[:'kma'::uuid], array[:'o2'::uuid])), null, null);

-- today's sheet, surnames only
select core.ingest_apply(:'t'::uuid, $j$[
 {"fingerprint": "s1", "date": "2026-10-20", "time": "17:00", "discipline": "MD", "level": "MASTER", "flags": [],
  "side1": [{"raw": "ΧΑΜΑΜΗΣ", "surname": "ΧΑΜΑΜΗΣ", "first": ""}, {"raw": "ΧΑΜΑΜΗΣ", "surname": "ΧΑΜΑΜΗΣ", "first": ""}],
  "side2": [{"raw": "ΣΑΡΙΔΑΚΗΣ", "surname": "ΣΑΡΙΔΑΚΗΣ", "first": ""}, {"raw": "ΣΑΡΙΔΑΚΗΣ", "surname": "ΣΑΡΙΔΑΚΗΣ", "first": ""}], "result": null},
 {"fingerprint": "s2", "date": "2026-10-20", "time": "18:00", "discipline": "MD", "level": "MEDIUM", "flags": [],
  "side1": [{"raw": "ΤΖΑΦΛΕΡΗΣ", "surname": "ΤΖΑΦΛΕΡΗΣ", "first": ""}, {"raw": "ΤΖΑΦΛΕΡΗΣ", "surname": "ΤΖΑΦΛΕΡΗΣ", "first": ""}],
  "side2": [{"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΕΝΑΣ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΕΝΑΣ"}, {"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΔΥΟ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΔΥΟ"}], "result": null},
 {"fingerprint": "s3", "date": "2026-10-20", "time": "19:00", "discipline": "MS", "level": "-40", "flags": [],
  "side1": [{"raw": "ΣΚΙΑΔΑΣ", "surname": "ΣΚΙΑΔΑΣ", "first": ""}], "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΕΝΑΣ"}], "result": null},
 {"fingerprint": "s4", "date": "2026-10-20", "time": "20:00", "discipline": "MS", "level": "50+", "flags": [],
  "side1": [{"raw": "ΚΟΥΚΟΣ", "surname": "ΚΟΥΚΟΣ", "first": ""}], "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΔΥΟ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΔΥΟ"}], "result": null},
 {"fingerprint": "s5", "date": "2026-10-21", "time": "17:00", "discipline": "MS", "level": "-40", "flags": [],
  "side1": [{"raw": "ΤΖΑΦΛΕΡΗΣ", "surname": "ΤΖΑΦΛΕΡΗΣ", "first": ""}], "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΔΥΟ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΔΥΟ"}], "result": null},
 {"fingerprint": "s6", "date": "2026-10-21", "time": "18:00", "discipline": "MD", "level": "OPEN", "flags": [],
  "side1": [{"raw": "ΜΙΚΡΟΥΛΗΣ", "surname": "ΜΙΚΡΟΥΛΗΣ", "first": ""}, {"raw": "ΜΙΚΡΟΥΛΗΣ", "surname": "ΜΙΚΡΟΥΛΗΣ", "first": ""}],
  "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΕΝΑΣ"}, {"raw": "ΑΝΤΙΠΑΛΟΣ ΔΥΟ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΔΥΟ"}], "result": null},
 {"fingerprint": "s7", "date": "2026-10-21", "time": "19:00", "discipline": "MS", "level": "OPEN", "flags": [],
  "side1": [{"raw": "ΣΑΡΙΔΑΚΗΣ", "surname": "ΣΑΡΙΔΑΚΗΣ", "first": ""}], "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΕΝΑΣ"}], "result": null}
]$j$::jsonb, null, null) as run \gset

-- brothers and a known pair
select is((select array_agg(mp.player_id order by mp.player_id) from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 's1' and mp.side = 1), (select array_agg(x order by x) from unnest(array[:'ham1'::uuid, :'ham2'::uuid]) x),
          'brothers: the only two Χαμάμης, one each');
select is((select array_agg(mp.player_id order by mp.player_id) from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 's1' and mp.side = 2), (select array_agg(x order by x) from unnest(array[:'sa'::uuid, :'spa'::uuid]) x),
          'three Σαριδάκης: the two who played together (Α. and Πάολο)');
select ok((select provenance -> 'smart_names' @> '[{"slot": "1:0", "rule": "brothers"}, {"slot": "2:0", "rule": "known_pair"}]'
             from core.matches where source_ref = 's1'), 'the rule that decided each place is in the provenance');
select is((select array_agg(mp.player_id order by mp.player_id) from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 's2' and mp.side = 1), (select array_agg(x order by x) from unnest(array[:'tth'::uuid, :'tst'::uuid]) x),
          'Τζαφλέρης: Θάνος and Στ. played together, Θαν never did');
-- the category
select is((select mp.player_id from core.match_participants mp join core.matches m on m.id = mp.match_id where m.source_ref = 's4' and mp.side = 1),
          :'kil'::uuid, 'Κούκος in 50+: the only one who played 50+');
select ok((select provenance -> 'smart_names' @> '[{"rule": "category"}]' from core.matches where source_ref = 's4'), 'recorded as the category rule');
select is((:'run'::jsonb ->> 'auto_brothers')::int, 2, 'the run report counts the brothers');
select is((:'run'::jsonb ->> 'auto_pair')::int, 4, 'and the known pairs');
select is((:'run'::jsonb ->> 'auto_category')::int, 1, 'and the category');
select ok(not exists (select 1 from core.player_aliases where alias_norm in (core.normalize_search('ΧΑΜΑΜΗΣ'), core.normalize_search('ΣΑΡΙΔΑΚΗΣ'))),
          'a rule''s pick is never remembered as an alias');

-- no guesses beyond the rules
select is((select count(*)::int from core.matches where source_ref in ('s3', 's5', 's6', 's7')), 0, 'the other rows wait for staff');
select is((:'run'::jsonb ->> 'held_for_review')::int, 4, 'four held');
select is((select jsonb_array_length(payload -> 'unclear') from core.ingest_reviews where fingerprint = 's6' and status = 'open'), 2,
          'two Μικρούλης, one a minor: not brothers, both places asked');
select ok(not exists (select 1 from core.ingest_reviews r, jsonb_array_elements(r.payload -> 'unclear') u, jsonb_array_elements(u -> 'candidates') c
                       where r.fingerprint = 's6' and (c ->> 'id')::uuid = :'mk2'::uuid), 'a minor is never a candidate');
select is((select payload -> 'unclear' -> 0 ->> 'slot' from core.ingest_reviews where fingerprint = 's3' and status = 'open'), '1:0',
          'each held name knows its place on the card');

-- context, best first
select is((select jsonb_array_length(payload -> 'unclear' -> 0 -> 'candidates') from core.ingest_reviews where fingerprint = 's3'), 2,
          'Σκιαδάς: both candidates');
select ok((select (payload -> 'unclear' -> 0 -> 'candidates' -> 0 -> 'categories') @> '[{"n": 1}]' from core.ingest_reviews where fingerprint = 's3'),
          'each with the categories they played, counted');
select ok((select payload -> 'unclear' -> 0 -> 'candidates' -> 0 -> 'why' ? 'other_categories' from core.ingest_reviews where fingerprint = 's3'),
          'neither played -40: said so');
select ok((select payload -> 'unclear' -> 0 -> 'candidates' -> 0 ->> 'last_match' from core.ingest_reviews where fingerprint = 's3') is not null,
          'and their last match');
select is((select payload -> 'unclear' -> 0 -> 'candidates' -> 0 ->> 'id' from core.ingest_reviews where fingerprint = 's3'), :'skp',
          'Πέτρος first: he played the opponent named on the row');
select is((select jsonb_array_length(payload -> 'unclear' -> 0 -> 'candidates') from core.ingest_reviews where fingerprint = 's7'), 3,
          'a surname alone lists everyone who carries it');

-- likely duplicates
select is((select c ->> 'likely_duplicate_of' from core.ingest_reviews r, jsonb_array_elements(r.payload -> 'unclear' -> 0 -> 'candidates') c
            where r.fingerprint = 's5' and (c ->> 'id')::uuid = :'tthan'::uuid), :'tth', '«Θαν» with no matches: likely «Θάνος»');
select ok((select c ->> 'likely_duplicate_of' from core.ingest_reviews r, jsonb_array_elements(r.payload -> 'unclear' -> 0 -> 'candidates') c
            where r.fingerprint = 's7' and (c ->> 'id')::uuid = :'sa'::uuid) is null, '«Α.» and «Αγγ.» both played: not flagged');

-- a staff decision on a bare surname two players carry is no alias either
select id as r6 from core.ingest_reviews where fingerprint = 's3' and status = 'open' \gset
select tests.login(:'adm'::uuid);
select lives_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": [{"raw": "ΣΚΙΑΔΑΣ", "slot": "1:0", "player_id": "%s"}]}')$$, :'r6', :'skp'),
                'staff decide Σκιαδάς');
select tests.logout();
select ok(not exists (select 1 from core.player_aliases where alias_norm = core.normalize_search('ΣΚΙΑΔΑΣ')), 'and «ΣΚΙΑΔΑΣ» is not remembered for the next row');

-- the draw put a known match in another category: it moves, no second match
select core.ingest_apply(:'t'::uuid, $j$[
 {"fingerprint": "s2", "date": "2026-10-20", "time": "18:00", "discipline": "MD", "level": "MASTER", "flags": ["level_from_draw"],
  "side1": [{"raw": "ΤΖΑΦΛΕΡΗΣ", "surname": "ΤΖΑΦΛΕΡΗΣ", "first": ""}, {"raw": "ΤΖΑΦΛΕΡΗΣ", "surname": "ΤΖΑΦΛΕΡΗΣ", "first": ""}],
  "side2": [{"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΕΝΑΣ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΕΝΑΣ"}, {"raw": "ΚΑΙΝΟΥΡΓΙΟΣ ΔΥΟ", "surname": "ΚΑΙΝΟΥΡΓΙΟΣ", "first": "ΔΥΟ"}], "result": null}
]$j$::jsonb, null, null) as rerun \gset
select is((select e.name from core.matches m join core.tournament_events e on e.id = m.event_id where m.source_ref = 's2'), 'MASTER',
          'the match moved to MASTER');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and source_ref = 's2'), 1, 'still one match');
select is((:'rerun'::jsonb ->> 'recategorised')::int, 1, 'the run says so');

-- open decisions through the rules again (one held before this logic existed)
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'old1', $j${"row": {"fingerprint": "old1", "date": "2026-10-22", "time": "17:00", "discipline": "MD", "level": "MASTER",
  "side1": [{"raw": "ΧΑΜΑΜΗΣ", "surname": "ΧΑΜΑΜΗΣ", "first": ""}, {"raw": "ΧΑΜΑΜΗΣ", "surname": "ΧΑΜΑΜΗΣ", "first": ""}],
  "side2": [{"raw": "ΑΝΤΙΠΑΛΟΣ ΕΝΑΣ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΕΝΑΣ"}, {"raw": "ΑΝΤΙΠΑΛΟΣ ΔΥΟ", "surname": "ΑΝΤΙΠΑΛΟΣ", "first": "ΔΥΟ"}], "result": null},
  "unclear": [{"raw": "ΧΑΜΑΜΗΣ", "surname": "ΧΑΜΑΜΗΣ", "first": "", "candidates": []}]}$j$::jsonb);
select tests.login(:'adm'::uuid);
select api.admin_rerun_ingest_reviews(:'t'::uuid) as again \gset
select tests.logout();
select is((:'again'::jsonb ->> 'resolved')::int, 1, 'the old Χαμάμης row resolves without staff');
select is((select status from core.ingest_reviews where fingerprint = 'old1'), 'done', 'its decision closes');
select is((select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 'old1' and mp.player_id in (:'ham1'::uuid, :'ham2'::uuid)), 2, 'with both brothers');
select ok((select payload -> 'unclear' -> 0 -> 'candidates' -> 0 ? 'rank' from core.ingest_reviews where fingerprint = 's7' and status = 'open'),
          'the ones still open get their context refreshed');

select * from finish();
rollback;
