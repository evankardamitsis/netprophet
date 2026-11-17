-- The Pro emails (founder, 17 Nov 2026, on the approved email board). Four kinds, all in the 'pro' group: they respect
-- the email switch and the person's own switch (notification_prefs.game_email) and carry the unsubscribe link.
--
--   pro_welcome     Pro or the free week starts (INITIAL_PURCHASE, the store's trial included). Once per account.
--   pro_trial_day5  day 5 of the free week at 10:00 Athens: two days left, the charge date and price, how to cancel in
--                   their store. Queued at the start with a due date two days before the store's end; at send time it
--                   is checked again (cancelled, or no longer on the free week: dropped) and takes the plan as it is
--                   then (a plan change inside the week moves the price).
--   pro_cancel      a voluntary cancellation (cancel_reason UNSUBSCRIBE; refunds, billing errors and the rest never):
--                   «Το Pro σου σταματάει στις <date>», plain, no offer. Dropped at send if they turned it back on.
--   pro_winback     the day Pro actually ends (EXPIRATION with expiration_reason UNSUBSCRIBE), for people who paid at
--                   least once (not the free week alone), App Store only for now (Play needs app build 1.0.1), once
--                   per account ever: 3 months of pro_monthly at 4,49€ through an Apple one-time offer code. The code
--                   comes from core.offer_codes and is given at send time, only to an email that will really go out;
--                   with the pool empty the email waits (due) and the admin page and the morning email count it.
--
-- Never from sandbox events (environment SANDBOX) and never for a deleted profile. The hook is a trigger on
-- core.purchases, the row api.apply_store_event writes for every store event, so that function is untouched.

insert into core.email_kinds (kind, grp, label) values
  ('pro_welcome',    'pro', 'Pro: καλώς ήρθες'),
  ('pro_trial_day5', 'pro', 'Pro: 2 μέρες ακόμα δωρεάν'),
  ('pro_cancel',     'pro', 'Pro: σταματάει'),
  ('pro_winback',    'pro', 'Pro: γύρνα με τη μισή τιμή')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;

-- ── the offer code pool ─────────────────────────────────────────────────────────────────────────────────────────

-- one-time codes made in App Store Connect for an offer (the lead creates the offer and imports a batch here); a
-- code is given to one person, once, at the moment their email is sent
create table if not exists core.offer_codes (
  code           text primary key,
  offer          text not null default 'pro_winback',
  expires_at     timestamptz not null,
  assigned_user  uuid,
  assigned_at    timestamptz,
  email_id       uuid unique,
  created_at     timestamptz not null default now()
);
create index if not exists offer_codes_free_idx on core.offer_codes (offer, expires_at) where assigned_user is null;
alter table core.offer_codes enable row level security;

-- a code is given only while it still has a week left to be redeemed
create or replace function core.offer_codes_free(p_offer text default 'pro_winback')
returns int
language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int from core.offer_codes
   where offer = p_offer and assigned_user is null and expires_at > now() + interval '7 days';
$$;
revoke all on function core.offer_codes_free(text) from public, anon, authenticated;

-- the admin page: a batch of codes pasted from App Store Connect, with the expiry the batch has there
create or replace function api.admin_offer_codes_import(p_codes text[], p_expires date, p_offer text default 'pro_winback')
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_exp   timestamptz;
  v_clean text[];
  v_bad   int;
  v_added int;
begin
  if not core.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_offer is distinct from 'pro_winback' then
    raise exception 'unknown_offer' using errcode = '22023';
  end if;
  if p_expires is null or p_expires <= core.athens_day() then
    raise exception 'expiry_in_past' using errcode = '22023';
  end if;
  -- the end of that day in Athens
  v_exp := ((p_expires + 1) + time '00:00') at time zone 'Europe/Athens' - interval '1 second';
  select array_agg(distinct upper(btrim(c))) filter (where upper(btrim(c)) ~ '^[A-Z0-9]{4,64}$'),
         count(*) filter (where btrim(c) <> '' and upper(btrim(c)) !~ '^[A-Z0-9]{4,64}$')
    into v_clean, v_bad
    from unnest(coalesce(p_codes, '{}')) c;
  insert into core.offer_codes (code, offer, expires_at)
  select c, p_offer, v_exp from unnest(coalesce(v_clean, '{}')) c
  on conflict (code) do nothing;
  get diagnostics v_added = row_count;
  return jsonb_build_object('added', v_added, 'already_there', coalesce(array_length(v_clean, 1), 0) - v_added,
                            'invalid', v_bad, 'left', core.offer_codes_free(p_offer));
end;
$$;
revoke all on function api.admin_offer_codes_import(text[], date, text) from public, anon;
grant execute on function api.admin_offer_codes_import(text[], date, text) to authenticated;

-- ── what a plan costs, for the email ────────────────────────────────────────────────────────────────────────────

create or replace function core.email_plan(p_product text)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object('product_id', p.product_id, 'price', p.price_eur, 'renews', p.renews_eur, 'period', p.period)
    from core.store_products p where p.product_id = p_product and p.grants = 'pro';
$$;
revoke all on function core.email_plan(text) from public, anon, authenticated;

-- the person's Pro store events (production only)
create or replace function core.pro_events(p_user uuid)
returns setof core.purchases
language sql stable security definer set search_path = core, pg_temp
as $$
  select p.* from core.purchases p
    join core.store_products s on s.product_id = p.product_id and s.grants = 'pro'
   where p.user_id = p_user and p.environment = 'PRODUCTION';
$$;
revoke all on function core.pro_events(uuid) from public, anon, authenticated;

-- the newest of them of these types (the store's own clock, then ours)
create or replace function core.pro_last_event(p_user uuid, p_types text[])
returns core.purchases
language sql stable security definer set search_path = core, pg_temp
as $$
  select p.* from core.pro_events(p_user) p
   where p.event_type = any (p_types)
   order by coalesce(nullif(coalesce(p.raw -> 'event', p.raw) ->> 'event_timestamp_ms', '')::bigint,
                     (extract(epoch from p.created_at) * 1000)::bigint) desc, p.created_at desc
   limit 1;
$$;
revoke all on function core.pro_last_event(uuid, text[]) from public, anon, authenticated;

-- ── queueing, from the store events ─────────────────────────────────────────────────────────────────────────────

create or replace function core.email_on_store_event()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  e       jsonb := coalesce(new.raw -> 'event', new.raw);
  v_trial boolean := upper(coalesce(e ->> 'period_type', '')) = 'TRIAL';
  v_plan  jsonb;
  v_due   timestamptz;
begin
  if new.user_id is null or new.environment <> 'PRODUCTION' then return new; end if;
  v_plan := core.email_plan(new.product_id);
  if v_plan is null then return new; end if;   -- a cosmetic, or a product we do not sell
  if exists (select 1 from core.profiles where user_id = new.user_id and deleted_at is not null) then return new; end if;

  if new.event_type = 'INITIAL_PURCHASE' and new.applied then
    perform core.email_queue(new.user_id, 'pro_welcome', 'pro_welcome:' || new.user_id,
      v_plan || jsonb_build_object('store', new.store, 'trial', v_trial, 'ends_at', new.expires_at));
    -- day 5 of the free week: two days before the store's end, 10:00 Athens
    if v_trial and new.expires_at is not null then
      v_due := ((core.athens_day(new.expires_at) - 2) + time '10:00') at time zone 'Europe/Athens';
      if v_due > now() then
        perform core.email_queue(new.user_id, 'pro_trial_day5', 'pro_trial_day5:' || new.user_id,
          v_plan || jsonb_build_object('store', new.store, 'ends_at', new.expires_at), v_due);
      end if;
    end if;

  elsif new.event_type = 'CANCELLATION' and e ->> 'cancel_reason' = 'UNSUBSCRIBE'
        and new.expires_at is not null and new.expires_at > now() then
    perform core.email_queue(new.user_id, 'pro_cancel',
      'pro_cancel:' || new.user_id || ':' || core.athens_day(new.expires_at),
      v_plan || jsonb_build_object('store', new.store, 'trial', v_trial, 'ends_at', new.expires_at));

  elsif new.event_type = 'EXPIRATION' and e ->> 'expiration_reason' = 'UNSUBSCRIBE' and new.store = 'APP_STORE'
        -- paid at least once: a purchase or a renewal outside the free week (the charge on day 8 is a RENEWAL)
        and exists (select 1 from core.pro_events(new.user_id) p
                     where p.event_type in ('INITIAL_PURCHASE', 'RENEWAL') and p.applied
                       and p.store <> 'PROMOTIONAL'
                       and upper(coalesce(coalesce(p.raw -> 'event', p.raw) ->> 'period_type', '')) <> 'TRIAL') then
    perform core.email_queue(new.user_id, 'pro_winback', 'pro_winback:' || new.user_id,
      jsonb_build_object('store', new.store, 'ended_at', new.expires_at));
  end if;
  return new;
end;
$$;
drop trigger if exists email_on_store_event on core.purchases;
create trigger email_on_store_event after insert on core.purchases
  for each row execute function core.email_on_store_event();

-- ── checked again at send time ──────────────────────────────────────────────────────────────────────────────────

-- One gate per kind, asked by api.admin_emails_due for a row that passed the general rules: null to send as queued,
-- {"skip": reason} to drop it, {"payload": {...}} to send it with these values merged in. Later slices add their
-- kinds here. «Send me a test» rows pass as they are.
create or replace function core.email_gate(p_kind text, p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_last  core.purchases;
  v_trial core.entitlements;
  v_prod  text;
begin
  if coalesce(p_payload ->> 'test', 'false') = 'true' then return null; end if;

  if p_kind = 'pro_welcome' then
    -- refunded or ended before it went out
    if not core.is_pro(p_user) then return jsonb_build_object('skip', 'not_pro'); end if;

  elsif p_kind = 'pro_trial_day5' then
    select * into v_trial from core.entitlements
     where user_id = p_user and key = 'pro' and source = 'trial' and status = 'active' and ends_at > now()
     order by ends_at desc limit 1;
    if v_trial.user_id is null then return jsonb_build_object('skip', 'not_on_trial'); end if;
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type = 'CANCELLATION' then return jsonb_build_object('skip', 'cancelled'); end if;
    -- the plan as it is now: a change inside the week names the new one
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'PRODUCT_CHANGE']);
    v_prod := coalesce(core.store_product_id(nullif(coalesce(v_last.raw -> 'event', v_last.raw) ->> 'new_product_id', '')),
                       v_last.product_id);
    return jsonb_build_object('payload',
      coalesce(core.email_plan(v_prod), '{}'::jsonb) || jsonb_build_object('ends_at', v_trial.ends_at));

  elsif p_kind = 'pro_cancel' then
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type in ('UNCANCELLATION', 'RENEWAL', 'INITIAL_PURCHASE') then
      return jsonb_build_object('skip', 'uncancelled');
    end if;
    -- ended already (a refund after the cancellation, or the date passed): the date in the email would be wrong
    if not core.is_pro(p_user) or (p_payload ->> 'ends_at')::timestamptz <= now() then
      return jsonb_build_object('skip', 'ended');
    end if;

  elsif p_kind = 'pro_winback' then
    if core.is_pro(p_user) then return jsonb_build_object('skip', 'pro_again'); end if;
  end if;
  return null;
end;
$$;
revoke all on function core.email_gate(text, uuid, jsonb) from public, anon, authenticated;

-- ── the sender's side: the same rules as before, plus the gate and the winback code ─────────────────────────────

create or replace function api.admin_emails_due(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s      core.email_settings;
  v_free int;
  v_ids  uuid[];
  v_code core.offer_codes;
  r      record;
begin
  select * into s from core.email_settings;

  -- the switch is off: nothing waits for it to come on
  if s.mode = 'off' then
    update core.emails set status = 'skipped', reason = 'off' where status = 'due' and due_at <= now();
    return '[]'::jsonb;
  end if;

  -- a winback without its code waits while the pool is empty, outside the batch, so it holds nothing else up
  v_free := core.offer_codes_free('pro_winback');

  with due as (
    select e.id, e.kind, k.grp, e.payload, e.user_id,
           coalesce(e.to_email, u.email) as email,
           pr.deleted_at, pr.notification_prefs
      from core.emails e
      join core.email_kinds k on k.kind = e.kind
      left join auth.users u on u.id = e.user_id
      left join core.profiles pr on pr.user_id = e.user_id
     where e.status = 'due' and e.due_at <= now()
       and (e.kind <> 'pro_winback' or e.payload ? 'code' or v_free > 0)
     order by e.due_at
     limit p_limit
     for update of e skip locked
  ), judged as (
    select d.*,
           case when d.email is null then 'no_address'
                when d.kind = any (s.kinds_off) then 'kind_off'
                when s.mode = 'allowlist' and not (lower(d.email) = any (select lower(a) from unnest(s.allowlist) a)) then 'not_allowlisted'
                when d.grp <> 'account' and d.deleted_at is not null then 'deleted'
                when d.grp in ('game', 'pro') and coalesce(d.notification_prefs ->> 'game_email', 'true') = 'false' then 'unsubscribed'
           end as skip0
      from due d
  ), gated as (
    select j.*, case when j.skip0 is null then core.email_gate(j.kind, j.user_id, j.payload) end as gate
      from judged j
  ), final as (
    select g.*, coalesce(g.skip0, g.gate ->> 'skip') as skip from gated g
  ), skipped as (
    update core.emails e set status = 'skipped', reason = f.skip
      from final f where e.id = f.id and f.skip is not null
    returning e.id
  ), taken as (
    update core.emails e set status = 'sending', attempts = e.attempts + 1,
                             payload = e.payload || coalesce(f.gate -> 'payload', '{}'::jsonb)
      from final f where e.id = f.id and f.skip is null
    returning e.id
  )
  select coalesce(array_agg(id), '{}') into v_ids from taken;

  -- the winback's code, given only now that the email will go out; a retry keeps the code it already has
  for r in select id, user_id from core.emails where id = any (v_ids) and kind = 'pro_winback' and not (payload ? 'code') loop
    update core.offer_codes c set assigned_user = r.user_id, assigned_at = now(), email_id = r.id
     where c.code = (select code from core.offer_codes
                      where offer = 'pro_winback' and assigned_user is null and expires_at > now() + interval '7 days'
                      order by expires_at, code limit 1 for update skip locked)
    returning * into v_code;
    if found then
      update core.emails set payload = payload || jsonb_build_object('code', v_code.code, 'code_expires_at', v_code.expires_at)
       where id = r.id;
    else
      -- another run took the last one: back to waiting, as if never taken
      update core.emails set status = 'due', attempts = attempts - 1 where id = r.id;
      v_ids := array_remove(v_ids, r.id);
    end if;
  end loop;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', e.id, 'kind', e.kind, 'group', k.grp, 'to', coalesce(e.to_email, u.email), 'payload', e.payload,
             'first_name', nullif(btrim(pr.first_name), ''), 'gender', pr.gender, 'lang', coalesce(pr.locale, 'el'),
             'unsubscribe_token', case when k.grp <> 'account' then pr.email_token end) order by e.due_at), '[]'::jsonb)
      from core.emails e
      join core.email_kinds k on k.kind = e.kind
      left join auth.users u on u.id = e.user_id
      left join core.profiles pr on pr.user_id = e.user_id
     where e.id = any (v_ids));
