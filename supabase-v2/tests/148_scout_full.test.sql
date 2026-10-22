-- 20270315000000_pro_scout_full: the Pro scout shows at least what the free player card shows, and much more
-- (history, singles and doubles numbers, form, every meeting, this tournament so far, traits); a free account still
-- gets nothing; minors and hidden players are never named.
begin;
select plan(16);

select tests.create_user('sf-u@test.local') as u \gset
select tests.create_user('sf-v@test.local') as v \gset
select tests.mk_player('Εγώ', 'Σκάουτερ') as me \gset
select tests.mk_player('Αντί', 'Παλος') as opp \gset
select tests.mk_player('Κοινός', 'Τρίτος') as x \gset
select tests.mk_player('Μικρός', 'Ανήλικος') as y \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
insert into core.tournaments (sport_id, name, surface) values ('tennis', 'Open Σκάουτ', 'clay') returning id as tour \gset

-- me beat opp (a meeting); opp beat x in this tournament's earlier round; opp beat y, a minor; y beat me
select tests.mk_match(:'me'::uuid, :'opp'::uuid, now() - interval '9 days') as m1 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m1'::uuid, 1, '[{"w":6,"l":4},{"w":6,"l":3}]');
select tests.mk_match(:'opp'::uuid, :'x'::uuid, now() - interval '2 days') as m2 \gset
update core.matches set tournament_id = :'tour'::uuid, round = 'quarter' where id = :'m2'::uuid;
insert into core.match_results (match_id, winner_side, sets) values (:'m2'::uuid, 1, '[{"w":7,"l":6,"tb":[7,3]},{"w":6,"l":2}]');
select tests.mk_match(:'opp'::uuid, :'y'::uuid, now() - interval '5 days') as m3 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m3'::uuid, 1, '[{"w":6,"l":1},{"w":6,"l":1}]');
select tests.mk_match(:'y'::uuid, :'me'::uuid, now() - interval '4 days') as m4 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m4'::uuid, 1, '[{"w":6,"l":2},{"w":6,"l":2}]');
update core.players set is_minor = true where id = :'y'::uuid;
-- my next match: the semi-final against opp
select tests.mk_match(:'me'::uuid, :'opp'::uuid) as next \gset
update core.matches set tournament_id = :'tour'::uuid, round = 'semi' where id = :'next'::uuid;
-- someone voted how opp plays
insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
select :'v'::uuid, :'opp'::uuid, 'tennis', id from core.trait_defs where label_en = 'Lots of slice';

-- free: nothing at all
select tests.login(:'u'::uuid);
select throws_ok(format($$select api.get_scout(%L)$$, :'next'), '42501', 'pro_required', 'a free account gets no scout data');
select tests.logout();

insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);
select api.get_scout(:'next') -> 'opponents' -> 0 as o \gset

-- a superset of the free card: every match on the card is in the history, the year and the form agree
select ok((select bool_and(h.ids @> jsonb_build_array(l.value -> 'match_id'))
             from jsonb_array_elements(api.get_player(:'opp'::uuid) -> 'last_matches') l,
                  (select jsonb_agg(e -> 'match_id') as ids from jsonb_array_elements(:'o'::jsonb -> 'history') e) h),
          'every match on the free card is in the scout history');
select is((:'o'::jsonb ->> 'history_count')::int, 3, 'all their results');
select is(:'o'::jsonb -> 'form10', '["L", "W", "W"]'::jsonb, 'form, oldest first');
select is(:'o'::jsonb -> 'history' -> 0 ->> 'tournament', 'Open Σκάουτ', 'a history row knows the tournament');
select is(:'o'::jsonb -> 'history' -> 0 ->> 'surface', 'clay', 'and the surface');
select is(jsonb_array_length(:'o'::jsonb -> 'history' -> 1 -> 'opponents'), 0, 'a minor is never named in the history');

-- μεταξύ σας: every meeting, from my side
select is(jsonb_array_length(:'o'::jsonb -> 'h2h' -> 'meetings'), 1, 'every meeting between us');
select is((:'o'::jsonb -> 'h2h' -> 'meetings' -> 0 ->> 'won')::boolean, true, 'from my side');

-- the numbers of «Τα στατιστικά σου», for them
select is((:'o'::jsonb -> 'singles' ->> 'played')::int, 3, 'singles played');
select is(:'o'::jsonb -> 'singles' -> 'more' -> 'by_surface', '[{"key": "clay", "won": 1, "lost": 0}]'::jsonb, 'by surface');
select is((:'o'::jsonb -> 'singles' -> 'more' -> 'runs' ->> 'current')::int, 2, 'wins in a row now');
select is((:'o'::jsonb -> 'doubles' ->> 'played')::int, 0, 'doubles are there too');

-- this tournament so far, and how they play
select is(:'o'::jsonb -> 'path' -> 0 ->> 'round', 'quarter', 'their way to this match');
select is(:'o'::jsonb -> 'traits' -> 0 ->> 'count', '1', 'traits with the counts');

-- common opponents never include a minor
select is(jsonb_array_length(:'o'::jsonb -> 'common'), 0, 'a minor is never a common opponent');
select tests.logout();

select * from finish();
rollback;
