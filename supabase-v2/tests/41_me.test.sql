-- Εγώ: this year's record split singles/doubles, your votes, what is in the air, your friends.
begin;
select plan(11);

select tests.create_user('me-u@test.local') as u \gset
select tests.create_user('me-v@test.local') as v \gset

select tests.mk_player('Εγώ', 'Ίδιος') as me \gset
select tests.mk_player('Αντί', 'Πάλος') as o1 \gset
select tests.mk_player('Συν', 'Παίκτης') as p2 \gset
select tests.mk_player('Αντί', 'Ένα') as o2 \gset
select tests.mk_player('Αντί', 'Δύο') as o3 \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;

-- yesterday: a singles win and a doubles loss
select tests.mk_match(:'me'::uuid, :'o1'::uuid) as m_s \gset
update core.matches set starts_at = now() - interval '1 day' where id = :'m_s'::uuid;
insert into core.matches (sport_id, format, status, starts_at, source)
values ('tennis', 'doubles', 'scheduled', now() - interval '1 day', 'admin') returning id as m_d \gset
insert into core.match_participants (match_id, side, player_id, position)
values (:'m_d'::uuid, 1, :'me'::uuid, 1), (:'m_d'::uuid, 1, :'p2'::uuid, 2),
       (:'m_d'::uuid, 2, :'o2'::uuid, 1), (:'m_d'::uuid, 2, :'o3'::uuid, 2);
select tests.finish_match(:'m_s'::uuid, 1) is not null as x \gset
select tests.finish_match(:'m_d'::uuid, 2) is not null as x \gset

-- votes: one right, one wrong, one waiting (alone on it: +10), one open match left
select tests.play(:'u'::uuid, true) is not null as x \gset
select tests.play(:'u'::uuid, false) is not null as x \gset
select tests.mk_match_fresh() as m_wait \gset
select tests.mk_match_fresh() as m_open \gset
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'u'::uuid, 'match', :'m_wait'::uuid, 1, now(), core.athens_day());

-- friends: o1 first, p2 later
insert into core.follows (user_id, player_id, relation, created_at)
values (:'u'::uuid, :'o1'::uuid, 'known', now() - interval '2 days'), (:'u'::uuid, :'p2'::uuid, 'friend', now() - interval '1 day');

select tests.as_anon();
select throws_ok($$select api.get_me_page()$$, '42501', null, 'anonymous callers have no Εγώ');

select tests.login(:'u'::uuid);
select is(api.get_me_page() -> 'record_year' -> 'singles', '{"w": 1, "l": 0}'::jsonb, 'this year in singles');
select is(api.get_me_page() -> 'record_year' -> 'doubles', '{"w": 0, "l": 1}'::jsonb, 'this year in doubles');
select is((api.get_me_page() ->> 'matches')::int, 2, 'results of your player');
select is((api.get_me_page() -> 'votes' ->> 'resolved')::int, 2, 'resolved votes');
select is((api.get_me_page() -> 'votes' ->> 'correct')::int, 1, 'correct votes');
select is((api.get_me_page() -> 'votes' ->> 'waiting')::int, 1, 'votes waiting for a result');
select is((api.get_me_page() -> 'votes' ->> 'pending_points')::int, 10, 'what the waiting vote pays');
select ok((api.get_me_page() -> 'votes' ->> 'open')::int >= 1, 'open matches you have not voted on');
select is((api.get_me_page() -> 'friends' -> 'first' -> 0 ->> 'id'), :'p2', 'friends, newest first');

select tests.login(:'v'::uuid);
select is(api.get_me_page() -> 'record_year', 'null'::jsonb, 'no player, no record');

select * from finish();
rollback;
