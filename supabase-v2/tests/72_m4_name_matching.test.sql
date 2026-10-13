-- M4 part 2: name matching. First names by family (formal, everyday, nickname), initials, the swapped reading,
-- surnames alone (this tournament first, then the roster, several to staff), the same name twice in the roster to
-- staff, and one decision releasing every row held for the same spelling.
begin;
select plan(11);

select tests.create_user('nm2-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Φαίη', 'Ζυγοπετρίδου', 'f') as faii \gset
select tests.mk_player('Ορέστης', 'Βρυξελλίδης') as orestis \gset
select tests.mk_player('Σπύρος', 'Μονοσύλλαβος') as solo \gset
select tests.mk_player('Νίκος', 'Διπλοεπώνυμος') as d1 \gset
select tests.mk_player('Πέτρος', 'Διπλοεπώνυμος') as d2 \gset
select tests.mk_player('Ηλίας', 'Δίδυμος') as tw1 \gset
select tests.mk_player('Ηλίας', 'Δίδυμος') as tw2 \gset

select is(core.ingest_person('{"surname": "ΖΥΓΟΠΕΤΡΙΔΟΥ", "first": "ΦΙΛΟΘΕΗ"}') ->> 'player_id', :'faii', 'Φιλοθέη is Φαίη');
select is(core.ingest_person('{"surname": "ΒΡΥΞΕΛΛΙΔΗΣ", "first": "ΟΡ"}') ->> 'player_id', :'orestis', 'an initial matches the name it starts');
select is(core.ingest_person('{"surname": "ΟΡΕΣΤΗΣ", "first": "ΒΡΥΞΕΛΛΙΔΗΣ"}') ->> 'player_id', :'orestis', 'the other way round');
select is(core.ingest_person('{"surname": "ΜΟΝΟΣΥΛΛΑΒΟΣ", "first": ""}') ->> 'how', 'surname', 'a surname alone, one in the roster: links');
select is(core.ingest_person('{"surname": "ΔΙΠΛΟΕΠΩΝΥΜΟΣ", "first": ""}') ->> 'how', 'review', 'two in the roster: staff');
select is(core.ingest_person('{"surname": "ΔΙΔΥΜΟΣ", "first": "ΗΛΙΑΣ"}') ->> 'how', 'review', 'the same name twice: staff, not a third copy');

-- in a tournament where Πέτρος Διπλοεπώνυμος already plays, the surname alone is him
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Τ2', 'import') returning id as t \gset
select tests.mk_match(:'d2'::uuid, :'solo'::uuid) as m0 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m0'::uuid;
select is(core.ingest_person('{"surname": "ΔΙΠΛΟΕΠΩΝΥΜΟΣ", "first": ""}', :'t'::uuid) ->> 'player_id', :'d2', 'a surname alone: the one in this tournament');

-- two rows held for the same twin; one decision releases both
select tests.login(:'adm'::uuid);
select api.admin_ingest_run(:'t'::uuid, $j$[
 {"fingerprint": "nm-a", "date": "2026-10-22", "time": "19:00", "discipline": "MS", "level": "OPEN",
  "side1": [{"raw": "ΔΙΔΥΜΟΣ ΗΛΙΑΣ", "surname": "ΔΙΔΥΜΟΣ", "first": "ΗΛΙΑΣ"}], "side2": [{"raw": "ΜΟΝΟΣΥΛΛΑΒΟΣ", "surname": "ΜΟΝΟΣΥΛΛΑΒΟΣ", "first": ""}], "result": null},
 {"fingerprint": "nm-b", "date": "2026-10-23", "time": "19:00", "discipline": "MS", "level": "OPEN",
  "side1": [{"raw": "ΔΙΔΥΜΟΣ ΗΛΙΑΣ", "surname": "ΔΙΔΥΜΟΣ", "first": "ΗΛΙΑΣ"}], "side2": [{"raw": "ΖΥΓΟΠΕΤΡΙΔΟΥ ΦΙΛΟΘΕΗ", "surname": "ΖΥΓΟΠΕΤΡΙΔΟΥ", "first": "ΦΙΛΟΘΕΗ"}], "result": null}
]$j$::jsonb, false) as run \gset
select tests.logout();
select is((:'run'::jsonb ->> 'held_for_review')::int, 2, 'both rows wait');
select id as r1 from core.ingest_reviews where fingerprint = 'nm-a' and status = 'open' \gset
select tests.login(:'adm'::uuid);
select api.admin_resolve_ingest_review(:'r1'::uuid, jsonb_build_object('decisions', jsonb_build_array(
         jsonb_build_object('raw', 'ΔΙΔΥΜΟΣ ΗΛΙΑΣ', 'player_id', :'tw1'::uuid)))) as res \gset
select tests.logout();
select is((:'res'::jsonb ->> 'also_released')::int, 1, 'the other row with the same spelling goes in too');
select is((select count(*)::int from core.matches where source_ref in ('nm-a', 'nm-b')), 2, 'both matches exist');
select is((select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref in ('nm-a', 'nm-b') and mp.player_id = :'tw1'::uuid), 2, 'both with the chosen twin');

select * from finish();
rollback;
