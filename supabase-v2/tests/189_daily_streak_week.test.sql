-- api.get_streak_week: your own days of the daily σερί this Athens week (Monday to today), played or frozen; nothing
-- while the switch is off; never anyone else's; never last week's; signed in only.
begin;
select plan(9);

select core.athens_day() as today \gset
select (:'today'::date - (extract(isodow from :'today'::date)::int - 1)) as mon \gset
select tests.create_user('week-me@test.local') as u \gset
select tests.create_user('week-other@test.local') as o \gset

insert into core.streak_days (user_id, day, kind) values
  (:'u'::uuid, :'mon'::date, 'played'),
  (:'u'::uuid, :'today'::date, case when :'today'::date = :'mon'::date then 'played' else 'frozen' end),
  (:'u'::uuid, :'mon'::date - 1, 'played'),
  (:'o'::uuid, :'today'::date, 'played')
on conflict do nothing;

select tests.as_anon();
select throws_ok($$select api.get_streak_week()$$, '42501', null, 'not for anon');
select tests.logout();

-- off (the default): it says so and lists nothing
select tests.login(:'u'::uuid);
select is((api.get_streak_week() ->> 'on')::boolean, false, 'off: the switch is off');
select is(jsonb_array_length(api.get_streak_week() -> 'days'), 0, 'off: no day');
select tests.logout();

update core.game_settings set daily_streak = true where id;

select tests.login(:'u'::uuid);
select is(api.get_streak_week() ->> 'today', :'today', 'today is the Athens day');
select is(api.get_streak_week() ->> 'monday', :'mon', 'the week starts on Monday');
select is((select array_agg(x ->> 'day' order by x ->> 'day') from jsonb_array_elements(api.get_streak_week() -> 'days') x),
          (select array_agg(distinct d::text order by d::text) from unnest(array[:'mon'::date, :'today'::date]) d),
          'on: this week''s days only, in order (last Sunday is left out)');
select is((select x ->> 'kind' from jsonb_array_elements(api.get_streak_week() -> 'days') x where x ->> 'day' = :'today'),
          case when :'today'::date = :'mon'::date then 'played' else 'frozen' end, 'a frozen day says so');
select tests.logout();

select tests.login(:'o'::uuid);
select is(jsonb_array_length(api.get_streak_week() -> 'days'), 1, 'another person sees only their own day');
select tests.logout();

select is((select count(*)::int from core.streak_days where user_id = :'u'::uuid),
          case when :'today'::date = :'mon'::date then 2 else 3 end, 'reading changes nothing');

select * from finish();
rollback;
