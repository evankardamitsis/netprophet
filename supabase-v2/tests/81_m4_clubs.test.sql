-- M4: clubs. A source that names the club puts the match there (club added the first time); the surface is the
-- club's once staff set it, else the tournament's.
begin;
select plan(8);

select tests.create_user('club-adm@test.local', 'admin') as adm \gset
select tests.create_user('club-u@test.local') as u \gset
select tests.mk_player('Κλ', 'Συλλογικός') as a \gset
select tests.mk_player('Γη', 'Γηπεδούχος') as b \gset
insert into core.tournaments (sport_id, name, source, surface) values ('tennis', 'Club League', 'import', 'hard') returning id as t \gset

select core.ingest_run(:'t'::uuid, jsonb_build_array(jsonb_build_object('fingerprint', 'cl-1', 'date', current_date + 1, 'time', '18:00',
  'discipline', 'MS', 'level', 'LEAGUE', 'club', 'PRC (Μαρούσι)', 'court', 'Court 1 PRC', 'result', null,
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);

select is((select count(*)::int from core.clubs where name = 'PRC (Μαρούσι)'), 1, 'a club seen for the first time is added');
select is((select court from core.matches where source_ref = 'cl-1'), 'Court 1 PRC', 'the court is kept');
select is(core.match_surface((select id from core.matches where source_ref = 'cl-1')), 'hard', 'no club surface yet: the tournament''s');

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_clubs()$$, '42501', null, 'clubs: staff only');
select tests.logout();

select id as club from core.clubs where name = 'PRC (Μαρούσι)' \gset
select tests.login(:'adm'::uuid);
select ok((api.admin_clubs() -> 0 ->> 'surface') is null, 'the club without a surface comes first');
select api.admin_save_club(:'club'::uuid, 'clay');
select tests.logout();
select is(core.match_surface((select id from core.matches where source_ref = 'cl-1')), 'clay', 'the club''s surface wins');

-- the next run names the same club in other case: no second club
select core.ingest_run(:'t'::uuid, jsonb_build_array(jsonb_build_object('fingerprint', 'cl-1', 'date', current_date + 1, 'time', '19:00',
  'discipline', 'MS', 'level', 'LEAGUE', 'club', 'prc (μαρούσι)', 'court', 'Court 2 PRC', 'result', null,
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);
select is((select count(*)::int from core.clubs where lower(name) = 'prc (μαρούσι)'), 1, 'same club, one row');
select is((select court from core.matches where source_ref = 'cl-1'), 'Court 2 PRC', 'a new court follows the source');

select * from finish();
rollback;
