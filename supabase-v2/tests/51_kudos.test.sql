-- Kudos and reactions: thank the other side or someone you follow, react to a result, see what you were told.
begin;
select plan(20);

select tests.create_user('kd-u@test.local') as u \gset
select tests.create_user('kd-w@test.local') as w \gset
select tests.create_user('kd-s@test.local') as s \gset
select tests.create_user('kd-z@test.local') as z \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
select tests.mk_player('Μικ', 'Ρος') as kid \gset
update core.players set is_minor = true where id = :'kid'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set claimed_by_user_id = :'w'::uuid where id = :'o'::uuid;

select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day(), :'o')::jsonb) ->> 'match_id' as m1 \gset

-- «Πες μια καλή κουβέντα»
select is(jsonb_array_length(api.kudos_options(:'m1'::uuid)), 5, 'five lines to pick from');
select ok(not exists (select 1 from jsonb_array_elements(api.kudos_options(:'m1'::uuid)) x
                        join core.kudos_options k on k.key = x ->> 'key' where k.doubles_only),
          'no doubles-only lines in singles');
select is((api.give_kudo(:'m1'::uuid, 'strong_serve') ->> 'given')::int, 1, 'the logger thanks the other side');
select is((api.give_kudo(:'m1'::uuid, 'strong_serve') ->> 'given')::int, 0, 'once is enough');
select throws_ok(format($$select api.give_kudo(%L, 'nope')$$, :'m1'), '22023', 'bad_kudo', 'only lines from the pool');
select tests.logout();
select ok(exists (select 1 from core.notifications where user_id = :'w'::uuid and type = 'kudos'), 'the opponent hears about it');

-- a spectator thanks someone they follow
select tests.login(:'s'::uuid);
select throws_ok(format($$select api.give_kudo(%L, 'quick_feet', %L)$$, :'m1', :'o'), '42501', 'nobody_to_thank', 'not without following them');
select is((select r -> 'kudo_to' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'null'::jsonb,
          'and no «Πες κάτι» either');
select api.follow_player(:'o'::uuid);
select is((select r -> 'kudo_to' ->> 'player_id' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), :'o',
          '«Πες κάτι στον …» for a player they follow');
select is((api.give_kudo(:'m1'::uuid, 'quick_feet', :'o'::uuid) ->> 'given')::int, 1, 'a follower can thank them');
select is((select r -> 'kudo_to' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'null'::jsonb,
          'and the prompt goes away');

-- reactions: the pair for a player-logged match is Μπράβο / Ρεβάνς
select is((select r -> 'reactions' -> 'options' -> 0 ->> 'label' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'),
          'Μπράβο', 'a logged match gets Μπράβο / Ρεβάνς');
select is((api.react(:'m1'::uuid, 'bravo') -> 'counts' ->> 'bravo')::int, 1, 'a reaction counts');
select throws_ok(format($$select api.react(%L, 'stroll')$$, :'m1'), '22023', 'bad_reaction', 'only the two on the card');
select is((api.react(:'m1'::uuid, 'rematch') -> 'counts'), '{"rematch": 1}'::jsonb, 'another pick replaces it');
select is((api.react(:'m1'::uuid, null) -> 'counts'), '{}'::jsonb, 'and it can be taken back');

-- «Τι λένε για σένα»
select tests.login(:'w'::uuid);
select is((select sum((x ->> 'n')::int)::int from jsonb_array_elements(api.get_my_kudos()) x), 2, 'the opponent sees both kudos');

-- minors get none
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-1"}}',
                            core.athens_day() - 1, :'kid')::jsonb) ->> 'match_id' as m2 \gset
select throws_ok(format($$select api.give_kudo(%L, 'stamina')$$, :'m2'), '42501', 'nobody_to_thank', 'no kudos for minors');

-- the good word from a link becomes a kudo when that person joins
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νέος", "surname": "Κάποιος"}}], "result": {"won": false, "sets": "2-1"}}',
                            core.athens_day() - 2)::jsonb) ->> 'match_id' as m3 \gset
select api.match_links(:'m3'::uuid) -> 0 ->> 'token' as tok \gset
select tests.as_anon();
select api.link_kudo(:'tok', 'serve');
select tests.login(:'z'::uuid);
select api.claim_via_link(:'tok') is not null as x \gset
select tests.logout();
select is((select o.key from core.kudos k join core.kudos_options o on o.id = k.option_id
            where k.from_user_id = :'z'::uuid and k.to_player_id = :'me'::uuid), 'strong_serve', 'the link''s «Σερβίς» arrives as a kudo');
select tests.login(:'u'::uuid);
select is((api.get_my_kudos() -> 0 ->> 'key'), 'strong_serve', 'and the logger sees it');

select * from finish();
rollback;
