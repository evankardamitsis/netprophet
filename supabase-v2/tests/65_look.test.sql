-- «Εμφάνιση»: the prototype's catalogue, wear what you own (free kits are everyone's), never what you have not got;
-- «Μάντης του κλαμπ» gives the night set; the back of the card shows the exact level only to Pro.
begin;
select plan(11);

select tests.create_user('lk-u@test.local') as u \gset
select tests.mk_player('Λουκ', 'Δοκιμής') as me \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
insert into core.player_sports (player_id, sport_id, level_value, level_tier, level_direction, level_status)
values (:'me'::uuid, 'tennis', 4.23, 4, 'up', 'active')
on conflict (player_id, sport_id) do update set level_value = 4.23, level_tier = 4, level_direction = 'up', level_status = 'active';

select tests.login(:'u'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'category' = 'background'), 6,
          'six backgrounds, as in the prototype');
select is(api.get_look() -> 'equipped' ->> 'kit', 'kit_green', 'everyone starts in Πράσινο');
select is(api.equip_item('kit', 'kit_white') -> 'equipped' ->> 'kit', 'kit_white', 'a free kit, worn');
select throws_ok($$select api.equip_item('frame', 'frame_gold')$$, '42501', 'not_owned', 'not what you have not bought');
select throws_ok($$select api.equip_item('background', 'frame_seven')$$, 'P0002', 'not_found', 'a frame is not a background');
select tests.logout();

-- earn a background through a quest grant, wear it, take it off
insert into core.user_cosmetics (user_id, item_id, source) select :'u'::uuid, id, 'earned' from core.cosmetic_items where key = 'bg_night';
select tests.login(:'u'::uuid);
select is(api.equip_item('background', 'bg_night') -> 'equipped' ->> 'background', 'bg_night', 'an earned background, worn');
select is(api.equip_item('background', null) -> 'equipped' -> 'background', 'null'::jsonb, 'and taken off');
select tests.logout();

-- the night set comes with «Μάντης του κλαμπ»
insert into core.user_badges (user_id, badge_key, counter, tier) values (:'u'::uuid, 'club_oracle', 5, 1)
on conflict (user_id, badge_key) do update set counter = 5, tier = 1;
select ok(exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                   where uc.user_id = :'u'::uuid and c.key = 'kit_night'), 'Μάντης του κλαμπ gives Σετ Βραδινό ματς');

-- the back of the card
select tests.login(:'u'::uuid);
select is(api.get_my_level() -> 'value', 'null'::jsonb, 'free: no exact value');
select tests.logout();
insert into core.entitlements (user_id, source, status) values (:'u'::uuid, 'gift', 'active');
select tests.login(:'u'::uuid);
select is((api.get_my_level() ->> 'value')::numeric, 4.23, 'Pro: the value');
select is((api.get_my_level() ->> 'to_next')::numeric, 0.27, 'and the gap to level 4,5');
select tests.logout();

select * from finish();
rollback;
