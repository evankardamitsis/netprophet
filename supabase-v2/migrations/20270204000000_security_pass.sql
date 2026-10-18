-- Security pass (18 Oct 2026). Fixes from the audit that change no product rule:
-- - the store: a Pro event without an end never grants Pro for ever; one free week row per account (a unique index)
-- - the quiz: a card's right answer and reveal stay on the server until you answer it
-- - links: claiming through a match link never takes a player who chose to hide, and never un-hides them
-- - kudos: only on matches that are approved
-- - offers: «shown» counts once a day, so it cannot grow without end
-- - purchases: the list is for admins, not editors
-- - functions in core: no default execute for PUBLIC or anon (core is not exposed today; this keeps it so if it ever is)

-- ── the store ──
create unique index if not exists entitlements_one_trial on core.entitlements (user_id) where key = 'pro' and source = 'trial';

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
  return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
end;
$$;
revoke all on function api.apply_store_event(jsonb) from public, anon, authenticated;
grant execute on function api.apply_store_event(jsonb) to service_role;

-- ── the quiz ──
create or replace function api.get_quiz()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := core.quiz_day_key(now());
  v_set  uuid;
  s      core.quiz_sets;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_set := core.quiz_build_set(v_uid, v_day);
  select * into s from core.quiz_sets where id = v_set;
  return jsonb_build_object(
    'quiz_day', v_day,
    'required', 6,
    'pro', s.pro,
    'awarded', s.awarded_at is not null,
    'next_at', ((v_day + 1)::timestamp + interval '9 hours') at time zone 'Europe/Athens',
    'answered', (select count(*) from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                  where v.user_id = v_uid and v.subject_type = 'card' and c.set_id = v_set),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'position', c.position, 'family', c.family, 'content', case when v.option is null then c.content - 'right' - 'reveal' else c.content end,
               'my_option', v.option,
               'split', case when v.option is not null then core.quiz_split(c.id) end) order by c.position)
        from core.quiz_set_cards c
        left join core.votes v on v.user_id = v_uid and v.subject_type = 'card' and v.subject_id = c.id
       where c.set_id = v_set), '[]'::jsonb));
end;
$$;

-- the answer brings the reveal with it, now that the card has none before
create or replace function api.answer_card(p_card uuid, p_option int, p_client_event_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_today    date := core.athens_day();
  c          core.quiz_set_cards;
  s          core.quiz_sets;
  v_today_n  int;
  v_answered int;
  v_parts    jsonb;
  v_awarded  int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from core.quiz_set_cards where id = p_card;
  select * into s from core.quiz_sets where id = c.set_id;
  if c.id is null or s.user_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  if s.quiz_day <> core.quiz_day_key(now()) then raise exception 'card_expired' using errcode = '55000'; end if;
  if p_option is null or p_option < 1 or p_option > jsonb_array_length(c.content -> 'options') then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  if exists (select 1 from core.votes where user_id = v_uid and subject_type = 'card' and subject_id = p_card) then
    raise exception 'already_answered' using errcode = '23505';
  end if;

  insert into core.votes (user_id, subject_type, subject_id, option, client_event_id, day_key)
  values (v_uid, 'card', p_card, p_option::smallint, p_client_event_id, v_today);

  -- a card counts like a vote for the counters (never for σερί or freezes: no record_vote_cast)
  perform core.ensure_game_state(v_uid);
  select count(*) into v_today_n from core.votes where user_id = v_uid and day_key = v_today;
  update core.user_game_state
     set votes_cast = votes_cast + 1,
         active_days = active_days + case when v_today_n = 3 then 1 else 0 end,
         last_active_day = case when v_today_n >= 3 then v_today else last_active_day end,
         version = version + 1, updated_at = now()
   where user_id = v_uid;

  select count(*) into v_answered from core.votes v join core.quiz_set_cards x on x.id = v.subject_id
   where v.user_id = v_uid and v.subject_type = 'card' and x.set_id = s.id;
  v_parts := core.quiz_completion_points(v_answered, 6, s.awarded_at is not null, core.sport_rules(s.sport_id));
  if jsonb_array_length(v_parts) > 0 then
    v_awarded := core.award_points(v_uid, (v_parts -> 0 ->> 'delta')::int, 'daily_quiz', 'quiz_day', s.id,
                                   'quiz:' || v_uid || ':' || s.quiz_day);
    update core.quiz_sets set awarded_at = now() where id = s.id;
  end if;

  return jsonb_build_object('option', p_option, 'right', c.content -> 'right', 'reveal', c.content -> 'reveal', 'split', core.quiz_split(p_card),
                            'answered', v_answered, 'awarded', v_awarded);
end;
$$;

-- ── links ──
create or replace function api.claim_via_link(p_token text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_l      core.match_links;
  v_pr     core.profiles;
  v_pl     core.players;
  v_logger uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_l := core.link_by_token(p_token);
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));
  select * into v_pr from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select * into v_pl from core.players where id = v_l.player_id for update;
  if v_pr.claimed_player_id = v_pl.id then
    return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'replayed', true);
  end if;
  if v_pr.claimed_player_id is not null then
    raise exception 'already_claimed_other' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null or v_pl.status = 'merged' then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  -- a player who chose to hide is never taken through a link someone else sent
  if v_pl.hidden then raise exception 'player_hidden' using errcode = '42501'; end if;
  update core.players set claimed_by_user_id = v_uid, status = 'active' where id = v_pl.id;   -- trigger syncs the profile
  update core.match_links set claimed_at = now() where id = v_l.id;

  if v_l.kudo is not null then
    select pr.claimed_player_id into v_logger
      from core.matches m join core.profiles pr on pr.user_id = m.logged_by where m.id = v_l.match_id;
    if v_logger is not null then
      insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
      select v_uid, v_logger, v_l.match_id, o.id
        from core.kudos_options o
       where o.key = case v_l.kudo when 'serve' then 'strong_serve' when 'backhand' then 'great_backhand'
                                   when 'calm' then 'calm_clutch' when 'feet' then 'quick_feet'
                                   when 'fair_play' then 'fair_calls' when 'company' then 'good_vibes' end
      on conflict (from_user_id, match_id, to_player_id) do nothing;
    end if;
  end if;
  return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'replayed', false);
