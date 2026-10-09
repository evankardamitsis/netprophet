-- claim flow, Greek/Greeklish player search, get_me, get_feed, follows, storage policies.
begin;
select plan(33);

select tests.create_user('cf-a@test.local', 'user', 'Alpha User') as a \gset
select tests.create_user('cf-b@test.local', 'user', 'Beta User') as b \gset

-- players for search and claim
insert into core.players (id, first_name, surname, gender, area_id) values
 ('11000000-0000-0000-0000-000000000001', 'Χρήστος', 'Παπαδάκης', 'm', 'glyfada'),
 ('11000000-0000-0000-0000-000000000002', 'Χρύσα', 'Παπαδάκη', 'f', 'glyfada'),
 ('11000000-0000-0000-0000-000000000003', 'Νίκος', 'Σπυρόπουλος', 'm', 'athens'),
 ('11000000-0000-0000-0000-000000000004', 'Κρυφός', 'Παπαδάκης', 'm', 'athens');
update core.players set hidden = true where id = '11000000-0000-0000-0000-000000000004';

select tests.login(:'a'::uuid);

-- find_matching_players (ported claim lookup): surname first, Greeklish aware, skips hidden
select is((select id from api.find_matching_players('Christos', 'Papadakis') order by match_score desc limit 1),
          '11000000-0000-0000-0000-000000000001'::uuid, 'Greeklish lookup finds the Greek player; exact surname and first name ranks first');
select is((select count(*)::int from api.find_matching_players('', 'ΠΑΠΑΔΆΚΗΣ')), 2, 'first name is optional, capitals/accents do not matter, close surname forms count, hidden players are skipped');
select is((select count(*)::int from api.find_matching_players('Christos', 'Zzzzz')), 0, 'unknown surname: nothing');

-- search_players
select is((select count(*)::int from api.search_players('papadak')), 2, 'search by prefix, Greeklish');
select is((select count(*)::int from api.search_players('Σπυρόπουλος Νίκος')), 1, 'search by both names, any order');
select is((select count(*)::int from api.search_players('kryfos')), 0, 'hidden players are not searchable');

-- claim
select throws_ok($$select api.claim_player('11000000-0000-0000-0000-000000000004')$$, 'P0002', null, 'a hidden player cannot be claimed');
select throws_ok($$select api.claim_player(gen_random_uuid())$$, 'P0002', null, 'unknown player');
select is((api.claim_player('11000000-0000-0000-0000-000000000001') ->> 'replayed')::boolean, false, 'claim works');
select is((select claimed_player_id from core.profiles where user_id = auth.uid()), '11000000-0000-0000-0000-000000000001'::uuid, 'profile points at the player (sync trigger)');
select is((select claim_status from core.profiles where user_id = auth.uid()), 'claimed', 'claim_status = claimed');
select is((api.claim_player('11000000-0000-0000-0000-000000000001') ->> 'replayed')::boolean, true, 'claiming the same player again is a replay');
select throws_ok($$select api.claim_player('11000000-0000-0000-0000-000000000003')$$, '23505', null, 'one account cannot claim two players');
select tests.login(:'b'::uuid);
select throws_ok($$select api.claim_player('11000000-0000-0000-0000-000000000001')$$, '23505', null, 'a claimed player cannot be claimed by someone else');
select is((select count(*)::int from api.find_matching_players('Christos', 'Papadakis') where id = '11000000-0000-0000-0000-000000000001'), 0, 'claimed players leave the claim lookup');

-- follows
select lives_ok($$select api.follow_player('11000000-0000-0000-0000-000000000003', 'friend', 'card')$$, 'follow a player');
select lives_ok($$select api.follow_player('11000000-0000-0000-0000-000000000003', 'known', 'card')$$, 'following again keeps the stronger relation');
select is((select relation from api.my_follows where player_id = '11000000-0000-0000-0000-000000000003'), 'friend', 'friend is not downgraded to known');
select is((select is_followed from api.search_players('spiropulos') limit 1), true, 'search shows who you follow');

