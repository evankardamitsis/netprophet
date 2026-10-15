-- A held match where one spelling is two people (a doubles with two «ΚΑΛΙΒΡΟΥΣΗΣ»): each place on the card gets its
-- own decision; one player twice is refused by name, before anything is written.
begin;
select plan(4);

select tests.create_user('rp-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Αλέξανδρος', 'Καλιβρούσης') as k1 \gset
select tests.mk_player('Γιώργος', 'Καλιβρούσης') as k2 \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Review Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/y", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'rp1', $j${"row": {"fingerprint": "rp1", "date": "2026-10-20", "time": "20:30", "discipline": "MD", "level": "OPEN",
  "side1": [{"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "surname": "ΚΑΛΙΒΡΟΥΣΗΣ", "first": ""}, {"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "surname": "ΚΑΛΙΒΡΟΥΣΗΣ", "first": ""}],
  "side2": [{"raw": "ΦΛΑΜΠΟΥΡΑΣ", "surname": "ΦΛΑΜΠΟΥΡΑΣ", "first": ""}, {"raw": "ΣΑΝΙΔΑΣ", "surname": "ΣΑΝΙΔΑΣ", "first": ""}], "result": null},
  "unclear": [{"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "surname": "ΚΑΛΙΒΡΟΥΣΗΣ", "first": ""}]}$j$::jsonb)
returning id as rv \gset

select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": [{"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "player_id": "%s"}]}')$$, :'rv', :'k1'),
                 '22023', 'same_player_twice', 'one answer for both: refused by name, not a duplicate key');
select lives_ok(format($$select api.admin_resolve_ingest_review(%L, '{"decisions": [{"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "slot": "1:0", "player_id": "%s"}, {"raw": "ΚΑΛΙΒΡΟΥΣΗΣ", "slot": "1:1", "player_id": "%s"}]}')$$, :'rv', :'k1', :'k2'),
                'one answer per place on the card saves');
select tests.logout();
select is((select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id where m.source_ref = 'rp1'), 4,
          'the match has its four players');
select is((select array_agg(mp.player_id order by mp.position) from core.match_participants mp join core.matches m on m.id = mp.match_id
            where m.source_ref = 'rp1' and mp.side = 1), array[:'k1'::uuid, :'k2'::uuid], 'each in their place');

select * from finish();
rollback;
