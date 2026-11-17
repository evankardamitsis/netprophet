-- The website list (email slice 4): people who are not players yet leave their email on netprophetapp.com and get
-- the week's results every Monday. EU law: double opt-in. The only email an address gets before it confirms is the
-- consent request itself (site_confirm); nothing else goes to it until the «Ναι» tap on /email/confirm.
--
-- Built on 20270422000000_email_core: the same queue (core.emails, address in to_email, no user_id), the same switch,
-- allow-list and kinds_off. api.admin_emails_due is redefined here with the list rules added (the rest is the core
-- body as it was): a merge point for any other slice that also redefines it.
--
-- Abuse: the RPCs are open to anon (the publishable key is public), so the brakes live here, not on the website:
--   * one consent email per address every 10 minutes, at most 3 a day;
--   * at most 100 consent emails an hour for everyone together;
--   * the answer is the same in every case (new, waiting, confirmed, unsubscribed, has an account), so nobody can
--     learn whether an address is on the list.
-- Requests nobody confirmed are deleted after 30 days. Unsubscribed addresses stay, so they are never written to again.

create table if not exists core.list_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique
                   check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- the secret in the confirm and unsubscribe links; a new consent request gets a new one
  token            uuid not null unique default gen_random_uuid(),
  lang             text not null default 'el' check (lang in ('el', 'en')),
  source           text not null default 'site' check (length(source) <= 40),
  created_at       timestamptz not null default now(),
  requested_at     timestamptz not null default now(),
  last_confirm_at  timestamptz,
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz
);
alter table core.list_subscribers enable row level security;

insert into core.email_kinds (kind, grp, label) values
  ('site_confirm', 'list', 'Site: επιβεβαίωση εγγραφής'),
  ('site_weekly',  'list', 'Site: η εβδομάδα στα γήπεδα')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;

create index if not exists emails_list_sub_idx on core.emails ((payload ->> 'subscriber_id'), created_at) where kind = 'site_confirm';

-- an address that belongs to a live account: they get the game emails, never the list's weekly
create or replace function core.list_has_account(p_email text)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from auth.users u join core.profiles p on p.user_id = u.id
                  where lower(u.email) = lower(p_email) and p.deleted_at is null)
$$;
revoke all on function core.list_has_account(text) from public, anon, authenticated;

-- ── the website (anon) ────────────────────────────────────────────────────────────────────────────────────────────

-- «Στείλε μου τα αποτελέσματα της εβδομάδας»: queues the consent request. True for any well-formed address, whatever
-- its state, so the answer tells nothing; false only for something that is not an email.
create or replace function api.list_subscribe(p_email text, p_source text default 'site', p_lang text default 'el')
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  s core.list_subscribers;
begin
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;

  select * into s from core.list_subscribers where email = v_email for update;
  if not found then
    insert into core.list_subscribers (email, lang, source)
    values (v_email, case when p_lang = 'en' then 'en' else 'el' end, left(coalesce(nullif(btrim(p_source), ''), 'site'), 40))
    on conflict (email) do nothing;
    select * into s from core.list_subscribers where email = v_email for update;
  elsif s.confirmed_at is not null and s.unsubscribed_at is null then
    return true;                      -- already on the list: nothing to send
  elsif s.unsubscribed_at is not null then
    -- left once and asks again: a fresh consent, a fresh token (an old link never brings them back)
    update core.list_subscribers
       set token = gen_random_uuid(), confirmed_at = null, unsubscribed_at = null, requested_at = now(),
           lang = case when p_lang = 'en' then 'en' else 'el' end
     where id = s.id
    returning * into s;
  else
    update core.list_subscribers set requested_at = now() where id = s.id returning * into s;
  end if;

  -- the brakes: per address, then for everyone
  if s.last_confirm_at is not null and s.last_confirm_at > now() - interval '10 minutes' then
    return true;
  end if;
  if (select count(*) from core.emails e
       where e.kind = 'site_confirm' and e.payload ->> 'subscriber_id' = s.id::text and e.created_at > now() - interval '24 hours') >= 3 then
    return true;
  end if;
  if (select count(*) from core.emails e where e.kind = 'site_confirm' and e.created_at > now() - interval '1 hour') >= 100 then
    return true;
  end if;

  -- a key per request: a request skipped by the allow-list can be asked again later
  perform core.email_queue(null, 'site_confirm', 'site_confirm:' || s.id || ':' || extract(epoch from now())::bigint,
                           jsonb_build_object('subscriber_id', s.id), now(), s.email);
  update core.list_subscribers set last_confirm_at = now() where id = s.id;
  return true;
end;
$$;
revoke all on function api.list_subscribe(text, text, text) from public;
grant execute on function api.list_subscribe(text, text, text) to anon, authenticated;

-- the «Ναι» button on /email/confirm: true when the token is a live request (or already confirmed)
create or replace function api.list_confirm(p_token uuid)
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  update core.list_subscribers set confirmed_at = coalesce(confirmed_at, now())
   where token = p_token and unsubscribed_at is null;
  return found;
