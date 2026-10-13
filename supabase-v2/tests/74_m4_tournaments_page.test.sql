-- M4 part 3b: the Tournaments page. On, coming and recent tournaments with their draws and schedule by day;
-- «Το πρόγραμμά σου» only with Pro; minors and hidden players never show (matches left out, draw names masked).
begin;
select plan(11);

select tests.create_user('tp-u@test.local') as u \gset
select tests.mk_player('Τάκης', 'Τουρνουάς') as me \gset
select tests.mk_player('Νίκος', 'Αντίπαλος') as opp \gset
select tests.mk_player('Μικρός', 'Ανήλικος') as kid \gset
update core.players set is_minor = true where id = :'kid'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;

insert into core.tournaments (sport_id, name, source, venue, starts_on, ends_on)
values ('tennis', 'Τεστ Open', 'import', 'Κηφισιά', current_date - 2, current_date + 5) returning id as t \gset
insert into core.tournaments (sport_id, name, source, starts_on, ends_on)
values ('tennis', 'Παλιό Open', 'import', current_date - 60, current_date - 40) returning id as old \gset
select tests.mk_match(:'me'::uuid, :'opp'::uuid, now() + interval '1 day') as m1 \gset
select tests.mk_match(:'kid'::uuid, :'opp'::uuid, now() + interval '1 day') as m2 \gset
select tests.mk_match(:'opp'::uuid, :'me'::uuid, now() - interval '50 days') as m3 \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'m1'::uuid, :'m2'::uuid);
update core.matches set tournament_id = :'old'::uuid where id = :'m3'::uuid;
insert into core.tournament_draws (tournament_id, tab, discipline, level, format, size, draw)
values (:'t'::uuid, 'Μ 40+', 'MS', '40+', 'knockout', 2, jsonb_build_object(
  'entrants', jsonb_build_array(
    jsonb_build_object('pos', 1, 'raw', 'ΤΟΥΡΝΟΥΑΣ ΤΑΚΗΣ', 'players', jsonb_build_array(jsonb_build_object('raw', 'ΤΟΥΡΝΟΥΑΣ ΤΑΚΗΣ', 'player_id', :'me'::uuid))),
    jsonb_build_object('pos', 2, 'raw', 'ΑΝΗΛΙΚΟΣ ΜΙΚΡΟΣ', 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΝΗΛΙΚΟΣ ΜΙΚΡΟΣ', 'player_id', :'kid'::uuid)))),
  'rounds', '[]'::jsonb));

select tests.login(:'u'::uuid);
select api.get_tournaments() as list \gset
select api.get_tournament(:'t'::uuid) as one \gset
select tests.logout();

select is((select count(*)::int from jsonb_array_elements(:'list'::jsonb -> 'items') i where i ->> 'id' in (:'t', :'old')), 1,
          'the long finished tournament is not listed');
select is((select i ->> 'state' from jsonb_array_elements(:'list'::jsonb -> 'items') i where i ->> 'id' = :'t'), 'ongoing', 'on now');
select is((select (i ->> 'in_it')::boolean from jsonb_array_elements(:'list'::jsonb -> 'items') i where i ->> 'id' = :'t'), true, 'I am in it');
select is(:'list'::jsonb -> 'mine', 'null'::jsonb, 'free: no «Το πρόγραμμά σου»');
select is(jsonb_array_length(:'one'::jsonb -> 'draws'), 1, 'the draw');
select is(:'one'::jsonb -> 'masked', '["ΑΝΗΛΙΚΟΣ ΜΙΚΡΟΣ"]'::jsonb, 'a minor''s name is masked');
select is((select count(*)::int from jsonb_array_elements(:'one'::jsonb -> 'days') d, jsonb_array_elements(d -> 'matches')), 1,
          'the minor''s match is left out of the schedule');
select is(:'one'::jsonb ->> 'me', :'me', 'the page knows which player is me');

insert into core.entitlements (user_id, source, status) values (:'u'::uuid, 'gift', 'active');
select tests.login(:'u'::uuid);
select api.get_tournaments() as pro \gset
select tests.logout();
select is(jsonb_array_length(:'pro'::jsonb -> 'mine'), 1, 'Pro: my next tournament match');
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Χωρίς τέλος', 'import', current_date - 90) returning id as noend \gset
select is(core.tournament_state((select t from core.tournaments t where id = :'noend'::uuid)), 'done', 'no end date: done two weeks after it started');
select throws_ok($$select api.get_tournament(gen_random_uuid())$$, '28000', null, 'signed in only');

select * from finish();
rollback;
