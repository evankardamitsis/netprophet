-- M4: the morning email's data: staff recipients, decisions, results only staff can enter, sheet problems, service only.
begin;
select plan(6);

select tests.create_user('mail-adm@test.local', 'admin') as adm \gset
select tests.create_user('mail-u@test.local') as u \gset
select tests.mk_player('Α', 'Πρωινός') as a \gset
select tests.mk_player('Β', 'Πρωινός') as b \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '5 hours') as m \gset
insert into core.tournaments (sport_id, name, source, source_url) values ('tennis', 'Mail Open', 'import', 'https://docs.google.com/spreadsheets/d/x') returning id as t \gset
insert into core.ingest_runs (tournament_id, trigger, health, error) values (:'t'::uuid, 'cron', 'error', 'not shared');
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload) values (:'t'::uuid, 'walkover', 'f1', '{}');

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_morning_digest()$$, '42501', null, 'not for users');
select tests.logout();

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select api.admin_morning_digest() as d \gset
reset role;

select ok((:'d'::jsonb -> 'recipients') ? 'mail-adm@test.local', 'staff get it');
select ok(not ((:'d'::jsonb -> 'recipients') ? 'mail-u@test.local'), 'users do not');
select ok((:'d'::jsonb -> 'decisions' ->> 'walkovers')::int >= 1, 'the walkover waiting');
select ok((:'d'::jsonb ->> 'results_for_you')::int >= 1, 'a friendly with no result');
select ok(jsonb_path_exists(:'d'::jsonb, '$.sheet_problems[*] ? (@.tournament == "Mail Open" && @.health == "error")'), 'the sheet that could not be read');

select * from finish();
rollback;
