-- Follow a tournament (20270305000000_tournament_follow): anyone follows, only their own rows; followers hear of the
-- draw, tomorrow's schedule and the final, once each, never at night, never when switched off or deleted, and not twice
-- when their own Pro push already said it.
begin;
select plan(51);

select core.athens_day(now()) as d \gset
select tests.create_user('tf-fan@test.local') as fan \gset
select tests.create_user('tf-off@test.local') as off \gset
select tests.create_user('tf-gone@test.local') as gone \gset
select tests.create_user('tf-pro@test.local') as pro \gset
select tests.create_user('tf-out@test.local') as out \gset
select tests.create_user('tf-cap@test.local') as cap \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
-- «Τουρνουά που ακολουθείς» off, the way the app does it (api.update_profile)
select tests.login(:'off'::uuid);
select lives_ok($$select api.update_profile(jsonb_build_object('notification_prefs', '{"followed": false, "reactions": true}'::jsonb))$$,
                'the switch saves through update_profile');
select tests.logout();
select is(core.push_wants(:'off'::uuid, 'followed'), false, 'switched off: no follower pushes');
select is(core.push_wants(:'fan'::uuid, 'followed'), true, 'on unless switched off');
select tests.mk_player('Νίκος', 'Πρόος') as p_pro \gset
select tests.mk_player('Φώτης', 'Φρίος') as p_b \gset
select tests.mk_player('Όθων', 'Όφος') as p_c \gset
select tests.mk_player('Ρένος', 'Ρέος') as p_d \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p_pro'::uuid;
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Follow Open', 'import', current_date) returning id as t \gset

-- ── follow and unfollow ──
select tests.as_anon();
select throws_ok(format('select api.follow_tournament(%L, true)', :'t'), '42501', null, 'not without signing in');
select tests.login(:'fan'::uuid);
select is(api.follow_tournament(:'t'::uuid, true), '{"followed": true, "followers": 1}'::jsonb, 'follow: on, one follower');
select is(api.follow_tournament(:'t'::uuid, true), '{"followed": true, "followers": 1}'::jsonb, 'follow again: still one');
select is((api.get_tournament(:'t'::uuid) ->> 'followed')::boolean, true, 'get_tournament: followed');
select is((api.get_tournament(:'t'::uuid) ->> 'followers')::int, 1, 'get_tournament: the follower count');
select is((select (i ->> 'followed')::boolean from jsonb_array_elements(api.get_tournaments() -> 'items') i where i ->> 'id' = :'t'),
          true, 'get_tournaments: listed and followed, before its first match or draw');
select is(api.follow_tournament(:'t'::uuid, false), '{"followed": false, "followers": 0}'::jsonb, 'unfollow');
select is((api.get_tournament(:'t'::uuid) ->> 'followed')::boolean, false, 'get_tournament: not followed');
select ok(not exists (select 1 from jsonb_array_elements(api.get_tournaments() -> 'items') i where i ->> 'id' = :'t'),
          'get_tournaments: no match, no draw, no follow: not listed');
select throws_ok(format('select api.follow_tournament(%L, true)', gen_random_uuid()), 'P0002', null, 'a tournament that is not there');
select throws_ok(format('insert into core.tournament_follows (user_id, tournament_id) values (%L, %L)', :'fan', :'t'), '42501', null,
                 'no writing the table directly');
select is((api.follow_tournament(:'t'::uuid, true) ->> 'followed')::boolean, true, 'follow again');
select tests.logout();

-- the others: off (switched off), gone (deleted), pro (plays in it), out (does not follow)
select tests.login(:'off'::uuid);
select api.follow_tournament(:'t'::uuid, true) as _x \gset
select tests.logout();
select tests.login(:'gone'::uuid);
select api.follow_tournament(:'t'::uuid, true) as _x \gset
select tests.logout();
select tests.login(:'pro'::uuid);
select api.follow_tournament(:'t'::uuid, true) as _x \gset
select tests.logout();
update core.profiles set deleted_at = now() where user_id = :'gone'::uuid;

