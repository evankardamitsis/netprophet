-- Pro «Η σεζόν σου»: the month's numbers, the free teaser vs the Pro recap, win cards for your own wins only
-- (the first win of the month free), and no level value anywhere in what goes out.
begin;
select plan(29);

select tests.create_user('ss-u@test.local') as u \gset
select tests.create_user('ss-v@test.local') as v \gset
select tests.create_user('ss-w@test.local') as w \gset
select tests.mk_player('Βαγγέλης', 'Σεζόν') as me \gset
select tests.mk_player('Νίκος', 'Ψηλός') as hi \gset
select tests.mk_player('Μάριος', 'Χαμηλός') as lo \gset
select tests.mk_player('Γιώργος', 'Μέσος') as mid \gset
select tests.mk_player('Παιδί', 'Μικρό') as kid \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set is_minor = true where id = :'kid'::uuid;
insert into core.player_sports (player_id, sport_id, level_value) values
  (:'hi'::uuid, 'tennis', 5.0), (:'lo'::uuid, 'tennis', 3.0), (:'mid'::uuid, 'tennis', 4.0), (:'kid'::uuid, 'tennis', 6.0)
  on conflict (player_id, sport_id) do update set level_value = excluded.level_value;

-- days well inside this month and last month (Athens)
select (date_trunc('month', core.athens_day())::date + 9) as d0 \gset
select (date_trunc('month', core.athens_day())::date - 15) as dp \gset
select core.month_key() as mon \gset
select core.month_key((:'dp'::date + time '12:00') at time zone 'Europe/Athens') as prev \gset

insert into core.tournaments (sport_id, name) values ('tennis', 'Κύπελλο Σεζόν') returning id as t1 \gset
insert into core.tournaments (sport_id, name) values ('tennis', 'Φθινοπωρινό') returning id as t2 \gset
insert into core.tournament_events (tournament_id, name, format) values (:'t1'::uuid, 'Ανδρών Α', 'singles') returning id as e1 \gset

-- m1: the first win of the month, over Μάριος, 2-0
select tests.mk_match(:'me'::uuid, :'lo'::uuid, (:'d0'::date + 1 + time '10:00') at time zone 'Europe/Athens') as m1 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m1'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');
-- m2: a loss to Γιώργος in three sets, the third a tie-break
select tests.mk_match(:'me'::uuid, :'mid'::uuid, (:'d0'::date + 2 + time '10:00') at time zone 'Europe/Athens') as m2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m2'::uuid, 2, '[{"w":6,"l":4},{"w":3,"l":6},{"w":7,"l":6}]');
-- m3: the best win, over Νίκος (the highest level), with a tie-break, in the cup's final
select tests.mk_match(:'me'::uuid, :'hi'::uuid, (:'d0'::date + 3 + time '10:00') at time zone 'Europe/Athens') as m3 \gset
update core.matches set tournament_id = :'t1'::uuid, event_id = :'e1'::uuid, round = 'Τελικός' where id in (:'m3'::uuid, :'m1'::uuid);
insert into core.match_results (match_id, winner_side, sets) values (:'m3'::uuid, 1, '[{"w":7,"l":6},{"w":6,"l":2}]');
-- m4: a player-logged win, sets only, 2-1
select tests.mk_match(:'me'::uuid, :'mid'::uuid, (:'d0'::date + 4 + time '10:00') at time zone 'Europe/Athens') as m4 \gset
update core.matches set tournament_id = :'t2'::uuid where id = :'m4'::uuid;
insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost) values (:'m4'::uuid, 1, '[]', 2, 1);
-- m5: a walkover win: not a played match
select tests.mk_match(:'me'::uuid, :'lo'::uuid, (:'d0'::date + 5 + time '10:00') at time zone 'Europe/Athens') as m5 \gset
insert into core.match_results (match_id, winner_side, sets, walkover) values (:'m5'::uuid, 1, '[]', true);
-- m6: a win over a minor: counted, never on a card, never the best win
select tests.mk_match(:'me'::uuid, :'kid'::uuid, (:'d0'::date + 6 + time '10:00') at time zone 'Europe/Athens') as m6 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m6'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');
-- last month: one win
select tests.mk_match(:'me'::uuid, :'lo'::uuid, (:'dp'::date + time '10:00') at time zone 'Europe/Athens') as m0 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m0'::uuid, 1, '[{"w":6,"l":1},{"w":6,"l":1}]');

-- points, σερί and the Ladder group
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key, created_at) values
  (:'u'::uuid, 40, 'correct', 'match', gen_random_uuid(), :'mon', 'ss-1', now()),
  (:'u'::uuid, 10, 'correct', 'match', gen_random_uuid(), :'prev', 'ss-2', now() - interval '40 days'),
  (:'w'::uuid, 50, 'correct', 'match', gen_random_uuid(), :'mon', 'ss-3', now());
insert into core.streak_events (user_id, streak_before, streak_after, kind, created_at) values
  (:'u'::uuid, 3, 4, 'correct', now()), (:'u'::uuid, 1, 2, 'correct', now()), (:'u'::uuid, 9, 10, 'correct', now() - interval '40 days');
insert into core.leagues (month_key, tier, group_no) values (:'mon', 'silver', 77) returning id as lg \gset
insert into core.league_members (league_id, user_id) values (:'lg'::uuid, :'u'::uuid), (:'lg'::uuid, :'w'::uuid);

