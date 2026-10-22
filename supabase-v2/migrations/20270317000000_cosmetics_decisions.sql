-- Cosmetics decisions (founder, 22 Oct 2026, all approved).
--
--   1. «Πρώτη γενιά» (frame_founding) is back: it is for everyone who takes Pro «Ιδρυτικό μέλος» (store product
--      pro_founding) by 31/12/2026 23:59 Europe/Athens. It is a cosmetic only, it never gives points, ranking or
--      anything in the game (never sell advantage). api.apply_store_event gives it, as source 'earned', on a paid
--      pro_founding event that gives Pro (the first charge, every renewal, an uncancellation, a plan change, an
--      extension); the insert does nothing the second time, so renewals and replays never duplicate it. The date
--      that counts is when the person first took pro_founding: their earliest pro_founding event that gave Pro, a
--      free week included, read from the store's purchased_at_ms (else event_timestamp_ms, else when we recorded it).
--      So a free week started on 28/12 that turns paid on 4/1 still gives it; the free week alone (cancelled before
--      the charge) never does. A TRANSFER (a restore on a new login) carries it to the account Pro moved to. Same
--      Athens date line as api.pro_offer (founding_until 2026-12-31). Backfill: everyone who already paid for it.
--   2. «Φίλοι» (frame_friends) stays off until invites ship (docs/v2/STATUS.md has the TODO).
--   3. σερί 10 also gives one free freeze, next to Frame «Δέκα», only the first time the user ever reaches 10 (ΠΡ below
--      10 before, the same first time as the milestone moment), only into a free slot: with both slots full nothing
--      extra, and no retry later. core.apply_outcome (body as in 20270309000000_streak_match_order.sql) grants it as
--      freeze source 'streak10' and reports freezeGranted; core.reward_milestone (body as in 20270110000000_gear.sql)
--      puts it in the celebration's reward, so the moment reads «Ασφάλεια και κορνίζα». core.sport_rules (body as in
--      20261231000000_game_level.sql) gains milestone_freeze_at_streak 10. packages/core streak.ts is the rule
--      (MILESTONE_FREEZE_AT); shared vectors in packages/core/test-vectors/streak.json, pgTAP 80 and 150.

-- 1 ------------------------------------------------------------------------------------------------------------
update core.cosmetic_items
   set active = true, earn_rule_text = 'Για όσους μπήκαν Ιδρυτικά μέλη στο Pro ως τις 31/12'
 where key = 'frame_founding';

-- the moment a store event happened: when it was bought, else when the store sent it, else p_else
create or replace function core.store_event_at(p_event jsonb, p_else timestamptz)
returns timestamptz language sql stable set search_path = ''
as $$
  select coalesce(
    case when coalesce(p_event -> 'event', p_event) ->> 'purchased_at_ms' ~ '^[0-9]{1,15}$'
         then to_timestamp((coalesce(p_event -> 'event', p_event) ->> 'purchased_at_ms')::numeric / 1000) end,
    case when coalesce(p_event -> 'event', p_event) ->> 'event_timestamp_ms' ~ '^[0-9]{1,15}$'
         then to_timestamp((coalesce(p_event -> 'event', p_event) ->> 'event_timestamp_ms')::numeric / 1000) end,
    p_else)
$$;
revoke all on function core.store_event_at(jsonb, timestamptz) from public, anon, authenticated;

-- a founding member: already wears «Πρώτη γενιά», or first took Pro «Ιδρυτικό μέλος» on or before 31/12/2026 Athens
create or replace function core.founding_member(p_users uuid[])
returns boolean language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                  where c.key = 'frame_founding' and uc.user_id = any (p_users))
      or coalesce((select (min(core.store_event_at(p.raw, p.created_at)) at time zone 'Europe/Athens')::date <= date '2026-12-31'
                     from core.purchases p
                    where p.user_id = any (p_users) and p.applied
                      and (p.product_id = 'pro_founding' or coalesce(p.raw -> 'event', p.raw) ->> 'new_product_id' = 'pro_founding')
                      and p.event_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE',
                                           'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE')),
                  false)
$$;
revoke all on function core.founding_member(uuid[]) from public, anon, authenticated;
grant execute on function core.founding_member(uuid[]) to service_role;