end;
$$;
revoke all on function api.admin_emails_due(int) from public, anon, authenticated;
grant execute on function api.admin_emails_due(int) to service_role;

-- ── the admin page and the morning email count the pool and the waiting winbacks ────────────────────────────────

create or replace function core.offer_codes_status()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'left', core.offer_codes_free('pro_winback'),
    'given', (select count(*) from core.offer_codes where offer = 'pro_winback' and assigned_user is not null),
    'next_expiry', (select min(expires_at) from core.offer_codes
                     where offer = 'pro_winback' and assigned_user is null and expires_at > now() + interval '7 days'),
    'winback_waiting', (select count(*) from core.emails
                         where kind = 'pro_winback' and status = 'due' and due_at <= now() and not (payload ? 'code')));
$$;
revoke all on function core.offer_codes_status() from public, anon, authenticated;

create or replace function api.admin_email_settings()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'mode', s.mode, 'allowlist', to_jsonb(s.allowlist), 'start_at', s.start_at, 'kinds_off', to_jsonb(s.kinds_off),
    'offer_codes', core.offer_codes_status(),
    'kinds', (select coalesce(jsonb_agg(jsonb_build_object(
                'kind', k.kind, 'group', k.grp, 'label', k.label,
                'sent_7d', (select count(*) from core.emails e where e.kind = k.kind and e.status = 'sent' and e.sent_at > now() - interval '7 days'),
                'skipped_7d', (select count(*) from core.emails e where e.kind = k.kind and e.status = 'skipped' and e.created_at > now() - interval '7 days'),
                'failed', (select count(*) from core.emails e where e.kind = k.kind and e.status = 'failed'),
                'due', (select count(*) from core.emails e where e.kind = k.kind and e.status = 'due')
              ) order by k.grp, k.kind), '[]'::jsonb) from core.email_kinds k))
  from core.email_settings s
  where core.is_staff() or coalesce(auth.role(), '') = 'service_role';
