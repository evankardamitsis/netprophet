-- «Τα στατιστικά σου» are your real matches: singles and doubles apart, games only where the score has them (sets-only
-- results count in sets and deciding sets), tie-breaks, super tie-breaks, comebacks, walkovers and retirements, the
-- splits, opponents, partners, best wins and tournaments; the free teaser vs Pro; periods; nothing hidden leaks.
begin;
select plan(40);

select tests.create_user('ms-u@test.local') as u \gset
select tests.create_user('ms-v@test.local') as v \gset
select tests.mk_player('Βαγγέλης', 'Ματς') as me \gset
select tests.mk_player('Άλκης', 'Άλφα') as a \gset
select tests.mk_player('Βασίλης', 'Βήτα') as b \gset
select tests.mk_player('Γιάννης', 'Γάμμα') as c \gset
select tests.mk_player('Παιδί', 'Μικρό') as kid \gset
select tests.mk_player('Πέτρος', 'Ζευγάρι') as p \gset
select tests.mk_player('Κατερίνα', 'Μικτό', 'f') as q \gset
select tests.mk_player('Δημήτρης', 'Δέλτα') as d1 \gset
select tests.mk_player('Ηλίας', 'Έψιλον') as d2 \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set is_minor = true where id = :'kid'::uuid;
insert into core.player_sports (player_id, sport_id, level_value) values
  (:'a'::uuid, 'tennis', 5.0), (:'b'::uuid, 'tennis', 4.0), (:'c'::uuid, 'tennis', 3.0), (:'kid'::uuid, 'tennis', 6.0)
  on conflict (player_id, sport_id) do update set level_value = excluded.level_value;

-- recent matches this year (never before 1 January), one more than a year ago
select (greatest(date_trunc('year', core.athens_day())::date, core.athens_day() - 8) + time '08:00') at time zone 'Europe/Athens' as t0 \gset
select ((core.athens_day() - 400) + time '10:00') at time zone 'Europe/Athens' as told \gset

insert into core.tournaments (sport_id, name, surface) values ('tennis', 'Κύπελλο Χώμα', 'clay') returning id as t1 \gset
insert into core.tournaments (sport_id, name, surface) values ('tennis', 'Open Σκληρό', 'hard') returning id as t2 \gset
insert into core.tournament_events (tournament_id, name, format) values (:'t1'::uuid, 'Ανδρών Α', 'singles') returning id as e1 \gset

-- singles, in time order: s7 L, s1 W, s2 W, s4 W, s3 L, s5 W, s6 walkover
-- s7: a loss to Βήτα on the super tie-break (lost the first set, won the second)
select tests.mk_match(:'me'::uuid, :'b'::uuid, :'t0'::timestamptz) as s7 \gset
update core.matches set tournament_id = :'t2'::uuid where id = :'s7'::uuid;
insert into core.match_results (match_id, winner_side, sets) values (:'s7'::uuid, 2, '[{"w":6,"l":4},{"w":3,"l":6},{"w":10,"l":8,"stb":true}]');
-- s1: a straight win over Άλφα, quarter-final of the clay cup
select tests.mk_match(:'me'::uuid, :'a'::uuid, :'t0'::timestamptz + interval '1 hour') as s1 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'s1'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');
-- s2: a comeback over Βήτα, the third set a tie-break, semi-final
select tests.mk_match(:'me'::uuid, :'b'::uuid, :'t0'::timestamptz + interval '2 hours') as s2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'s2'::uuid, 1, '[{"w":4,"l":6},{"w":6,"l":3},{"w":7,"l":6,"tb":true}]');
-- s4: a friendly win over Βήτα, sets only, 2-1
select tests.mk_match(:'me'::uuid, :'b'::uuid, :'t0'::timestamptz + interval '3 hours') as s4 \gset
insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost) values (:'s4'::uuid, 1, '[]', 2, 1);
-- s3: the final, lost to Άλφα in straight sets, the first a tie-break
select tests.mk_match(:'me'::uuid, :'a'::uuid, :'t0'::timestamptz + interval '4 hours') as s3 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'s3'::uuid, 2, '[{"w":7,"l":6,"tb":[7,5]},{"w":6,"l":4}]');
update core.matches set tournament_id = :'t1'::uuid, event_id = :'e1'::uuid,
       round = case id when :'s1'::uuid then 'quarter' when :'s2'::uuid then 'semi' else 'final' end
 where id in (:'s1'::uuid, :'s2'::uuid, :'s3'::uuid);
