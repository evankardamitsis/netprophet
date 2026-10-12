-- Pro «Πού κερδίζεις, πού χάνεις»: splits of your results, Pro only.
begin;
select plan(8);

select tests.create_user('wl-u@test.local') as u \gset
select tests.create_user('wl-v@test.local') as v \gset
select tests.mk_player('Εγώ', 'Μετρώ') as me \gset
select tests.mk_player('Αρι', 'Στερός') as lefty \gset
select tests.mk_player('Δε', 'Ξιός') as righty \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
insert into core.player_sports (player_id, sport_id, hand) values (:'lefty'::uuid, 'tennis', 'L')
  on conflict (player_id, sport_id) do update set hand = 'L';

-- a morning loss to the lefty after winning the first set, in three sets
select tests.mk_match(:'me'::uuid, :'lefty'::uuid,
       ((core.athens_day() - 3)::timestamp + time '10:00') at time zone 'Europe/Athens') as m1 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m1'::uuid, 2, '[{"w":4,"l":6},{"w":6,"l":3},{"w":6,"l":4}]');
-- an evening win over the righty with a tie-break
select tests.mk_match(:'me'::uuid, :'righty'::uuid,
       ((core.athens_day() - 2)::timestamp + time '20:00') at time zone 'Europe/Athens') as m2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'m2'::uuid, 1, '[{"w":7,"l":6},{"w":6,"l":2}]');

select tests.login(:'u'::uuid);
select throws_ok($$select api.get_win_loss()$$, '42501', 'pro_required', 'Πού κερδίζεις is Pro');

select tests.logout();
insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active'),
                                                                     (:'v'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);
select is(api.get_win_loss() -> 'total', '{"w": 1, "l": 1}'::jsonb, 'all your results');
select is((select r ->> 'w' || '-' || (r ->> 'l') from jsonb_array_elements(api.get_win_loss() -> 'rows') r where r ->> 'key' = 'morning'),
          '0-1', 'mornings (Athens time)');
select is((select r ->> 'w' || '-' || (r ->> 'l') from jsonb_array_elements(api.get_win_loss() -> 'rows') r where r ->> 'key' = 'evening'),
          '1-0', 'evenings');
select is((select r ->> 'w' || '-' || (r ->> 'l') from jsonb_array_elements(api.get_win_loss() -> 'rows') r where r ->> 'key' = 'tiebreaks'),
          '1-0', 'tie-break sets');
select is((select r ->> 'w' || '-' || (r ->> 'l') from jsonb_array_elements(api.get_win_loss() -> 'rows') r where r ->> 'key' = 'lefties'),
          '0-1', 'against left-handers');
select ok(not exists (select 1 from jsonb_array_elements(api.get_win_loss() -> 'rows') r where r ->> 'key' = 'lost_first'),
          'a split with no matches is left out');

select tests.login(:'v'::uuid);
select is(api.get_win_loss() -> 'rows', '[]'::jsonb, 'no player, no splits');

select * from finish();
rollback;
