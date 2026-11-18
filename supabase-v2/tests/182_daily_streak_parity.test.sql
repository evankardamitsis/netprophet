-- The daily σερί rule parity: packages/core rules/dailyStreak.ts and the SQL give the same results on the shared
-- vectors (packages/core/test-vectors/daily-streak.json), first through the pure functions (core.day_streak_play,
-- day_streak_rollover, day_streak_moment, day_streak_backfill), then each sequence again end to end against the
-- tables (core.day_streak_touch and day_streak_close on a real account, the freezes as rows). A group with no SQL
-- mapping fails.
\set ON_ERROR_STOP on
\set daily `cat "${VECTORS_DIR:-packages/core/test-vectors}/daily-streak.json"`

begin;

create temp table dvec (doc jsonb not null);
insert into dvec values (:'daily'::jsonb);
grant select on dvec to public;

select plan(
  1
  + (select count(*)::int from dvec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c)
  + (select count(*)::int from dvec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
      where g ->> 'fn' = 'dailyStreakSequence'));

select is((select doc ->> 'version' from dvec), '1', 'daily-streak.json is version 1');

update core.game_settings set daily_streak = true where id;

create function tests.dcases() returns table (fn text, name text, input jsonb, expected jsonb) language sql stable as $$
  select g ->> 'fn', c ->> 'name', c -> 'input', c -> 'expected'
    from dvec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
$$;

-- the steps of a sequence as (op, day) pairs: play_at becomes its Athens day, play_days expands
create function tests.dsteps(p_steps jsonb) returns table (n int, op text, day date, quiet boolean) language sql stable as $$
  select (row_number() over (order by o, k))::int, st ->> 'op',
         case st ->> 'op'
           when 'play' then (st ->> 'day')::date
           when 'play_at' then core.athens_day((st ->> 'at')::timestamptz)
           when 'play_days' then (st ->> 'from')::date + k
           when 'rollover' then (st ->> 'today')::date
         end,
         coalesce((st ->> 'quiet')::boolean, false)
    from jsonb_array_elements(p_steps) with ordinality s(st, o)
    cross join lateral generate_series(0, case when st ->> 'op' = 'play_days' then (st ->> 'count')::int - 1 else 0 end) k
$$;

create function tests.daily_parity() returns setof text language plpgsql as $$
declare
  c      record;
  st     record;
  s      jsonb;
  r      jsonb;
  ev     jsonb;
  u      uuid;
  f      text;
  v_fid  uuid;
begin
  for c in select * from tests.dcases() loop
    if c.fn = 'dayStreakMoment' then
      return next is(core.day_streak_moment(c.input), case when c.expected = 'null'::jsonb then null else c.expected end,
                     'moment: ' || c.name);
      continue;
    end if;
    if c.fn = 'backfillDailyStreak' then
      return next is(core.day_streak_backfill(array(select jsonb_array_elements_text(c.input -> 'days')::date),
                                              (c.input ->> 'today')::date), c.expected, 'backfill: ' || c.name);
      continue;
    end if;
    if c.fn <> 'dailyStreakSequence' then
      return next fail('daily-streak: no SQL mapping for fn ' || c.fn || ' (' || c.name || ')');
      continue;
    end if;

    -- 1. pure
    s := c.input -> 'initial';
    ev := '[]'::jsonb;
    for st in select * from tests.dsteps(c.input -> 'steps') order by n loop
      if st.op in ('play', 'play_at', 'play_days') then
        r := core.day_streak_play(s, st.day, 2);
      elsif st.op = 'rollover' then
        r := core.day_streak_rollover(s, st.day);
      else
        r := case when jsonb_array_length(s -> 'freezes') < 2
                  then jsonb_build_object('state', s || jsonb_build_object('freezes', (s -> 'freezes') || '["paid"]'::jsonb),
                                          'events', '[{"kind": "bought"}]'::jsonb)
                  else jsonb_build_object('state', s, 'events', '[{"kind": "rejected", "reason": "max_freezes"}]'::jsonb) end;
      end if;
      s := r -> 'state';
      if not st.quiet then ev := ev || (r -> 'events'); end if;
    end loop;
    return next is(jsonb_build_object('events', ev, 'final', s), c.expected, 'pure: ' || c.name);

    -- 2. against the tables, one account per case
    u := tests.create_user('ds-' || md5(c.name) || '@test.local');
    update core.user_game_state
       set streak = (c.input #>> '{initial,current}')::int, streak_best = (c.input #>> '{initial,best}')::int,
           day_last = (c.input #>> '{initial,lastPlayed}')::date, day_through = (c.input #>> '{initial,through}')::date,
           record_run = (c.input #>> '{initial,recordRun}')::boolean
     where user_id = u;
    for f in select jsonb_array_elements_text(c.input #> '{initial,freezes}') loop
      perform core.grant_freeze(u, f, case f when 'paid' then 'purchase' else 'gift' end, 2);
    end loop;
    ev := '[]'::jsonb;
    for st in select * from tests.dsteps(c.input -> 'steps') order by n loop
      if st.op in ('play', 'play_at', 'play_days') then
        r := core.day_streak_touch(u, (st.day + time '12:00') at time zone 'Europe/Athens');
      elsif st.op = 'rollover' then
        r := core.day_streak_close(u, st.day, (st.day + time '00:07') at time zone 'Europe/Athens');
      else
        v_fid := core.grant_freeze(u, 'paid', 'purchase', 2);
        r := case when v_fid is null then '[{"kind": "rejected", "reason": "max_freezes"}]'::jsonb else '[{"kind": "bought"}]'::jsonb end;
      end if;
      if not st.quiet then ev := ev || r; end if;
    end loop;
    return next is(jsonb_build_object('events', ev, 'final', core.day_streak_state(u)), c.expected, 'tables: ' || c.name);
  end loop;
end $$;

select * from tests.daily_parity();

select * from finish();
rollback;