-- s5: a minor retired against you: counted, never named
select tests.mk_match(:'me'::uuid, :'kid'::uuid, :'t0'::timestamptz + interval '5 hours') as s5 \gset
insert into core.match_results (match_id, winner_side, sets, retired) values (:'s5'::uuid, 1, '[{"w":6,"l":2},{"w":2,"l":1}]', true);
-- s6: a walkover: not played
select tests.mk_match(:'me'::uuid, :'c'::uuid, :'t0'::timestamptz + interval '6 hours') as s6 \gset
insert into core.match_results (match_id, winner_side, sets, walkover) values (:'s6'::uuid, 1, '[]', true);
-- more than a year ago: a win over Γάμμα in the hard court open
select tests.mk_match(:'me'::uuid, :'c'::uuid, :'told'::timestamptz) as sold \gset
update core.matches set tournament_id = :'t2'::uuid where id = :'sold'::uuid;
insert into core.match_results (match_id, winner_side, sets) values (:'sold'::uuid, 1, '[{"w":6,"l":0},{"w":6,"l":0}]');
-- never counted: disputed, waiting for staff, not approved
select tests.mk_match(:'me'::uuid, :'c'::uuid, :'t0'::timestamptz + interval '7 hours') as xd \gset
insert into core.match_results (match_id, winner_side, sets) values (:'xd'::uuid, 1, '[{"w":6,"l":0},{"w":6,"l":0}]');
update core.matches set status = 'disputed' where id = :'xd'::uuid;
select tests.mk_match(:'me'::uuid, :'c'::uuid, :'t0'::timestamptz + interval '8 hours') as xp \gset
insert into core.match_results (match_id, winner_side, sets) values (:'xp'::uuid, 1, '[{"w":6,"l":0},{"w":6,"l":0}]');
update core.matches set review = 'pending' where id = :'xp'::uuid;
select tests.mk_match(:'me'::uuid, :'c'::uuid, :'t0'::timestamptz + interval '9 hours') as xa \gset
insert into core.match_results (match_id, winner_side, sets) values (:'xa'::uuid, 1, '[{"w":6,"l":0},{"w":6,"l":0}]');
update core.matches set approved = false where id = :'xa'::uuid;

-- doubles: with Ζευγάρι a win and a loss (a minor across the net), a mixed win with Μικτό, sets only
insert into core.matches (sport_id, format, status, starts_at, source) values ('tennis', 'doubles', 'scheduled', :'t0'::timestamptz + interval '1 hour', 'admin') returning id as dd1 \gset
insert into core.match_participants (match_id, side, player_id, position) values
  (:'dd1'::uuid, 1, :'me'::uuid, 1), (:'dd1'::uuid, 1, :'p'::uuid, 2), (:'dd1'::uuid, 2, :'d1'::uuid, 1), (:'dd1'::uuid, 2, :'d2'::uuid, 2);
insert into core.match_results (match_id, winner_side, sets) values (:'dd1'::uuid, 1, '[{"w":6,"l":4},{"w":6,"l":4}]');
insert into core.matches (sport_id, format, status, starts_at, source) values ('tennis', 'doubles', 'scheduled', :'t0'::timestamptz + interval '2 hours', 'admin') returning id as dd2 \gset
insert into core.match_participants (match_id, side, player_id, position) values
  (:'dd2'::uuid, 1, :'me'::uuid, 1), (:'dd2'::uuid, 1, :'p'::uuid, 2), (:'dd2'::uuid, 2, :'d1'::uuid, 1), (:'dd2'::uuid, 2, :'kid'::uuid, 2);