end;
$$;

-- ── kudos ──
create or replace function api.give_kudo(p_match_id uuid, p_option_key text, p_to_player uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_me     uuid;
  v_side   smallint;
  v_option uuid;
  v_n      int := 0;
  r        record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_option from core.kudos_options where key = p_option_key and active;
  if v_option is null then raise exception 'bad_kudo' using errcode = '22023'; end if;
  if not exists (select 1 from core.matches m join core.match_results mr on mr.match_id = m.id
                  where m.id = p_match_id and m.approved and m.status not in ('void', 'disputed')) then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = v_me;
  if v_side is null and p_to_player is null then raise exception 'not_your_match' using errcode = '42501'; end if;

  for r in
    select p.id, p.claimed_by_user_id
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
     where mp.match_id = p_match_id and p.id is distinct from v_me
       and (p_to_player is null or p.id = p_to_player)
       and (v_side is null or mp.side <> v_side)
       and (v_side is not null or exists (select 1 from core.follows f where f.user_id = v_uid and f.player_id = p.id))
       and not p.hidden and not p.is_minor
       and not core.is_blocked(p.claimed_by_user_id, v_uid)
  loop
    insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
    values (v_uid, r.id, p_match_id, v_option)
    on conflict (from_user_id, match_id, to_player_id) do nothing;
    if found then
      v_n := v_n + 1;
      if r.claimed_by_user_id is not null then
        insert into core.notifications (user_id, type, payload, channel, dedupe_key)
        values (r.claimed_by_user_id, 'kudos', jsonb_build_object('match_id', p_match_id, 'option', p_option_key),
                'in_app', 'kudos:' || p_match_id || ':' || v_uid || ':' || r.id)
        on conflict (dedupe_key) do nothing;
      end if;
    end if;
  end loop;
  if v_n = 0 and not exists (select 1 from core.kudos where from_user_id = v_uid and match_id = p_match_id
                              and (p_to_player is null or to_player_id = p_to_player)) then
    raise exception 'nobody_to_thank' using errcode = '42501';
  end if;
  return jsonb_build_object('match_id', p_match_id, 'given', v_n);
end;
$$;

-- ── offers ──
create or replace function api.pro_offer_shown(p_moment text)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_moment not in ('draw', 'before_match', 'after_loss', 'quiz', 'me') then
    raise exception 'invalid_moment' using errcode = '22023';
  end if;
  -- once a day is all the cap needs
  if exists (select 1 from core.pro_offers_shown where user_id = auth.uid() and shown_at > now() - interval '20 hours') then
    return;
  end if;
  insert into core.pro_offers_shown (user_id, moment) values (auth.uid(), p_moment);
end;
$$;

-- ── purchases list ──
create or replace function api.admin_purchases(p_limit int default 100)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_admin() or core.is_service()) then raise exception 'forbidden' using errcode = '42501'; end if;
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

-- ── core functions ──
alter default privileges in schema core revoke execute on functions from public;
alter default privileges in schema api revoke execute on functions from public;
do $$
declare f record;
begin
  -- only functions still on the default (execute for PUBLIC): signed-in users keep what they had, anon loses it;
  -- functions with their own grants already say who may run them
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.pronamespace = 'core'::regnamespace and p.prokind = 'f' and p.proacl is null
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.pronamespace = 'core'::regnamespace and p.prokind = 'f' and p.proacl is not null
  loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;
