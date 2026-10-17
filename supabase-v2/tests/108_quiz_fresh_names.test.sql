-- Different names every day: people in yesterday's questions go to the back of the line today, a match asked about yesterday is
-- not asked again, and «Ο μήνας» waits while its leader was asked about lately.
begin;
select plan(4);

select tests.create_user('fr-u@test.local') as u \gset
create temp table pp as
select g, tests.mk_player('Νέος' || g, 'Παίκτης' || g, case when g > 32 then 'f' else 'm' end) as id from generate_series(1, 44) g;
grant select on pp to public;
insert into core.follows (user_id, player_id) select :'u'::uuid, id from pp;
update core.player_sports set hand = 'L' where player_id in (select id from pp);
insert into core.player_sports (player_id, sport_id, hand) select id, 'tennis', 'L' from pp
on conflict (player_id, sport_id) do update set hand = 'L';
-- a few results this week and a match tomorrow
select tests.finish_match(tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '20 hours'), 1);
select tests.finish_match(tests.mk_match((select id from pp where g = 3), (select id from pp where g = 4), now() - interval '30 hours'), 2);
select tests.finish_match(tests.mk_match((select id from pp where g = 5), (select id from pp where g = 6), now() - interval '40 hours'), 1);
select tests.mk_match((select id from pp where g = 7), (select id from pp where g = 8), now() + interval '1 day');
select tests.finish_match(tests.mk_match((select id from pp where g = 9 + 2 * k), (select id from pp where g = 10 + 2 * k), now() - interval '1 day' - k * interval '5 hours'), 1 + k % 2)
  from generate_series(0, 3) k;
select tests.mk_match((select id from pp where g = 17), (select id from pp where g = 18), now() + interval '2 days');

-- yesterday's set, then today's
select core.quiz_build_set(:'u'::uuid, core.athens_day() - 1, false) as y \gset
select core.quiz_build_set(:'u'::uuid, core.athens_day(), false) as t \gset

select is((select count(*)::int from core.quiz_set_cards where set_id = :'t'::uuid), 6, 'still six cards today');
-- about fourteen names a day; only one open match is left and few have results, so at most a couple can come back
select ok((select count(*)::int from (
             select unnest(player_ids) from core.quiz_set_cards where set_id = :'t'::uuid
             intersect
             select id from pp
             intersect
             select unnest(player_ids) from core.quiz_set_cards where set_id = :'y'::uuid) x) <= 2,
          'yesterday''s names stay away, but for the odd one when nobody else fits');
select is((select count(*)::int from core.quiz_set_cards a join core.quiz_set_cards b on b.content ->> 'match_id' = a.content ->> 'match_id'
            where a.set_id = :'t'::uuid and b.set_id = :'y'::uuid), 0, 'no match asked about two days running');
select ok(exists (select 1 from core.quiz_recent_players(:'u'::uuid)), 'yesterday counts as lately');

select * from finish();
rollback;
