-- 20270314000000_player_card_traits_open: «Πώς παίζει» is open to everyone signed in (no shared match needed), one
-- vote per person per phrase per player, never on your own player, minors or hidden players, a daily cap; and the
-- profile's «Τελευταία ματς» carries the games, the tournament and the round, without matches waiting for staff.
begin;
select plan(16);

select tests.create_user('to-a@test.local') as a \gset
select tests.create_user('to-n@test.local') as n \gset
select tests.mk_player('Άλφα', 'Ανοιχτός') as pa \gset
select tests.mk_player('Βήτα', 'Ψηφιστός') as pb \gset
select tests.mk_player('Γάμμα', 'Αντίπαλος') as pc \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'pa'::uuid;
select id as fair from core.trait_defs where label_en = 'Fair play' \gset

-- n has no player at all and never played anyone: still votes
select tests.login(:'n'::uuid);
select is((api.get_traits(:'pb'::uuid) ->> 'can_vote')::boolean, true, 'an account without a player can vote');
select is((select (t ->> 'count')::int from jsonb_array_elements(api.vote_trait(:'pb'::uuid, :'fair'::uuid, true) -> 'traits') t
            where t.value ->> 'id' = :'fair'), 1, 'a tap counts');
select is((select (t ->> 'count')::int from jsonb_array_elements(api.vote_trait(:'pb'::uuid, :'fair'::uuid, true) -> 'traits') t
            where t.value ->> 'id' = :'fair'), 1, 'a second tap on the same phrase is still one vote');
select is((select count(*)::int from core.trait_votes where voter_user_id = :'n'::uuid), 1, 'one row per person, phrase and player');
-- with no votes left the phrase may fall out of the top eight (ties order by id), so count the rows
select api.vote_trait(:'pb'::uuid, :'fair'::uuid, false) is not null as untapped \gset
select is((select count(*)::int from core.trait_votes where voter_user_id = :'n'::uuid and player_id = :'pb'::uuid), 0,
          'tap again to take it back');
select is((select count(*)::int from jsonb_array_elements(api.suggest_trait(:'pb'::uuid, 'Ανοιχτό παιχνίδι') -> 'traits') t
            where (t ->> 'pending')::boolean), 1, 'adding your own phrase is open too, and waits for staff');
select tests.logout();

-- never on your own player
select tests.login(:'a'::uuid);
select is((api.get_traits(:'pa'::uuid) ->> 'can_vote')::boolean, false, 'not on your own player');
select throws_ok(format($$select api.vote_trait(%L, %L)$$, :'pa', :'fair'), '42501', 'not_allowed', 'a self-vote is refused');
select throws_ok(format($$select api.suggest_trait(%L, 'Ο καλύτερος')$$, :'pa'), '42501', 'not_allowed', 'and so is a phrase about yourself');
select tests.logout();

-- hidden and minors: never
update core.players set hidden = true where id = :'pc'::uuid;
select tests.login(:'n'::uuid);
select throws_ok(format($$select api.vote_trait(%L, %L)$$, :'pc', :'fair'), '42501', 'not_allowed', 'never on a hidden player');
select tests.logout();
update core.players set hidden = false, is_minor = true where id = :'pc'::uuid;
select tests.login(:'n'::uuid);
select throws_ok(format($$select api.vote_trait(%L, %L)$$, :'pc', :'fair'), '42501', 'not_allowed', 'never on a minor');
select tests.logout();
update core.players set is_minor = false where id = :'pc'::uuid;

-- the daily cap: 100 taps put on in a day
insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id, created_at)
select :'n'::uuid, tests.mk_player('Πολλοί', 'Π' || g::text), 'tennis', :'fair'::uuid, now() - interval '1 hour'
  from generate_series(1, 100) g;
select tests.login(:'n'::uuid);
select throws_ok(format($$select api.vote_trait(%L, %L)$$, :'pc', :'fair'), '54000', 'rate_limited', 'the 101st tap in a day waits');
select tests.logout();
update core.trait_votes set created_at = now() - interval '2 days' where voter_user_id = :'n'::uuid;
select tests.login(:'n'::uuid);
select lives_ok(format($$select api.vote_trait(%L, %L)$$, :'pc', :'fair'), 'a day later it counts again');
select tests.logout();

-- «Τελευταία ματς»: games, tournament and round; a match waiting for staff stays out
insert into core.tournaments (sport_id, name) values ('tennis', 'Open Δοκιμής') returning id as tour \gset
select tests.mk_match(:'pb'::uuid, :'pc'::uuid, now() - interval '3 days') as m1 \gset
update core.matches set tournament_id = :'tour'::uuid, round = 'QF' where id = :'m1'::uuid;
select tests.finish_match(:'m1'::uuid, 2);
select tests.mk_match(:'pb'::uuid, :'pc'::uuid, now() - interval '1 day') as m2 \gset
select tests.finish_match(:'m2'::uuid, 1);
update core.matches set review = 'pending' where id = :'m2'::uuid;

select tests.login(:'n'::uuid);
select is(jsonb_array_length(api.get_player(:'pb'::uuid) -> 'last_matches'), 1, 'a match waiting for staff is not on the card');
select is((api.get_player(:'pb'::uuid) -> 'last_matches' -> 0) - 'match_id' - 'starts_at' - 'partner' - 'opponents' - 'level' - 'discipline',
          jsonb_build_object('format', 'singles', 'won', false, 'score', '2-0', 'sets', '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb,
                             'tournament', 'Open Δοκιμής', 'round', 'QF', 'retired', false, 'walkover', false),
          'the row has the games (winner first), the tournament and the round');
select is(api.get_player(:'pb'::uuid) -> 'record_year', '{"w": 0, "l": 1}'::jsonb, 'and the record agrees');
select tests.logout();

select * from finish();
rollback;