insert into core.match_results (match_id, winner_side, sets) values (:'dd2'::uuid, 2, '[{"w":7,"l":6},{"w":6,"l":4}]');
insert into core.matches (sport_id, format, status, starts_at, source) values ('tennis', 'mixed', 'scheduled', :'t0'::timestamptz + interval '3 hours', 'admin') returning id as dd3 \gset
insert into core.match_participants (match_id, side, player_id, position) values
  (:'dd3'::uuid, 1, :'me'::uuid, 1), (:'dd3'::uuid, 1, :'q'::uuid, 2), (:'dd3'::uuid, 2, :'d1'::uuid, 1), (:'dd3'::uuid, 2, :'d2'::uuid, 2);
insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost) values (:'dd3'::uuid, 1, '[]', 2, 0);

-- free: the teaser, no detail
select tests.login(:'u'::uuid);
select is((api.my_match_stats() -> 'singles') - 'more', '{"played": 7, "won": 5, "lost": 2, "win_pct": 71}'::jsonb,
          'free singles: played, won, lost, win % (no walkover, no disputed, pending or hidden match)');
select is((api.my_match_stats() -> 'doubles') - 'more', '{"played": 3, "won": 2, "lost": 1, "win_pct": 67}'::jsonb,
          'free doubles: mixed counts with doubles');
select is(api.my_match_stats() -> 'total', '{"played": 10, "won": 7, "lost": 3, "win_pct": 70}'::jsonb, 'the total');
select is(api.my_match_stats() -> 'singles' -> 'more', 'null'::jsonb, 'free: the detail is Pro');
select is((api.my_match_stats() ->> 'pro')::boolean, false, 'free is told it is free');
select is((api.my_match_stats('12m') -> 'singles') - 'more', '{"played": 6, "won": 4, "lost": 2, "win_pct": 67}'::jsonb,
          'the last 12 months leave the old match out');
select is(api.my_match_stats('year') -> 'singles' ->> 'played', '6', 'this year');
select throws_ok($$select api.my_match_stats('week')$$, '22023', 'bad_period', 'the period is checked');
select tests.login(:'v'::uuid);
select is((api.my_match_stats() -> 'total') - 'win_pct', '{"played": 0, "won": 0, "lost": 0}'::jsonb, 'no player: nothing, no error');
select is((api.my_match_stats() ->> 'has_player')::boolean, false, 'no player is said');
select tests.logout();

-- Pro: the detail
insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);
create temp table ms as select api.my_match_stats() -> 'singles' -> 'more' as s, api.my_match_stats() -> 'doubles' -> 'more' as d;
select is((select s -> 'walkovers' from ms), '{"won": 1, "lost": 0}'::jsonb, 'walkovers apart');
select is((select s -> 'retired' from ms), '{"won": 1, "lost": 0}'::jsonb, 'the opponent retired');
select is((select s -> 'runs' from ms), '{"current": 1, "best": 3}'::jsonb, 'the current and the best run of wins');
select is((select s -> 'sets' from ms), '{"won": 11, "lost": 6, "pct": 65}'::jsonb, 'sets, from the games or the sets only');
select is((select s -> 'games' from ms), '{"won": 69, "lost": 47, "pct": 59, "matches": 6}'::jsonb,
          'games only from scores with games, the super tie-break left out');
select is((select s -> 'tiebreaks' from ms), '{"played": 2, "won": 1}'::jsonb, 'tie-breaks');
select is((select s -> 'super_tiebreaks' from ms), '{"played": 1, "won": 0}'::jsonb, 'super tie-breaks');
select is((select s -> 'deciding' from ms), '{"played": 3, "won": 2}'::jsonb, 'deciding sets, a sets-only 2-1 included');
select is((select s -> 'first_set_lost' from ms), '{"played": 3, "won": 1}'::jsonb, 'after losing the first set: one comeback');
select is((select s -> 'first_set_won' from ms), '{"played": 3, "won": 3}'::jsonb, 'after winning the first set');
select is((select s -> 'straight' from ms), '{"won": 2, "lost": 1}'::jsonb, 'straight sets, a retirement left out');
select is((select s -> 'kinds' from ms), '{"tournament": {"won": 3, "lost": 2}, "friendly": {"won": 2, "lost": 0}}'::jsonb,
          'tournaments and friendlies');
