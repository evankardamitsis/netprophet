-- The launch email to the old NetProphet's accounts, sent by the hourly email job instead of by hand from Resend
-- (founder, 20 Nov 2026: "these should all be automated flows"; start when Android is live).
--
-- - core.email_settings.launch_at: when it starts. Null until it is set (the day Google Play publishes the app); the
--   sweep does nothing before it.
-- - core.email_settings.launch_before: which accounts get it, the ones made before this moment. 1 Oct 2026, when the new
--   app first had accounts of its own: the accounts before it are the old app's (carried over with their dates), the
--   ones after it are test and early accounts.
-- - core.email_launch_sweep(): hourly; one launch_v1 per such account, deleted ones never, once only (dedupe key).
--   The sender's usual rules still apply: the switch, «no game emails» in Ρυθμίσεις or the unsubscribe link.
-- - core.email_gate: launch_v1 is let through the before-launch rule (it is the one email those accounts get) and
--   it neither waits for nor counts towards the weekly cap's wait (it still counts as a game email sent).

insert into core.email_kinds (kind, grp, label) values ('launch_v1', 'game', 'Το νέο NetProphet (παλιοί λογαριασμοί)')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;

alter table core.email_settings add column if not exists launch_at timestamptz;
alter table core.email_settings add column if not exists launch_before timestamptz not null default '2026-10-01 00:00:00+00';

create or replace function core.email_launch_sweep()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s core.email_settings;
  n int := 0;
  r record;
begin
  select * into s from core.email_settings;
  if s.launch_at is null or now() < s.launch_at then return 0; end if;
  for r in select pr.user_id from core.profiles pr
            where pr.created_at < s.launch_before and pr.deleted_at is null
              and not exists (select 1 from core.emails e where e.dedupe_key = 'launch_v1:' || pr.user_id) loop
    perform core.email_queue(r.user_id, 'launch_v1', 'launch_v1:' || r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function core.email_launch_sweep() from public, anon, authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-email-launch', '3 * * * *', $c$select core.email_launch_sweep()$c$);
  end if;
end;
$do$;

-- core.email_gate as in 20270429000000_email_existing_players.sql, with launch_v1 let through the before-launch rule
-- and the weekly cap.
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

  -- players from before the launch (founder, 19 Nov 2026): the launch email only (queued by core.email_launch_sweep
  -- since 20 Nov, no longer sent by hand from Resend). So no game
  -- email and no winback for accounts made before core.email_settings.start_at (set to the launch, 19 Nov 08:12 UTC).
  -- Account emails and the Pro emails that answer what they do themselves (welcome to Pro, trial ending, cancelled)
  -- still go.
  if ((select grp from core.email_kinds where kind = p_kind) = 'game' or p_kind = 'pro_winback')
     and p_kind <> 'launch_v1'
     and (select pr.created_at from core.profiles pr where pr.user_id = p_user) < (select start_at from core.email_settings) then
    return jsonb_build_object('skip', 'before_launch');
  end if;

  -- the weekly cap (20270426000000_email_series): a game email waits out the week when the person already had 2
  -- game emails sent in the last 7 days (account emails never count; «Send me a test» rows neither count nor wait).
  -- The σερί-lost and milestone emails skip it (founder, 18 Nov): rare and timely; they still count for the others.
  if (select grp from core.email_kinds where kind = p_kind) = 'game'
     and p_kind not in ('streak_lost', 'streak_milestone', 'launch_v1')
     and (select count(*) from core.emails e join core.email_kinds k on k.kind = e.kind
           where e.user_id = p_user and k.grp = 'game' and e.status in ('sent', 'sending')
             and e.dedupe_key not like 'test:%'
             and coalesce(e.sent_at, e.created_at) > now() - interval '7 days') >= 2 then
    return jsonb_build_object('skip', 'cap');
  end if;

  -- the daily σερί emails (20270427000000_daily_streak): only while it is on; the reminder only on its own evening
  -- before 22:00 and while they still have not played; the lost one only while no new σερί started that day
  if p_kind in ('streak_lost', 'streak_milestone', 'streak_reminder_email') and not core.daily_streak_on() then
    return jsonb_build_object('skip', 'daily_streak_off');
  end if;
  if p_kind = 'streak_reminder_email' then
    if core.athens_day(now()) is distinct from (p_payload ->> 'day')::date
       or extract(hour from now() at time zone 'Europe/Athens') >= 22 then
      return jsonb_build_object('skip', 'late');
    end if;
    if (select g.day_last from core.user_game_state g where g.user_id = p_user) >= (p_payload ->> 'day')::date then
      return jsonb_build_object('skip', 'played');
    end if;
  elsif p_kind = 'streak_lost' then
    if (select g.day_last from core.user_game_state g where g.user_id = p_user) >= (p_payload ->> 'day')::date then
      return jsonb_build_object('skip', 'started_again');
    end if;
  end if;

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
