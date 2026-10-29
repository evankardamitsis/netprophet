-- A tournament staff marked finished is not read by the cron and its matches are not called off for rain.
begin;
select plan(4);

select tests.mk_player('Τε', 'Λειωμένος') as a \gset
select tests.mk_player('Πα', 'Τελικός') as b \gset
insert into core.tournaments (sport_id, name, source, source_url, draw_url, ongoing)
values ('tennis', 'Done Open', 'import', 'https://docs.google.com/spreadsheets/d/done', 'https://docs.google.com/spreadsheets/d/done-draw', true)
returning id as t \gset

select core.ingest_run(:'t'::uuid, jsonb_build_array(
  jsonb_build_object('fingerprint', 'sf-1', 'date', core.athens_day(now()) - 1, 'time', '10:00', 'discipline', 'MS', 'level', 'OPEN', 'result', null,
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select ok(jsonb_path_exists(api.ingest_due(), '$[*] ? (@.name == "Done Open")'), 'an ongoing tournament is due');
reset role;

update core.tournaments set finished = true where id = :'t'::uuid;

set local role service_role;
select ok(not jsonb_path_exists(api.ingest_due(), '$[*] ? (@.name == "Done Open")'), 'once finished it is not read, schedule or draw');
reset role;

select ok(not jsonb_path_exists(core.auto_rain(), '$[*] ? (@.tournament == "Done Open")'), 'the rain rule leaves a finished tournament alone');
select ok((select postponed_at is null from core.matches where source_ref = 'sf-1'), 'its match without a result stays as it is');

select * from finish();
rollback;