select is((select s -> 'by_surface' from ms),
          '[{"key": "clay", "won": 2, "lost": 1}, {"key": "hard", "won": 1, "lost": 1}]'::jsonb, 'by surface');
select is((select s -> 'by_category' from ms), '[{"key": "Ανδρών Α", "won": 2, "lost": 1}]'::jsonb, 'by category');
select is((select s -> 'by_round' from ms),
          '[{"key": "final", "won": 0, "lost": 1}, {"key": "quarter", "won": 1, "lost": 0}, {"key": "semi", "won": 1, "lost": 0}]'::jsonb,
          'by round');
select is((select sum((x ->> 'won')::int + (x ->> 'lost')::int)::int from ms, jsonb_array_elements(s -> 'by_month') x), 6,
          'by month: the last 12 months only');
select is((select jsonb_agg(jsonb_build_array(x ->> 'surname', x -> 'played', x -> 'won')) from ms, jsonb_array_elements(s -> 'opponents') x),
          '[["Βήτα", 3, 2], ["Άλφα", 2, 1], ["Γάμμα", 1, 1]]'::jsonb, 'the opponents you met most, with the head-to-head, no minor');
select is((select jsonb_agg(x ->> 'match_id') from ms, jsonb_array_elements(s -> 'best_wins') x),
          jsonb_build_array(:'s1', :'s4', :'s2'), 'the best wins: strongest opponent first, never over a minor');
select is((select s -> 'best_wins' -> 0 -> 'opponents' -> 0 ->> 'surname' from ms), 'Άλφα', 'a best win names the opponent');
select is((select s -> 'tournaments' -> 'count' from ms), '2'::jsonb, 'tournaments played');
select is((select jsonb_agg(jsonb_build_array(x ->> 'name', x -> 'played', x -> 'won', x ->> 'last_round', x -> 'last_won'))
             from ms, jsonb_array_elements(s -> 'tournaments' -> 'list') x),
          '[["Κύπελλο Χώμα", 3, 2, "final", false], ["Open Σκληρό", 2, 1, null, false]]'::jsonb,
          'each tournament: the record and how far you went');
select is((select s -> 'partners' from ms), 'null'::jsonb, 'singles have no partners');
select is((select jsonb_agg(jsonb_build_array(x ->> 'surname', x -> 'played', x -> 'won')) from ms, jsonb_array_elements(d -> 'partners') x),
          '[["Ζευγάρι", 2, 1], ["Μικτό", 1, 1]]'::jsonb, 'doubles partners with the record');
select is((select jsonb_agg(jsonb_build_array(x ->> 'surname', x -> 'played', x -> 'won')) from ms, jsonb_array_elements(d -> 'opponents') x),
          '[["Δέλτα", 3, 2], ["Έψιλον", 2, 2]]'::jsonb, 'doubles opponents, the minor left out');
select is((select d -> 'games' -> 'matches' from ms), '2'::jsonb, 'doubles games only where the score has them');
select is((select d -> 'tiebreaks' from ms), '{"played": 1, "won": 0}'::jsonb, 'doubles tie-breaks');
select is((select d -> 'best_wins' -> 0 -> 'partners' -> 0 ->> 'surname' from ms), 'Μικτό', 'a doubles best win names the partner');
select ok((select (s::text || d::text) !~* 'level' and (s::text || d::text) !~ '\d\.\d' from ms), 'no level value or key anywhere');
select ok((select (s::text || d::text) !~ 'Μικρό' from ms), 'no minor named anywhere');
select tests.logout();

select tests.as_anon();
select throws_ok($$select api.my_match_stats()$$, '42501', null, 'anon cannot ask');
select tests.logout();

select * from finish();
rollback;
