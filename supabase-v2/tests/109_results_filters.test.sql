-- Αποτελέσματα filters: a tournament loads all of its results (not only the last two weeks), a name finds a player's
-- matches in any spelling, and results_tournaments lists tournaments with results, yours first.
begin;
select plan(7);

select tests.create_user('rf-u@test.local') as u \gset
select tests.mk_player('Αλέξανδρος', 'Τσακαλώτος') as pa \gset
select tests.mk_player('Νίκος', 'Ζερβός') as pb \gset
select tests.mk_player('Ηλίας', 'Μάρκου') as pc \gset
select tests.mk_player('Σπύρος', 'Ρήγας') as pd \gset
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Filter Open', 'import', current_date - 40) returning id as t1 \gset
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Other Cup', 'import', current_date - 5) returning id as t2 \gset

-- in Filter Open: one a month ago (outside the usual two weeks), one yesterday; in Other Cup: one yesterday
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() - interval '30 days') as m_old \gset
select tests.mk_match(:'pa'::uuid, :'pc'::uuid, now() - interval '1 day') as m_new \gset
select tests.mk_match(:'pc'::uuid, :'pd'::uuid, now() - interval '1 day') as m_other \gset
update core.matches set tournament_id = :'t1'::uuid where id in (:'m_old', :'m_new');
update core.matches set tournament_id = :'t2'::uuid where id = :'m_other';
select tests.finish_match(:'m_old'::uuid, 1) is not null as x \gset
select tests.finish_match(:'m_new'::uuid, 1) is not null as x \gset
select tests.finish_match(:'m_other'::uuid, 2) is not null as x \gset
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'pd'::uuid);

select tests.login(:'u'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_results(14, 60, :'t1'::uuid, null))), 2,
          'a tournament loads all of its results, a month back too');
select ok(not exists (select 1 from jsonb_array_elements(api.get_results(14, 60, :'t1'::uuid, null)) e where e ->> 'match_id' = :'m_other'),
          'and only that tournament');
select is((select e ->> 'tournament_id' from jsonb_array_elements(api.get_results(14, 60, :'t1'::uuid, null)) e limit 1), :'t1',
          'rows say which tournament');
select is((select count(*)::int from jsonb_array_elements(api.get_results(14, 60, null, 'tsakalotos'))), 2,
          'a name in Greeklish finds that player''s matches');
select is((select count(*)::int from jsonb_array_elements(api.get_results(14, 60, null, 'ΖΕΡΒΟΣ'))), 1,
          'in capitals without accents too');
select is((select count(*)::int from jsonb_array_elements(api.get_results(14, 60, :'t2'::uuid, 'Τσακαλώτος'))), 0,
          'tournament and name together');
select is((select jsonb_agg(x ->> 'name') from jsonb_array_elements(api.results_tournaments()) x
            where x ->> 'name' in ('Filter Open', 'Other Cup')), '["Other Cup", "Filter Open"]'::jsonb,
          'tournaments with results, the one with someone you follow first');
select tests.logout();

select * from finish();
rollback;
