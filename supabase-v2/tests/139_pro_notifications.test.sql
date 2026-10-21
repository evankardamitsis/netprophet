-- Pro notifications (20270304000000_pro_notifications): the draw, the schedule and the reminders go to Pro only, never to
-- someone who switched them off, once per event, with data.url to the screen; between 23:00 and 08:00 Athens a draw or
-- schedule push waits for 08:00 and a reminder is not sent.
begin;
select plan(31);

-- ── quiet hours ──
select core.athens_day(now()) as d \gset
select is(core.push_at((:'d'::date + time '22:59') at time zone 'Europe/Athens'), (:'d'::date + time '22:59') at time zone 'Europe/Athens', '22:59: at once');
select is(core.push_at((:'d'::date + time '23:00') at time zone 'Europe/Athens'), (:'d'::date + 1 + time '08:00') at time zone 'Europe/Athens', '23:00: the next 08:00');
select is(core.push_at((:'d'::date + time '03:00') at time zone 'Europe/Athens'), (:'d'::date + time '08:00') at time zone 'Europe/Athens', '03:00: this 08:00');
select is(core.push_at((:'d'::date + time '08:00') at time zone 'Europe/Athens'), (:'d'::date + time '08:00') at time zone 'Europe/Athens', '08:00: at once');
select is(core.url_part('Α ΑΠΛΟ'), '%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'a draw tab is percent-encoded like encodeURIComponent');

-- ── people: Pro, free, Pro with «Τα τουρνουά σου» off, Pro with reminders off ──
select tests.create_user('pn-pro@test.local') as pro \gset
select tests.create_user('pn-free@test.local') as free \gset
select tests.create_user('pn-off@test.local') as off \gset
select tests.create_user('pn-remoff@test.local') as remoff \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active'), (:'off'::uuid, 'gift', 'active'), (:'remoff'::uuid, 'gift', 'active');
update core.profiles set notification_prefs = '{"tournaments": false}' where user_id = :'off'::uuid;
update core.profiles set notification_prefs = '{"reminders": false, "reactions": true}' where user_id = :'remoff'::uuid;
select tests.mk_player('Νίκος', 'Πρόος') as p_pro \gset
select tests.mk_player('Φώτης', 'Φρίος') as p_free \gset
select tests.mk_player('Όθων', 'Όφος') as p_off \gset
select tests.mk_player('Ρένος', 'Ρεμόφος') as p_remoff \gset
select tests.mk_player('Ξένος', 'Ξένου') as p_x \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p_pro'::uuid;
update core.players set claimed_by_user_id = :'free'::uuid where id = :'p_free'::uuid;
update core.players set claimed_by_user_id = :'off'::uuid where id = :'p_off'::uuid;
update core.players set claimed_by_user_id = :'remoff'::uuid where id = :'p_remoff'::uuid;
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Pro Open', 'import', current_date) returning id as t \gset

-- the builders are called here with a set clock, so the triggers (real clock) stay out of it
alter table core.matches disable trigger schedule_alert_on_change;
alter table core.tournament_draws disable trigger draw_alert_on_change;

-- the day after tomorrow, 10:00 Athens
select ((:'d'::date + 2) + time '10:00') at time zone 'Europe/Athens' as starts \gset
select tests.mk_match(:'p_pro'::uuid, :'p_free'::uuid, :'starts'::timestamptz) as m1 \gset
select tests.mk_match(:'p_off'::uuid, :'p_remoff'::uuid, :'starts'::timestamptz) as m2 \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'m1'::uuid, :'m2'::uuid);

-- ── the schedule ──
select is(core.schedule_alert(:'m1'::uuid, 'new', (:'d'::date + time '12:00') at time zone 'Europe/Athens'), 1, 'schedule: one push, to the Pro player only');
select is((select count(*)::int from core.notifications where user_id = :'free'::uuid and type = 'schedule'), 0, 'schedule: free gets nothing');
select is(core.schedule_alert(:'m2'::uuid, 'new', (:'d'::date + time '12:00') at time zone 'Europe/Athens'), 1, 'schedule: of two Pro players, one switched it off');
select is((select count(*)::int from core.notifications where user_id = :'off'::uuid), 0, '«Τα τουρνουά σου» off: nothing');
select is(core.schedule_alert(:'m1'::uuid, 'new', (:'d'::date + time '13:00') at time zone 'Europe/Athens'), 0, 'schedule: once per event');
select is((select payload -> 'data' ->> 'url' from core.notifications where user_id = :'pro'::uuid and type = 'schedule'), '/tournament/' || :'t',
          'schedule: data.url opens the tournament');
select is((select payload ->> 'type' from core.outbox where payload ->> 'user_id' = :'pro' and payload ->> 'type' = 'schedule'), 'schedule', 'schedule: typed');

-- at night: it waits for 08:00, and a newer change takes its place
select tests.mk_match(:'p_pro'::uuid, :'p_x'::uuid, ((:'d'::date + 2) + time '12:00') at time zone 'Europe/Athens') as m3 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m3'::uuid;
select is(core.schedule_alert(:'m3'::uuid, 'new', (:'d'::date + 1 + time '02:00') at time zone 'Europe/Athens'), 1, 'at 02:00: queued');
select is((select run_after from core.outbox where payload ->> 'dedupe_key' like 'schedule:%' || :'m3' || ':new:%'),
          (:'d'::date + 1 + time '08:00') at time zone 'Europe/Athens', 'at 02:00: it waits for 08:00');
