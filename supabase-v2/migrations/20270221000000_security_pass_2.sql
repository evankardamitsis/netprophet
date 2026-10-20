-- Security pass 2 (20 Oct 2026). Fixes from the second audit that change no product rule:
-- - minors: the claim search never lists a minor, and following one by one never takes a minor (as follow_players)
-- - caps: a player logs 10 new matches per Athens day, gives 50 kudos and asks for 5 claims a day ('rate_limited');
--   follow_players takes 50 ids at most ('too_many'). A match link answers once already: the answer needs a
--   pending confirmation and every answer ends it, so no per-token counter is added
-- - storage: no public SELECT on avatars, athlete-photos or logos. Public buckets serve their files by URL without
--   a policy; the policy only let anyone list the folders. Owners (and staff for logos) keep a SELECT of their own,
--   because updating or removing a file needs to see it
-- - update_profile: names 1 to 60 characters once trimmed; onboarding_state and notification_prefs objects under 8 KB
-- - the store: a RevenueCat TRANSFER moves Pro from the old accounts to the new one
-- - core: security definer helpers with no role check of their own are not executable by authenticated
--   (core is not exposed through the API; this keeps it safe if it ever is). The ones RLS policies call stay.

-- ── minors ──
create or replace function api.find_matching_players(p_name text, p_surname text)
returns table (id uuid, first_name text, surname text, area_id text, match_score int)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_sn text := core.normalize_search(p_surname);
  v_fn text := core.normalize_search(p_name);
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_sn = '' then return; end if;
  return query
  select p.id, p.first_name, p.surname, p.area_id,
         (case when p.surname_norm = v_sn then 70 else round(50 * similarity(p.surname_norm, v_sn))::int end
          + case when v_fn = '' then 0
                 when p.first_name_norm = v_fn then 30
                 when left(p.first_name_norm, length(v_fn)) = v_fn then 20
                 else round(15 * similarity(p.first_name_norm, v_fn))::int end) as match_score
    from core.players p
   where (p.surname_norm = v_sn or similarity(p.surname_norm, v_sn) >= 0.55)
     and (v_fn = '' or p.first_name_norm = v_fn or left(p.first_name_norm, length(v_fn)) = v_fn
          or similarity(p.first_name_norm, v_fn) >= 0.5)
     and not p.hidden and not p.is_minor and p.status = 'active' and p.claimed_by_user_id is null
   order by 5 desc, 2, 3
   limit 20;
end;
$$;

create or replace function api.follow_player(p_player_id uuid, p_relation text default 'known', p_source text default 'profile')
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_relation not in ('known', 'friend') or p_source not in ('onboarding', 'profile', 'card', 'invite') then
    raise exception 'invalid_argument' using errcode = '22023';
  end if;
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  insert into core.follows (user_id, player_id, relation, source)
  values (v_uid, p_player_id, p_relation, p_source)
  on conflict (user_id, player_id) do update
    set relation = case when core.follows.relation = 'friend' then 'friend' else excluded.relation end;
end;
$$;

