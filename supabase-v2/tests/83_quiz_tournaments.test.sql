-- Quiz from the tournaments: «Τουρνουά» asks who lifts a category out of three unbeaten players, in a category with
-- someone you know in it, in words you can say out loud. «Θυμάσαι;» has retired.
begin;
select plan(7);

select tests.create_user('qt-u@test.local') as u \gset
select tests.create_user('qt-far@test.local') as far \gset
create temp table tp as
select g, tests.mk_player('Τουρ' || g, 'Νουάς' || g, 'm') as id from generate_series(1, 8) g;
grant select on tp to public;
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Quiz Open', 'import', current_date - 3) returning id as t \gset
insert into core.tournament_events (tournament_id, name, format) values (:'t'::uuid, 'Μ 40+', 'singles') returning id as e \gset

-- first round two days ago: 1, 3, 5, 7 win; one match ahead tomorrow
select tests.mk_match((select id from tp where g = 1), (select id from tp where g = 2), now() - interval '2 days') as m1 \gset
select tests.mk_match((select id from tp where g = 3), (select id from tp where g = 4), now() - interval '2 days') as m2 \gset
select tests.mk_match((select id from tp where g = 5), (select id from tp where g = 6), now() - interval '2 days') as m3 \gset
select tests.mk_match((select id from tp where g = 7), (select id from tp where g = 8), now() - interval '2 days') as m4 \gset
select tests.mk_match((select id from tp where g = 1), (select id from tp where g = 3), now() + interval '1 day') as m5 \gset
update core.matches set tournament_id = :'t'::uuid, event_id = :'e'::uuid where id in (:'m1', :'m2', :'m3', :'m4', :'m5');
select tests.finish_match(:'m1'::uuid, 1);
select tests.finish_match(:'m2'::uuid, 1);
select tests.finish_match(:'m3'::uuid, 1);
select tests.finish_match(:'m4'::uuid, 1);

select is(core.quiz_tournament(:'far'::uuid, 'tennis', 'cup', core.quiz_day_key(now()), 'seed', '{}', '{}'), null, 'nobody you know in it: no card');
insert into core.follows (user_id, player_id) values (:'u'::uuid, (select id from tp where g = 1));
select core.quiz_tournament(:'u'::uuid, 'tennis', 'cup', core.quiz_day_key(now()), 'seed', '{}', '{}') as cup \gset
select is(:'cup'::jsonb -> 'content' ->> 'tag', 'Τουρνουά', 'a cup card');
select is(:'cup'::jsonb -> 'content' ->> 'q', 'Ποιος θα σηκώσει το Μ 40+ στο Quiz Open;', 'names the category and the tournament');
select ok((select bool_and(x::uuid in (select id from tp where g in (1, 3, 5, 7))) from jsonb_array_elements_text(:'cup'::jsonb -> 'ids') x),
          'three players still unbeaten');

select is(core.quiz_tournament(:'u'::uuid, 'tennis', 'recall', core.quiz_day_key(now()), 'seed', '{}', '{}'), null, '«Θυμάσαι;» has retired');

update core.tournaments set name = 'Quiz Open 2026–27' where id = :'t'::uuid;
update core.tournament_events set name = 'Regular Season 2026–27' where id = :'e'::uuid;
select is(core.quiz_tournament(:'u'::uuid, 'tennis', 'cup', core.quiz_day_key(now()), 'seed', '{}', '{}') -> 'content' ->> 'q',
          'Ποιος θα το σηκώσει στο Quiz Open;', 'no years, and a category that reads like a code stays out');

select tests.login(:'u'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_quiz() -> 'cards') c where c -> 'content' ->> 'tag' = 'Θυμάσαι;'), 'never in a set');
select tests.logout();

select * from finish();
rollback;
