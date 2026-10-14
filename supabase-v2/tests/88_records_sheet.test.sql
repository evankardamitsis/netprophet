-- Records sheet: one read for the admin's Google Sheet writer: tournaments with totals, every tournament match in a
-- stable order, and the matches changed since the last write. Staff and the service key only.
begin;
select plan(14);

select tests.create_user('rec-adm@test.local', 'admin') as adm \gset
select tests.create_user('rec-u@test.local') as u \gset
insert into core.tournaments (sport_id, name, source, source_kind, source_url, venue, ongoing)
values ('tennis', 'Records Open', 'import', 'sheet', 'https://docs.google.com/spreadsheets/d/rec', 'Club R', true) returning id as t \gset

select tests.mk_player('Άλφα', 'Ρεκόρ') as a \gset
select tests.mk_player('Βήτα', 'Ρεκόρ') as b \gset
select tests.mk_player('Νέος', 'Ρεκόρ') as np \gset
update core.players set source = 'import' where id = :'np'::uuid;
-- the roster players are older than the tournament's matches; the new one came with them
update core.players set created_at = now() - interval '30 days' where id in (:'a'::uuid, :'b'::uuid);

select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '2 days') as m_late \gset
select tests.mk_match(:'a'::uuid, :'np'::uuid, now() + interval '1 day') as m_early \gset
select tests.mk_match(:'b'::uuid, :'np'::uuid, now() - interval '1 day') as m_old \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '3 days') as m_friendly \gset
update core.matches set tournament_id = :'t'::uuid, source = 'import',
                        provenance = jsonb_build_object('tab', 'ΣΑΒ 18/10', 'row', 7, 'category_raw', 'ΑΝΔΡΕΣ Β')
 where id in (:'m_late'::uuid, :'m_early'::uuid, :'m_old'::uuid);
select tests.finish_match(:'m_old'::uuid, 2);
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload) values (:'t'::uuid, 'walkover', 'rec-f1', '{}');

-- one match last changed two days ago (the touch trigger would set now())
alter table core.matches disable trigger matches_touch;
update core.matches set created_at = now() - interval '2 days', updated_at = now() - interval '2 days' where id = :'m_late'::uuid;
alter table core.matches enable trigger matches_touch;

select tests.login(:'u'::uuid);
select throws_ok($$select api.records_sheet()$$, '42501', null, 'not for users');
select tests.logout();

select tests.login(:'adm'::uuid);
select lives_ok($$select api.records_sheet()$$, 'staff can read it');
select tests.logout();

select tests.as_service();
select api.records_sheet() as d \gset
select api.records_sheet(now() - interval '1 hour') as d2 \gset
select tests.logout();

select is((select jsonb_agg(x ->> 'match_id') from jsonb_array_elements(:'d'::jsonb -> 'matches') x
            where x ->> 'tournament_id' = :'t'),
          jsonb_build_array(:'m_old', :'m_early', :'m_late'), 'matches in start order');
select ok(not jsonb_path_exists(:'d'::jsonb, '$.matches[*] ? (@.match_id == $id)', jsonb_build_object('id', :'m_friendly')),
          'friendlies are not tournament matches');

select is((select x - 'id' - 'last_run_at' - 'starts_on' - 'ends_on' from jsonb_array_elements(:'d'::jsonb -> 'tournaments') x where x ->> 'id' = :'t'),
          jsonb_build_object('name', 'Records Open', 'source_kind', 'sheet', 'source_url', 'https://docs.google.com/spreadsheets/d/rec',
                             'venue', 'Club R', 'ongoing', true, 'active', true,
                             'matches', 3, 'results', 1, 'players', 3, 'new_players', 1, 'open_reviews', 1),
          'tournament totals: matches, results, players, the one the sheet added, decisions waiting');

create temp table rm as select x from jsonb_array_elements(:'d'::jsonb -> 'matches') x where x ->> 'match_id' = :'m_old';
grant select on rm to public;
select is((select x ->> 'tab' || '|' || (x ->> 'row') || '|' || (x ->> 'category_raw') from rm), 'ΣΑΒ 18/10|7|ΑΝΔΡΕΣ Β', 'where the sheet had it');
select is((select x -> 'side1' -> 0 ->> 'name' from rm), 'Βήτα Ρεκόρ', 'side 1 by roster name');
select is((select x -> 'side2' -> 0 ->> 'id' from rm), :'np', 'side 2 player id');
select is((select (x ->> 'winner_side')::int from rm), 2, 'the winner');
select is((select x -> 'sets' from rm), '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb, 'the sets, winner first');
select is((select x ->> 'result_source' from rm), 'sheet', 'a result nobody typed in, on a sheet match');

select is(jsonb_array_length(:'d'::jsonb -> 'changes') >= 3, true, 'the first write lists every match');
select is((select jsonb_agg(c ->> 'match_id' order by c ->> 'match_id') from jsonb_array_elements(:'d2'::jsonb -> 'changes') c
            where c ->> 'match_id' in (:'m_late', :'m_early', :'m_old')),
          (select jsonb_agg(id order by id) from unnest(array[:'m_early', :'m_old']) id),
          'later writes list only what changed since');
select is((select c ->> 'kind' from jsonb_array_elements(:'d2'::jsonb -> 'changes') c where c ->> 'match_id' = :'m_early'), 'new', 'a match made since is new');

select * from finish();
rollback;
