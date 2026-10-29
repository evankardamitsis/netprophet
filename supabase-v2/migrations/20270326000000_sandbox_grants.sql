-- Sandbox purchases give what they bought, for everyone (29 Oct). Until now a SANDBOX event gave Pro or a cosmetic
-- only to staff (admin, editor); for anyone else it was recorded with the note «sandbox» and nothing more. App Review
-- buys in the sandbox with an account of its own, and every TestFlight purchase is a sandbox one, so the reviewer and
-- our testers paid, saw «Η πληρωμή πέρασε» and never got Pro (App Review 28 Oct, Xen 29 Oct). Only invited TestFlight
-- testers, store licence testers and the stores' reviewers can buy in the sandbox, and a sandbox subscription stops
-- renewing within a day, so this gives nothing away in practice. Apple asks for exactly this: accept a sandbox
-- receipt from a production build. The purchase keeps environment = 'SANDBOX' in core.purchases.
--
-- Backfill: sandbox events already recorded with the note «sandbox» are applied again, in order, so the people who
-- bought them (Xen) get what they paid for. Same function, same idempotency (event_id), so nothing is granted twice.

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
  v_frame  boolean := false;
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
    -- «Πρώτη γενιά» follows the subscription to the account it moved to (a restore on a new login)
    if v_done and core.founding_member(v_from) then
      v_frame := core.grant_founding_frame(v_to);
    end if;
    return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note, 'founding_frame', v_frame);
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
  -- «Πρώτη γενιά»: paid Pro «Ιδρυτικό μέλος» taken by 31/12/2026 (Athens). Every renewal checks again and the
  -- insert does nothing the second time; the free week alone never gives it.
  if v_done and not v_trial and v_prod.grants = 'pro'
     and v_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                    'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE')
     and 'pro_founding' in (v_prod.product_id, core.store_product_id(e ->> 'new_product_id'))
     and core.founding_member(array[v_user]) then
    v_frame := core.grant_founding_frame(v_user);
  end if;
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note, 'founding_frame', v_frame);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;

-- the events kept back by the old rule, oldest first; a replay is a no-op for an event already applied
do $$
declare r record;
begin
  -- apply_store_event answers the webhook only (core.is_service): this block speaks as it, for this transaction
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  for r in select event_id, raw from core.purchases where note = 'sandbox' and not applied order by created_at loop
    delete from core.purchases where event_id = r.event_id;
    perform api.apply_store_event(r.raw);
  end loop;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end $$;
