-- A personal Σήμερα: inside the hard tiers (unvoted first, then your circle) the feed ranks by area, level
-- closeness, the tournaments you play in, hot matches, rematches and what you voted on before. Levels only rank.
begin;
select plan(9);

-- keep the feed deterministic: take the seed matches out of play
update core.matches set status = 'void' where source_ref like 'seed-m%';

select tests.create_user('rank-u@test.local') as u \gset
select tests.mk_player('Ράνκ', 'Εγώ') as me \gset
update core.profiles set claimed_player_id = :'me'::uuid, area_id = 'kifisia' where user_id = :'u'::uuid;
insert into core.player_sports (player_id, sport_id, level_value) values (:'me'::uuid, 'tennis', 3.0);

-- all cards start at the same time, so only the score separates them
create function pg_temp.at() returns timestamptz language sql as $$ select date_trunc('hour', now()) + interval '2 days' $$;
create function pg_temp.fresh() returns uuid language sql as $$ select tests.mk_match_fresh(pg_temp.at()) $$;
-- a card's place in the feed (0 based)
create function pg_temp.pos(p_feed jsonb, p_match uuid) returns int language sql as $$
  select (o - 1)::int from jsonb_array_elements(p_feed -> 'items') with ordinality x(c, o) where c ->> 'match_id' = p_match::text
$$;

-- circle and area
select tests.mk_player('Φίλος', 'Κύκλου') as fp \gset
select tests.mk_match(:'fp'::uuid, tests.mk_player('Αντί', 'Πάλος'), pg_temp.at()) as circle \gset
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'fp'::uuid);
select pg_temp.fresh() as near \gset
select pg_temp.fresh() as far \gset
update core.matches set area_id = 'kifisia' where id = :'near'::uuid;
update core.matches set area_id = 'pagrati' where id = :'far'::uuid;

-- level closeness
select pg_temp.fresh() as lvl_near \gset
select pg_temp.fresh() as lvl_far \gset
insert into core.player_sports (player_id, sport_id, level_value)
select mp.player_id, 'tennis', case when mp.match_id = :'lvl_near'::uuid then 3.0 + 0.1 * mp.side else 6.0 + 0.1 * mp.side end
  from core.match_participants mp where mp.match_id in (:'lvl_near'::uuid, :'lvl_far'::uuid);

-- a tournament you play in versus one you do not
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Rank Mine Open', 'admin') returning id as t_mine \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Rank Other Open', 'admin') returning id as t_other \gset
select tests.mk_match(:'me'::uuid, tests.mk_player('Αντί', 'Μου'), now() - interval '3 days', 'played') as mine_played \gset
update core.matches set tournament_id = :'t_mine'::uuid where id = :'mine_played'::uuid;
select pg_temp.fresh() as in_mine \gset
select pg_temp.fresh() as in_other \gset
update core.matches set tournament_id = :'t_mine'::uuid where id = :'in_mine'::uuid;
update core.matches set tournament_id = :'t_other'::uuid where id = :'in_other'::uuid;

-- hot (ten votes, 5/5) versus cold (none)
select pg_temp.fresh() as hot \gset
select pg_temp.fresh() as cold \gset
insert into core.votes (user_id, subject_type, subject_id, option)
select tests.create_user('rank-v' || g || '@test.local'), 'match', :'hot'::uuid, 1 + g % 2 from generate_series(1, 10) g;

-- a rematch versus a first meeting
select tests.mk_player('Ρεβάνς', 'Ένα') as r1 \gset
select tests.mk_player('Ρεβάνς', 'Δύο') as r2 \gset
select tests.mk_match(:'r1'::uuid, :'r2'::uuid, now() - interval '20 days', 'played') as met \gset
select tests.mk_match(:'r1'::uuid, :'r2'::uuid, pg_temp.at()) as rematch \gset
select pg_temp.fresh() as first_meet \gset

-- a match you vote on
select pg_temp.fresh() as voted \gset

select tests.login(:'u'::uuid);
select api.cast_vote(:'voted'::uuid, 1) is not null as v \gset
select api.get_feed(100) as feed \gset
select tests.logout();

select cmp_ok(pg_temp.pos(:'feed', :'circle'), '<', pg_temp.pos(:'feed', :'near'),
              'someone you follow still comes first among the unvoted, ahead of a match in your area');
select cmp_ok(pg_temp.pos(:'feed', :'near'), '<', pg_temp.pos(:'feed', :'far'), 'a match in your area beats one elsewhere');
select cmp_ok(pg_temp.pos(:'feed', :'lvl_near'), '<', pg_temp.pos(:'feed', :'lvl_far'), 'players near your level beat players far from it');
select cmp_ok(pg_temp.pos(:'feed', :'in_mine'), '<', pg_temp.pos(:'feed', :'in_other'), 'a tournament you play in beats one you do not');
select cmp_ok(pg_temp.pos(:'feed', :'hot'), '<', pg_temp.pos(:'feed', :'cold'), 'a hot match (many votes, close split) beats a cold one');
select cmp_ok(pg_temp.pos(:'feed', :'rematch'), '<', pg_temp.pos(:'feed', :'first_meet'), 'a rematch beats a first meeting');
select is(pg_temp.pos(:'feed', :'voted'),
          (select max(pg_temp.pos(:'feed', (c ->> 'match_id')::uuid)) from jsonb_array_elements(:'feed'::jsonb -> 'items') c
            where c ->> 'kind' = 'match'),
          'a match you voted on still sinks below every unvoted one');
select is((select count(*)::int from jsonb_array_elements(:'feed'::jsonb -> 'items') c
            where c ->> 'kind' = 'match' and (c ? 'score' or c::text ~ 'level_value')), 0,
          'the score and the hidden levels never leave the database');
select is(pg_temp.pos(:'feed', :'mine_played'), null, 'your own match is still not on your feed');

select * from finish();
rollback;