-- ── caps ──
create or replace function api.follow_players(p_player_ids uuid[], p_source text default 'onboarding')
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if cardinality(coalesce(p_player_ids, '{}')) > 50 then raise exception 'too_many' using errcode = '54000'; end if;
  if p_source not in ('onboarding', 'profile', 'card', 'invite') then
    raise exception 'invalid_argument' using errcode = '22023';
  end if;
  insert into core.follows (user_id, player_id, relation, source)
  select v_uid, p.id, 'known', p_source
    from core.players p
   where p.id = any (coalesce(p_player_ids, '{}')) and p.status = 'active' and not p.hidden and not p.is_minor
  on conflict (user_id, player_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function api.log_match(p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_staff   boolean := core.is_staff();
  v_me      uuid;
  v_sport   text;
  v_mode    text := p ->> 'mode';
  v_format  text := coalesce(p ->> 'format', 'singles');
  v_date    date := (p ->> 'date')::date;
  v_match   uuid := nullif(p ->> 'match_id', '')::uuid;
  v_partner uuid;
  v_opps    uuid[] := '{}';
  v_person  jsonb;
  v_starts  timestamptz;
  v_won     boolean;
  v_lost    int;
  v_side    smallint;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_mode not in ('played', 'soon') then raise exception 'bad_mode' using errcode = '22023'; end if;
  if v_format not in ('singles', 'doubles', 'mixed') then raise exception 'bad_format' using errcode = '22023'; end if;
  if v_date is null then raise exception 'date_required' using errcode = '22023'; end if;
  if v_mode = 'played' and (p -> 'result' is null or (p -> 'result' ->> 'sets') not in ('2-0', '2-1')) then
    raise exception 'result_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('log_match:' || v_uid, 0));
  -- 10 new matches per Athens day for a player; staff enter whole tournament days, so they are not capped
  if v_match is null and not v_staff and (
       select count(*) from core.matches
        where logged_by = v_uid
          and created_at >= (date_trunc('day', now() at time zone 'Europe/Athens') at time zone 'Europe/Athens')) >= 10 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  v_me := core.own_player(v_uid);
  select primary_sport into v_sport from core.profiles where user_id = v_uid;

  if v_match is null then
    if v_format <> 'singles' then v_partner := core.log_person(p -> 'partner'); end if;
    for v_person in select * from jsonb_array_elements(coalesce(p -> 'opponents', '[]'::jsonb)) loop
      v_opps := v_opps || core.log_person(v_person);
    end loop;
    if array_length(v_opps, 1) is distinct from (case v_format when 'singles' then 1 else 2 end) then
      raise exception 'wrong_opponents' using errcode = '22023';
    end if;
    if v_me = any(v_opps) or v_partner = any(v_opps) or v_partner = v_me then
      raise exception 'same_player_twice' using errcode = '22023';
    end if;
    -- never two of the same match: the screen asks «Αυτό είναι το ματς σου;» first
    if exists (
      select 1 from core.matches m
       where m.format = v_format and m.status <> 'void'
         and m.starts_at >= ((v_date - 1)::timestamp at time zone 'Europe/Athens')
         and m.starts_at <  ((v_date + 2)::timestamp at time zone 'Europe/Athens')
         and (select count(*) from core.match_participants mp
               where mp.match_id = m.id and mp.player_id = any (array_remove(v_opps || v_partner || v_me, null)))
             = 1 + array_length(v_opps, 1) + (case when v_partner is null then 0 else 1 end)) then
      raise exception 'duplicate_match' using errcode = '23505';
    end if;

    -- «Έρχεται» stays open for votes until the end of that day; a played match sits at noon (or now, if earlier)
    v_starts := case v_mode
                  when 'soon' then ((v_date + 1)::timestamp - interval '1 minute') at time zone 'Europe/Athens'
                  else least(now(), (v_date + time '12:00') at time zone 'Europe/Athens') end;
    insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, logged_by,
                              announced_before_played, provenance, approved, review)
    values (coalesce(v_sport, 'tennis'), v_format, 'scheduled', v_starts, nullif(p ->> 'tournament_id', '')::uuid,
            'user', v_uid, v_mode = 'soon',
            jsonb_strip_nulls(jsonb_build_object('logged_via', 'app',
              'tournament_suggestion', nullif(btrim(coalesce(p ->> 'tournament_suggestion', '')), ''))),
            v_staff, case when v_staff then null else 'pending' end)
    returning id into v_match;
    insert into core.match_participants (match_id, side, player_id, position) values (v_match, 1, v_me, 1);
    if v_partner is not null then
      insert into core.match_participants (match_id, side, player_id, position) values (v_match, 1, v_partner, 2);
    end if;
    for i in 1..array_length(v_opps, 1) loop
      insert into core.match_participants (match_id, side, player_id, position) values (v_match, 2, v_opps[i], i);
    end loop;
  else
    -- a result for a match already in the app, one of yours, still without a result
    if v_mode <> 'played' then raise exception 'bad_mode' using errcode = '22023'; end if;
    if not exists (select 1 from core.match_participants where match_id = v_match and player_id = v_me) then
      raise exception 'not_your_match' using errcode = '42501';
    end if;
    if exists (select 1 from core.match_results where match_id = v_match) then
      raise exception 'has_result' using errcode = '23505';
    end if;
    update core.matches set announced_before_played = true where id = v_match and source = 'user';
  end if;

  if v_mode = 'played' then
    select side into v_side from core.match_participants where match_id = v_match and player_id = v_me;
    v_won := (p -> 'result' ->> 'won')::boolean;
    v_lost := split_part(p -> 'result' ->> 'sets', '-', 2)::int;
    perform core.set_result(v_match, case when v_won then v_side else 3 - v_side end, '[]'::jsonb, 2, v_lost,
                            false, false, v_uid, not v_staff);
    -- the other side confirms (in the feed, or by the link for people not in the app)
    insert into core.match_confirmations (match_id, player_id, state, via)
    select v_match, mp.player_id, 'pending', 'feed'
      from core.match_participants mp where mp.match_id = v_match and mp.side <> v_side
    on conflict (match_id, player_id) do nothing;
  end if;

  return jsonb_build_object('match_id', v_match, 'mode', v_mode,
                            'review', (select review from core.matches where id = v_match));
end;
$$;

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
  perform pg_advisory_xact_lock(hashtextextended('give_kudo:' || v_uid, 0));
  if (select count(*) from core.kudos where from_user_id = v_uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
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

create or replace function core.request_claim(p_uid uuid, p_player uuid, p_via text, p_link uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_open core.claim_requests;
begin
  select * into v_open from core.claim_requests where user_id = p_uid and status = 'pending' for update;
  if found and v_open.player_id = p_player then
    return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', true);
  end if;
  -- 5 requests a day: each new one cancels the open one, so cancelled rows count too (a replay above does not)
  if (select count(*) from core.claim_requests where user_id = p_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if v_open.id is not null then
    update core.claim_requests set status = 'cancelled', decided_at = now() where id = v_open.id;
  end if;
  insert into core.claim_requests (user_id, player_id, via, link_id) values (p_uid, p_player, p_via, p_link);
  update core.profiles set claim_status = 'requested' where user_id = p_uid;
  return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', false);
end;
$$;

-- ── update_profile: bounded names and blobs ──
create or replace function api.update_profile(p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_row core.profiles; k text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_argument: patch must be an object' using errcode = '22023';
  end if;
  -- names: 1 to 60 characters once trimmed (null still clears); the two jsonb blobs stay under 8 KB each
  foreach k in array array['first_name', 'surname', 'display_name'] loop
    if p_patch ? k and jsonb_typeof(p_patch -> k) <> 'null' then
      if jsonb_typeof(p_patch -> k) <> 'string' or char_length(btrim(p_patch ->> k)) not between 1 and 60 then
        raise exception 'invalid_argument: % must be 1 to 60 characters', k using errcode = '22023';
      end if;
      p_patch := jsonb_set(p_patch, array[k], to_jsonb(btrim(p_patch ->> k)));
    end if;
  end loop;
  foreach k in array array['onboarding_state', 'notification_prefs'] loop
    if p_patch ? k and (jsonb_typeof(p_patch -> k) <> 'object' or pg_column_size(p_patch -> k) >= 8192) then
      raise exception 'invalid_argument: % must be an object under 8 KB', k using errcode = '22023';
    end if;
  end loop;
  update core.profiles set
    first_name = case when p_patch ? 'first_name' then p_patch ->> 'first_name' else first_name end,
    surname = case when p_patch ? 'surname' then p_patch ->> 'surname' else surname end,
    display_name = case when p_patch ? 'display_name' then p_patch ->> 'display_name' else display_name end,
    gender = case when p_patch ? 'gender' then p_patch ->> 'gender' else gender end,
    area_id = case when p_patch ? 'area_id' then p_patch ->> 'area_id' else area_id end,
    area_ids = case when p_patch ? 'area_ids' then array(select jsonb_array_elements_text(p_patch -> 'area_ids')) else area_ids end,
    primary_sport = case when p_patch ? 'primary_sport' then p_patch ->> 'primary_sport' else primary_sport end,
    hand = case when p_patch ? 'hand' then p_patch ->> 'hand' else hand end,
    tournament_experience = case when p_patch ? 'tournament_experience' then p_patch ->> 'tournament_experience' else tournament_experience end,
    locale = case when p_patch ? 'locale' then p_patch ->> 'locale' else locale end,
    tz = case when p_patch ? 'tz' then p_patch ->> 'tz' else tz end,
    hidden = case when p_patch ? 'hidden' then (p_patch ->> 'hidden')::boolean else hidden end,
    onboarding_state = case when p_patch ? 'onboarding_state' then p_patch -> 'onboarding_state' else onboarding_state end,
    notification_prefs = case when p_patch ? 'notification_prefs' then p_patch -> 'notification_prefs' else notification_prefs end
  where user_id = v_uid and deleted_at is null
  returning * into v_row;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('user_id', v_row.user_id, 'display_name', v_row.display_name,
                            'primary_sport', v_row.primary_sport, 'hidden', v_row.hidden);
end;
$$;

-- ── the store: TRANSFER ──
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
    return jsonb_build_object('event_id', v_id, 'applied', v_done, 'note', v_note);
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

-- ── storage: owners see their own files, nobody lists the rest ──
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "logos public read" on storage.objects;
create policy "avatars owner read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "athlete-photos owner read" on storage.objects for select to authenticated
  using (bucket_id = 'athlete-photos' and core.can_write_athlete_photo((storage.foldername(name))[1]));
create policy "logos staff read" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and core.is_staff());

-- ── core: security definer helpers without a role check, called only from api functions (owned by postgres) ──
-- is_admin, is_staff and can_write_athlete_photo stay: RLS policies call them with the caller's rights. Trigger
-- functions are left as they are (they cannot be called directly).
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'core' and p.prosecdef
       and p.proname in ('badge_counters', 'badges_refresh_match', 'in_active_circle', 'ingest_candidates',
                         'ingest_person', 'match_surface', 'quiz_pool', 'quiz_split', 'quiz_who',
                         'tournament_match_json', 'tournament_match_visible', 'trait_can_vote', 'unlock_counters')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
