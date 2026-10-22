-- Earned cosmetics are earnable: every active earned item has a way in, the two with none are off the wardrobe, a
-- quest can only give an item the wardrobe shows, and the weekly quests land their frame and background.
\set ON_ERROR_STOP on
begin;
select plan(12);

-- the two frames nothing can give today are off
select is((select array_agg(key order by key) from core.cosmetic_items where key in ('frame_founding', 'frame_friends') and not active),
          array['frame_founding', 'frame_friends'], 'Πρώτη γενιά and Φίλοι are off until something gives them');

-- every active earned item is given by something: a σερί milestone, a badge, the month close or an active quest
select is((select array_agg(c.key order by c.key) from core.cosmetic_items c
            where c.active and c.kind = 'earned'
              and c.key not in ('frame_seven', 'frame_ten', 'gear_headband', 'frame_level', 'kit_night', 'frame_month_top', 'gear_crown')
              and not exists (select 1 from core.quest_defs q where q.active and q.reward -> 'cosmeticIds' ? c.key)),
          null::text[], 'no active earned item is left without a way to earn it');
select is((select count(*)::int from core.cosmetic_items where active and kind = 'earned' and coalesce(earn_rule_text, '') = ''),
          0, 'every active earned item says how it is earned');
select is((select count(*)::int from core.cosmetic_items where active and kind = 'earned' and price_eur is not null),
          0, 'no earned item has a price');
select is((select count(*)::int from core.store_products p join core.cosmetic_items c on 'cos:' || c.key = p.grants
            where c.kind in ('earned', 'free')),
          0, 'no earned or free item is sold in the store');

-- an active quest only gives items the wardrobe shows (reactivating a quest while its item is off would hide the reward)
select is((select count(*)::int from core.quest_defs q, jsonb_array_elements_text(q.reward -> 'cosmeticIds') k(key)
            where q.active and not exists (select 1 from core.cosmetic_items c where c.key = k.key and c.active and c.kind = 'earned')),
          0, 'every cosmetic an active quest gives is an active earned item');

-- the wardrobe
select tests.create_user('ec-u@test.local') as u \gset
select tests.login(:'u'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'key' in ('frame_founding', 'frame_friends')),
          0, 'the wardrobe does not show them');
select throws_ok($$select api.equip_item('frame', 'frame_founding')$$, 'P0002', 'not_found', 'and they cannot be worn');
select is((select count(*)::int from jsonb_array_elements(api.get_look() -> 'items') i
            where i ->> 'kind' = 'earned' and (i ->> 'price_eur' is not null or coalesce(i ->> 'earn_rule', '') = '')),
          0, 'earned items reach the app with their rule and no price');
select tests.logout();

-- the weekly quests land their reward in the wardrobe, once
insert into core.user_quest_progress (user_id, quest_key, period_key, progress, done_at)
values (:'u'::uuid, 'weekly_log_2_matches', 'w-test', 2, now()), (:'u'::uuid, 'weekly_vote_5_days', 'w-test', 5, now());
select core.quest_grant(:'u'::uuid, 'weekly_log_2_matches', 'w-test');
select core.quest_grant(:'u'::uuid, 'weekly_vote_5_days', 'w-test');
select is((select array_agg(c.key order by c.key) from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where uc.user_id = :'u'::uuid and uc.source = 'earned'),
          array['bg_grass', 'frame_week'], '«Πέρνα 2 αγώνες σου» gives Της εβδομάδας, «Ψήφισε 5 μέρες» gives Γρασίδι');
select is(core.quest_grant(:'u'::uuid, 'weekly_log_2_matches', 'w-test'), null, 'a second grant gives nothing');
select tests.login(:'u'::uuid);
select is((select jsonb_agg(i ->> 'owned' order by i ->> 'key') from jsonb_array_elements(api.get_look() -> 'items') i
            where i ->> 'key' in ('frame_week', 'bg_grass')),
          '["true", "true"]'::jsonb, 'and they are owned in the wardrobe');

select * from finish();
rollback;
