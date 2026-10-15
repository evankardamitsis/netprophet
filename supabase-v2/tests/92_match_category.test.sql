-- The category on the players' matches: the event («Μ 40+») and the discipline on the feed's match cards, the
-- results and a player's last and next matches; a match outside any event has none.
begin;
select plan(7);

select tests.create_user('cat-u@test.local') as u \gset
select tests.mk_player('Κατη', 'Γορίας', 'm') as a \gset
select tests.mk_player('Ομά', 'Δας', 'm') as b \gset
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Category Open', 'import', current_date - 3) returning id as t \gset
insert into core.tournament_events (tournament_id, name, format) values (:'t'::uuid, 'Μ 40+', 'singles') returning id as e \gset

select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '1 day') as done \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '1 day') as next \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '2 days') as plain \gset
update core.matches set tournament_id = :'t'::uuid, event_id = :'e'::uuid,
       provenance = coalesce(provenance, '{}'::jsonb) || '{"discipline": "MS"}'
 where id in (:'done', :'next');
select tests.finish_match(:'done'::uuid, 1);

select tests.login(:'u'::uuid);
select is((select c ->> 'level' from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' = :'next'),
          'Μ 40+', 'a feed card names the category');
select is((select c ->> 'discipline' from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' = :'next'),
          'MS', 'and the discipline');
select is((select c -> 'level' from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' = :'plain'),
          'null'::jsonb, 'a match outside any event has none');
select is((select c ->> 'level' from jsonb_array_elements(api.get_results()) c where c ->> 'match_id' = :'done'),
          'Μ 40+', 'a result names the category');
select is((select c ->> 'discipline' from jsonb_array_elements(api.get_results()) c where c ->> 'match_id' = :'done'),
          'MS', 'and the discipline');
select is((select c ->> 'level' from jsonb_array_elements(api.get_player(:'a'::uuid) -> 'last_matches') c
            where c ->> 'match_id' = :'done'), 'Μ 40+', 'a player''s last matches name it');
select is(api.get_player(:'a'::uuid) -> 'next_match' ->> 'level', 'Μ 40+', 'and the next match');

select * from finish();
rollback;
