-- The free week with a card (founder, 18 Oct): the store's trial arrives as INITIAL_PURCHASE with period_type TRIAL
-- and is full Pro to the store's end; the charge on day 8 (RENEWAL) turns it into paid Pro; cancelling inside the
-- week keeps it to its end, then EXPIRATION ends it; once had, it is never offered again. Our no-card week is gone.
-- A sandbox purchase gives what it bought to anyone (App Review and TestFlight buy in the sandbox; 29 Oct). price_eur is the purchased price in EUR, never RevenueCat's USD.
begin;
select plan(13);

select tests.create_user('ct-a@test.local') as a \gset
select tests.create_user('ct-b@test.local') as b \gset
select tests.create_user('ct-ed@test.local', 'editor') as ed \gset

select ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'api' and p.proname = 'start_pro_trial'), 'the no-card week is gone');

select tests.login(:'a'::uuid);
select ok((api.pro_offer() ->> 'trial_available')::boolean, 'a new account is offered the free week');
select tests.logout();

-- the week starts in the store
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct1', 'type', 'INITIAL_PURCHASE', 'period_type', 'TRIAL', 'app_user_id', :'a', 'product_id', 'pro_monthly',
  'store', 'PLAY_STORE', 'environment', 'PRODUCTION', 'currency', 'EUR', 'price', 0, 'price_in_purchased_currency', 0,
  'expiration_at_ms', (extract(epoch from now() + interval '7 days') * 1000)::bigint)));
select tests.logout();
select ok(core.is_pro(:'a'::uuid), 'the free week is full Pro');
select tests.login(:'a'::uuid);
select ok((api.pro_offer() ->> 'on_trial')::boolean, 'and the offer knows it is the free week');
select is((api.get_pro() -> 'current' ->> 'source'), 'trial', 'the Pro screen sees the free week');
select tests.logout();

-- day 8: the card is charged
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct2', 'type', 'RENEWAL', 'period_type', 'NORMAL', 'app_user_id', :'a', 'product_id', 'pro_monthly',
  'environment', 'PRODUCTION', 'currency', 'EUR', 'price', 9.75, 'price_in_purchased_currency', 8.99,
  'expiration_at_ms', (extract(epoch from now() + interval '37 days') * 1000)::bigint)));
select tests.logout();
select is((select source from core.entitlements where user_id = :'a'::uuid and key = 'pro' and status = 'active'),
          'subscription', 'the charge turns the week into paid Pro');
select is((select price_eur from core.purchases where event_id = 'ct2'), 8.99::numeric(8,2), 'the price kept is the euro one');
select tests.login(:'a'::uuid);
select ok(not (api.pro_offer() ->> 'trial_available')::boolean, 'the week is never offered again');
select tests.logout();

-- b cancels inside the week: Pro to its end, then the store ends it
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct3', 'type', 'INITIAL_PURCHASE', 'period_type', 'TRIAL', 'app_user_id', :'b', 'product_id', 'pro_founding',
  'expiration_at_ms', (extract(epoch from now() + interval '7 days') * 1000)::bigint)));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct4', 'type', 'CANCELLATION', 'cancel_reason', 'UNSUBSCRIBE', 'period_type', 'TRIAL', 'app_user_id', :'b',
  'product_id', 'pro_founding')));
select tests.logout();
select ok(core.is_pro(:'b'::uuid), 'cancelling inside the week keeps it to its end');
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct5', 'type', 'EXPIRATION', 'period_type', 'TRIAL', 'app_user_id', :'b', 'product_id', 'pro_founding')));
select tests.logout();
select ok(not core.is_pro(:'b'::uuid), 'and the end of the week ends Pro');

-- sandbox: a player and staff alike
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct6', 'type', 'NON_RENEWING_PURCHASE', 'environment', 'SANDBOX', 'app_user_id', :'b', 'product_id', 'cos_fx_trophy')));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ct7', 'type', 'INITIAL_PURCHASE', 'environment', 'SANDBOX', 'app_user_id', :'ed', 'product_id', 'pro_monthly',
  'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint)));
select tests.logout();
select ok(exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                   where uc.user_id = :'b'::uuid and c.key = 'fx_trophy'), 'a sandbox purchase unlocks a player (App Review)');
select is((select environment from core.purchases where event_id = 'ct6' and applied), 'SANDBOX', 'it is applied and kept as sandbox');
select ok(core.is_pro(:'ed'::uuid), 'staff can test with sandbox purchases');

select * from finish();
rollback;
