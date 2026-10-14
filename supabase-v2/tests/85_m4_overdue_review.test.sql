-- Sheet results that never came: two days on, a sheet match with no result (not cancelled, not called off by staff)
-- is flagged overdue for a person; «Rained off, keep it» confirms the postponement and takes it off the list.
begin;
select plan(6);

select tests.create_user('ovd-adm@test.local', 'admin') as adm \gset
select tests.create_user('ovd-u@test.local') as u \gset
select tests.mk_player('Ορ', 'Αργοπορίας') as a \gset
select tests.mk_player('Πρ', 'Προχθεσινός') as b \gset
insert into core.tournaments (sport_id, name, source, source_url) values ('tennis', 'Late Open', 'import', 'https://docs.google.com/spreadsheets/d/y') returning id as t \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '3 days') as old \gset
select tests.mk_match(:'b'::uuid, :'a'::uuid, now() - interval '5 hours') as fresh \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'old', :'fresh');

select tests.login(:'adm'::uuid);
create temp table d as select api.admin_desk(7) as doc;
grant select on d to public;
select ok((select (x ->> 'overdue')::boolean from d, jsonb_array_elements(doc) x where x ->> 'match_id' = :'old'), 'three days and no result: overdue');
select ok(not (select (x ->> 'overdue')::boolean from d, jsonb_array_elements(doc) x where x ->> 'match_id' = :'fresh'), 'today: still the sheet''s');

select api.admin_keep_postponed(:'old'::uuid);
select is((select provenance ->> 'postponed_by' from core.matches where id = :'old'::uuid), 'staff', 'kept as rained off by staff');
select ok(not (select (x ->> 'overdue')::boolean from jsonb_array_elements(api.admin_desk(7)) x where x ->> 'match_id' = :'old'),
          'a staff decision takes it off the list');
select lives_ok(format('select api.admin_keep_postponed(%L)', :'old'), 'keeping it twice is harmless');
select tests.logout();

select tests.login(:'u'::uuid);
select throws_ok(format('select api.admin_keep_postponed(%L)', :'fresh'), '42501', null, 'staff only');
select tests.logout();

select * from finish();
rollback;
