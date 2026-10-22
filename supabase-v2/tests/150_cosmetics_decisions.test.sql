-- Cosmetics decisions (founder, 22 Oct 2026). «Πρώτη γενιά» is for everyone who takes Pro «Ιδρυτικό μέλος» by
-- 31/12/2026 23:59 Athens: given once by the store event, never twice on a renewal or a replay, never after the date,
-- never for another plan or for the free week alone, carried over on a restore. σερί 10 gives one free freeze the
-- first time only, into a free slot only.
begin;
select plan(27);

create function tests.ms(p_at timestamptz) returns bigint language sql as $$ select (extract(epoch from p_at) * 1000)::bigint $$;
create function tests.store(p_id text, p_type text, p_user uuid, p_product text, p_at timestamptz,
                            p_period text default 'NORMAL', p_env text default 'PRODUCTION')
returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform tests.as_service();
  r := api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
         'id', p_id, 'type', p_type, 'period_type', p_period, 'app_user_id', p_user, 'product_id', p_product,
         'store', 'PLAY_STORE', 'environment', p_env, 'currency', 'EUR', 'price_in_purchased_currency', 49.99,
         'purchased_at_ms', tests.ms(p_at), 'event_timestamp_ms', tests.ms(p_at),
         'expiration_at_ms', tests.ms(greatest(p_at, now()) + interval '1 year'))));
  perform tests.logout();
  return r;
end $$;
create function tests.founding(p_user uuid) returns int language sql as $$
  select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
   where uc.user_id = p_user and c.key = 'frame_founding' and uc.source = 'earned'
$$;

select tests.create_user('cd-a@test.local') as a \gset
select tests.create_user('cd-b@test.local') as b \gset
select tests.create_user('cd-c@test.local') as c \gset
select tests.create_user('cd-d@test.local') as d \gset
select tests.create_user('cd-e@test.local') as e \gset
select tests.create_user('cd-f@test.local') as f \gset
select tests.create_user('cd-h@test.local') as h \gset
select tests.create_user('cd-s@test.local') as s \gset

-- the item is back, earned, with its rule and no price
select ok((select active and kind = 'earned' and price_eur is null
                  and earn_rule_text = 'Για όσους μπήκαν Ιδρυτικά μέλη στο Pro ως τις 31/12'
             from core.cosmetic_items where key = 'frame_founding'), 'Πρώτη γενιά is on, earned, with its rule');
select tests.login(:'b'::uuid);
select is((select jsonb_build_object('owned', i -> 'owned', 'price', i -> 'price_eur', 'rule', i ->> 'earn_rule')
             from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'key' = 'frame_founding'),
          jsonb_build_object('owned', false, 'price', null, 'rule', 'Για όσους μπήκαν Ιδρυτικά μέλη στο Pro ως τις 31/12'),
          'the wardrobe shows it with its rule, not owned, never for sale');
select throws_ok($$select api.equip_item('frame', 'frame_founding')$$, '42501', 'not_owned', 'and it cannot be worn before it is yours');
select tests.logout();

-- a: founding member in November
select is((tests.store('cd1', 'INITIAL_PURCHASE', :'a'::uuid, 'pro_founding', '2026-11-05 10:00+02') ->> 'founding_frame')::boolean,
          true, 'the first charge of Pro «Ιδρυτικό μέλος» gives it');
select is(tests.founding(:'a'::uuid), 1, 'it is in the wardrobe as earned');
select is((tests.store('cd2', 'RENEWAL', :'a'::uuid, 'pro_founding', '2027-11-05 10:00+02') ->> 'founding_frame')::boolean,
          false, 'the renewal a year later gives nothing new');
select is(tests.store('cd2', 'RENEWAL', :'a'::uuid, 'pro_founding', '2027-11-05 10:00+02') ->> 'duplicate', 'true',
          'a replayed event is applied once');
select is(tests.founding(:'a'::uuid), 1, 'still one, after the renewal and the replay');
select tests.login(:'a'::uuid);
select lives_ok($$select api.equip_item('frame', 'frame_founding')$$, 'and it can be worn');
select ok(core.is_pro(:'a'::uuid), 'Pro itself is untouched by the frame');
select tests.logout();

