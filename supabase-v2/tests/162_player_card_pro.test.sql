-- api.get_player_pro: Pro gets the full report on any player's card; free gets counts only, never a result.
begin;
select plan(10);

select tests.create_user('pc-free@test.local') as free \gset
select tests.create_user('pc-pro@test.local') as pro \gset
select tests.mk_player('Ζήτα', 'Αναφοράς') as them \gset
select tests.mk_player('Ήτα', 'Δωρεάν') as me \gset
select tests.mk_player('Ιώτα', 'Συνδρομητής') as mepro \gset
select tests.mk_player('Θήτα', 'Τρίτος') as other \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'free'::uuid;
update core.profiles set claimed_player_id = :'mepro'::uuid where user_id = :'pro'::uuid;
insert into core.entitlements (user_id, key, source, status) values (:'pro'::uuid, 'pro', 'promo', 'active');
insert into core.tournaments (sport_id, name, surface) values ('tennis', 'Χωμάτινο Open', 'clay') returning id as t \gset

-- them beat the free viewer's player in three sets with a tie-break, on clay; them lost to a third player
select tests.mk_match(:'them'::uuid, :'me'::uuid, now() - interval '3 days') as m1 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m1'::uuid;
insert into core.match_results (match_id, winner_side, sets) values (:'m1'::uuid, 1, '[{"w":6,"l":4},{"w":3,"l":6},{"w":7,"l":6}]');
select tests.mk_match(:'them'::uuid, :'other'::uuid, now() - interval '2 days') as m2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m2'::uuid, 2, '[{"w":6,"l":2},{"w":6,"l":1}]');
-- and lost to the Pro viewer's player
select tests.mk_match(:'them'::uuid, :'mepro'::uuid, now() - interval '1 day') as m3 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m3'::uuid, 2, '[{"w":6,"l":3},{"w":6,"l":3}]');

select tests.login(:'free'::uuid);
select api.get_player_pro(:'them'::uuid) as f \gset
select tests.logout();
select is((:'f'::jsonb ->> 'pro')::boolean, false, 'free: not Pro');
select is((:'f'::jsonb -> 'teaser') - 'surfaces', '{"matches": 3, "meetings": 1, "deciding": 1, "tiebreaks": 1}'::jsonb, 'free: the counts');
select is(:'f'::jsonb -> 'teaser' -> 'surfaces', '[{"surface": "clay", "matches": 1}]'::jsonb, 'free: matches per surface, no result');
select ok(not (:'f'::jsonb ? 'player'), 'free: no report at all');
select ok(:'f'::text !~ '"(won|w|l|history|h2h|singles|sets)"', 'free: no win, loss, set or history anywhere');

select tests.login(:'pro'::uuid);
select api.get_player_pro(:'them'::uuid) as p \gset
select tests.logout();
select is((:'p'::jsonb ->> 'pro')::boolean, true, 'Pro: Pro');
select is((:'p'::jsonb -> 'player' -> 'h2h' ->> 'w')::int, 1, 'Pro: μεταξύ σας, from my side');
select is((:'p'::jsonb -> 'player' ->> 'history_count')::int, 3, 'Pro: every match');
select ok((:'p'::jsonb -> 'player') ? 'singles', 'Pro: the numbers');

update core.players set is_minor = true where id = :'them'::uuid;
select tests.login(:'pro'::uuid);
select throws_ok(format($$select api.get_player_pro(%L)$$, :'them'), 'P0002', 'player_not_found', 'never a minor');
select tests.logout();

select * from finish();
rollback;
