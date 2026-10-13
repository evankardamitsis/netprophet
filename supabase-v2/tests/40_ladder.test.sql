-- Κατάταξη: this month's points in two scopes, ranked like core (points, then first to reach them, then id).
begin;
select plan(14);

select tests.create_user('lad-u@test.local') as u \gset
select tests.create_user('lad-a@test.local') as a \gset
select tests.create_user('lad-b@test.local') as b \gset
select tests.create_user('lad-c@test.local') as c \gset
select tests.create_user('lad-d@test.local') as d \gset
select tests.create_user('lad-e@test.local') as e \gset

-- a and b have players the viewer follows (one of each relation)
select tests.mk_player('Άλφα', 'Πρώτος') as pa \gset
select tests.mk_player('Βήτα', 'Δεύτερος') as pb \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'pa'::uuid;
update core.players set claimed_by_user_id = :'b'::uuid where id = :'pb'::uuid;
update core.profiles set claimed_player_id = :'pa'::uuid where user_id = :'a'::uuid;
update core.profiles set claimed_player_id = :'pb'::uuid where user_id = :'b'::uuid;
insert into core.follows (user_id, player_id, relation) values (:'u'::uuid, :'pa'::uuid, 'known'), (:'u'::uuid, :'pb'::uuid, 'friend');

-- this month: c 80, a 50 (reached first), d 50, u 30; b nothing; e only last month
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key, created_at)
values (:'c'::uuid, 80, 'correct', 'match', gen_random_uuid(), core.month_key(), 'lad-c', now() - interval '3 hours'),
       (:'a'::uuid, 50, 'correct', 'match', gen_random_uuid(), core.month_key(), 'lad-a', now() - interval '2 hours'),
       (:'d'::uuid, 50, 'correct', 'match', gen_random_uuid(), core.month_key(), 'lad-d', now() - interval '1 hour'),
       (:'u'::uuid, 30, 'upset', 'match', gen_random_uuid(), core.month_key(), 'lad-u', now() - interval '1 hour'),
       (:'e'::uuid, 100, 'correct', 'match', gen_random_uuid(), core.month_key(now() - interval '40 days'), 'lad-e',
        now() - interval '40 days');

-- one vote waiting for a result (alone on it, so not an upset: +10), one open match left to vote on
select tests.mk_match_fresh() as m_voted \gset
select tests.mk_match_fresh() as m_open \gset
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'u'::uuid, 'match', :'m_voted'::uuid, 1, now(), core.athens_day());

select tests.as_anon();
select throws_ok($$select api.get_ladder('friends', 20)$$, '42501', null, 'anonymous callers cannot see the Κατάταξη');

select tests.login(:'u'::uuid);
select throws_ok($$select api.get_ladder('area', 20)$$, '22023', null, 'only league, friends and all');

-- friends: a 50, u 30, b 0
select is(jsonb_array_length(api.get_ladder('friends', 20) -> 'rows'), 3, 'friends: you and the people you follow');
select is((api.get_ladder('friends', 20) -> 'rows' -> 2 ->> 'user_id'), :'b', 'a friend with no points is still on the board');
select is((api.get_ladder('friends', 20) -> 'me' ->> 'position')::int, 2, 'your position among friends');
select is((api.get_ladder('friends', 20) -> 'me' ->> 'to_next')::int, 21, 'to pass the row above: the gap plus one');
select is((api.get_ladder('friends', 20) -> 'me' -> 'above' ->> 'surname'), 'Πρώτος', 'the name above comes from their player');

-- all: c 80, a 50, d 50, u 30
select is((api.get_ladder('all', 20) -> 'me' ->> 'position')::int, 4, 'your position in all of Attica');
select ok(not exists(select 1 from jsonb_array_elements(api.get_ladder('all', 20) -> 'rows') r
                      where r ->> 'user_id' in (:'b', :'e')), 'all: nobody without points this month');
select is((api.get_ladder('all', 20) -> 'rows' -> 1 ->> 'user_id'), :'a', 'a tie goes to whoever reached the points first');
select is((select jsonb_agg(r ->> 'position') from jsonb_array_elements(api.get_ladder('all', 2) -> 'rows') r),
          '["1", "2", "4"]'::jsonb, 'the top rows, then your own row with its real position');

select is((api.get_ladder('all', 20) ->> 'pending')::int, 10, 'points still in the air on your waiting vote');
select ok((api.get_ladder('all', 20) ->> 'open_votes')::int >= 1, 'open matches you have not voted on');
select ok((api.get_ladder('all', 20) ->> 'days_left')::int between 1 and 31, 'days until the month ends');

select * from finish();
rollback;
