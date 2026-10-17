-- Paying for Pro and the cosmetics (founder, 17 Oct 2026: "build them"; prices 8,99 a month, 69,99 a year, founding
-- members 49,99 the first year until 31 Dec 2026; "plus all the cosmetic purchases we have"). RevenueCat holds the
-- catalogue and Stripe (web), Google Play and later Apple take the money; every purchase event reaches us through one
-- webhook (the revenuecat-webhook edge function) and api.apply_store_event, which is the only thing that turns Pro on
-- or off for a payment or adds a bought item. The free week needs no card: we give it once per account. The Pro
-- offers in the app are capped: one a day, none in the first three days.

-- ── what can be bought ───────────────────────────────────────────────────────────────────────────────────────────
create table core.store_products (
  product_id  text primary key,
  kind        text not null check (kind in ('subscription', 'one_time')),
  -- what it gives: Pro, or a cosmetic by its key
  grants      text not null check (grants = 'pro' or grants like 'cos:%'),
  price_eur   numeric(6, 2) not null,
  period      text check (period in ('month', 'year')),
  note        text,
  active      boolean not null default true
);
alter table core.store_products enable row level security;

insert into core.store_products (product_id, kind, grants, price_eur, period, note) values
('pro_monthly',  'subscription', 'pro', 8.99,  'month', null),
('pro_yearly',   'subscription', 'pro', 69.99, 'year',  null),
('pro_founding', 'subscription', 'pro', 49.99, 'year',  'Founding members: the first year at 49,99, then 69,99; sold until 31 Dec 2026');

-- every cosmetic that is bought today, at its price: cos_<key>
insert into core.store_products (product_id, kind, grants, price_eur)
select 'cos_' || key, 'one_time', 'cos:' || key, price_eur
  from core.cosmetic_items where active and kind in ('buy', 'pack') and price_eur is not null
on conflict (product_id) do nothing;

-- ── what was bought ──────────────────────────────────────────────────────────────────────────────────────────────
create table core.purchases (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null unique,            -- the provider's event id: one event is applied once
  user_id     uuid references auth.users (id) on delete set null,
  store       text not null,                   -- STRIPE, RC_BILLING, PLAY_STORE, APP_STORE, ...
  environment text not null default 'PRODUCTION',
  event_type  text not null,
  product_id  text,
  expires_at  timestamptz,
  price_eur   numeric(8, 2),
  applied     boolean not null default false,
  note        text,
  raw         jsonb not null,
  created_at  timestamptz not null default now()
);
create index purchases_user_idx on core.purchases (user_id, created_at desc);
alter table core.purchases enable row level security;

-- the free week, and the offers shown, for the caps
alter table core.entitlements drop constraint if exists entitlements_source_check;
alter table core.entitlements add constraint entitlements_source_check
  check (source in ('subscription', 'gift', 'promo', 'migration', 'waitlist', 'trial'));

create table core.pro_offers_shown (
  user_id  uuid not null references auth.users (id) on delete cascade,
  moment   text not null,
  shown_at timestamptz not null default now()
);
create index pro_offers_shown_idx on core.pro_offers_shown (user_id, shown_at desc);
alter table core.pro_offers_shown enable row level security;

-- ── applying a store event ───────────────────────────────────────────────────────────────────────────────────────
-- p_event is RevenueCat's webhook body: {"event": {id, type, app_user_id, product_id, expiration_at_ms, store,
-- environment, price, cancel_reason, ...}}. app_user_id is our auth user id (the app logs in to RevenueCat with it).
create or replace function api.apply_store_event(p_event jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  e        jsonb := coalesce(p_event -> 'event', p_event);
  v_id     text := e ->> 'id';
  v_type   text := upper(coalesce(e ->> 'type', ''));
  v_user   uuid;
  v_prod   core.store_products;
  v_exp    timestamptz;
  v_item   uuid;
  v_note   text;
  v_done   boolean := false;
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_id is null then raise exception 'event_without_id' using errcode = '22023'; end if;
  if exists (select 1 from core.purchases where event_id = v_id) then
    return jsonb_build_object('event_id', v_id, 'duplicate', true);
  end if;

  begin
    v_user := (e ->> 'app_user_id')::uuid;
  exception when others then
    v_user := null;   -- an anonymous RevenueCat id: kept for the record, nothing to grant
  end;
  if v_user is not null and not exists (select 1 from auth.users where id = v_user) then v_user := null; end if;
  select * into v_prod from core.store_products where product_id = e ->> 'product_id';
  if (e ->> 'expiration_at_ms') is not null then
    v_exp := to_timestamp((e ->> 'expiration_at_ms')::numeric / 1000);
  end if;

  if v_user is null then
    v_note := 'no user';
  elsif v_prod.product_id is null and v_type not in ('TEST') then
    v_note := 'unknown product';
  elsif v_prod.grants = 'pro' then
    if v_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                  'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE') then
      -- one paid Pro row per person, moved to the new end; a free week in progress gives way to it
      update core.entitlements set status = 'expired', ends_at = now()
       where user_id = v_user and key = 'pro' and source = 'trial' and status = 'active';
      update core.entitlements set ends_at = coalesce(v_exp, ends_at), status = 'active'
       where user_id = v_user and key = 'pro' and source = 'subscription';
      if not found then
        insert into core.entitlements (user_id, key, source, status, ends_at)
        values (v_user, 'pro', 'subscription', 'active', v_exp);
      end if;
      v_done := true;
    elsif v_type = 'EXPIRATION' then
      update core.entitlements set status = 'expired', ends_at = least(coalesce(ends_at, now()), now())
       where user_id = v_user and key = 'pro' and source = 'subscription' and status = 'active';
      v_done := true;
    elsif v_type = 'CANCELLATION' and e ->> 'cancel_reason' = 'CUSTOMER_SUPPORT' then
      -- a refund: Pro ends now
      update core.entitlements set status = 'expired', ends_at = now()
       where user_id = v_user and key = 'pro' and source = 'subscription' and status = 'active';
      v_done := true;
    else
      -- CANCELLATION (auto-renew off: Pro runs to its end), BILLING_ISSUE (the store retries), and the rest: record only
      v_note := 'recorded';
    end if;
  else
    -- a cosmetic, owned for good; a refund takes it back
    select id into v_item from core.cosmetic_items where key = substr(v_prod.grants, 5);
    if v_item is null then
      v_note := 'unknown item';
    elsif v_type in ('NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE') then
      insert into core.user_cosmetics (user_id, item_id, source) values (v_user, v_item, 'bought')
      on conflict (user_id, item_id) do nothing;
      v_done := true;
    elsif v_type = 'CANCELLATION' and e ->> 'cancel_reason' = 'CUSTOMER_SUPPORT' then
      delete from core.user_equipped where user_id = v_user and item_id = v_item;
      delete from core.user_cosmetics where user_id = v_user and item_id = v_item and source = 'bought';
      v_done := true;
    else
      v_note := 'recorded';
    end if;
  end if;

  insert into core.purchases (event_id, user_id, store, environment, event_type, product_id, expires_at, price_eur,
                              applied, note, raw)
  values (v_id, v_user, coalesce(e ->> 'store', 'UNKNOWN'), coalesce(e ->> 'environment', 'PRODUCTION'), v_type,
          e ->> 'product_id', v_exp, nullif(e ->> 'price', '')::numeric, v_done, v_note, p_event);
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;

