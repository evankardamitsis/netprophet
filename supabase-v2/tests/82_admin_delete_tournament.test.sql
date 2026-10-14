-- Admin: delete a tournament with its matches; refused once people voted on it; admins only.
begin;
select plan(5);

select tests.create_user('del-adm@test.local', 'admin') as adm \gset
select tests.create_user('del-u@test.local') as u \gset
select tests.mk_player('Δι', 'Διαγραφής') as a \gset
select tests.mk_player('Σβ', 'Σβησμένος') as b \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Old Open', 'import') returning id as t \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Voted Open', 'import') returning id as t2 \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '1 day') as m \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '2 days') as m2 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m'::uuid;
update core.matches set tournament_id = :'t2'::uuid where id = :'m2'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option) values (:'u'::uuid, 'match', :'m2'::uuid, 1);

select tests.login(:'u'::uuid);
select throws_ok(format('select api.admin_delete_tournament(%L)', :'t'), '42501', null, 'admins only');
select tests.logout();

select tests.login(:'adm'::uuid);
select is((api.admin_delete_tournament(:'t'::uuid) ->> 'matches')::int, 1, 'deleted with its match');
select throws_ok(format('select api.admin_delete_tournament(%L)', :'t2'), 'P0001', null, 'refused once people voted');
select tests.logout();
select ok(not exists (select 1 from core.tournaments where id = :'t'::uuid), 'the tournament is gone');
select ok(not exists (select 1 from core.matches where id = :'m'::uuid), 'its match too');

select * from finish();
rollback;
