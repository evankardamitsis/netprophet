-- Onboarding: claim status transitions, suggestions (own area first, never yourself or hidden), following several.
begin;
select plan(12);

select tests.create_user('ob-u@test.local') as u \gset
select tests.create_user('ob-c@test.local') as c \gset

select tests.mk_player('Γλυφάδα', 'Ένας') as near1 \gset
select tests.mk_player('Γλυφάδα', 'Δύο') as near2 \gset
select tests.mk_player('Κηφισιά', 'Μακριά') as far \gset
select tests.mk_player('Κρυφός', 'Παίκτης') as hid \gset
select tests.mk_player('Εγώ', 'Ο ίδιος') as mine \gset
update core.players set area_id = 'glyfada' where id in (:'near1'::uuid, :'near2'::uuid, :'mine'::uuid);
update core.players set area_id = 'kifisia' where id = :'far'::uuid;
update core.players set hidden = true where id = :'hid'::uuid;
update core.profiles set area_ids = '{glyfada}', area_id = 'glyfada', claimed_player_id = :'mine'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'mine'::uuid;

select tests.as_anon();
select throws_ok($$select api.suggest_players(30)$$, '42501', null, 'anonymous callers get no suggestions');

-- suggestions
select tests.login(:'u'::uuid);
select ok((select bool_and(e ->> 'area_id' = 'glyfada')
             from (select e from jsonb_array_elements(api.suggest_players(30)) e limit 2) x),
          'people from your own area come first');
select ok(not exists(select 1 from jsonb_array_elements(api.suggest_players(100)) e where e ->> 'id' = :'mine'),
          'never your own player');
select ok(not exists(select 1 from jsonb_array_elements(api.suggest_players(100)) e where e ->> 'id' = :'hid'),
          'never a hidden player');
select ok((api.suggest_players(1) -> 0) ? 'followers', 'each comes with a follower count');

-- following several
select is(api.follow_players(array[:'near1'::uuid, :'near2'::uuid, :'hid'::uuid]), 2, 'follows the visible ones');
select is(api.follow_players(array[:'near1'::uuid]), 0, 'following again changes nothing');
select is((select relation from core.follows where user_id = :'u'::uuid and player_id = :'near1'::uuid), 'known',
          'onboarding follows are «known», not friends');

-- claim status: a user with a claim cannot say they are new; one without can, once
select throws_ok($$select api.set_claim_status('creation_requested')$$, '23505', null, 'a claimed account is not new');
select tests.login(:'c'::uuid);
select is(api.set_claim_status('skipped'), 'skipped', 'skipping the claim is recorded');
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'then asking to be added is allowed');
select throws_ok($$select api.set_claim_status('claimed')$$, '22023', null, 'claiming goes through claim_player only');

select * from finish();
rollback;
