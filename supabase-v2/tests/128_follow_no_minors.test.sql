-- Onboarding never suggests or follows a minor (the automatic 6 included), and still never a hidden player.
begin;
select plan(4);

select tests.create_user('fm-u@test.local') as u \gset

select tests.mk_player('Μεγάλος', 'Γλυφάδας') as adult \gset
select tests.mk_player('Μικρός', 'Γλυφάδας') as kid \gset
select tests.mk_player('Κρυφός', 'Γλυφάδας') as hid \gset
update core.players set area_id = 'glyfada' where id in (:'adult'::uuid, :'kid'::uuid, :'hid'::uuid);
update core.players set is_minor = true where id = :'kid'::uuid;
update core.players set hidden = true where id = :'hid'::uuid;
update core.profiles set area_ids = '{glyfada}', area_id = 'glyfada' where user_id = :'u'::uuid;

select tests.login(:'u'::uuid);
select ok(exists(select 1 from jsonb_array_elements(api.suggest_players(100)) e where e ->> 'id' = :'adult'),
          'an adult from your area is suggested');
select ok(not exists(select 1 from jsonb_array_elements(api.suggest_players(100)) e where e ->> 'id' = :'kid'),
          'never a minor');
select is(api.follow_players(array[:'adult'::uuid, :'kid'::uuid, :'hid'::uuid]), 1, 'follows only the adult');
select ok(not exists(select 1 from core.follows where user_id = :'u'::uuid and player_id = :'kid'::uuid),
          'no follow row for the minor');
select tests.logout();

select * from finish();
rollback;