update core.matches set starts_at = starts_at + interval '1 hour' where id = :'m3'::uuid;
select is(core.schedule_alert(:'m3'::uuid, 'moved', (:'d'::date + 1 + time '03:00') at time zone 'Europe/Athens'), 1, 'moved at 03:00: queued');
select is((select count(*)::int from core.outbox where payload ->> 'dedupe_key' like 'schedule:%' || :'m3' || ':%' and done_at is null), 1,
          'one push waits for the match, with the latest time');
select is((select payload -> 'message' ->> 'title' from core.outbox where payload ->> 'dedupe_key' like 'schedule:%' || :'m3' || ':%' and done_at is null),
          'Το πρόγραμμά σου', 'they never heard of it: still «Το πρόγραμμά σου»');

-- the sender: what is due goes with type and url; what waits for 08:00 stays
update core.outbox set run_after = now() - interval '1 second' where payload ->> 'dedupe_key' like 'schedule:%' || :'m1' || ':%';
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[pn-pro]', :'pro'::uuid, 'ios');
select core.take_push_batch(200) as b \gset
select ok(jsonb_path_exists(:'b'::jsonb, '$[*] ? (@.data.type == "schedule" && @.data.url starts with "/tournament/")'), 'the push carries type and url');
select is(jsonb_array_length(:'b'::jsonb), 1, 'the night push still waits');

-- ── the draw ──
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw) values (:'t'::uuid, 'Α ΑΠΛΟ', 'MS', 'knockout', 4,
  jsonb_build_object(
    'entrants', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΠΡΟΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΠΡΟΟΣ', 'player_id', :'p_pro'))),
      jsonb_build_object('pos', 2, 'raw', 'ΦΡΙΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΦΡΙΟΣ', 'player_id', :'p_free'))),
      jsonb_build_object('pos', 3, 'raw', 'ΟΦΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΟΦΟΣ', 'player_id', :'p_off'))),
      jsonb_build_object('pos', 4, 'raw', 'ΡΕΜΟΦΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΡΕΜΟΦΟΣ', 'player_id', :'p_remoff')))),
    'rounds', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('round', 1, 'slot', 1, 'winner', null),
      jsonb_build_object('round', 1, 'slot', 2, 'winner', null)))));
select is(core.draw_alert(:'t'::uuid, 'Α ΑΠΛΟ', (:'d'::date + time '23:30') at time zone 'Europe/Athens'), 2,
          'draw: the two Pro players with it on (not free, not switched off)');
select is((select payload -> 'data' ->> 'url' from core.notifications where user_id = :'pro'::uuid and type = 'draw'),
          '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'draw: data.url opens the tournament on that draw');
select is((select payload ->> 'body' from core.notifications where user_id = :'pro'::uuid and type = 'draw'),
          'Pro Open · Α ΑΠΛΟ: πρώτος γύρος με Φρίος', 'draw: with the opponent');
select is((select run_after from core.outbox where payload ->> 'dedupe_key' = 'draw:' || :'pro' || ':' || :'t' || ':Α ΑΠΛΟ'),
          (:'d'::date + 1 + time '08:00') at time zone 'Europe/Athens', 'draw at 23:30: it waits for 08:00');
select is(core.draw_alert(:'t'::uuid, 'Α ΑΠΛΟ', (:'d'::date + 1 + time '15:00') at time zone 'Europe/Athens'), 0, 'draw: once per draw');

-- ── the reminders ──
create temp view rm as select user_id, dedupe_key, payload from core.notifications where type = 'reminder';
select is(core.match_reminders((:'d'::date + 1 + time '23:10') at time zone 'Europe/Athens'), 0, 'reminders: nothing at 23:10');
select is(core.match_reminders((:'d'::date + 1 + time '20:05') at time zone 'Europe/Athens'), 3,
          'the evening before: the Pro player (two matches) and the one with only «Τα τουρνουά σου» off');
select is((select count(*)::int from rm where user_id in (:'free'::uuid, :'remoff'::uuid)), 0, 'reminders: not free, not switched off');
select is((select payload -> 'data' ->> 'url' from rm where dedupe_key like 'reminder:eve:' || :'pro' || ':' || :'m1' || ':%'), '/scout/' || :'m1',
          'a reminder opens «Ο αντίπαλος πριν το ματς»');
select is(core.match_reminders((:'d'::date + 1 + time '21:00') at time zone 'Europe/Athens'), 0, 'reminders: once each');

-- two hours before an 09:00 match: not at 07:30, at the 08:00 run
select tests.mk_match(:'p_pro'::uuid, :'p_x'::uuid, ((:'d'::date + 3) + time '09:00') at time zone 'Europe/Athens') as m4 \gset
select is(core.match_reminders((:'d'::date + 3 + time '07:30') at time zone 'Europe/Athens'), 0, 'two hours before, at 07:30: quiet');
select is((select count(*)::int from rm where dedupe_key like 'reminder:soon:%' || :'m4' || ':%')
          + core.match_reminders((:'d'::date + 3 + time '08:00') at time zone 'Europe/Athens'), 1, 'at 08:00: «Σε λίγο παίζεις»');

select * from finish();
rollback;
