-- Players who were here before the launch get the launch email and nothing else from the game (founder, 19 Nov 2026).
-- core.email_gate as in 20270427000000_daily_streak.sql, with the before-launch rule added at the top.
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

  -- players from before the launch (founder, 19 Nov 2026): the launch email only, sent by hand from Resend. So no game
  -- email and no winback for accounts made before core.email_settings.start_at (set to the launch, 19 Nov 08:12 UTC).
  -- Account emails and the Pro emails that answer what they do themselves (welcome to Pro, trial ending, cancelled)
  -- still go.
  if ((select grp from core.email_kinds where kind = p_kind) = 'game' or p_kind = 'pro_winback')
     and (select pr.created_at from core.profiles pr where pr.user_id = p_user) < (select start_at from core.email_settings) then
    return jsonb_build_object('skip', 'before_launch');
  end if;

  -- the weekly cap (20270426000000_email_series): a game email waits out the week when the person already had 2
  -- game emails sent in the last 7 days (account emails never count; «Send me a test» rows neither count nor wait).
  -- The σερί-lost and milestone emails skip it (founder, 18 Nov): rare and timely; they still count for the others.
  if (select grp from core.email_kinds where kind = p_kind) = 'game'
     and p_kind not in ('streak_lost', 'streak_milestone')
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
