-- Players' levels are hidden, so the upset questions never name them: before a match the favourite is named in words,
-- after it the question asks whether you saw it coming. The hidden tiers still decide which matches are upsets.
begin;
select plan(5);

select tests.create_user('qn-u@test.local') as u \gset
create temp table pp as
select g, tests.mk_player('Ανατ' || g, 'Παίκτης' || g, 'm') as id from generate_series(1, 4) g;
grant select on pp to public;
-- 1 and 3 are level 2, 2 and 4 are level 5
insert into core.player_sports (player_id, sport_id, level_tier)
select id, 'tennis', case when g % 2 = 1 then 2 else 5 end from pp
on conflict (player_id, sport_id) do update set level_tier = excluded.level_tier;
insert into core.follows (user_id, player_id) select :'u'::uuid, id from pp;

-- 1 (level 2) beat 2 (level 5) yesterday; 3 (level 2) meets 4 (level 5) tomorrow, for the first time
select tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '1 day') as m_post \gset
select tests.finish_match(:'m_post'::uuid, 1);
select tests.mk_match((select id from pp where g = 3), (select id from pp where g = 4), now() + interval '1 day') as m_pre \gset

create temp table q as
select k, core.quiz_dynamic(:'u'::uuid, 'tennis', k, core.quiz_day_key(now()), 'seed', '{}', '{}') as card
  from unnest(array['pre', 'post']) k;
grant select on q to public;

select is((select card -> 'content' ->> 'q' from q where k = 'pre'),
          '{p1.o} παίζει αύριο με {p2.ton}, που ξεκινά φαβορί. Γίνεται ανατροπή;', 'before: the favourite in words');
select ok((select card -> 'content' ->> 'q' not like '%6-3%' and card -> 'content' ->> 'reveal' like 'Ανατροπή! %κέρδισε %.'
             from q where k = 'post'),
          'after: the result is hidden in the question, the upset shows after the pick');
select ok((select (card -> 'content' ->> 'right')::int in (0, 1) from q where k = 'post'), 'after: one right answer, no level moving');
select is((select count(*)::int from q where card::text like '%(level%'), 0, 'no question names a level');
select is((select count(*)::int from q where card is not null), 2, 'both upset cards were made');

select * from finish();
rollback;
