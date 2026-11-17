-- The Pro emails: queued from the store events (production only, never a deleted profile), the free week's day 5
-- checked again at send time with the plan as it is then, a voluntary cancellation only, the winback once per account
-- for App Store payers who cancelled, its code given only when it really goes out and never burned on a skipped email.
begin;
select plan(31);

update core.email_settings set mode = 'on', allowlist = '{}', kinds_off = '{}';

-- a store event as the webhook sends it; n orders the events like the store's clock does
create or replace function tests.pro_ev(p_id text, p_type text, p_user uuid, p_product text, p_n int,
                                        p_extra jsonb default '{}'::jsonb)
returns jsonb language plpgsql as $$
declare v jsonb;
begin
  perform tests.as_service();
  v := api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
    'id', p_id, 'type', p_type, 'app_user_id', p_user, 'product_id', p_product, 'store', 'APP_STORE',
    'environment', 'PRODUCTION', 'period_type', 'NORMAL', 'currency', 'EUR',
    'event_timestamp_ms', 1800000000000 + p_n * 1000,
    'expiration_at_ms', (extract(epoch from now() + interval '30 days') * 1000)::bigint) || p_extra));
  perform tests.logout();
  return v;
end $$;
create or replace function tests.exp_ms(p interval) returns bigint language sql as $$
  select (extract(epoch from now() + p) * 1000)::bigint $$;

select tests.create_user('ep-a@example.com') as a \gset
select tests.create_user('ep-b@example.com') as b \gset
select tests.create_user('ep-c@example.com') as c \gset
select tests.create_user('ep-d@example.com') as d \gset
select tests.create_user('ep-e@example.com') as e \gset
select tests.create_user('ep-f@example.com') as f \gset
select tests.create_user('ep-g@example.com') as g \gset
select tests.create_user('ep-h@example.com') as h \gset
select tests.create_user('ep-adm@example.com', 'admin') as adm \gset

-- ── the free week starts ──
select tests.pro_ev('ep-a1', 'INITIAL_PURCHASE', :'a'::uuid, 'pro_founding', 1,
  jsonb_build_object('period_type', 'TRIAL', 'price', 0, 'expiration_at_ms', tests.exp_ms(interval '7 days')));