-- RLS: your own rows only
select tests.login(:'out'::uuid);
select is((select count(*)::int from core.tournament_follows), 0, 'RLS: someone else sees none of the follows');
select tests.logout();
select tests.login(:'fan'::uuid);
select is((select count(*)::int from core.tournament_follows), 1, 'RLS: you see your own');
select tests.logout();

-- at most 100
insert into core.tournaments (sport_id, name, source, starts_on)
select 'tennis', 'Cap ' || g, 'import', current_date from generate_series(1, 100) g;
insert into core.tournament_follows (user_id, tournament_id) select :'cap'::uuid, id from core.tournaments where name like 'Cap %';
select tests.login(:'cap'::uuid);
select throws_ok(format('select api.follow_tournament(%L, true)', :'t'), '54000', null, 'the 101st follow: too many');
select is((api.follow_tournament((select id from core.tournaments where name = 'Cap 1'), true) ->> 'followed')::boolean, true,
          'one already followed: still fine');
select is((api.follow_tournament((select id from core.tournaments where name = 'Cap 1'), false) ->> 'followed')::boolean, false,
          'stopping one is always fine');
select tests.logout();

-- ── 1. the draw (the real trigger) ──
create temp view fp as select user_id, dedupe_key, payload, scheduled_at from core.notifications where type = 'follow';
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw) values (:'t'::uuid, 'Α ΑΠΛΟ', 'MS', 'knockout', 4,
  jsonb_build_object(
    'entrants', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΠΡΟΟΣ ΝΙΚΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΠΡΟΟΣ ΝΙΚΟΣ', 'player_id', :'p_pro'))),
      jsonb_build_object('pos', 2, 'raw', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'player_id', :'p_b'))),
      jsonb_build_object('pos', 3, 'raw', 'ΟΦΟΣ ΟΘΩΝ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΟΦΟΣ ΟΘΩΝ', 'player_id', :'p_c'))),
      jsonb_build_object('pos', 4, 'raw', 'ΡΕΟΣ ΡΕΝΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΡΕΟΣ ΡΕΝΟΣ', 'player_id', :'p_d')))),
    'rounds', jsonb_build_array(
      jsonb_build_array(
        jsonb_build_object('round', 1, 'slot', 1, 'side1', 'ΠΡΟΟΣ ΝΙΚΟΣ', 'side2', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'winner', null),
        jsonb_build_object('round', 1, 'slot', 2, 'side1', 'ΟΦΟΣ ΟΘΩΝ', 'side2', 'ΡΕΟΣ ΡΕΝΟΣ', 'winner', null)),
      jsonb_build_array(
        jsonb_build_object('round', 2, 'slot', 1, 'side1', null, 'side2', null, 'winner', null)))));

select is((select count(*)::int from fp where user_id = :'fan'::uuid), 1, 'draw: the follower hears of it');
select is((select payload ->> 'title' from fp where user_id = :'fan'::uuid), 'Follow Open: βγήκε η κλήρωση', 'draw: the title');
select is((select payload ->> 'body' from fp where user_id = :'fan'::uuid), 'Δες το ταμπλό.', 'draw: the body');
select is((select payload -> 'data' ->> 'url' from fp where user_id = :'fan'::uuid),
          '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'draw: data.url opens that draw');
select is((select payload ->> 'type' from core.outbox where payload ->> 'user_id' = :'fan' and payload ->> 'type' = 'follow'), 'follow',
          'draw: queued typed «follow»');
select is((select count(*)::int from fp where user_id = :'off'::uuid), 0, '«Τουρνουά που ακολουθείς» off: nothing');
select is((select count(*)::int from fp where user_id = :'gone'::uuid), 0, 'a deleted account: nothing');
select is((select count(*)::int from fp where user_id = :'out'::uuid), 0, 'not following: nothing');
select is((select count(*)::int from core.notifications where user_id = :'pro'::uuid and type = 'draw'), 1, 'the Pro player gets their own draw');
select is((select count(*)::int from fp where user_id = :'pro'::uuid), 0, 'and not the follower one too');

update core.tournament_draws set draw = draw || '{"flags": []}'::jsonb where tournament_id = :'t'::uuid;
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw)
values (:'t'::uuid, 'Β ΑΠΛΟ', 'MS', 'knockout', 2, '{"entrants": [], "rounds": []}'::jsonb);
select is((select count(*)::int from fp where user_id = :'fan'::uuid), 1, 'draw: once a day per tournament, whatever the categories');