-- «Πρώτη γενιά» into the wardrobe, once; true when it was given now
create or replace function core.grant_founding_frame(p_user uuid)
returns boolean language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if p_user is null then return false; end if;
  insert into core.user_cosmetics (user_id, item_id, source)
  select p_user, id, 'earned' from core.cosmetic_items where key = 'frame_founding' and active
  on conflict (user_id, item_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke all on function core.grant_founding_frame(uuid) from public, anon, authenticated;
grant execute on function core.grant_founding_frame(uuid) to service_role;

-- the store applies it (api.apply_store_event, otherwise as in 20270221000000_security_pass_2.sql)
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
    insert into core.purchases (event_id, user_id, store, environment, event_type, product_id, expires_at, price_eur,
                                applied, note, raw)
    values (v_id, v_to, coalesce(e ->> 'store', 'UNKNOWN'), v_env, v_type, e ->> 'product_id', v_moved, null,
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

  insert into core.purchases (event_id, user_id, store, environment, event_type, product_id, expires_at, price_eur,
                              applied, note, raw)
  values (v_id, v_user, coalesce(e ->> 'store', 'UNKNOWN'), v_env, v_type, e ->> 'product_id', v_exp, v_price,
          v_done, coalesce(v_note, case when v_trial then 'trial' end), p_event);
  -- «Πρώτη γενιά»: paid Pro «Ιδρυτικό μέλος» taken by 31/12/2026 (Athens). Every renewal checks again and the
  -- insert does nothing the second time; the free week alone never gives it.
  if v_done and not v_trial and v_prod.grants = 'pro'
     and v_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                    'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE')
     and 'pro_founding' in (v_prod.product_id, e ->> 'new_product_id')
     and core.founding_member(array[v_user]) then
    v_frame := core.grant_founding_frame(v_user);
  end if;
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note, 'founding_frame', v_frame);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;

-- everyone who already paid for Pro «Ιδρυτικό μέλος» (most likely nobody yet)
insert into core.user_cosmetics (user_id, item_id, source)
select distinct p.user_id, c.id, 'earned'
  from core.purchases p
  join core.cosmetic_items c on c.key = 'frame_founding'
  join auth.users u on u.id = p.user_id
 where p.applied and p.product_id = 'pro_founding'
   and upper(coalesce(coalesce(p.raw -> 'event', p.raw) ->> 'period_type', '')) <> 'TRIAL'
   and p.event_type in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                        'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE')
   and core.founding_member(array[p.user_id])
on conflict (user_id, item_id) do nothing;

-- 3 ------------------------------------------------------------------------------------------------------------
create or replace function core.sport_rules(p_sport text)
returns jsonb language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'correct', 10, 'upset', 30, 'chain', 5, 'daily_quiz', 30, 'freeze_max', 2,
           'free_freeze_every_votes', 15, 'first_free_freeze_at_streak', 3, 'milestone_freeze_at_streak', 10,
           'upset_share_max', 0.40, 'upset_min_votes', 10,
           'streak_milestones', jsonb_build_array(3, 5, 7, 10),
           'game_level_step', 100
         ) || coalesce((select config -> 'rules' from core.sports where id = p_sport), '{}'::jsonb)
$$;

alter table core.freezes drop constraint if exists freezes_source_check;
alter table core.freezes add constraint freezes_source_check
  check (source in ('streak3', 'streak10', 'every15', 'purchase', 'gift'));

create or replace function core.apply_outcome(p_user uuid, p_vote uuid, p_correct boolean, p_at timestamptz,
                                              p_sport text default 'tennis')
returns jsonb language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_rules    jsonb := core.sport_rules(p_sport);
  v_fmax     int := (v_rules ->> 'freeze_max')::int;
  v_first_at int := (v_rules ->> 'first_free_freeze_at_streak')::int;
  v_ten_at   int := (v_rules ->> 'milestone_freeze_at_streak')::int;
  gs         core.user_game_state;
  v_chain_before int;
  v_best_before  int;
  v_fid      uuid;
  v_free     record;
  v_granted  boolean := false;
  v_milestone int;
  v_event    jsonb;
  v_record   int;
