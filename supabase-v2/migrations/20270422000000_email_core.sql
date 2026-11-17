-- The email system (founder, 17 Nov 2026: "build everything", after the email board was approved). The database
-- decides who gets which email and when; the admin's cron route renders each one (apps/admin/src/lib/v2/mail) and
-- sends it through Resend from hello@netprophetapp.com, replies to hello@monadlabs.gr.
--
-- This first slice: the queue, the switch, unsubscribe, the welcome and the account emails (profile claim approved or
-- rejected, new player approved or rejected, account deleted). The series, the weekly emails, Pro and the website
-- follow in their own migrations and only add kinds and the rules that queue them.
--
-- Safety, so nothing reaches the 166 existing accounts by surprise:
--   * core.email_settings.mode: 'off' (nothing goes out, the queue is marked skipped), 'allowlist' (only the listed
--     addresses; every other due email is skipped, never kept for later), 'on'.
--   * core.email_settings.start_at: the welcome is queued only for accounts made after it, so nothing backfills.
--   * a kind can be switched off on its own (core.email_settings.kinds_off).
--   * game emails respect notification_prefs.game_email, the same switch the unsubscribe link writes.

create table if not exists core.email_settings (
  id          boolean primary key default true check (id),
  mode        text not null default 'off' check (mode in ('off', 'allowlist', 'on')),
  allowlist   text[] not null default '{}',
  start_at    timestamptz not null default now(),
  kinds_off   text[] not null default '{}',
  updated_at  timestamptz not null default now()
);
-- starts on the allow-list with nobody on it: the addresses are set on the admin page, not in the repo
insert into core.email_settings (id, mode) values (true, 'allowlist') on conflict (id) do nothing;
alter table core.email_settings enable row level security;

-- kinds and their group: 'account' emails always go (the law allows them without consent and they carry no
-- unsubscribe); 'game' and 'pro' emails respect the switch; 'list' emails go to website sign-ups (a later slice)
create table if not exists core.email_kinds (
  kind   text primary key,
  grp    text not null check (grp in ('account', 'game', 'pro', 'list')),
  label  text not null
);
insert into core.email_kinds (kind, grp, label) values
  ('welcome',        'game',    'Καλώς ήρθες'),
  ('claim_ok',       'account', 'Το προφίλ εγκρίθηκε'),
  ('claim_no',       'account', 'Το προφίλ δεν εγκρίθηκε'),
  ('new_player_ok',  'account', 'Νέος παίκτης: εγκρίθηκε'),
  ('new_player_no',  'account', 'Νέος παίκτης: δεν εγκρίθηκε'),
  ('deleted',        'account', 'Ο λογαριασμός διαγράφηκε')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;
alter table core.email_kinds enable row level security;

create table if not exists core.emails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                     -- no foreign key: the deleted-account email outlives its user
  to_email    text,                     -- set only when the user row will be gone (account deleted); purged after send
  kind        text not null references core.email_kinds (kind),
  dedupe_key  text not null unique,
  payload     jsonb not null default '{}'::jsonb,
  due_at      timestamptz not null default now(),
  status      text not null default 'due' check (status in ('due', 'sending', 'sent', 'skipped', 'failed')),
  reason      text,
  attempts    int not null default 0,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists emails_due_idx on core.emails (due_at) where status = 'due';
create index if not exists emails_user_idx on core.emails (user_id, created_at);
alter table core.emails enable row level security;

-- one secret per account for the one-click unsubscribe link (no sign-in on the website)
alter table core.profiles add column if not exists email_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_email_token_idx on core.profiles (email_token);

-- queue one email; a second call with the same key does nothing
create or replace function core.email_queue(p_user uuid, p_kind text, p_key text, p_payload jsonb default '{}'::jsonb,
                                            p_due timestamptz default now(), p_to text default null)
returns void
language sql security definer set search_path = core, pg_temp
as $$
  insert into core.emails (user_id, kind, dedupe_key, payload, due_at, to_email)
  values (p_user, p_kind, p_key, coalesce(p_payload, '{}'::jsonb), coalesce(p_due, now()), p_to)
  on conflict (dedupe_key) do nothing;
$$;
revoke all on function core.email_queue(uuid, text, text, jsonb, timestamptz, text) from public, anon, authenticated;

-- ── triggers that queue ───────────────────────────────────────────────────────────────────────────────────────────

