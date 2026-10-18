-- The free week, with a card (founder, 18 Oct: "we need to get the users card or else we have higher chance he
-- doesnt pay"). The week is no longer ours: it is the store's free trial on every Pro plan (Stripe through RevenueCat
-- Web Billing, a Google Play free-trial offer, later Apple), so the card is taken at the start and the plan is charged
-- on day 8 unless the player cancels. The week is full Pro.
--
-- RevenueCat says so on the webhook: INITIAL_PURCHASE with period_type TRIAL. We keep it as a 'trial' row to the
-- store's end; the RENEWAL that charges the card turns it into the paid row (the existing path); EXPIRATION or a
-- refund ends it. Our own no-card week (api.start_pro_trial) goes.
--
-- Two more fixes while here: a sandbox purchase (Stripe test mode, Play testers) grants Pro only to staff, so a test
-- purchase never unlocks a real player; and RevenueCat's `price` is in USD, so price_eur now takes the purchased
-- currency's price when that currency is EUR, and stays empty otherwise (the raw event keeps everything).

drop function if exists api.start_pro_trial();

/** has this account had a free week, or paid for Pro before: then the plans start with a charge */
create or replace function core.pro_trial_used(p_user uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.entitlements
                  where user_id = p_user and key = 'pro' and source in ('trial', 'subscription'))
      or exists (select 1 from core.purchases p
                   join core.store_products s on s.product_id = p.product_id and s.grants = 'pro'
                  where p.user_id = p_user)
$$;
revoke all on function core.pro_trial_used(uuid) from public, anon, authenticated;

create or replace function api.apply_store_event(p_event jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  e        jsonb := coalesce(p_event -> 'event', p_event);
  v_id     text := e ->> 'id';
  v_type   text := upper(coalesce(e ->> 'type', ''));
  v_env    text := upper(coalesce(e ->> 'environment', 'PRODUCTION'));
  v_trial  boolean := upper(coalesce(e ->> 'period_type', '')) = 'TRIAL';
  v_user   uuid;
  v_prod   core.store_products;
  v_exp    timestamptz;
  v_item   uuid;
  v_note   text;
  v_done   boolean := false;
  v_price  numeric;
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
  if upper(coalesce(e ->> 'currency', '')) = 'EUR' then
    begin
      v_price := nullif(e ->> 'price_in_purchased_currency', '')::numeric;
    exception when others then
      v_price := null;
    end;
  end if;

  if v_user is null then
    v_note := 'no user';
  elsif v_env = 'SANDBOX' and not exists (select 1 from core.profiles
                                           where user_id = v_user and role in ('admin', 'editor') and deleted_at is null) then
    -- a test purchase by a player: recorded, never granted
    v_note := 'sandbox';
  elsif v_prod.product_id is null and v_type not in ('TEST') then
    v_note := 'unknown product';
  elsif v_prod.grants = 'pro' then
    if v_type = 'INITIAL_PURCHASE' and v_trial then
      -- the free week starts: full Pro to the store's end, the card charged after it
      update core.entitlements set ends_at = coalesce(v_exp, ends_at), status = 'active'
       where user_id = v_user and key = 'pro' and source = 'trial';
      if not found then
        insert into core.entitlements (user_id, key, source, status, ends_at)
        values (v_user, 'pro', 'trial', 'active', coalesce(v_exp, now() + interval '7 days'));
      end if;
      v_done := true;
    elsif v_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                     'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE') then
      if v_trial then
        -- still inside the free week (a plan change or an extension): it moves with the store
        update core.entitlements set ends_at = coalesce(v_exp, ends_at), status = 'active'
         where user_id = v_user and key = 'pro' and source = 'trial';
      else
        -- one paid Pro row per person, moved to the new end; the free week gives way to it
        update core.entitlements set status = 'expired', ends_at = now()
         where user_id = v_user and key = 'pro' and source = 'trial' and status = 'active';
        update core.entitlements set ends_at = coalesce(v_exp, ends_at), status = 'active'
         where user_id = v_user and key = 'pro' and source = 'subscription';
        if not found then
          insert into core.entitlements (user_id, key, source, status, ends_at)
          values (v_user, 'pro', 'subscription', 'active', v_exp);
        end if;
      end if;
      v_done := true;
    elsif v_type = 'EXPIRATION' then
      update core.entitlements set status = 'expired', ends_at = least(coalesce(ends_at, now()), now())
       where user_id = v_user and key = 'pro' and source in ('subscription', 'trial') and status = 'active';
      v_done := true;
    elsif v_type = 'CANCELLATION' and e ->> 'cancel_reason' = 'CUSTOMER_SUPPORT' then
      -- a refund: Pro ends now
      update core.entitlements set status = 'expired', ends_at = now()
       where user_id = v_user and key = 'pro' and source in ('subscription', 'trial') and status = 'active';
      v_done := true;
    else
      -- CANCELLATION (auto-renew off, also inside the free week: Pro runs to its end), BILLING_ISSUE (the store
      -- retries), and the rest: record only
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
  values (v_id, v_user, coalesce(e ->> 'store', 'UNKNOWN'), v_env, v_type, e ->> 'product_id', v_exp, v_price,
          v_done, coalesce(v_note, case when v_trial then 'trial' end), p_event);
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;

/** the Pro screen's plans: the free week is there until the account has had it or paid */
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
    'trial_available', not core.pro_trial_used(v_uid) and not core.is_pro(v_uid),
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
