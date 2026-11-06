-- The daily quiz's variety: rules with a right answer, cards from real results that are right, people you know only, a
-- different order each day, and nothing again within 30 days while something else is free.
begin;
select plan(21);

select tests.create_user('qv-u@test.local') as u \gset
select tests.create_user('qv-new@test.local') as nu \gset
select tests.create_user('qv-pro@test.local') as pu \gset
insert into core.entitlements (user_id, key, source, status) values (:'pu'::uuid, 'pro', 'gift', 'active');
create temp table pp as select g, tests.mk_player('Ποικ' || g, 'Παίκτης' || g, 'm') as id from generate_series(1, 6) g;
grant select on pp to public;
insert into core.follows (user_id, player_id) select :'u'::uuid, id from pp where g <= 4;
select core.quiz_day_key(now()) as d \gset

-- 1 beat 2 in straight sets; 3 lost the first set to 4 and turned it round; 1 and 2 have met three times, 1 leads 2-1
select tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '2 days') as m1 \gset
select tests.as_service();
select api.admin_set_result(:'m1'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb);
select tests.logout();
select tests.mk_match((select id from pp where g = 3), (select id from pp where g = 4), now() - interval '3 days') as m2 \gset
select tests.as_service();
select api.admin_set_result(:'m2'::uuid, 1, '[{"w":4,"l":6},{"w":6,"l":3},{"w":6,"l":2}]'::jsonb);
select tests.logout();
select tests.finish_match(tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '40 days'), 1);
select tests.finish_match(tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '50 days'), 2);

-- Βρες το σκορ: the true score among three, and it is the right one
select core.quiz_real(:'u'::uuid, 'tennis', 'score', :'d', 'seed', '{}', '{}') as sc \gset
select is(:'sc'::jsonb -> 'content' ->> 'tag', 'Βρες το σκορ', 'the score card');
select is(jsonb_array_length(:'sc'::jsonb -> 'content' -> 'options'), 3, 'three scores');
select is((select count(distinct o ->> 'label')::int from jsonb_array_elements(:'sc'::jsonb -> 'content' -> 'options') o), 3, 'all different');
select is((:'sc'::jsonb -> 'content' -> 'options' -> (:'sc'::jsonb -> 'content' ->> 'right')::int) ->> 'label',
          (select core.quiz_score(sets) from core.match_results where match_id = (:'sc'::jsonb -> 'content' ->> 'match_id')::uuid), 'the right option is the true score');
select is((:'sc'::jsonb -> 'ids' ->> 0)::uuid,
          (select mp.player_id from core.match_results r join core.match_participants mp on mp.match_id = r.match_id and mp.side = r.winner_side
            where r.match_id = (:'sc'::jsonb -> 'content' ->> 'match_id')::uuid limit 1), 'and p1 is the winner');

-- Το γύρισε; both ways
select core.quiz_real(:'u'::uuid, 'tennis', 'comeback', :'d', 'seed', array[(select id from pp where g = 1)], '{}') as cb \gset
select is(:'cb'::jsonb -> 'content' ->> 'match_id', :'m2', 'the match where the first set went the other way');
select is((:'cb'::jsonb -> 'content' ->> 'right')::int, 0, 'it turned round');
select is((:'cb'::jsonb -> 'ids' ->> 0)::uuid, (select id from pp where g = 3), 'p1 lost the first set and won');
select core.quiz_real(:'u'::uuid, 'tennis', 'comeback', :'d', 'seed', array[(select id from pp where g = 3)], '{}') as cb2 \gset
select is((:'cb2'::jsonb -> 'content' ->> 'right')::int, 1, 'straight sets: over in two');
select is((:'cb2'::jsonb -> 'ids' ->> 0)::uuid, (select id from pp where g = 2), 'and p1 is the one who lost it');

-- Μεταξύ τους
select core.quiz_real(:'u'::uuid, 'tennis', 'h2h', :'d', 'seed', '{}', '{}') as hh \gset
select is((:'hh'::jsonb -> 'ids' ->> (:'hh'::jsonb -> 'content' ->> 'right')::int)::uuid, (select id from pp where g = 1), 'who leads');
select ok(:'hh'::jsonb -> 'content' ->> 'reveal' like '%προηγείται 2-1.', 'and by how much');

-- Ο πιο πολυάσχολος needs a clear first and two more; here only four people played this month, all once
select is(core.quiz_real(:'u'::uuid, 'tennis', 'busy', :'d', 'seed', '{}', '{}'), null, 'no clear first: no card');

-- someone new knows nobody: no cards about people, a full set anyway
select core.quiz_build_set(:'nu'::uuid, :'d'::date, false);
select is((select count(*)::int from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id where s.user_id = :'nu'::uuid and s.quiz_day = :'d'), 6, 'six cards for someone who knows nobody');
select is((select count(*)::int from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
            where s.user_id = :'nu'::uuid and s.quiz_day = :'d' and c.family in ('s', 'c')), 0, 'none of them asks about strangers');
select ok(exists (select 1 from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
                   where s.user_id = :'nu'::uuid and s.quiz_day = :'d' and c.content ->> 'tag' = 'Κανόνες'
                     and (c.content ->> 'right')::int in (0, 1) and c.content ->> 'reveal' <> ''), 'a rule, with its right answer');

-- a Pro set is twelve, one of a kind: «Ποιος κέρδισε;» at most once
select core.quiz_build_set(:'pu'::uuid, :'d'::date, true);
select is((select count(*)::int from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id where s.user_id = :'pu'::uuid and s.quiz_day = :'d'), 12, 'twelve for Pro');
select is((select count(*)::int from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
            where s.user_id = :'pu'::uuid and s.quiz_day = :'d' and c.content ->> 'tag' = 'Κανόνες'), 1, 'one rule a day for Pro too');

-- ten days: the order changes, and nothing comes back while something else is free
select core.quiz_build_set(:'nu'::uuid, :'d'::date + i, false) from generate_series(1, 4) i;
select is((select count(*)::int from (select c.template_id from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
                                       where s.user_id = :'nu'::uuid and c.family = 'o' group by 1 having count(*) > 1) x), 0, 'no opinion twice in five days');
select ok((select count(distinct s.tags) > 1 from (select string_agg(c.content ->> 'tag', ',' order by c.position) as tags
             from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id where s.user_id = :'nu'::uuid group by s.id) s), 'the order is not the same every day');

select is(core.quiz_short_name('Athens Tennis 2026–27'), 'Athens Tennis', 'the name loses its year');

select * from finish();
rollback;