-- the welcome: when onboarding is done, for accounts made after the start (never the existing ones)
create or replace function core.email_on_onboarded()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if coalesce(new.onboarding_state ->> 'done', 'false') = 'true'
     and coalesce(old.onboarding_state ->> 'done', 'false') <> 'true'
     and new.deleted_at is null
     and new.created_at >= (select start_at from core.email_settings) then
    perform core.email_queue(new.user_id, 'welcome', 'welcome:' || new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists email_on_onboarded on core.profiles;
create trigger email_on_onboarded after update of onboarding_state on core.profiles
  for each row execute function core.email_on_onboarded();

-- profile claims: approved or rejected, a claim of a roster player or a new player (via 'new')
create or replace function core.email_on_claim_decided()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_name text;
begin
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    select nullif(btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))), '')
      into v_name from core.players p where p.id = new.player_id;
    perform core.email_queue(
      new.user_id,
      case when new.via = 'new' then (case when new.status = 'approved' then 'new_player_ok' else 'new_player_no' end)
           else (case when new.status = 'approved' then 'claim_ok' else 'claim_no' end) end,
      'claim:' || new.id,
      jsonb_build_object('player_id', new.player_id, 'player_name', v_name));
  end if;
  return new;
end;
$$;
drop trigger if exists email_on_claim_decided on core.claim_requests;
create trigger email_on_claim_decided after update of status on core.claim_requests
  for each row execute function core.email_on_claim_decided();

-- account deleted: the auth user goes, so the address rides on the row (purged once sent)
create or replace function core.email_on_user_deleted()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if old.email is not null and old.email not like '%@test.local' then
    perform core.email_queue(old.id, 'deleted', 'deleted:' || old.id, '{}'::jsonb, now(), old.email);
  end if;
  return old;
end;
$$;
drop trigger if exists email_on_user_deleted on auth.users;
create trigger email_on_user_deleted after delete on auth.users
  for each row execute function core.email_on_user_deleted();

-- ── the sender's side (service role only) ─────────────────────────────────────────────────────────────────────────

-- what is due now, ready to render: claims them ('sending') so two runs never send twice. Whatever the switch, the
-- allow-list, a kind switched off or the person's own switch rules out is marked skipped right here, never kept.
create or replace function api.admin_emails_due(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s core.email_settings;
  v jsonb;
begin
  select * into s from core.email_settings;

  -- the switch is off: nothing waits for it to come on
  if s.mode = 'off' then
    update core.emails set status = 'skipped', reason = 'off' where status = 'due' and due_at <= now();
    return '[]'::jsonb;
  end if;

  with due as (
    select e.id, e.kind, k.grp, e.payload, e.user_id,
           coalesce(e.to_email, u.email) as email,
           pr.first_name, pr.gender, pr.locale, pr.email_token, pr.deleted_at, pr.notification_prefs
      from core.emails e
      join core.email_kinds k on k.kind = e.kind
      left join auth.users u on u.id = e.user_id
      left join core.profiles pr on pr.user_id = e.user_id
     where e.status = 'due' and e.due_at <= now()
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
           end as skip
      from due d
  ), skipped as (
    update core.emails e set status = 'skipped', reason = j.skip
      from judged j where e.id = j.id and j.skip is not null
    returning e.id
  ), taken as (
    update core.emails e set status = 'sending', attempts = e.attempts + 1
      from judged j where e.id = j.id and j.skip is null
    returning e.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', j.id, 'kind', j.kind, 'group', j.grp, 'to', j.email, 'payload', j.payload,
           'first_name', nullif(btrim(j.first_name), ''), 'gender', j.gender, 'lang', coalesce(j.locale, 'el'),
           'unsubscribe_token', case when j.grp <> 'account' then j.email_token end)), '[]'::jsonb)
    into v
    from judged j
   where j.skip is null and j.id in (select id from taken);
  return v;
end;
$$;
revoke all on function api.admin_emails_due(int) from public, anon, authenticated;
grant execute on function api.admin_emails_due(int) to service_role;

-- the route reports back: sent, or failed with Resend's answer (a failed one is tried again up to 3 times)
create or replace function api.admin_emails_done(p_results jsonb)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r jsonb;
  n int := 0;