$$;
revoke all on function api.admin_email_settings() from public, anon;
grant execute on function api.admin_email_settings() to authenticated, service_role;

create or replace function api.admin_email_digest()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'mode', (select mode from core.email_settings),
    'sent_24h', (select count(*) from core.emails where status = 'sent' and sent_at > now() - interval '24 hours'),
    'failed', (select count(*) from core.emails where status = 'failed' and created_at > now() - interval '7 days'),
    'by_kind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (
                  select kind, count(*) n from core.emails where status = 'sent' and sent_at > now() - interval '24 hours' group by kind) x),
    'winback_waiting', (core.offer_codes_status() ->> 'winback_waiting')::int,
    'codes_left', core.offer_codes_free('pro_winback'));
$$;
revoke all on function api.admin_email_digest() from public, anon, authenticated;
grant execute on function api.admin_email_digest() to service_role;

-- «Send me a test»: the Pro kinds get sample values (a free week ending in 7 days on «Ιδρυτικό μέλος», the App
-- Store, a dummy code), so a test never takes a real code from the pool and never waits for one
create or replace function api.admin_email_test(p_kind text)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_key text := 'test:' || p_kind || ':' || auth.uid() || ':' || extract(epoch from clock_timestamp())::bigint;
  v_pro jsonb := coalesce(core.email_plan('pro_founding'), '{}'::jsonb) || jsonb_build_object(
    'store', 'APP_STORE', 'trial', true, 'ends_at', now() + interval '7 days', 'ended_at', now(),
    'code', 'NPTESTCODE0000', 'code_expires_at', now() + interval '30 days');
begin
  if not core.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from core.email_kinds where kind = p_kind) then
    raise exception 'unknown_kind' using errcode = '22023';
  end if;
  perform core.email_queue(auth.uid(), p_kind, v_key,
    jsonb_build_object('player_name', 'Νίκος Παπαχρήστος', 'test', true)
      || case when p_kind like 'pro\_%' then v_pro else '{}'::jsonb end,
    now(),
    case when p_kind = 'deleted' then (select email from auth.users where id = auth.uid()) end);
  return (select id from core.emails where dedupe_key = v_key);
end;
$$;
revoke all on function api.admin_email_test(text) from public, anon;
grant execute on function api.admin_email_test(text) to authenticated;
