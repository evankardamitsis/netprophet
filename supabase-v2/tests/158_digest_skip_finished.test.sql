-- The morning email does not ask staff about a finished tournament: no «no result 2 days on», no sheet problem.
begin;
select plan(4);

select tests.mk_player('Τε', 'Ξεχασμένος') as a \gset
select tests.mk_player('Πα', 'Κλειστός') as b \gset
insert into core.tournaments (sport_id, name, source, source_url, ongoing)
values ('tennis', 'Closed Open', 'import', 'https://docs.google.com/spreadsheets/d/closed', true)
returning id as t \gset

select core.ingest_run(:'t'::uuid, jsonb_build_array(
  jsonb_build_object('fingerprint', 'dsf-1', 'date', core.athens_day(now()) - 3, 'time', '10:00', 'discipline', 'MS', 'level', 'OPEN', 'result', null,
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);
insert into core.ingest_runs (tournament_id, trigger, health, error) values (:'t'::uuid, 'cron', 'error', 'not shared');

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select api.admin_morning_digest() as d \gset
reset role;
select ok(jsonb_path_exists(:'d'::jsonb, '$.overdue[*] ? (@.tournament == "Closed Open")'), 'an ongoing tournament: the match with no result is overdue');

update core.tournaments set finished = true where id = :'t'::uuid;

set local role service_role;
select api.admin_morning_digest() as d \gset
reset role;
select ok(not jsonb_path_exists(:'d'::jsonb, '$.overdue[*] ? (@.tournament == "Closed Open")'), 'finished: not overdue any more');
select ok(not jsonb_path_exists(:'d'::jsonb, '$.sheet_problems[*] ? (@.tournament == "Closed Open")'), 'finished: no sheet problem');
select ok((select count(*) = 1 from core.matches where source_ref = 'dsf-1' and status in ('announced', 'scheduled')), 'the match itself is left as it is');

select * from finish();
rollback;