-- ── the free week ────────────────────────────────────────────────────────────────────────────────────────────────
/** a week of Pro, once per account, never on top of Pro already running */
create or replace function api.start_pro_trial()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_end timestamptz := now() + interval '7 days';
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and source = 'trial') then
    raise exception 'trial_used' using errcode = '23505';
  end if;
  if core.is_pro(v_uid) then raise exception 'already_pro' using errcode = '23505'; end if;
  insert into core.entitlements (user_id, key, source, status, ends_at) values (v_uid, 'pro', 'trial', 'active', v_end);
  return jsonb_build_object('ends_at', v_end);
end;
$$;
revoke all on function api.start_pro_trial() from public, anon;
grant execute on function api.start_pro_trial() to authenticated, service_role;

-- ── what the Pro screen and the offers need ──────────────────────────────────────────────────────────────────────
/**
 * The plans with their prices (founding while it lasts), whether the free week is still yours, and whether an offer
 * may show now: not to Pro, not in the first three days after sign-up, at most one a day.
 */
create or replace function api.pro_offer()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_founding boolean := core.athens_day() <= date '2026-12-31';
  v_joined   timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select created_at into v_joined from auth.users where id = v_uid;
  return jsonb_build_object(
    'pro', core.is_pro(v_uid),
    'trial_available', not exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and source = 'trial')
                       and not core.is_pro(v_uid),
    'on_trial', exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and source = 'trial'
                         and status = 'active' and ends_at > now()),
    'founding_until', case when v_founding then '2026-12-31' end,
    'plans', (select jsonb_agg(jsonb_build_object('product_id', p.product_id, 'price', p.price_eur, 'period', p.period)
                               order by p.price_eur desc)
                from core.store_products p
               where p.grants = 'pro' and p.active
                 and (p.product_id <> 'pro_founding' or v_founding)
                 and (p.product_id <> 'pro_yearly' or not v_founding)),
    'can_offer', not core.is_pro(v_uid)
                 and coalesce(v_joined, now()) < now() - interval '3 days'
                 and not exists (select 1 from core.pro_offers_shown s
                                  where s.user_id = v_uid and s.shown_at > now() - interval '20 hours'));
end;
$$;
revoke all on function api.pro_offer() from public, anon;
grant execute on function api.pro_offer() to authenticated, service_role;

/** an offer was shown at this moment (draw, before_match, after_loss, quiz, me): the cap counts it */
create or replace function api.pro_offer_shown(p_moment text)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_moment not in ('draw', 'before_match', 'after_loss', 'quiz', 'me') then
    raise exception 'invalid_moment' using errcode = '22023';
  end if;
  insert into core.pro_offers_shown (user_id, moment) values (auth.uid(), p_moment);
end;
$$;
revoke all on function api.pro_offer_shown(text) from public, anon;
grant execute on function api.pro_offer_shown(text) to authenticated, service_role;

/** the store catalogue for the app: the product id to buy for each cosmetic */
create or replace function api.store_products()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'kind', kind, 'grants', grants,
                                               'price', price_eur, 'period', period) order by product_id), '[]'::jsonb)
    from core.store_products where active
$$;
revoke all on function api.store_products() from public, anon;
grant execute on function api.store_products() to authenticated, service_role;

-- staff: the latest purchases, for the admin
create or replace function api.admin_purchases(p_limit int default 100)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_staff() or core.is_service()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('at', x.created_at, 'store', x.store, 'environment', x.environment,
                                        'type', x.event_type, 'product_id', x.product_id, 'price', x.price_eur,
                                        'applied', x.applied, 'note', x.note,
                                        'person', (select display_name from core.profiles where user_id = x.user_id))
                     order by x.created_at desc)
      from (select * from core.purchases order by created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) x),
    '[]'::jsonb);
end;
$$;
revoke all on function api.admin_purchases(int) from public, anon;
grant execute on function api.admin_purchases(int) to authenticated, service_role;