-- get_me
select tests.login(:'a'::uuid);
select is(api.get_me() -> 'player' ->> 'surname', 'Παπαδάκης', 'get_me returns the claimed player');
select is((api.get_me() -> 'game' ->> 'streak')::int, 0, 'get_me: σερί 0 for a new player');
select is((api.get_me() -> 'game' -> 'freezes' ->> 'max')::int, 2, 'get_me: freeze cap comes from the sport rules');
select is((api.get_me() ->> 'pro')::boolean, false, 'get_me: not Pro');
select is(api.get_me() -> 'player' -> 'level_value', 'null'::jsonb, 'get_me: level numbers are hidden for free users');
select tests.logout();
insert into core.player_sports (player_id, sport_id, level_value, level_tier) values ('11000000-0000-0000-0000-000000000001', 'tennis', 4.5, 5);
insert into core.entitlements (user_id, source, status) values (:'a'::uuid, 'promo', 'active');
select tests.login(:'a'::uuid);
select is((api.get_me() -> 'player' ->> 'level_value')::numeric, 4.5, 'get_me: Pro users see the level number');
select tests.logout();
select tests.as_anon();
select throws_ok($$select api.get_me()$$, '42501', null, 'anon cannot call get_me');
select tests.logout();

-- get_feed: results first, then open matches (unvoted, circle first), sponsored card after every 4th card
select tests.create_user('cf-c@test.local') as c \gset
select tests.mk_player('F', 'Circle') as pc \gset
select tests.mk_match(:'pc'::uuid, tests.mk_player('F', 'Other1'), now() + interval '9 days') as mc \gset
select tests.mk_match_fresh(now() + interval '1 day') as m1 \gset
select tests.mk_match_fresh(now() + interval '2 day') as m2 \gset
select tests.mk_match_fresh(now() + interval '3 day') as m3 \gset
select tests.mk_match_fresh(now() + interval '4 day') as m4 \gset
select tests.mk_match_fresh(now() + interval '6 day') as m5 \gset
insert into core.follows (user_id, player_id) values (:'c'::uuid, :'pc'::uuid);
-- keep the feed deterministic: take the seed matches out of play
update core.matches set status = 'void' where source_ref like 'seed-m%';
insert into core.sponsored_cards (sponsor, title, placement, status) values ('Test Sponsor', 'Test ad', 'feed', 'active');
update core.sponsored_cards set status = 'paused' where sponsor <> 'Test Sponsor';
select tests.login(:'c'::uuid);
select api.cast_vote(:'m2'::uuid, 1) is not null as voted \gset
select api.get_feed(6) as feed \gset
select is((:'feed'::jsonb -> 'items' -> 0 ->> 'match_id')::uuid, :'mc'::uuid, 'feed: the match with someone you follow comes first');
select is((:'feed'::jsonb -> 'items' -> 4 ->> 'kind'), 'sponsored', 'feed: a labelled sponsored card follows every 4 cards');
select is((:'feed'::jsonb -> 'items' -> 4 ->> 'label'), 'Χορηγούμενο', 'feed: the ad carries the Χορηγούμενο label');
select is((select count(*)::int from jsonb_array_elements(:'feed'::jsonb -> 'items') e where e ->> 'kind' = 'match' and e ->> 'match_id' = :'m2'), 1, 'feed: matches you voted on are still listed');
select is((:'feed'::jsonb -> 'items' -> 6 ->> 'match_id'), :'m2', 'feed: voted matches sink below the unvoted ones');
select is((:'feed'::jsonb -> 'items' -> 6 -> 'split' ->> 'total')::int, 1, 'feed: the split is only on matches you voted on');
select is((:'feed'::jsonb -> 'items' -> 0 -> 'split'), 'null'::jsonb, 'feed: no split on an unvoted match');

select * from finish();
rollback;