begin
  perform core.ensure_game_state(p_user);
  select * into gs from core.user_game_state where user_id = p_user for update;
  v_chain_before := gs.chain;
  v_best_before := gs.streak_best;

  if p_correct then
    insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
    values (p_user, p_vote, gs.streak, gs.streak + 1, 'correct');
    gs.streak := gs.streak + 1;
    gs.chain := gs.chain + 1;
    gs.votes_correct := gs.votes_correct + 1;
    gs.streak_best := greatest(gs.streak_best, gs.streak);
    -- «Νέο ρεκόρ»: the first card of this run past the ΠΡ it started from (nothing to beat when that was 0)
    if gs.streak_best > v_best_before and not gs.record_run and v_best_before > 0 then
      v_record := gs.streak;
    end if;
    gs.record_run := gs.record_run or gs.streak_best > v_best_before;

    -- the first free freeze: when sigma reaches exactly 3, once, only if a slot is free
    if gs.streak = v_first_at and not gs.first_free_at3_done then
      v_fid := core.grant_freeze(p_user, 'free', 'streak3', v_fmax);
      if v_fid is not null then
        gs.first_free_at3_done := true;
        v_granted := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      end if;
    end if;

    -- σερί 10 (founder, 22 Oct 2026): one more free freeze, only the first time ever (ΠΡ below 10 before), only into
    -- a free slot; with both slots full nothing extra and no retry later
    if gs.streak = v_ten_at and v_best_before < v_ten_at then
      v_fid := core.grant_freeze(p_user, 'free', 'streak10', v_fmax);
      if v_fid is not null then
        v_granted := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      end if;
    end if;

    if gs.streak = any (select jsonb_array_elements_text(v_rules -> 'streak_milestones')::int) then
      v_milestone := gs.streak;
    end if;
    v_event := jsonb_build_object('kind', 'advanced', 'milestone', v_milestone,
                                  'newBest', gs.streak_best > v_best_before, 'freezeGranted', v_granted,
                                  'record', v_record);

  elsif gs.streak = 0 then
    -- a wrong vote with no sigma to protect: nothing is spent, nothing is logged
    gs.chain := 0;
    v_event := jsonb_build_object('kind', 'idle');

  else
    -- a freeze absorbs the wrong vote: the free one first (keeps number and chain), then the oldest paid one
    -- (keeps the number only, the chain restarts)
    select f.id, f.kind into v_free
      from core.freezes f where f.user_id = p_user and f.used_at is null
     order by (f.kind = 'free') desc, f.acquired_at, f.id limit 1 for update;
    if found then
      update core.freezes set used_at = clock_timestamp(), used_on_vote_id = p_vote where id = v_free.id;
      if v_free.kind = 'paid' then gs.chain := 0; end if;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
      values (p_user, p_vote, gs.streak, gs.streak, v_free.id, 'freeze_used');
      v_event := jsonb_build_object('kind', 'frozen', 'freezeUsed', v_free.kind);
    else
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
      values (p_user, p_vote, gs.streak, 0, 'broke');
      v_event := jsonb_build_object('kind', 'broken', 'lostStreak', gs.streak);
      gs.streak := 0;
      gs.chain := 0;
      gs.broke_at := p_at;
      gs.record_run := false;
    end if;
  end if;

  update core.user_game_state
     set streak = gs.streak, streak_best = gs.streak_best, chain = gs.chain, votes_correct = gs.votes_correct,
         first_free_at3_done = gs.first_free_at3_done, broke_at = gs.broke_at, record_run = gs.record_run,
         version = version + 1, updated_at = now()
   where user_id = p_user;

  return jsonb_build_object('event', v_event, 'chain_before', v_chain_before);
end;
$$;

create or replace function core.reward_milestone()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_n      int := (new.payload ->> 'streak')::int;
  v_freeze boolean := false;
  v_frame  text;
  v_key    text := case v_n when 7 then 'frame_seven' when 10 then 'frame_ten' end;
  v_n_ins  int;
  v_gear   text;
begin
  if new.kind <> 'celebration' or new.payload ->> 'type' <> 'streak_milestone' then return new; end if;
  if v_n in (3, 10) then
    -- the resolver grants it on the same vote, just before (σερί 3: the first free freeze; σερί 10: one more)
    v_freeze := exists (select 1 from core.streak_events e join core.freezes f on f.id = e.freeze_id
                         where e.user_id = new.user_id and e.kind = 'freeze_earned' and f.source in ('streak3', 'streak10')
                           and e.vote_id = (select id from core.votes where user_id = new.user_id and subject_type = 'match'
                                               and subject_id = (new.payload ->> 'match_id')::uuid));
  end if;
  if v_key is not null then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = v_key
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_frame := v_key; end if;
  end if;
  -- 5 in a row: the lime headband (lime is earned, never bought)
  if v_n = 5 then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = 'gear_headband'
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_gear := 'gear_headband'; end if;
  end if;
  new.payload := new.payload || jsonb_build_object('reward', jsonb_build_object('freeze', v_freeze, 'frame', v_frame, 'gear', v_gear));
  return new;
end;
$$;