-- the line is 31/12/2026 23:59 Athens (UTC+2 in winter)
select tests.store('cd3', 'INITIAL_PURCHASE', :'b'::uuid, 'pro_founding', '2026-12-31 23:59:59+02') is not null as x \gset
select is(tests.founding(:'b'::uuid), 1, '31/12 23:59:59 Athens still counts');
select tests.store('cd4', 'INITIAL_PURCHASE', :'c'::uuid, 'pro_founding', '2027-01-01 00:00:01+02') is not null as x \gset
select is(tests.founding(:'c'::uuid), 0, 'after 31/12 Athens: no frame');
select ok(core.is_pro(:'c'::uuid), 'though Pro itself was applied');
select tests.store('cd4b', 'RENEWAL', :'c'::uuid, 'pro_founding', '2028-01-01 00:00:01+02') is not null as x \gset
select is(tests.founding(:'c'::uuid), 0, 'nor on its renewal');

-- another plan, the free week alone, a sandbox purchase by a player
select tests.store('cd5', 'INITIAL_PURCHASE', :'d'::uuid, 'pro_monthly', '2026-11-05 10:00+02') is not null as x \gset
select is(tests.founding(:'d'::uuid), 0, 'monthly Pro gives no frame');
select tests.store('cd6', 'INITIAL_PURCHASE', :'e'::uuid, 'pro_founding', '2026-12-28 12:00+02', 'TRIAL') is not null as x \gset
select is(tests.founding(:'e'::uuid), 0, 'the free week on «Ιδρυτικό μέλος» gives nothing yet');
select tests.store('cd7', 'RENEWAL', :'e'::uuid, 'pro_founding', '2027-01-04 12:00+02') is not null as x \gset
select is(tests.founding(:'e'::uuid), 1, 'a free week started on 28/12 that turns paid on 4/1 counts from 28/12');
select tests.store('cd8', 'INITIAL_PURCHASE', :'s'::uuid, 'pro_founding', '2026-11-05 10:00+02', 'NORMAL', 'SANDBOX') is not null as x \gset
select is(tests.founding(:'s'::uuid), 0, 'a sandbox purchase by a player gives nothing');

-- a restore on a new login moves Pro, and the frame comes along
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'cd9', 'type', 'TRANSFER', 'store', 'PLAY_STORE', 'environment', 'PRODUCTION', 'product_id', 'pro_founding',
  'transferred_from', jsonb_build_array(:'a'), 'transferred_to', jsonb_build_array(:'h')))) ->> 'founding_frame' as moved \gset
select tests.logout();
select is(:'moved'::text, 'true', 'the TRANSFER gives it to the account Pro moved to');
select is(tests.founding(:'h'::uuid) + tests.founding(:'a'::uuid), 2, 'and the old account keeps its earned frame');

-- σερί 10: the first time, a free slot -> one more free freeze, in the celebration's reward
select tests.create_user('cd-t@test.local') as t \gset
select tests.play(:'t'::uuid, true) is not null as p from generate_series(1, 10);
select is((select count(*)::int from core.freezes where user_id = :'t'::uuid and source = 'streak10' and kind = 'free'),
          1, 'σερί 10 the first time gives a free freeze');
select is(tests.unused_freezes(:'t'::uuid), 2, 'next to the one from σερί 3');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'t'::uuid and kind = 'celebration'
             and payload ->> 'type' = 'streak_milestone' and (payload ->> 'streak')::int = 10),
          '{"freeze": true, "frame": "frame_ten", "gear": null}'::jsonb, 'the moment gives the freeze and Frame Δέκα');

-- back to 10 after a break: nothing again
select tests.play(:'t'::uuid, false) is not null as p from generate_series(1, 3);   -- two freezes, then the break
select is((select streak from core.user_game_state where user_id = :'t'::uuid), 0, 'σερί broke after the freezes');
select tests.play(:'t'::uuid, true) is not null as p from generate_series(1, 10);
select is((select count(*)::int from core.freezes where user_id = :'t'::uuid and source = 'streak10'), 1,
          'back at 10 after a break: no second freeze');

-- σερί 10 the first time with both slots full: nothing extra, the frame still comes
select tests.create_user('cd-x@test.local') as x \gset
select tests.play(:'x'::uuid, true) is not null as p from generate_series(1, 3);   -- the free freeze at 3
select core.grant_freeze(:'x'::uuid, 'paid', 'purchase', 2) is not null as g \gset
select tests.play(:'x'::uuid, true) is not null as p from generate_series(4, 10);
select is((select count(*)::int from core.freezes where user_id = :'x'::uuid and source = 'streak10'), 0,
          'both slots full at 10: no freeze');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'x'::uuid and kind = 'celebration'
             and payload ->> 'type' = 'streak_milestone' and (payload ->> 'streak')::int = 10),
          '{"freeze": false, "frame": "frame_ten", "gear": null}'::jsonb, 'the moment gives Frame Δέκα only');

select * from finish();
rollback;
