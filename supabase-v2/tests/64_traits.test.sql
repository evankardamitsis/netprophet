-- Traits: only people who played a player vote on how they play; the profile shows the top six; a new phrase
-- waits for staff; Εγώ shows your top three with counts only for Pro; never on minors.
begin;
select plan(12);

select tests.create_user('tr-a@test.local') as a \gset
select tests.create_user('tr-b@test.local') as b \gset
select tests.create_user('tr-x@test.local') as x \gset
select tests.create_user('tr-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Άλφα', 'Πρώτος') as pa \gset
select tests.mk_player('Βήτα', 'Δεύτερος') as pb \gset
select tests.mk_player('Ξένος', 'Τρίτος') as px \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'pa'::uuid;
update core.players set claimed_by_user_id = :'b'::uuid where id = :'pb'::uuid;
update core.players set claimed_by_user_id = :'x'::uuid where id = :'px'::uuid;
-- a and b played (with a result); x never played either
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() - interval '2 days') as m \gset
select tests.finish_match(:'m'::uuid, 1);

select tests.login(:'a'::uuid);
select is(jsonb_array_length(api.get_traits(:'pb'::uuid) -> 'traits'), 6, 'the profile offers six to tap');
select is((api.get_traits(:'pb'::uuid) ->> 'can_vote')::boolean, true, 'an opponent can vote');
select is((select (t ->> 'count')::int from jsonb_array_elements(
             api.vote_trait(:'pb'::uuid, (select id from core.trait_defs where label_en = 'Quick feet'), true) -> 'traits') t
            where t ->> 'label_en' = 'Quick feet'), 1, 'a tap counts');
select is((select (t ->> 'mine')::boolean from jsonb_array_elements(api.get_traits(:'pb'::uuid) -> 'traits') t
            where t ->> 'label_en' = 'Quick feet'), true, 'and shows as mine');
select is((select count(*)::int from jsonb_array_elements(api.suggest_trait(:'pb'::uuid, 'Παίζει με χαμόγελο') -> 'traits') t
            where (t ->> 'pending')::boolean), 1, 'a new phrase waits, visible to who wrote it');
select tests.logout();

select tests.login(:'x'::uuid);
select throws_ok(format($$select api.vote_trait(%L, (select id from core.trait_defs where label_en = 'Fair play'))$$, :'pb'),
                 '42501', 'not_played', 'only people who played them');
select is((select count(*)::int from jsonb_array_elements(api.get_traits(:'pb'::uuid) -> 'traits') t where (t ->> 'pending')::boolean),
          0, 'others do not see a waiting phrase');
select tests.logout();

-- staff approve it
select tests.login(:'adm'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.admin_moderation() -> 'traits')), 1, 'it reaches the queue');
select api.admin_decide_trait((select id from core.trait_defs where label_en = 'Παίζει με χαμόγελο'), true, null, null, 'Plays with a smile');
select tests.logout();

-- Εγώ: b's top three, counts for Pro only
select tests.login(:'b'::uuid);
select is((api.get_my_traits() -> 'traits' -> 0 -> 'count'), 'null'::jsonb, 'free: the order, not the numbers');
select tests.logout();
insert into core.entitlements (user_id, source, status) values (:'b'::uuid, 'gift', 'active');
select tests.login(:'b'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_my_traits() -> 'traits')), 2, 'two phrases so far');
select is((select sum((t ->> 'count')::int)::int from jsonb_array_elements(api.get_my_traits() -> 'traits') t), 2, 'Pro: the numbers');
select tests.logout();

-- minors: never
update core.players set is_minor = true where id = :'pb'::uuid;
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.get_traits(%L)$$, :'pb'), 'P0002', 'not_found', 'never on a minor');
select tests.logout();

select * from finish();
rollback;
