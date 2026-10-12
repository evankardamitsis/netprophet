-- Minors: a birth year under 18 hides a player from votes, the feed, results, lists and profiles. Roster tools: staff
-- find anyone, fix the details, release a claim.
begin;
select plan(13);

select tests.create_user('rm-adm@test.local', 'admin') as adm \gset
select tests.create_user('rm-u@test.local') as u \gset
select tests.create_user('rm-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Μικρός', 'Παίκτης') as kid \gset
select tests.mk_player('Μεγάλος', 'Παίκτης') as adult \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set birth_year = extract(year from core.athens_day())::int - 12 where id = :'kid'::uuid;
update core.players set birth_year = extract(year from core.athens_day())::int - 30 where id = :'adult'::uuid;
select is((select string_agg(is_minor::text, ',' order by surname, first_name) from core.players where id in (:'kid'::uuid, :'adult'::uuid)),
          'false,true', 'a birth year under 18 makes a minor, over 18 not');

select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 1, :'kid')::jsonb) ->> 'match_id' as m1 \gset

select tests.login(:'v'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'m1'), 'a match with a minor is not in the feed');
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'m1'), '55000', null, 'and takes no votes');
select ok(not exists (select 1 from jsonb_array_elements(api.find_players('Παίκτης', 20)) p where p ->> 'id' = :'kid'), 'search leaves minors out');
select ok(exists (select 1 from jsonb_array_elements(api.find_players('Παίκτης', 20)) p where p ->> 'id' = :'adult'), 'but not adults');
select throws_ok(format($$select api.get_player(%L)$$, :'kid'), 'P0002', null, 'no profile page for a minor');
select is((select count(*)::int from api.players where id = :'kid'::uuid), 0, 'nor a row in the roster view');

select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m1')::jsonb) is not null as x \gset
select tests.login(:'v'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'nor in Αποτελέσματα');

-- roster tools
select throws_ok($$select api.admin_players('Παίκτης')$$, '42501', null, 'only staff');
select tests.login(:'adm'::uuid);
select is((select p ->> 'player_id' from jsonb_array_elements(api.admin_players(null, 'minors')) p where p ->> 'player_id' = :'kid'), :'kid', 'staff can find minors');
select is((api.admin_update_player(:'adult'::uuid, '{"first_name": "Μεγάλη", "gender": "f", "hidden": true}') ->> 'hidden')::boolean, true, 'fix the details and hide');
select is((api.admin_unclaim(:'me'::uuid) ->> 'claimed')::boolean, false, 'release a claim');
select tests.logout();
select is((select claimed_player_id from core.profiles where user_id = :'u'::uuid), null, 'and the account lets go of the player');

select * from finish();
rollback;
