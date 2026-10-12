-- Παίκτες: the list (friends first, then today's players, never yourself), search and a player's profile.
begin;
select plan(13);

select tests.create_user('pl-u@test.local') as u \gset

-- followed, not playing today
select tests.mk_player('Φίλος', 'Πρώτου') as f \gset
-- plays today
select tests.mk_player('Σήμερα', 'Παίζει') as t1 \gset
-- the viewer's own player, also plays today
select tests.mk_player('Εγώ', 'Ίδιος') as me \gset
select tests.mk_player('Κρυφός', 'Παίκτης') as hid \gset
select tests.mk_player('Αντίπαλος', 'Ένας') as o1 \gset
select tests.mk_player('Αντίπαλος', 'Δύο') as o2 \gset
update core.players set hidden = true where id = :'hid'::uuid;
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;

-- today's match (noon, Athens day), one played two days ago (f wins), one yesterday (f loses), one tomorrow
select tests.mk_match(:'t1'::uuid, :'me'::uuid,
       (core.athens_day()::timestamp + time '12:00') at time zone 'Europe/Athens') as m_today \gset
select tests.mk_match(:'f'::uuid, :'o1'::uuid, now() + interval '1 day') as m_old \gset
select tests.mk_match(:'f'::uuid, :'o2'::uuid, now() + interval '1 day') as m_new \gset
select tests.mk_match(:'f'::uuid, :'o1'::uuid, now() + interval '1 day') as m_next \gset
update core.matches set starts_at = now() - interval '2 days' where id = :'m_old'::uuid;
update core.matches set starts_at = now() - interval '1 day' where id = :'m_new'::uuid;
select tests.finish_match(:'m_old'::uuid, 1) is not null as x \gset
select tests.finish_match(:'m_new'::uuid, 2) is not null as x \gset

select tests.as_anon();
select throws_ok($$select api.get_players_home(60)$$, '42501', null, 'anonymous callers cannot list players');

select tests.login(:'u'::uuid);
select api.follow_player(:'f'::uuid, 'friend', 'profile')::text as x \gset

select is((api.get_players_home(60) -> 'players' -> 0 ->> 'id'), :'f', 'a friend who does not play today comes first');
select ok(exists(select 1 from jsonb_array_elements(api.get_players_home(60) -> 'players') e where e ->> 'id' = :'t1'),
          'then the players of today');
select ok(not exists(select 1 from jsonb_array_elements(api.get_players_home(60) -> 'players') e where e ->> 'id' = :'me'),
          'never the viewer''s own player');
select is((api.get_players_home(60) -> 'players' -> 0 ->> 'is_followed')::boolean, true, 'the friend is marked followed');
select is((api.get_players_home(60) -> 'players' -> 0 -> 'form'), '["W", "L"]'::jsonb, 'form is oldest first');
select ok((api.get_players_home(60) ->> 'total_players')::int >= 5, 'with the size of the roster');

select is((api.get_player(:'f'::uuid) -> 'record_year'), '{"w": 1, "l": 1}'::jsonb, 'this year''s record');
select is((api.get_player(:'f'::uuid) -> 'last_matches' -> 0 ->> 'won')::boolean, false, 'last matches, newest first');
select is((api.get_player(:'f'::uuid) -> 'next_match' ->> 'match_id'), :'m_next', 'the next match to play');
select is((api.get_player(:'me'::uuid) ->> 'is_me')::boolean, true, 'your own player is marked as you');
select throws_ok(format($$select api.get_player(%L)$$, :'hid'), 'P0002', null, 'a hidden player has no profile');
select is((api.find_players('πρωτου', 10) -> 0 ->> 'id'), :'f', 'search finds a player without accents');

select * from finish();
rollback;
