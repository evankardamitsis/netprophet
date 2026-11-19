-- The σερί emails show the prize (founder, 19 Nov 2026: "if you win anything show it on the email"). The lost and
-- 20:00 emails now carry what a day of play would give: the unused Ασφάλειες (a free one comes only while fewer than
-- the max of 2 are held, core.grant_freeze) and, for the 20:00 one, the Frame the next day would give if it is not
-- owned yet. Only core.streak_email_sweep changes (as in 20270427000000_daily_streak.sql, the payloads changed).

-- unused Ασφάλειες
create or replace function core.streak_freezes_left(p_user uuid)
returns int language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int from core.freezes where user_id = p_user and used_at is null
$$;
revoke all on function core.streak_freezes_left(uuid) from public, anon, authenticated;

-- the Frame a σερί of p_n days gives (packages/core DAY_MILESTONE_FRAMES), null when none or already owned
create or replace function core.streak_next_frame(p_user uuid, p_n int)
returns text language sql stable security definer set search_path = core, pg_temp
as $$
  select k from (select case p_n when 7 then 'frame_seven' when 10 then 'frame_ten' when 30 then 'frame_month'
                                 when 100 then 'frame_hundred' end as k) x
   where k is not null
     and not exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                      where uc.user_id = p_user and c.key = x.k)
$$;
revoke all on function core.streak_next_frame(uuid, int) from public, anon, authenticated;

create or replace function core.streak_email_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s       core.email_settings;
  r       record;
  v_n     int := 0;
  v_today date := core.athens_day(p_now);
  v_ten   timestamptz := core.email_slot(core.athens_day(p_now), 10);
  v_eight timestamptz := core.email_slot(core.athens_day(p_now), 20);
  v_hour  int := extract(hour from p_now at time zone 'Europe/Athens');
begin
  select * into s from core.email_settings;
  if s.mode = 'off' or not core.daily_streak_on() then return 0; end if;

  if p_now >= v_ten and p_now < v_ten + interval '4 hours' then
    for r in
      select distinct on (e.user_id) e.user_id, e.streak_before as n, g.streak_best as best
        from core.streak_events e join core.user_game_state g on g.user_id = e.user_id
       where e.kind = 'broke' and e.day = v_today - 1 and e.streak_before >= 7
         and coalesce(g.day_last, date '-infinity') < v_today
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_lost:' || e.user_id || ':' || v_today)
       order by e.user_id, e.id desc
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_lost', 'streak_lost:' || r.user_id || ':' || v_today,
                               jsonb_build_object('n', r.n, 'best', r.best, 'day', v_today,
                                                  'freezes', core.streak_freezes_left(r.user_id)), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  if v_hour between 10 and 21 then
    for r in
      select distinct e.user_id, e.streak_after as n
        from core.streak_events e
       where e.kind = 'played' and e.streak_after in (30, 100) and e.day >= v_today - 2
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_milestone:' || e.user_id || ':' || e.streak_after)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_milestone', 'streak_milestone:' || r.user_id || ':' || r.n,
                               jsonb_build_object('n', r.n, 'frame', case r.n when 30 then 'frame_month' else 'frame_hundred' end), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  if p_now >= v_eight and p_now < v_eight + interval '1 hour' then
    for r in
      select g.user_id, g.streak from core.user_game_state g
       where g.streak >= 1 and g.day_last < v_today and coalesce(g.day_through, g.day_last) >= v_today - 1
         and not exists (select 1 from core.push_tokens pt where pt.user_id = g.user_id)
         and core.push_wants(g.user_id, 'streak_reminder')
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_reminder:' || g.user_id || ':' || v_today)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_reminder_email', 'streak_reminder:' || r.user_id || ':' || v_today,
                               jsonb_build_object('n', r.streak, 'day', v_today,
                                                  'freezes', core.streak_freezes_left(r.user_id),
                                                  'next_frame', core.streak_next_frame(r.user_id, r.streak + 1)), p_now);
      v_n := v_n + 1;
    end loop;
  end if;
  return v_n;
end;
$$;
revoke all on function core.streak_email_sweep(timestamptz) from public, anon, authenticated;
