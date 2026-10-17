-- Purchases: a store event turns Pro on to its expiry, a renewal moves the end, a refund ends it; a cosmetic is
-- owned for good (a refund takes it back); every event is applied once; only the service may apply; the free week
-- is once per account; the offers are capped.
begin;
select plan(17);

select tests.create_user('pay-u@test.local') as u \gset
select tests.create_user('pay-v@test.local') as v \gset
update auth.users set created_at = now() - interval '10 days' where id in (:'u', :'v');

-- the catalogue: three Pro plans and every bought cosmetic
select is((select count(*)::int from core.store_products where grants = 'pro'), 3, 'three Pro plans');
select is((select price_eur from core.store_products where product_id = 'cos_fx_fireworks'), 1.99::numeric(6,2), 'a cosmetic at its price');
select ok(not exists (select 1 from core.store_products where product_id = 'cos_kit_green'), 'free and earned items are not sold');

-- only the service applies events
select tests.login(:'u'::uuid);
select throws_ok($$select api.apply_store_event('{"event":{"id":"x"}}')$$, '42501', null, 'a player cannot apply a purchase');
select tests.logout();

select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev1', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'u', 'product_id', 'pro_monthly', 'store', 'RC_BILLING',
  'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint, 'price', 8.99)));
select tests.logout();
select ok(core.is_pro(:'u'::uuid), 'a purchase turns Pro on');

select tests.as_service();
select is((api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev1', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'u', 'product_id', 'pro_monthly'))) ->> 'duplicate')::boolean,
  true, 'the same event twice is applied once');
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev2', 'type', 'RENEWAL', 'app_user_id', :'u', 'product_id', 'pro_monthly',
  'expiration_at_ms', (extract(epoch from now() + interval '60 days') * 1000)::bigint)));
select tests.logout();
select is((select count(*)::int from core.entitlements where user_id = :'u'::uuid and source = 'subscription'), 1, 'one paid Pro row');
select ok((select ends_at > now() + interval '55 days' from core.entitlements where user_id = :'u'::uuid and source = 'subscription'),
          'a renewal moves the end');

select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev3', 'type', 'CANCELLATION', 'cancel_reason', 'UNSUBSCRIBE', 'app_user_id', :'u', 'product_id', 'pro_monthly')));
select tests.logout();
select ok(core.is_pro(:'u'::uuid), 'auto-renew off: Pro runs to its end');
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev4', 'type', 'CANCELLATION', 'cancel_reason', 'CUSTOMER_SUPPORT', 'app_user_id', :'u', 'product_id', 'pro_monthly')));
-- a cosmetic, then its refund
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev5', 'type', 'NON_RENEWING_PURCHASE', 'app_user_id', :'u', 'product_id', 'cos_fx_trophy')));
select tests.logout();
select ok(not core.is_pro(:'u'::uuid), 'a refund ends Pro');
select ok(exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                   where uc.user_id = :'u'::uuid and c.key = 'fx_trophy' and uc.source = 'bought'), 'a bought cosmetic is owned');
select tests.login(:'u'::uuid);
select is(api.equip_item('win_effect', 'fx_trophy') -> 'equipped' ->> 'win_effect', 'fx_trophy', 'and can be worn');
select tests.logout();
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ev6', 'type', 'CANCELLATION', 'cancel_reason', 'CUSTOMER_SUPPORT', 'app_user_id', :'u', 'product_id', 'cos_fx_trophy')));
select tests.logout();
select ok(not exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                       where uc.user_id = :'u'::uuid and c.key = 'fx_trophy'), 'a refunded cosmetic is taken back');

-- the free week: once, then the offer knows
select tests.login(:'v'::uuid);
select ok((api.pro_offer() ->> 'trial_available')::boolean, 'the free week is there');
select api.start_pro_trial();
select ok(core.is_pro(:'v'::uuid), 'the free week turns Pro on, no card');
select throws_ok($$select api.start_pro_trial()$$, '23505', 'trial_used', 'once per account');
-- the cap: one offer a day
select tests.logout();
select tests.login(:'u'::uuid);
select api.pro_offer_shown('draw');
select is((api.pro_offer() ->> 'can_offer')::boolean, false, 'one offer a day at most');
select tests.logout();

select * from finish();
rollback;