-- free: the teaser
select tests.login(:'u'::uuid);
select is(api.my_season() -> 'now', '{"played": 5, "won": 4, "lost": 1, "points": 40}'::jsonb,
          'free: matches, wins, losses and points (no walkover)');
select is(api.my_season() -> 'prev', 'null'::jsonb, 'free: no last month to compare');
select is((api.my_season() ->> 'pro')::boolean, false, 'free is told it is free');
select is(api.my_season() ->> 'free_card', :'m1', 'the first win of the month is the free card');
select is((api.win_card(:'m1'::uuid) ->> 'free')::boolean, true, 'free: the first win of the month makes a card');
select throws_ok(format('select api.win_card(%L)', :'m3'), '42501', 'pro_required', 'free: any other win needs Pro');
select throws_ok(format('select api.win_card(%L)', :'m2'), '42501', 'not_your_win', 'a loss is no win card');
select throws_ok(format('select api.win_card(%L)', :'m5'), '42501', 'not_your_win', 'a walkover is no win card');
select throws_ok(format('select api.win_card(%L)', :'m6'), '42501', 'not_shareable', 'a minor never goes on a card');
select throws_ok($$select api.my_season('2026-13')$$, '22023', 'bad_month', 'a month key is checked');
select is((api.my_season(:'prev') -> 'now' ->> 'played')::int, 1, 'any month can be asked for');

select tests.login(:'w'::uuid);
select throws_ok(format('select api.win_card(%L)', :'m1'), '42501', 'not_your_win', 'someone else''s win is not yours');
select tests.login(:'v'::uuid);
select is(api.my_season() -> 'now' -> 'played', '0'::jsonb, 'no player: no matches, still a season');
select is((api.my_season() ->> 'has_player')::boolean, false, 'no player is said');
select tests.logout();

-- Pro: the whole recap
insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);
select is((api.my_season() -> 'now' ->> 'sets_won')::int || '-' || (api.my_season() -> 'now' ->> 'sets_lost'), '9-3',
          'sets won and lost, from the games or the sets only');
select is((api.my_season() -> 'now' ->> 'win_run')::int, 3, 'the longest run of wins');
select is(api.my_season() -> 'now' -> 'deciding', '{"w": 1, "l": 1}'::jsonb, 'the deciding set record');
select is(api.my_season() -> 'now' -> 'tiebreaks', '{"w": 1, "l": 1}'::jsonb, 'the tie-break record, in sets');
select is((api.my_season() -> 'now' ->> 'tournaments')::int, 2, 'tournaments played');
select is((api.my_season() -> 'now' ->> 'best_streak')::int, 4, 'the best σερί this month');
select is(api.my_season() -> 'now' -> 'best_win' ->> 'match_id', :'m3', 'the best win: the strongest opponent, minors left out');
select is(api.my_season() -> 'now' -> 'best_win' -> 'opponents' -> 0 ->> 'surname', 'Ψηλός', 'the best win names the opponent');
select is(api.my_season() -> 'now' -> 'ladder', '{"tier": "silver", "position": 2, "size": 2, "closed": false}'::jsonb,
          'the Ladder group, live');
select is((select jsonb_build_object('played', p -> 'played', 'won', p -> 'won', 'points', p -> 'points', 'best_streak', p -> 'best_streak',
                                   'best', p -> 'best_win' ->> 'match_id', 'ladder', p -> 'ladder')
             from (select api.my_season() -> 'prev' as p) x),
          jsonb_build_object('played', 1, 'won', 1, 'points', 10, 'best_streak', 10, 'best', :'m0', 'ladder', null),
          'last month, for the arrows');
select is(api.win_card(:'m3'::uuid) - 'starts_at' - 'match_id',
          '{"format": "singles", "tournament": "Κύπελλο Σεζόν", "category": "Ανδρών Α", "round": "Τελικός", "sets": [{"w": 7, "l": 6}, {"w": 6, "l": 2}], "score_summary": "2-0", "retired": false, "me": [{"first_name": "Βαγγέλης", "surname": "Σεζόν", "gender": "m"}], "opponents": [{"first_name": "Νίκος", "surname": "Ψηλός", "gender": "m"}], "pro": true, "free": false}'::jsonb,
          'Pro: a card for every win, with the names, score, tournament, category and round');
select ok(api.my_season()::text !~* 'level' and api.my_season(:'prev')::text !~* 'level'
          and api.win_card(:'m3'::uuid)::text !~* 'level' and api.win_card(:'m1'::uuid)::text !~* 'level',
          'no level value or key anywhere');
select ok(api.my_season()::text !~ '\d\.\d', 'no hidden level number leaks');
select tests.logout();

-- a closed month keeps the final rank
update core.leagues set closed_at = now() where id = :'lg'::uuid;
update core.league_members set final_rank = 1 where league_id = :'lg'::uuid and user_id = :'u'::uuid;
select tests.login(:'u'::uuid);
select is(api.my_season() -> 'now' -> 'ladder' ->> 'position', '1', 'a closed month shows the final rank');
select tests.logout();

select tests.as_anon();
select throws_ok($$select api.my_season()$$, '42501', null, 'anon cannot ask');
select tests.logout();

select * from finish();
rollback;
