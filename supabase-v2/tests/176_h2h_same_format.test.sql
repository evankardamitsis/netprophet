-- 20270419000000_h2h_same_format: head to head counts the same kind of match. Before a singles match only singles
-- meetings count, before a doubles match only doubles (mixed with them); a card without a match counts singles.
begin;
select plan(8);

select tests.create_user('hf-u@test.local') as u \gset
select tests.mk_player('Εγώ', 'Ιδιοςτυπος') as me \gset
select tests.mk_player('Αντί', 'Βλασσος') as opp \gset
select tests.mk_player('Συν', 'Παρτενερ') as p \gset
select tests.mk_player('Αλλος', 'Ζευγος') as q \gset
select tests.mk_player('Κοινός', 'Μονος') as x \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;

-- doubles a month ago: me and p beat opp and q
insert into core.matches (sport_id, format, status, starts_at, source)
values ('tennis', 'doubles', 'scheduled', now() - interval '30 days', 'admin') returning id as d1 \gset
insert into core.match_participants (match_id, side, player_id, position) values
  (:'d1'::uuid, 1, :'me'::uuid, 1), (:'d1'::uuid, 1, :'p'::uuid, 2), (:'d1'::uuid, 2, :'opp'::uuid, 1), (:'d1'::uuid, 2, :'q'::uuid, 2);
insert into core.match_results (match_id, winner_side, sets) values (:'d1'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');
-- singles: opp beat x, I lost to x; x is a common opponent in singles only
select tests.mk_match(:'opp'::uuid, :'x'::uuid, now() - interval '9 days') as s1 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'s1'::uuid, 1, '[{"w":6,"l":2},{"w":6,"l":2}]');
select tests.mk_match(:'x'::uuid, :'me'::uuid, now() - interval '8 days') as s2 \gset
insert into core.match_results (match_id, winner_side, sets) values (:'s2'::uuid, 1, '[{"w":6,"l":2},{"w":6,"l":2}]');

-- tomorrow: singles against opp, and a doubles against opp and q
select tests.mk_match(:'me'::uuid, :'opp'::uuid) as next_s \gset
insert into core.matches (sport_id, format, status, starts_at, source)
values ('tennis', 'doubles', 'scheduled', now() + interval '2 days', 'admin') returning id as next_d \gset
insert into core.match_participants (match_id, side, player_id, position) values
  (:'next_d'::uuid, 1, :'me'::uuid, 1), (:'next_d'::uuid, 1, :'p'::uuid, 2), (:'next_d'::uuid, 2, :'opp'::uuid, 1), (:'next_d'::uuid, 2, :'q'::uuid, 2);

insert into core.entitlements (user_id, key, source, status) values (:'u'::uuid, 'pro', 'promo', 'active');
select tests.login(:'u'::uuid);

-- singles: the doubles win is not a singles meeting
select api.get_scout(:'next_s') -> 'opponents' -> 0 as o \gset
select is(:'o'::jsonb -> 'h2h' -> 'w', '0'::jsonb, 'before a singles match a doubles win is not counted');
select is(:'o'::jsonb -> 'h2h' -> 'l', '0'::jsonb, 'and nothing is lost either');
select is(jsonb_array_length(:'o'::jsonb -> 'h2h' -> 'meetings'), 0, 'no singles meeting listed');
select is(jsonb_array_length(:'o'::jsonb -> 'common'), 1, 'the singles common opponent is there');

-- doubles: the doubles win counts
select (select e from jsonb_array_elements(api.get_scout(:'next_d') -> 'opponents') e
         where e ->> 'id' = :'opp') as od \gset
select is(:'od'::jsonb -> 'h2h' -> 'w', '1'::jsonb, 'before a doubles match the doubles win counts');
select is(jsonb_array_length(:'od'::jsonb -> 'h2h' -> 'meetings'), 1, 'the doubles meeting is listed');
select is(jsonb_array_length(:'od'::jsonb -> 'common'), 0, 'a singles common opponent is not a doubles one');
select tests.logout();

-- a card without a match counts singles
select is(core.scout_player_json(:'opp'::uuid, :'me'::uuid, :'u'::uuid, 'tennis', null) -> 'h2h' -> 'w', '0'::jsonb,
          'a player card counts singles meetings');

select * from finish();
rollback;