end;
$$;
revoke all on function api.list_confirm(uuid) from public;
grant execute on function api.list_confirm(uuid) to anon, authenticated;

-- the «Διαγραφή» link of a list email, and its one-click header: off for good, until they sign up again
create or replace function api.list_unsubscribe(p_token uuid)
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_id uuid;
begin
  update core.list_subscribers set unsubscribed_at = coalesce(unsubscribed_at, now())
   where token = p_token
  returning id into v_id;
  if v_id is null then
    return false;
  end if;
  update core.emails set status = 'skipped', reason = 'unsubscribed'
   where status = 'due' and kind in (select kind from core.email_kinds where grp = 'list')
     and payload ->> 'subscriber_id' = v_id::text;
  return true;
end;
$$;
revoke all on function api.list_unsubscribe(uuid) from public;
grant execute on function api.list_unsubscribe(uuid) to anon, authenticated;

-- ── the weekly email ──────────────────────────────────────────────────────────────────────────────────────────────

-- the players of one side, raw (the admin formats them with the copy helpers, Greek or Latin)
create or replace function core.list_side(p_match uuid, p_side smallint)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('first', btrim(p.first_name), 'surname', btrim(p.surname)) order by mp.position), '[]'::jsonb)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and mp.side = p_side
$$;
revoke all on function core.list_side(uuid, smallint) from public, anon, authenticated;

-- one match as the email shows it
create or replace function core.list_match(p_match uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'tournament', t.name, 'category', e.name, 'round', m.round,
           'winner', core.list_side(m.id, r.winner_side), 'loser', core.list_side(m.id, (3 - r.winner_side)::smallint),
           'sets', r.sets, 'retired', r.retired, 'walkover', r.walkover)
    from core.matches m
    join core.match_results r on r.match_id = m.id
    join core.tournaments t on t.id = m.tournament_id
    left join core.tournament_events e on e.id = m.event_id
   where m.id = p_match
$$;
revoke all on function core.list_match(uuid) from public, anon, authenticated;

