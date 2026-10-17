-- Dynamic cards: «Πριν το ματς» from an open match of players you know (a rematch here), a result from last week to
-- guess (a three-setter here: who won, or did it go to three; the score shows after the pick), «Εβδομαδιαίο» on
-- Mondays; the same card for everyone who knows them.
begin;
select plan(9);

select tests.create_user('qd-u@test.local') as u \gset
select tests.create_user('qd-v@test.local') as v \gset
create temp table pp as
select g, tests.mk_player('Δυν' || g, 'Παίκτης' || g, 'm') as id from generate_series(1, 6) g;
grant select on pp to public;
insert into core.player_sports (player_id, sport_id, level_tier) select id, 'tennis', 4 from pp
on conflict (player_id, sport_id) do update set level_tier = 4;
insert into core.follows (user_id, player_id) select u, id from pp, (values (:'u'::uuid), (:'v'::uuid)) x(u);

-- 1 beat 2 last week; they meet again tomorrow. 3 beat 4 in three sets three days ago.
select tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '10 days') as m0 \gset
select tests.finish_match(:'m0'::uuid, 1);
select tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() + interval '1 day') as m1 \gset
select tests.mk_match((select id from pp where g = 3), (select id from pp where g = 4), now() - interval '3 days') as m2 \gset
select tests.as_service();
select api.admin_set_result(:'m2'::uuid, 1, '[{"w":6,"l":4},{"w":3,"l":6},{"w":7,"l":5}]'::jsonb);
select tests.logout();

select extract(isodow from core.quiz_day_key(now())) = 1 as monday \gset
select tests.login(:'u'::uuid);
create temp table q as select api.get_quiz() as doc;
grant select on q to public;
select is((select c -> 'content' ->> 'tag' from q, jsonb_array_elements(doc -> 'cards') c where (c ->> 'position')::int = 2),
          'Πριν το ματς', 'position 2: before a match');
select ok((select c -> 'content' ->> 'q' like '{p1.o} και {p2.o} ξαναβρίσκονται αύριο.%' from q, jsonb_array_elements(doc -> 'cards') c
            where (c ->> 'position')::int = 2), 'a rematch, tomorrow');
select is((select c -> 'content' ->> 'match_id' from q, jsonb_array_elements(doc -> 'cards') c where (c ->> 'position')::int = 2),
          :'m1', 'about the open match');
select ok((select c -> 'content' ->> 'tag' from q, jsonb_array_elements(doc -> 'cards') c where (c ->> 'position')::int = 6)
            in ('Ποιος κέρδισε;', 'Τρίτο σετ;') or :'monday'::boolean,
          'position 6: a result to guess (or the weekly on a Monday)');
select ok((select bool_or(c -> 'content' ->> 'reveal' like '%κέρδισε 6-4, 3-6, 7-5.' and c -> 'content' ->> 'q' not like '%6-4%'
                          and (c -> 'content' ->> 'right')::int in (0, 1))
             from q, jsonb_array_elements(doc -> 'cards') c where c ->> 'family' = 'd')
          or :'monday'::boolean, 'the three-setter: hidden in the question, the score after the pick');
select is((select count(*)::int from q, jsonb_array_elements(doc -> 'cards') c), 6, 'still six cards');
select tests.logout();

-- v knows the same players: the same card, so the answers add up
select tests.login(:'v'::uuid);
select is((select c -> 'content' ->> 'match_id' from jsonb_array_elements(api.get_quiz() -> 'cards') c where (c ->> 'position')::int = 2),
          :'m1', 'the same match for someone who knows the same players');
select tests.logout();

-- Monday: the player of the week, out of the people you know (3, 5 and 1 each won this week)
select tests.mk_match((select id from pp where g = 5), (select id from pp where g = 6), now() - interval '2 days') as m3 \gset
select tests.finish_match(:'m3'::uuid, 1);
select tests.finish_match(tests.mk_match((select id from pp where g = 1), (select id from pp where g = 6), now() - interval '4 days'), 1);
select is((core.quiz_dynamic(:'u'::uuid, 'tennis', 'weekly', core.quiz_day_key(now()), 'seed', '{}', '{}') -> 'content' ->> 'tag'),
          'Εβδομαδιαίο', 'the weekly card');
select is(jsonb_array_length(core.quiz_dynamic(:'u'::uuid, 'tennis', 'weekly', core.quiz_day_key(now()), 'seed', '{}', '{}') -> 'content' -> 'players'),
          3, 'three to choose from');

select * from finish();
rollback;
