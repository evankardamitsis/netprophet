-- Google Play product ids (launch blocker, 22 Oct 2026). RevenueCat names a Google Play subscription by
-- «<subscription id>:<base plan id>» (RevenueCat docs, Android products: products set up since Feb 2023 use
-- `<subscription_id>:<base-plan-id>`), so Play sends «pro_monthly:monthly», «pro_yearly:yearly» and
-- «pro_founding:yearly» where the App Store and the web send «pro_monthly». api.apply_store_event looked the product
-- up by the exact id, so every Pro bought on Play was recorded as «unknown product» and gave nothing.
--
-- Now the id is normalized once, by core.store_product_id: the exact id when we sell it, else the part before «:»
-- when we sell that, else the id as it came (still unknown, still rejected). core.purchases.product_id keeps the
-- normalized id, so everything that reads it later (core.pro_trial_used, renewals, refunds, TRANSFER, the founding
-- checks) works for Play exactly as for the App Store; the new raw_product_id keeps what the store sent.
-- api.apply_store_event is otherwise as in 20270221000000_security_pass_2.sql. One-time items (cos_*) are not
-- subscriptions on Play and keep their plain id; they go through the same lookup anyway.

-- what the store sent, next to the id we sell it as
alter table core.purchases add column if not exists raw_product_id text;

-- the product we sell for a store id: exact first, else the Play subscription id before «:», else the id unchanged
create or replace function core.store_product_id(p_id text)
returns text language sql stable set search_path = ''
as $$
  select coalesce(
    (select s.product_id from core.store_products s where s.product_id = p_id),
    (select s.product_id from core.store_products s
      where position(':' in p_id) > 1 and s.product_id = split_part(p_id, ':', 1)),
    p_id)
$$;
revoke all on function core.store_product_id(text) from public, anon, authenticated;
grant execute on function core.store_product_id(text) to service_role;

-- rows already recorded: keep what came, and give a Play id its product (Play is not live yet, so most likely none)
update core.purchases set raw_product_id = product_id where raw_product_id is null;
update core.purchases set product_id = core.store_product_id(product_id)
 where product_id like '%:%' and core.store_product_id(product_id) <> product_id;

-- the store applies it, with the normalized id
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
  v_from   uuid[] := '{}';
  v_to     uuid;
  v_moved  timestamptz;
  x        text;
  -- Google Play ids come as «<subscription>:<base plan>»: one id for every store from here on
  v_pid    text := core.store_product_id(e ->> 'product_id');
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_id is null then raise exception 'event_without_id' using errcode = '22023'; end if;
  if exists (select 1 from core.purchases where event_id = v_id) then
    return jsonb_build_object('event_id', v_id, 'duplicate', true);
  end if;

  if v_type = 'TRANSFER' then
    -- the store moved a subscription between accounts (a restore on a new login): Pro leaves the old accounts and
    -- the new one gets it, to the latest end the old ones had. Bought cosmetics stay where they are.
    for x in select jsonb_array_elements_text(coalesce(e -> 'transferred_from', '[]'::jsonb)) loop
      begin
        v_from := v_from || x::uuid;
      exception when others then
        null;   -- an anonymous RevenueCat id: nothing of ours to take from
      end;
    end loop;
    for x in select jsonb_array_elements_text(coalesce(e -> 'transferred_to', '[]'::jsonb)) loop
      begin
        v_to := x::uuid;
      exception when others then
        v_to := null;
      end;
      exit when v_to is not null and exists (select 1 from auth.users where id = v_to);
      v_to := null;
    end loop;
    v_from := array_remove(v_from, v_to);
    select max(coalesce(ends_at, now())) into v_moved
      from core.entitlements
     where user_id = any (v_from) and key = 'pro' and source in ('subscription', 'trial') and status = 'active'
       and (ends_at is null or ends_at > now());
    if v_to is null then
      v_note := 'no user';
    elsif v_env = 'SANDBOX' and not exists (select 1 from core.profiles
                                             where user_id = v_to and role in ('admin', 'editor') and deleted_at is null) then
      v_note := 'sandbox';
    elsif v_moved is null then
      v_note := 'nothing to move';
    else
      update core.entitlements set status = 'expired', ends_at = now()
       where user_id = any (v_from) and key = 'pro' and source in ('subscription', 'trial') and status = 'active';
      update core.entitlements set status = 'active', ends_at = greatest(coalesce(ends_at, v_moved), v_moved)
       where user_id = v_to and key = 'pro' and source = 'subscription';
      if not found then
        insert into core.entitlements (user_id, key, source, status, ends_at)
        values (v_to, 'pro', 'subscription', 'active', v_moved);
      end if;
      v_done := true;
    end if;
    insert into core.purchases (event_id, user_id, store, environment, event_type, product_id, raw_product_id,
                                expires_at, price_eur, applied, note, raw)
    values (v_id, v_to, coalesce(e ->> 'store', 'UNKNOWN'), v_env, v_type, v_pid, e ->> 'product_id', v_moved, null,
            v_done, coalesce(v_note, 'transfer'), p_event);
    return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
  end if;

  begin
    v_user := (e ->> 'app_user_id')::uuid;
  exception when others then
    v_user := null;   -- an anonymous RevenueCat id: kept for the record, nothing to grant
  end;
  if v_user is not null and not exists (select 1 from auth.users where id = v_user) then v_user := null; end if;
  select * into v_prod from core.store_products where product_id = v_pid;
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
      elsif v_exp is null and v_type <> 'NON_RENEWING_PURCHASE' then
        -- a subscription always has an end: without one, record it and grant nothing (never Pro for ever)
        v_note := 'no expiry';
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
      v_done := v_note is null;
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

  insert into core.purchases (event_id, user_id, store, environment, event_type, product_id, raw_product_id,
                              expires_at, price_eur, applied, note, raw)
  values (v_id, v_user, coalesce(e ->> 'store', 'UNKNOWN'), v_env, v_type, v_pid, e ->> 'product_id', v_exp, v_price,
          v_done, coalesce(v_note, case when v_trial then 'trial' end), p_event);
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;
