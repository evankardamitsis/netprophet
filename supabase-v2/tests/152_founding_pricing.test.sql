-- Founding pricing (founder, 22 Oct 2026): «Ιδρυτικό μέλος» is 49,99€ the first year, then 69,99€ a year, sold until
-- 31/12. The Pro screen gets the price after the first year from api.pro_offer. On Google Play the founding offer's
-- phases arrive as TRIAL, then INTRO at 49,99€, then NORMAL at 69,99€: the INTRO year is paid Pro and gives
-- «Πρώτη γενιά», the free week alone does not.
begin;
select plan(8);

create function tests.ms(p_at timestamptz) returns bigint language sql as $$ select (extract(epoch from p_at) * 1000)::bigint $$;
create function tests.play(p_id text, p_type text, p_user uuid, p_at timestamptz, p_period text, p_price numeric)
returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform tests.as_service();
  r := api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
         'id', p_id, 'type', p_type, 'period_type', p_period, 'app_user_id', p_user, 'product_id', 'pro_founding:yearly',
         'store', 'PLAY_STORE', 'environment', 'PRODUCTION', 'currency', 'EUR', 'price_in_purchased_currency', p_price,
         'purchased_at_ms', tests.ms(p_at), 'event_timestamp_ms', tests.ms(p_at),
         'expiration_at_ms', tests.ms(greatest(p_at, now()) + interval '1 year'))));
  perform tests.logout();
  return r;
end $$;
create function tests.founding(p_user uuid) returns int language sql as $$
  select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
   where uc.user_id = p_user and c.key = 'frame_founding'
$$;

select tests.create_user('fp-a@test.local') as a \gset

-- the price after the first year
select is((select renews_eur from core.store_products where product_id = 'pro_founding'), 69.99::numeric(6, 2),
          'Ιδρυτικό μέλος renews at 69,99');
select tests.login(:'a'::uuid);
select is((select (x ->> 'renews')::numeric from jsonb_array_elements(api.pro_offer() -> 'plans') x
            where x ->> 'product_id' = 'pro_founding'),
          case when core.athens_day() <= date '2026-12-31' then 69.99 end,
          'the offer says 69,99 after the founding year (while it is sold)');
select is((select (x ->> 'renews')::numeric from jsonb_array_elements(api.pro_offer() -> 'plans') x
            where x ->> 'product_id' = 'pro_monthly'), 8.99, 'a plain plan renews at its own price');
select tests.logout();

-- the Play offer, phase by phase: 7 days free on 28/12, the first year at 49,99 on 4/1, 69,99 a year later
select tests.play('fp1', 'INITIAL_PURCHASE', :'a'::uuid, '2026-12-28 12:00+02', 'TRIAL', 0) is not null as x \gset
select ok(core.is_pro(:'a'::uuid), 'the Play free week on «Ιδρυτικό μέλος» is Pro');
select is(tests.founding(:'a'::uuid), 0, 'the free week alone gives no frame');
select is((tests.play('fp2', 'RENEWAL', :'a'::uuid, '2027-01-04 12:00+02', 'INTRO', 49.99) ->> 'founding_frame')::boolean,
          true, 'the 49,99 year (INTRO) after a free week started on 28/12 gives «Πρώτη γενιά»');
select is((tests.play('fp3', 'RENEWAL', :'a'::uuid, '2028-01-04 12:00+02', 'NORMAL', 69.99) ->> 'applied')::boolean,
          true, 'the 69,99 renewal a year later keeps Pro');
select is(tests.founding(:'a'::uuid), 1, 'and the frame once');

select * from finish();
rollback;
