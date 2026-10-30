-- The morning email does not count a match the sheet stopped listing as overdue, as the Results desk does not.
begin;
select plan(2);

select tests.mk_player('Ε', 'Παλιόφυλλος') as a \gset
select tests.mk_player('Ζ', 'Παλιόφυλλος') as b \gset
select tests.mk_player('Η', 'Ακόμαεδώ') as c \gset
select tests.mk_player('Θ', 'Ακόμαεδώ') as d \gset
insert into core.tournaments (sport_id, name, source, source_url, ongoing)
values ('tennis', 'Off Open', 'import', 'https://docs.google.com/spreadsheets/d/off', true) returning id as t \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '3 days') as gone \gset
select tests.mk_match(:'c'::uuid, :'d'::uuid, now() - interval '3 days') as stays \gset
update core.matches set tournament_id = :'t'::uuid, source = 'import', source_ref = 'off-1',
                        provenance = provenance || '{"missing_runs": 2}', postponed_at = now() - interval '2 days' where id = :'gone'::uuid;
update core.matches set tournament_id = :'t'::uuid, source = 'import', source_ref = 'off-2' where id = :'stays'::uuid;

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select api.admin_morning_digest() as d \gset
reset role;
select ok(jsonb_path_exists(:'d'::jsonb, '$.overdue[*] ? (@.tournament == "Off Open" && @.matches == 1)'), 'only the one still on the sheet is overdue');
select ok(not jsonb_path_exists(:'d'::jsonb, '$.overdue[*] ? (@.tournament == "Off Open" && @.matches == 2)'), 'the one off the sheet is not');

select * from finish();
rollback;
