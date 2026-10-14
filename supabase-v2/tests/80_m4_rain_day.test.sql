-- M4: «Βροχή». Staff call off a tournament day's open matches in one tap; the postponement holds while the sheet still
-- lists the old day and lifts when the sheet gives the match a new day.
begin;
select plan(7);

select tests.create_user('rain-adm@test.local', 'admin') as adm \gset
select tests.create_user('rain-u@test.local') as u \gset
select tests.mk_player('Βρ', 'Βροχερός') as a \gset
select tests.mk_player('Ομ', 'Ομπρέλας') as b \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Rain Open', 'import') returning id as t \gset

\set row1 '{"fingerprint": "rn-1", "time": "10:00", "discipline": "MS", "level": "OPEN", "result": null}'
select core.ingest_run(:'t'::uuid, jsonb_build_array(:'row1'::jsonb || jsonb_build_object('date', core.athens_day(now()),
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);

select tests.login(:'u'::uuid);
select throws_ok(format('select api.admin_rain_day(%L, %L)', :'t', core.athens_day(now())), '42501', null, 'not for users');
select tests.logout();

select tests.login(:'adm'::uuid);
select is(api.admin_rain_day(:'t'::uuid, core.athens_day(now()), true), 1, 'dry: one match would be called off');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and postponed_at is not null), 0, 'dry changes nothing');
select is(api.admin_rain_day(:'t'::uuid, core.athens_day(now())), 1, 'rained off');
select tests.logout();

-- the next run still lists the old day: it stays off
select core.ingest_run(:'t'::uuid, jsonb_build_array(:'row1'::jsonb || jsonb_build_object('date', core.athens_day(now()),
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);
select ok((select postponed_at is not null from core.matches where tournament_id = :'t'::uuid), 'a later run with the old day keeps it off');

-- the sheet moves it to another day: back on
select core.ingest_run(:'t'::uuid, jsonb_build_array(:'row1'::jsonb || jsonb_build_object('date', core.athens_day(now()) + 2,
  'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);
select ok((select postponed_at is null from core.matches where tournament_id = :'t'::uuid), 'a new day: back on');
select ok((select not (provenance ? 'postponed_by') from core.matches where tournament_id = :'t'::uuid), 'and no longer marked as called off');

select * from finish();
rollback;