begin
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    if (r ->> 'ok')::boolean then
      update core.emails set status = 'sent', sent_at = now(), reason = null, to_email = null
       where id = (r ->> 'id')::uuid and status = 'sending';
    else
      update core.emails
         set status = case when attempts >= 3 then 'failed' else 'due' end,
             due_at = now() + interval '15 minutes',
             reason = left(coalesce(r ->> 'error', 'error'), 300)
       where id = (r ->> 'id')::uuid and status = 'sending';
    end if;
    n := n + 1;
  end loop;
  -- a run that died mid-way: its emails go back to the queue after 30 minutes
  update core.emails set status = 'due' where status = 'sending' and created_at < now() - interval '30 minutes'
     and attempts < 3 and id not in (select (x ->> 'id')::uuid from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) x);
  return n;
end;
$$;
revoke all on function api.admin_emails_done(jsonb) from public, anon, authenticated;
grant execute on function api.admin_emails_done(jsonb) to service_role;

-- the admin page: the switch, the allow-list and what went out
create or replace function api.admin_email_settings()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'mode', s.mode, 'allowlist', to_jsonb(s.allowlist), 'start_at', s.start_at, 'kinds_off', to_jsonb(s.kinds_off),
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

create or replace function api.admin_set_email_settings(p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update core.email_settings set
    mode = coalesce(p ->> 'mode', mode),
    allowlist = case when p ? 'allowlist' then array(select lower(btrim(x)) from jsonb_array_elements_text(p -> 'allowlist') x where btrim(x) <> '') else allowlist end,
    kinds_off = case when p ? 'kinds_off' then array(select jsonb_array_elements_text(p -> 'kinds_off')) else kinds_off end,
    updated_at = now();
  return api.admin_email_settings();
end;
$$;
revoke all on function api.admin_set_email_settings(jsonb) from public, anon;
grant execute on function api.admin_set_email_settings(jsonb) to authenticated;

-- ── unsubscribe (the website, no sign-in) ─────────────────────────────────────────────────────────────────────────

-- the link carries the account's token: it turns off the game emails (the same switch as in the app); 'all' also
-- turns off the medal email. Wrong or old tokens answer false and change nothing.
create or replace function api.email_unsubscribe(p_token uuid, p_scope text default 'game')
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  update core.profiles
     set notification_prefs = coalesce(notification_prefs, '{}'::jsonb)
                              || jsonb_build_object('game_email', false)
                              || case when p_scope = 'all' then jsonb_build_object('medal_email', false) else '{}'::jsonb end
   where email_token = p_token and deleted_at is null;
  return found;
end;
$$;
revoke all on function api.email_unsubscribe(uuid, text) from public;
grant execute on function api.email_unsubscribe(uuid, text) to anon, authenticated;

-- ── the morning email counts them (memory rule: the morning email follows the rules) ─────────────────────────────

create or replace function api.admin_email_digest()
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'mode', (select mode from core.email_settings),
    'sent_24h', (select count(*) from core.emails where status = 'sent' and sent_at > now() - interval '24 hours'),
    'failed', (select count(*) from core.emails where status = 'failed' and created_at > now() - interval '7 days'),
    'by_kind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (
                  select kind, count(*) n from core.emails where status = 'sent' and sent_at > now() - interval '24 hours' group by kind) x));
$$;
revoke all on function api.admin_email_digest() from public, anon, authenticated;
grant execute on function api.admin_email_digest() to service_role;

-- «Send me a test» on the admin page: queues one email of a kind to the admin who pressed it, with sample values
-- for what the kind needs. It goes through the same queue, switch and allow-list as the real ones.
create or replace function api.admin_email_test(p_kind text)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_key text := 'test:' || p_kind || ':' || auth.uid() || ':' || extract(epoch from clock_timestamp())::bigint;
begin
  if not core.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from core.email_kinds where kind = p_kind) then
    raise exception 'unknown_kind' using errcode = '22023';
  end if;
  perform core.email_queue(auth.uid(), p_kind, v_key,
    jsonb_build_object('player_name', 'Νίκος Παπαχρήστος', 'test', true), now(),
    case when p_kind = 'deleted' then (select email from auth.users where id = auth.uid()) end);
  return (select id from core.emails where dedupe_key = v_key);
end;
$$;
revoke all on function api.admin_email_test(text) from public, anon;
grant execute on function api.admin_email_test(text) to authenticated;