-- a late follower once matches are played hears nothing about the draw
select tests.login(:'out'::uuid);
select api.follow_tournament(:'t'::uuid, true) as _x \gset
select tests.logout();
update core.tournament_draws
   set draw = jsonb_set(jsonb_set(draw, '{rounds,0,0,winner}', '1'), '{rounds,0,1,winner}', '2'),
       updated_at = now()
 where tournament_id = :'t'::uuid and tab = 'Α ΑΠΛΟ';
select is((select count(*)::int from fp where user_id = :'out'::uuid), 0, 'draw: not once a match is played');

-- at night it waits for 08:00
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Night Open', 'import', current_date) returning id as tn \gset
insert into core.tournament_follows (user_id, tournament_id) values (:'fan'::uuid, :'tn'::uuid);
alter table core.tournament_draws disable trigger draw_alert_on_change;
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw)
values (:'tn'::uuid, 'Γ', 'MS', 'knockout', 2, '{"entrants": [], "rounds": []}'::jsonb);
select is(core.follow_draw_alert(:'tn'::uuid, 'Γ', (:'d'::date + time '23:30') at time zone 'Europe/Athens'), 1, 'draw at 23:30: queued');
select is((select run_after from core.outbox where payload ->> 'user_id' = :'fan' and payload -> 'message' -> 'data' ->> 'tournament_id' = :'tn'),
          (:'d'::date + 1 + time '08:00') at time zone 'Europe/Athens', 'draw at 23:30: it waits for 08:00');
select is(core.follow_draw_alert(:'tn'::uuid, 'Γ', (:'d'::date + time '23:40') at time zone 'Europe/Athens'), 0, 'draw: not again');
alter table core.tournament_draws enable trigger draw_alert_on_change;

-- ── 3. the final (the real trigger) ──
update core.tournament_draws
   set draw = jsonb_set(jsonb_set(jsonb_set(draw, '{rounds,1,0,side1}', '"ΠΡΟΟΣ ΝΙΚΟΣ"'), '{rounds,1,0,side2}', '"ΡΕΟΣ ΡΕΝΟΣ"'),
                        '{rounds,1,0,winner}', '2')
 where tournament_id = :'t'::uuid and tab = 'Α ΑΠΛΟ';
create temp view ff as select * from fp where dedupe_key like 'follow_final:%';
select is((select payload ->> 'title' from ff where user_id = :'fan'::uuid), 'Follow Open: ο τελικός τελείωσε', 'final: the title');
select is((select payload ->> 'body' from ff where user_id = :'fan'::uuid), 'Ρένος Ρέος πήρε τον τίτλο στο Α ΑΠΛΟ.', 'final: the winner and the category');
select is((select payload -> 'data' ->> 'url' from ff where user_id = :'fan'::uuid),
          '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'final: data.url opens that draw');
select is((select count(*)::int from ff where user_id = :'out'::uuid), 1, 'final: a late follower hears this one');
select is((select count(*)::int from ff where user_id = :'pro'::uuid), 0, 'final: not the finalist');
select is((select count(*)::int from ff where user_id in (:'off'::uuid, :'gone'::uuid)), 0, 'final: not switched off, not deleted');
update core.tournament_draws set draw = draw || '{"flags": ["again"]}'::jsonb where tournament_id = :'t'::uuid and tab = 'Α ΑΠΛΟ';
select is((select count(*)::int from ff), 2, 'final: once');

-- a winner who is hidden is never named: no push
update core.players set hidden = true where id = :'p_b'::uuid;
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw) values (:'t'::uuid, 'Δ', 'MS', 'knockout', 2,
  jsonb_build_object(
    'entrants', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'player_id', :'p_b'))),
      jsonb_build_object('pos', 2, 'raw', 'ΟΦΟΣ ΟΘΩΝ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΟΦΟΣ ΟΘΩΝ', 'player_id', :'p_c')))),
    'rounds', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('round', 1, 'slot', 1, 'side1', 'ΦΡΙΟΣ ΦΩΤΗΣ', 'side2', 'ΟΦΟΣ ΟΘΩΝ', 'winner', null)))));
