-- Google Play product ids: RevenueCat sends «<subscription>:<base plan>» (pro_monthly:monthly). Each Pro plan bought
-- on Play gives Pro, renewals, cancellations, refunds, expirations and transfers work with Play ids, the purchase keeps
-- the id we sell (and the raw one), an unknown id is still rejected, and App Store / web ids are unchanged.
begin;
select plan(26);

select tests.create_user('play-a@test.local') as a \gset
select tests.create_user('play-b@test.local') as b \gset
select tests.create_user('play-c@test.local') as c \gset
select tests.create_user('play-d@test.local') as d \gset
select tests.create_user('play-e@test.local') as e \gset
select tests.create_user('play-f@test.local') as f \gset
select tests.create_user('play-g@test.local') as g \gset

-- ── the normalizer ──
select is(core.store_product_id('pro_monthly'), 'pro_monthly', 'an exact id stays');
select is(core.store_product_id('pro_founding:yearly'), 'pro_founding', 'a Play id is the subscription before «:»');
select is(core.store_product_id('cos_fx_trophy'), 'cos_fx_trophy', 'a one-time item stays');
select is(core.store_product_id('pro_lifetime:forever'), 'pro_lifetime:forever', 'an unknown Play id stays as it came');
select ok(core.store_product_id(null) is null, 'no id, no product');
select ok(not has_function_privilege('authenticated', 'core.store_product_id(text)', 'execute'),
          'players cannot call it');

-- ── each Pro plan bought on Play ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-1', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'a', 'product_id', 'pro_monthly:monthly',
  'store', 'PLAY_STORE', 'currency', 'EUR', 'price_in_purchased_currency', 8.99,
  'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint)));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-2', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'b', 'product_id', 'pro_yearly:yearly',
  'store', 'PLAY_STORE', 'expiration_at_ms', (extract(epoch from now() + interval '365 days') * 1000)::bigint)));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-3', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'c', 'product_id', 'pro_founding:yearly',
  'store', 'PLAY_STORE', 'purchased_at_ms', (extract(epoch from timestamptz '2026-12-01 12:00+02') * 1000)::bigint,
  'expiration_at_ms', (extract(epoch from now() + interval '365 days') * 1000)::bigint)));
select tests.logout();
select ok(core.is_pro(:'a'::uuid), 'pro_monthly:monthly gives Pro');
select ok(core.is_pro(:'b'::uuid), 'pro_yearly:yearly gives Pro');
select ok(core.is_pro(:'c'::uuid), 'pro_founding:yearly gives Pro');
select is((select product_id || ' ' || raw_product_id || ' ' || applied::text from core.purchases where event_id = 'play-1'),
          'pro_monthly pro_monthly:monthly true', 'the purchase keeps the id we sell and the one Play sent');
select is((select price_eur from core.purchases where event_id = 'play-1'), 8.99::numeric(8,2), 'with its price');
select is((select product_id from core.purchases where event_id = 'play-3'), 'pro_founding',
          'a founding purchase on Play reads as pro_founding');
-- «Πρώτη γενιά» (when the founding frame rule is in): a founding member on Play gets it like on the App Store
select ok(to_regprocedure('core.grant_founding_frame(uuid)') is null
          or exists (select 1 from core.user_cosmetics uc join core.cosmetic_items ci on ci.id = uc.item_id
                      where uc.user_id = :'c'::uuid and ci.key = 'frame_founding'),
          'the founding frame works with pro_founding:yearly');
select ok(core.pro_trial_used(:'a'::uuid), 'a Play buyer has used the free week');

-- ── renewal, auto-renew off, refund, expiration with Play ids ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-4', 'type', 'RENEWAL', 'app_user_id', :'a', 'product_id', 'pro_monthly:monthly', 'store', 'PLAY_STORE',
  'expiration_at_ms', (extract(epoch from now() + interval '60 days') * 1000)::bigint)));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-5', 'type', 'CANCELLATION', 'cancel_reason', 'UNSUBSCRIBE', 'app_user_id', :'a',
  'product_id', 'pro_monthly:monthly', 'store', 'PLAY_STORE')));
select tests.logout();
select ok((select ends_at > now() + interval '55 days' from core.entitlements
            where user_id = :'a'::uuid and source = 'subscription'), 'a Play renewal moves the end');
select ok(core.is_pro(:'a'::uuid), 'auto-renew off on Play: Pro runs to its end');
select is((select note from core.purchases where event_id = 'play-5'), 'recorded', 'and the cancellation is recorded');

select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-6', 'type', 'EXPIRATION', 'app_user_id', :'a', 'product_id', 'pro_monthly:monthly', 'store', 'PLAY_STORE')));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-7', 'type', 'CANCELLATION', 'cancel_reason', 'CUSTOMER_SUPPORT', 'app_user_id', :'b',
  'product_id', 'pro_yearly:yearly', 'store', 'PLAY_STORE')));
select tests.logout();
select ok(not core.is_pro(:'a'::uuid), 'a Play expiration ends Pro');
select ok(not core.is_pro(:'b'::uuid), 'a Play refund ends Pro');

-- ── the free week on Play ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-8', 'type', 'INITIAL_PURCHASE', 'period_type', 'TRIAL', 'app_user_id', :'e',
  'product_id', 'pro_monthly:monthly', 'store', 'PLAY_STORE',
  'expiration_at_ms', (extract(epoch from now() + interval '7 days') * 1000)::bigint)));
select tests.logout();
select ok(exists (select 1 from core.entitlements where user_id = :'e'::uuid and source = 'trial' and status = 'active'),
          'a Play free week gives the trial');

-- ── a transfer of a Play subscription ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-9', 'type', 'TRANSFER', 'product_id', 'pro_founding:yearly', 'store', 'PLAY_STORE',
  'transferred_from', jsonb_build_array(:'c'), 'transferred_to', jsonb_build_array(:'f'))));
select tests.logout();
select ok(not core.is_pro(:'c'::uuid) and core.is_pro(:'f'::uuid), 'a Play transfer moves Pro');
select is((select product_id || ' ' || raw_product_id from core.purchases where event_id = 'play-9'),
          'pro_founding pro_founding:yearly', 'and records the id we sell');

-- ── an unknown id is still rejected ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-10', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'g', 'product_id', 'pro_lifetime:forever',
  'store', 'PLAY_STORE', 'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint)));
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'play-11', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'g', 'product_id', ':monthly',
  'store', 'PLAY_STORE', 'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint)));
select tests.logout();
select ok(not core.is_pro(:'g'::uuid), 'an unknown Play id gives nothing');
select is((select string_agg(note || ' ' || product_id, ', ' order by event_id) from core.purchases
            where event_id in ('play-10', 'play-11')),
          'unknown product pro_lifetime:forever, unknown product :monthly', 'and is recorded as unknown, as it came');

-- ── App Store and web ids are unchanged ──
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'ios-1', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'d', 'product_id', 'pro_yearly', 'store', 'APP_STORE',
  'expiration_at_ms', (extract(epoch from now() + interval '365 days') * 1000)::bigint)));
select tests.logout();
select ok(core.is_pro(:'d'::uuid), 'an App Store id gives Pro as before');
select is((select product_id || ' ' || raw_product_id from core.purchases where event_id = 'ios-1'),
          'pro_yearly pro_yearly', 'and is recorded as it came');

select * from finish();
rollback;