-- What the week looked like, [p_from, p_to): matches played, the biggest upset (the winner fewest people voted for,
-- from 5 votes on, the same floor as the app's splits, counting only votes cast before the result), the titles
-- (finals) and how many matches come next week. Only matches we may talk about outside the app
-- (core.personal_push_ok: from an organiser, approved, no minor or hidden player, not a minor event).
create or replace function core.list_week(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with played as (
    select m.id, m.round, r.entered_at, r.winner_side, r.walkover
      from core.matches m join core.match_results r on r.match_id = m.id
     where m.starts_at >= p_from and m.starts_at < p_to and m.status <> 'void'
       and core.personal_push_ok(m.id)
  ), split as (
    select p.id, count(v.*)::int as total,
           count(v.*) filter (where v.option = p.winner_side)::int as for_winner
      from played p join core.votes v on v.subject_type = 'match' and v.subject_id = p.id and v.created_at <= p.entered_at
     where not p.walkover
     group by p.id
  ), upsets as (
    select s.id, s.total, round(100.0 * s.for_winner / s.total)::int as pct
      from split s where s.total >= 5 and s.for_winner * 2 < s.total
  ), titles as (
    select p.id from played p where p.round = 'final' order by p.entered_at desc limit 3
  ), upcoming as (
    select t.name, count(*)::int as n
      from core.matches m join core.tournaments t on t.id = m.tournament_id
     where m.starts_at >= p_to and m.starts_at < p_to + interval '7 days'
       and m.status in ('announced', 'scheduled') and m.postponed_at is null
       and m.approved and m.source = 'import' and not t.is_minor_event
     group by t.name
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'played', (select count(*) from played),
    'upsets', (select count(*) from upsets),
    'titles_count', (select count(*) from played where round = 'final'),
    'upset', (select core.list_match(u.id) || jsonb_build_object('pct', u.pct, 'votes', u.total)
                from upsets u order by u.pct, u.total desc limit 1),
    'titles', (select jsonb_agg(core.list_match(t.id)) from titles t),
    'next', (select sum(n) from upcoming),
    'next_tournament', (select name from upcoming order by n desc, name limit 1),
    'next_tournament_n', (select n from upcoming order by n desc, name limit 1)));
$$;
revoke all on function core.list_week(timestamptz, timestamptz) from public, anon, authenticated;

-- Hourly: on Monday from 09:00 Athens time, the week before goes to every confirmed subscriber without an account
-- (a tick that was missed catches up later the same Monday; the key is per week, so nobody gets it twice). A week
-- with nothing to say queues nothing. Every hour it also clears consent requests nobody confirmed in 30 days.
create or replace function core.list_weekly_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_local timestamp := p_now at time zone 'Europe/Athens';
  v_to timestamptz := date_trunc('week', p_now at time zone 'Europe/Athens') at time zone 'Europe/Athens';
  v_week text := to_char(p_now at time zone 'Europe/Athens', 'IYYY-"W"IW');
  v_data jsonb;
  v_n int := 0;
begin
  delete from core.list_subscribers
   where confirmed_at is null and unsubscribed_at is null and requested_at < p_now - interval '30 days';

  if extract(isodow from v_local) <> 1 or extract(hour from v_local) < 9 then
    return 0;
  end if;
  if not exists (select 1 from core.list_subscribers s
                  where s.confirmed_at is not null and s.unsubscribed_at is null
                    and not exists (select 1 from core.emails e where e.dedupe_key = 'site_weekly:' || s.id || ':' || v_week)) then
    return 0;
  end if;

  v_data := core.list_week(v_to - interval '7 days', v_to);
  if coalesce((v_data ->> 'played')::int, 0) = 0 and coalesce((v_data ->> 'next')::int, 0) = 0 then
    return 0;
  end if;

  insert into core.emails (kind, dedupe_key, payload, due_at, to_email)
  select 'site_weekly', 'site_weekly:' || s.id || ':' || v_week,
         v_data || jsonb_build_object('subscriber_id', s.id, 'week', v_week), p_now, s.email
    from core.list_subscribers s
   where s.confirmed_at is not null and s.unsubscribed_at is null and not core.list_has_account(s.email)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.list_weekly_sweep(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-list-weekly', '0 * * * *', $c$select core.list_weekly_sweep()$c$);
  end if;
end;
$$;

-- ── the sender's side: the core body, plus the list rules ─────────────────────────────────────────────────────────
-- List emails (grp 'list') carry payload.subscriber_id and their address in to_email. At send time:
--   * no such subscriber, or unsubscribed: skipped;
--   * not confirmed yet: skipped, except site_confirm (the consent request itself);
--   * site_weekly to an address that now has an account: skipped (they get the game emails instead);
--   * the token handed back is the subscriber's (confirm and unsubscribe links), the language theirs.
-- «Send me a test» rows (payload.test, an admin's user_id) pass with the admin's address.
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

  -- (Pro slice) a winback without its code waits while the pool is empty, outside the batch
  v_free := core.offer_codes_free('pro_winback');

  with due as (
    select e.id, e.kind, k.grp, e.payload, e.user_id,
           case when k.grp = 'list' and ls.id is not null then ls.email else coalesce(e.to_email, u.email) end as email,
           pr.deleted_at, pr.notification_prefs,
           ls.id as ls_id, ls.confirmed_at as ls_confirmed, ls.unsubscribed_at as ls_unsub,
           (coalesce(e.payload ->> 'test', '') = 'true' and e.user_id is not null) as is_test
      from core.emails e
      join core.email_kinds k on k.kind = e.kind
      left join auth.users u on u.id = e.user_id
      left join core.profiles pr on pr.user_id = e.user_id
      left join core.list_subscribers ls on k.grp = 'list' and ls.id::text = e.payload ->> 'subscriber_id'
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
                when d.grp = 'list' and not d.is_test and d.ls_id is null then 'no_subscriber'
                when d.grp = 'list' and d.ls_unsub is not null then 'unsubscribed'
                when d.grp = 'list' and not d.is_test and d.kind <> 'site_confirm' and d.ls_confirmed is null then 'unconfirmed'
                when d.kind = 'site_weekly' and not d.is_test and core.list_has_account(d.email) then 'has_account'
           end as skip0
      from due d
  ), gated as (
    select j.*, case when j.skip0 is null and j.grp <> 'list' then core.email_gate(j.kind, j.user_id, j.payload) end as gate
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

  -- (Pro slice) the winback's code, given only now that the email will go out; a retry keeps its code
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
      update core.emails set status = 'due', attempts = attempts - 1 where id = r.id;
      v_ids := array_remove(v_ids, r.id);
    end if;
  end loop;

  -- list emails go to the subscriber's address, in their language, with their own token (confirm and unsubscribe)
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', e.id, 'kind', e.kind, 'group', k.grp,
             'to', case when k.grp = 'list' and ls.id is not null then ls.email else coalesce(e.to_email, u.email) end,
             'payload', e.payload,
             'first_name', case when k.grp <> 'list' then nullif(btrim(pr.first_name), '') end, 'gender', pr.gender,
             'lang', case when k.grp = 'list' and ls.id is not null then ls.lang else coalesce(pr.locale, 'el') end,
             'unsubscribe_token', case when k.grp = 'list' then ls.token::text
                                       when k.grp <> 'account' then pr.email_token::text end) order by e.due_at), '[]'::jsonb)
      from core.emails e
      join core.email_kinds k on k.kind = e.kind
      left join auth.users u on u.id = e.user_id
      left join core.profiles pr on pr.user_id = e.user_id
      left join core.list_subscribers ls on k.grp = 'list' and ls.id::text = e.payload ->> 'subscriber_id'
     where e.id = any (v_ids));
end;
$$;
revoke all on function api.admin_emails_due(int) from public, anon, authenticated;
grant execute on function api.admin_emails_due(int) to service_role;