update core.tournament_draws set draw = jsonb_set(draw, '{rounds,0,0,winner}', '1') where tournament_id = :'t'::uuid and tab = 'Δ';
select is((select count(*)::int from ff where dedupe_key like '%:Δ'), 0, 'final: a hidden winner, no push');
update core.players set hidden = false where id = :'p_b'::uuid;

-- ── 2. tomorrow's schedule ──
alter table core.matches disable trigger schedule_alert_on_change;
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Program Open', 'import', current_date) returning id as ts \gset
insert into core.tournament_follows (user_id, tournament_id)
values (:'fan'::uuid, :'ts'::uuid), (:'off'::uuid, :'ts'::uuid), (:'gone'::uuid, :'ts'::uuid), (:'pro'::uuid, :'ts'::uuid);
select tests.mk_match(:'p_pro'::uuid, :'p_b'::uuid, ((:'d'::date + 1) + time '10:00') at time zone 'Europe/Athens') as s1 \gset
select tests.mk_match(:'p_c'::uuid, :'p_d'::uuid, ((:'d'::date + 1) + time '12:00') at time zone 'Europe/Athens') as s2 \gset
select tests.mk_match(:'p_c'::uuid, :'p_b'::uuid, ((:'d'::date + 2) + time '12:00') at time zone 'Europe/Athens') as s3 \gset
update core.matches set tournament_id = :'ts'::uuid where id in (:'s1'::uuid, :'s2'::uuid, :'s3'::uuid);
-- the Pro player already had «Το πρόγραμμά σου» for their match
select is(core.schedule_alert(:'s1'::uuid, 'new', (:'d'::date + time '12:00') at time zone 'Europe/Athens'), 1, 'the Pro player: their own schedule');

create temp view fs as select * from fp where dedupe_key like 'follow_schedule:%';
select is(core.follow_schedule_alerts((:'d'::date + time '17:50') at time zone 'Europe/Athens'), 0, 'schedule: not before 18:00');
select is(core.follow_schedule_alerts((:'d'::date + time '23:10') at time zone 'Europe/Athens'), 0, 'schedule: not from 23:00');
select is(core.follow_schedule_alerts((:'d'::date + time '19:00') at time zone 'Europe/Athens'), 1,
          'schedule at 19:00: the follower only (not off, not deleted, not the Pro player who had their own)');
select is((select payload ->> 'title' from fs where user_id = :'fan'::uuid), 'Program Open: το αυριανό πρόγραμμα', 'schedule: the title');
select is((select payload ->> 'body' from fs where user_id = :'fan'::uuid), '2 ματς αύριο. Δες ποιος παίζει και πότε.', 'schedule: tomorrow''s matches only');
select is((select payload -> 'data' ->> 'url' from fs where user_id = :'fan'::uuid),
          '/tournament/' || :'ts' || '?day=' || to_char(:'d'::date + 1, 'YYYY-MM-DD'), 'schedule: data.url opens that day');
select is(core.follow_schedule_alerts((:'d'::date + time '19:10') at time zone 'Europe/Athens'), 0, 'schedule: once a day');

select * from finish();
rollback;
