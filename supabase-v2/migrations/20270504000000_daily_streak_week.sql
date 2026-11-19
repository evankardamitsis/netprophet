-- The daily σερί sheet in app 1.0.1 (board 18 Nov 2026, «Στην εφαρμογή»): a tap on σερί in the top bar shows this
-- week, Monday to Sunday, each day played (lime) or covered by an Ασφάλεια (the blue circle). api.get_me already
-- says whether the daily σερί is on (game.daily_streak); the days themselves live in core.streak_days
-- (20270427000000_daily_streak), which is server only. This reads your own days of the current Athens week, nothing
-- else, and changes nothing. While the switch is off it says so and lists no day.
create or replace function api.get_streak_week()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := core.athens_day();
  v_mon   date := v_today - (extract(isodow from v_today)::int - 1);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not core.daily_streak_on() then
    return jsonb_build_object('on', false, 'today', v_today, 'monday', v_mon, 'days', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'on', true,
    'today', v_today,
    'monday', v_mon,
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'kind', d.kind) order by d.day)
                        from core.streak_days d
                       where d.user_id = v_uid and d.day between v_mon and v_today), '[]'::jsonb));
end;
$$;
revoke all on function api.get_streak_week() from public, anon;
grant execute on function api.get_streak_week() to authenticated, service_role;
comment on function api.get_streak_week() is 'Your days of the daily σερί this Athens week (played or frozen), for the sheet in the top bar. Read only.';
