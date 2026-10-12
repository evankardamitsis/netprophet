-- Pro scouting: only your own upcoming match, only with Pro; numbers from the results.
begin;
select plan(13);

select tests.create_user('sc-u@test.local') as u \gset
select tests.create_user('sc-w@test.local') as w \gset

select tests.mk_player('Εγώ', 'Σκάουτ') as me \gset
select tests.mk_player('Αντί', 'Πάλος') as opp \gset
select tests.mk_player('Κοινός', 'Γνωστός') as x \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'x'::uuid);

-- me beat opp in three sets, the third a tie-break
select tests.mk_match(:'me'::uuid, :'opp'::uuid, now() - interval '3 days') as m1 \gset
insert into core.match_results (match_id, winner_side, sets)
values (:'m1'::uuid, 1, '[{"w":6,"l":4},{"w":3,"l":6},{"w":7,"l":6,"tb":[7,5]}]');
-- opp beat x, the first set a tie-break
select tests.mk_match(:'opp'::uuid, :'x'::uuid, now() - interval '2 days') as m2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m2'::uuid, 1, '[{"w":7,"l":6},{"w":6,"l":2}]');
-- x beat me
select tests.mk_match(:'x'::uuid, :'me'::uuid, now() - interval '1 day') as m3 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m3'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":3}]');
-- my next match, and someone else's
select tests.mk_match(:'me'::uuid, :'opp'::uuid) as m4 \gset
select tests.mk_match(:'x'::uuid, :'opp'::uuid) as m5 \gset

select tests.as_anon();
select throws_ok(format($$select api.get_scout(%L)$$, :'m4'), '42501', null, 'anonymous callers cannot scout');

select tests.login(:'u'::uuid);
select throws_ok(format($$select api.get_scout(%L)$$, :'m4'), '42501', 'pro_required', 'scouting is Pro');

select tests.logout();
insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active'),
                                                                     (:'w'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);
select throws_ok(format($$select api.get_scout(%L)$$, :'m5'), '42501', 'not_your_match', 'never someone else''s match');
select throws_ok(format($$select api.get_scout(%L)$$, :'m1'), '22023', 'match_over', 'not a match already played');

select is((api.get_scout(:'m4') -> 'opponents' -> 0 ->> 'id'), :'opp', 'the other side of your match');
select is((api.get_scout(:'m4') -> 'opponents' -> 0 -> 'h2h' ->> 'w')::int, 1, 'you beat them once');
select is((api.get_scout(:'m4') -> 'opponents' -> 0 -> 'h2h' ->> 'l')::int, 0, 'and never lost to them');
select is((api.get_scout(:'m4') -> 'opponents' -> 0 -> 'h2h' -> 'last' ->> 'won')::boolean, true, 'the last meeting, your side');
select is(api.get_scout(:'m4') -> 'opponents' -> 0 -> 'deciding', '{"w": 0, "l": 1}'::jsonb, 'their deciding sets');
select is(api.get_scout(:'m4') -> 'opponents' -> 0 -> 'tiebreaks', '{"w": 1, "l": 1}'::jsonb, 'their tie-breaks');
select is(api.get_scout(:'m4') -> 'opponents' -> 0 -> 'common' -> 0 -> 'me', '{"w": 0, "l": 1}'::jsonb,
          'a common opponent: your record');
select is(api.get_scout(:'m4') -> 'opponents' -> 0 -> 'known', '{"w": 1, "l": 0}'::jsonb, 'their record against people you follow');

select tests.login(:'w'::uuid);
select throws_ok(format($$select api.get_scout(%L)$$, :'m4'), '42501', 'no_player', 'no player, nothing to scout');

select * from finish();
rollback;
