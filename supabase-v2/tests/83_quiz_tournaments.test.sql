-- Quiz from the tournaments: three of six cards come from real matches (position 4 a tournament card);
-- «Τουρνουά» asks who lifts a category out of three unbeaten players; «Θυμάσαι;» asks who won, with the right answer.
begin;
select plan(7);

select tests.create_user('qt-u@test.local') as u \gset
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

select core.quiz_tournament(:'u'::uuid, 'tennis', 'cup', core.quiz_day_key(now()), 'seed', '{}', '{}') as cup \gset
select is(:'cup'::jsonb -> 'content' ->> 'tag', 'Τουρνουά', 'a cup card');
select is(:'cup'::jsonb -> 'content' ->> 'q', 'Quiz Open, Μ 40+: ποιος το σηκώνει;', 'names the tournament and the category');
select ok((select bool_and(x::uuid in (select id from tp where g in (1, 3, 5, 7))) from jsonb_array_elements_text(:'cup'::jsonb -> 'ids') x),
          'three players still unbeaten');

select core.quiz_tournament(:'u'::uuid, 'tennis', 'recall', core.quiz_day_key(now()), 'seed', '{}', '{}') as rec \gset
select is(:'rec'::jsonb -> 'content' ->> 'tag', 'Θυμάσαι;', 'a recall card');
-- whichever match it picked (the seed data has others too), the right option is that match's winner
select is(((:'rec'::jsonb -> 'ids') ->> ((:'rec'::jsonb -> 'content' ->> 'right')::int))::uuid,
          (select mp.player_id from core.match_results r
             join core.match_participants mp on mp.match_id = r.match_id and mp.side = r.winner_side
            where r.match_id = (:'rec'::jsonb -> 'content' ->> 'match_id')::uuid limit 1),
          'the right answer is the winner');

-- a user who follows nobody: positions 2, 4 and 6 come from the tournament
select tests.login(:'u'::uuid);
create temp table q as select api.get_quiz() as doc;
grant select on q to public;
select ok((select c -> 'content' ->> 'q' like 'Quiz Open%' from q, jsonb_array_elements(doc -> 'cards') c where (c ->> 'position')::int = 4),
          'position 4: a tournament card');
select is((select string_agg(c ->> 'family', '' order by (c ->> 'position')::int) from q, jsonb_array_elements(doc -> 'cards') c
            where (c ->> 'position')::int in (2, 4, 6)), 'ddd', 'three of six come from real matches');
select tests.logout();

select * from finish();
rollback;