select is((select payload ->> 'trial' || ':' || (payload ->> 'price') || ':' || (payload ->> 'renews')
             from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'),
          'true:49.99:69.99', 'the free week queues the Pro welcome with the plan and its price after the first year');
select is((select due_at from core.emails where user_id = :'a'::uuid and kind = 'pro_trial_day5'),
          ((core.athens_day(now() + interval '7 days') - 2) + time '10:00') at time zone 'Europe/Athens',
          'day 5 is queued for 10:00 Athens, two days before the store''s end');
select ok((select due_at > now() from core.emails where user_id = :'a'::uuid and kind = 'pro_trial_day5'), 'and waits for it');

-- the same start sent again by the store (another event id) queues nothing more
select tests.pro_ev('ep-a1b', 'INITIAL_PURCHASE', :'a'::uuid, 'pro_founding', 2,
  jsonb_build_object('period_type', 'TRIAL', 'price', 0, 'expiration_at_ms', tests.exp_ms(interval '7 days')));
select is((select count(*)::int from core.emails where user_id = :'a'::uuid and kind = 'pro_welcome'), 1, 'one welcome per account');

-- sandbox events never queue anything
select tests.pro_ev('ep-c1', 'INITIAL_PURCHASE', :'c'::uuid, 'pro_monthly', 3,
  jsonb_build_object('environment', 'SANDBOX', 'period_type', 'TRIAL', 'expiration_at_ms', tests.exp_ms(interval '7 days')));
select is((select count(*)::int from core.emails where user_id = :'c'::uuid), 0, 'a sandbox purchase queues no email');

-- a deleted profile never gets one
update core.profiles set deleted_at = now() where user_id = :'h'::uuid;
select tests.pro_ev('ep-h1', 'INITIAL_PURCHASE', :'h'::uuid, 'pro_monthly', 4);
select is((select count(*)::int from core.emails where user_id = :'h'::uuid), 0, 'a deleted profile gets no Pro email');

-- ── a plan change inside the week, then day 5 comes ──
select tests.pro_ev('ep-a2', 'PRODUCT_CHANGE', :'a'::uuid, 'pro_founding', 5,
  jsonb_build_object('period_type', 'TRIAL', 'new_product_id', 'pro_monthly', 'expiration_at_ms', tests.exp_ms(interval '7 days')));
update core.emails set due_at = now() - interval '1 minute' where user_id = :'a'::uuid and kind = 'pro_trial_day5';
select api.admin_emails_due(100) as out1 \gset
select is((select x -> 'payload' ->> 'product_id' || ':' || (x -> 'payload' ->> 'price')
             from jsonb_array_elements(:'out1'::jsonb) x where x ->> 'kind' = 'pro_trial_day5' and (x ->> 'to') = 'ep-a@example.com'),
          'pro_monthly:8.99', 'day 5 names the plan as it is now, after a change inside the week');
select is((select x ->> 'group' from jsonb_array_elements(:'out1'::jsonb) x where x ->> 'kind' = 'pro_welcome' and (x ->> 'to') = 'ep-a@example.com'),
          'pro', 'the Pro emails are in the pro group');
select ok((select (x ->> 'unsubscribe_token') is not null from jsonb_array_elements(:'out1'::jsonb) x
            where x ->> 'kind' = 'pro_welcome' and (x ->> 'to') = 'ep-a@example.com'), 'and carry the unsubscribe token');

-- ── cancelling inside the free week ──
select tests.pro_ev('ep-d1', 'INITIAL_PURCHASE', :'d'::uuid, 'pro_monthly', 6,
  jsonb_build_object('period_type', 'TRIAL', 'price', 0, 'expiration_at_ms', tests.exp_ms(interval '7 days')));
select tests.pro_ev('ep-d2', 'CANCELLATION', :'d'::uuid, 'pro_monthly', 7,
  jsonb_build_object('period_type', 'TRIAL', 'cancel_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '7 days')));
select is((select count(*)::int from core.emails where user_id = :'d'::uuid and kind = 'pro_cancel'), 1, 'a voluntary cancellation queues pro_cancel');
update core.emails set due_at = now() - interval '1 minute' where user_id = :'d'::uuid and kind = 'pro_trial_day5';
select api.admin_emails_due(100);
select is((select status || ':' || reason from core.emails where user_id = :'d'::uuid and kind = 'pro_trial_day5'),
          'skipped:cancelled', 'day 5 is dropped for someone who cancelled the free week');
select is((select status from core.emails where user_id = :'d'::uuid and kind = 'pro_cancel'), 'sending', 'the cancellation email goes');

-- a refund or a billing error is not a choice to leave: no email
select tests.pro_ev('ep-f1', 'INITIAL_PURCHASE', :'f'::uuid, 'pro_monthly', 8);
select tests.pro_ev('ep-f2', 'CANCELLATION', :'f'::uuid, 'pro_monthly', 9, '{"cancel_reason": "CUSTOMER_SUPPORT"}');
select tests.pro_ev('ep-f3', 'CANCELLATION', :'f'::uuid, 'pro_monthly', 10, '{"cancel_reason": "BILLING_ERROR"}');
select is((select count(*)::int from core.emails where user_id = :'f'::uuid and kind = 'pro_cancel'), 0, 'refunds and billing errors queue no pro_cancel');

-- ── a paying member cancels, turns it back on, cancels again ──
select tests.pro_ev('ep-b1', 'INITIAL_PURCHASE', :'b'::uuid, 'pro_monthly', 11, '{"price": 9.75, "price_in_purchased_currency": 8.99}');
select is((select payload ->> 'trial' from core.emails where user_id = :'b'::uuid and kind = 'pro_welcome'), 'false', 'a paid start queues the welcome too');
select is((select count(*)::int from core.emails where user_id = :'b'::uuid and kind = 'pro_trial_day5'), 0, 'and no day 5');
select tests.pro_ev('ep-b2', 'CANCELLATION', :'b'::uuid, 'pro_monthly', 12, '{"cancel_reason": "UNSUBSCRIBE"}');
select tests.pro_ev('ep-b3', 'UNCANCELLATION', :'b'::uuid, 'pro_monthly', 13);
select api.admin_emails_due(100);
select is((select status || ':' || reason from core.emails where user_id = :'b'::uuid and kind = 'pro_cancel'),
          'skipped:uncancelled', 'turned back on before it went: the cancellation email is dropped');
select tests.pro_ev('ep-b4', 'CANCELLATION', :'b'::uuid, 'pro_monthly', 14, '{"cancel_reason": "UNSUBSCRIBE"}');
select is((select count(*)::int from core.emails where user_id = :'b'::uuid and kind = 'pro_cancel'), 1, 'one cancellation email per end date');

-- ── the end: the winback ──
select tests.pro_ev('ep-b5', 'EXPIRATION', :'b'::uuid, 'pro_monthly', 15,
  jsonb_build_object('expiration_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '-1 minute')));
select is((select count(*)::int from core.emails where user_id = :'b'::uuid and kind = 'pro_winback'), 1, 'a paying App Store member who cancelled gets the winback when Pro ends');

-- the pool is empty: it waits, unsent and not dropped, and is counted
select api.admin_emails_due(100) as out2 \gset
select ok(not exists (select 1 from jsonb_array_elements(:'out2'::jsonb) x where x ->> 'kind' = 'pro_winback'), 'no winback goes out without a code');
select is((select status from core.emails where user_id = :'b'::uuid and kind = 'pro_winback'), 'due', 'it waits for codes');
select is((api.admin_email_digest() ->> 'winback_waiting')::int, 1, 'the morning email counts it');

-- the free week alone, or a Play member, gets no winback (yet)
select tests.pro_ev('ep-d3', 'EXPIRATION', :'d'::uuid, 'pro_monthly', 16,
  jsonb_build_object('period_type', 'TRIAL', 'expiration_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '-1 minute')));
select tests.pro_ev('ep-e1', 'INITIAL_PURCHASE', :'e'::uuid, 'pro_monthly', 17, '{"store": "PLAY_STORE"}');
select tests.pro_ev('ep-e2', 'EXPIRATION', :'e'::uuid, 'pro_monthly', 18,
  jsonb_build_object('store', 'PLAY_STORE', 'expiration_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '-1 minute')));
select is((select count(*)::int from core.emails where user_id in (:'d'::uuid, :'e'::uuid) and kind = 'pro_winback'), 0,
          'no winback after the free week alone, none on Google Play yet');

-- ── the codes ──
select tests.login(:'b'::uuid);
select throws_ok($$select api.admin_offer_codes_import(array['AAAA1111'], current_date + 60)$$, '42501', null, 'only an admin imports codes');
select tests.logout();
select tests.login(:'adm'::uuid);
select is(api.admin_offer_codes_import(array['abc12345', 'ABC12345 ', 'not a code!', 'XYZ98765', ''], current_date + 60) ->> 'added', '2',
          'a batch is imported once each, upper-cased, the bad lines left out');
select tests.logout();

-- someone who turned the emails off: their winback is dropped and burns no code
select tests.pro_ev('ep-g1', 'INITIAL_PURCHASE', :'g'::uuid, 'pro_yearly', 19);
update core.profiles set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || '{"game_email": false}' where user_id = :'g'::uuid;
select tests.pro_ev('ep-g2', 'EXPIRATION', :'g'::uuid, 'pro_yearly', 20,
  jsonb_build_object('expiration_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '-1 minute')));

select api.admin_emails_due(100) as out3 \gset
select is((select x -> 'payload' ->> 'code' from jsonb_array_elements(:'out3'::jsonb) x where x ->> 'kind' = 'pro_winback'),
          'ABC12345', 'with codes in the pool the winback goes out with one');
select is((select assigned_user from core.offer_codes where code = 'ABC12345'), :'b'::uuid, 'the code is given to that person');
select is((select status || ':' || reason from core.emails where user_id = :'g'::uuid and kind = 'pro_winback'), 'skipped:unsubscribed', 'the switch still rules');
select is(core.offer_codes_free(), 1, 'and the skipped one took no code');

-- once per account ever
select tests.pro_ev('ep-b6', 'RENEWAL', :'b'::uuid, 'pro_monthly', 21);
select tests.pro_ev('ep-b7', 'EXPIRATION', :'b'::uuid, 'pro_monthly', 22,
  jsonb_build_object('expiration_reason', 'UNSUBSCRIBE', 'expiration_at_ms', tests.exp_ms(interval '-1 minute')));
select is((select count(*)::int from core.emails where user_id = :'b'::uuid and kind = 'pro_winback'), 1, 'one winback per account, ever');

-- «Send me a test» of the winback carries a sample code and takes none from the pool
select tests.login(:'adm'::uuid);
select api.admin_email_test('pro_winback') as tid \gset
select tests.logout();
select api.admin_emails_due(100) as out4 \gset
select is((select x -> 'payload' ->> 'code' from jsonb_array_elements(:'out4'::jsonb) x where (x ->> 'id') = :'tid'),
          'NPTESTCODE0000', 'a test winback goes with the sample code');
select is(core.offer_codes_free(), 1, 'and leaves the pool alone');

select * from finish();
rollback;
