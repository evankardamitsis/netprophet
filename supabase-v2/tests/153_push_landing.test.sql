-- Where every push opens (20270320000000_push_landing): core.push_url is the table, core.take_push_batch puts data.url
-- on every push it sends (a push queued with its own url keeps it), data.type stays. Each kind is queued here by its
-- real builder, then sent, and the url on the wire is checked.
begin;
select plan(40);

-- ── the table ──
select is(core.push_url('results', '{}', null), '/?results=1', 'results: the home, results card open');
select is(core.push_url('schedule', '{"tournament_id": "t1", "match_id": "m1"}', null), '/tournament/t1?match=m1', 'schedule: the tournament on the match');
select is(core.push_url('schedule', '{"match_id": "m1"}', null), '/', 'schedule with no tournament: the home');
select is(core.push_url('draw', '{"tournament_id": "t1", "tab": "Α ΑΠΛΟ"}', null), '/tournament/t1?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F',
          'draw: Ταμπλό on that draw');
select is(core.push_url('follow', '{"tournament_id": "t1", "tab": "M"}', null), '/tournament/t1?draw=M', 'follow draw / final: Ταμπλό on that draw');
select is(core.push_url('follow', '{"tournament_id": "t1", "day": "2027-03-21"}', null), '/tournament/t1?day=2027-03-21', 'follow schedule: Πρόγραμμα on that day');
select is(core.push_url('entry', '{"tournament_id": "t1"}', null), '/tournament/t1', 'entry deadline: the tournament');
select is(core.push_url('entry', '{}', null), '/', 'entry with no tournament: the home');
select is(core.push_url('reminder', '{"tournament_id": "t1", "match_id": "m1"}', null), '/scout/m1', 'reminder: «Ο αντίπαλος πριν το ματς»');
select is(core.push_url('reaction', '{"tournament_id": "t1", "match_id": "m1"}', null), '/results?tournament=t1', 'reaction: Αποτελέσματα on the tournament');
select is(core.push_url('reaction', '{"match_id": "m1"}', null), '/results', 'reaction to a friendly: Αποτελέσματα');
select is(core.push_url('claim', '{"decision": "approved"}', gen_random_uuid()), '/players?focus=1', 'claim, no player held: find yourself');
select is(core.push_url('something_new', '{}', null), '/', 'an unknown kind: the home');

-- ── people with a device ──
select core.athens_day(now()) as d \gset
select tests.create_user('pl-pro@test.local') as pro \gset
select tests.create_user('pl-fan@test.local') as fan \gset
select tests.create_user('pl-opp@test.local') as opp \gset
select tests.create_user('pl-fr@test.local') as fr \gset
select tests.create_user('pl-c1@test.local') as c1 \gset
select tests.create_user('pl-c2@test.local') as c2 \gset
select tests.create_user('pl-h@test.local') as h \gset
select tests.create_user('pl-adm@test.local', 'editor') as adm \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
insert into core.push_tokens (token, user_id, platform)
select 'ExponentPushToken[pl-' || n || ']', u, 'ios'
  from (values ('pro', :'pro'::uuid), ('fan', :'fan'::uuid), ('opp', :'opp'::uuid), ('c1', :'c1'::uuid), ('c2', :'c2'::uuid), ('h', :'h'::uuid)) v(n, u);
select tests.mk_player('Νίκος', 'Πρόος') as p_pro \gset
select tests.mk_player('Φώτης', 'Αντίος') as p_opp \gset
select tests.mk_player('Όθων', 'Τρίτος') as p_x \gset
select tests.mk_player('Ρένος', 'Τέταρτος') as p_y \gset
select tests.mk_player('Μάριος', 'Κλέιμος') as p_c1 \gset
select tests.mk_player('Λάμπρος', 'Άλλος') as p_c2 \gset
select tests.mk_player('Χάρης', 'Κρατάει') as p_h \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p_pro'::uuid;
update core.players set claimed_by_user_id = :'opp'::uuid where id = :'p_opp'::uuid;
update core.players set claimed_by_user_id = :'h'::uuid where id = :'p_h'::uuid;
update core.profiles set claimed_player_id = :'p_h'::uuid, claim_status = 'claimed' where user_id = :'h'::uuid;
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Landing Open', 'import', current_date) returning id as t \gset
insert into core.tournament_follows (user_id, tournament_id) values (:'fan'::uuid, :'t'::uuid);

-- what went out, per device and kind
create temp table sent (m jsonb);
create or replace function pg_temp.send() returns int language plpgsql as $$
declare v jsonb;
begin
  update core.outbox set run_after = now() - interval '1 second' where kind = 'push' and done_at is null;
  v := core.take_push_batch(500);
  insert into sent select e from jsonb_array_elements(v) e;
  return jsonb_array_length(v);
end $$;
create or replace function pg_temp.url(p_who text, p_type text) returns text language sql as $$
  select m -> 'data' ->> 'url' from sent where m ->> 'to' = 'ExponentPushToken[pl-' || p_who || ']' and m -> 'data' ->> 'type' = p_type
   order by ctid desc limit 1
$$;

-- ── results: a vote resolves ──
select tests.play(:'c2'::uuid, true) is not null as x1 \gset
select ok(pg_temp.send() > 0, 'results: sent');
select is(pg_temp.url('c2', 'results'), '/?results=1', 'results push: data.url opens the home with the results card');
select is((select m -> 'data' ->> 'count' from sent where m -> 'data' ->> 'type' = 'results' and m ->> 'to' = 'ExponentPushToken[pl-c2]'), '1',
          'results push: still grouped with its count (and its type, for the «clear seen pushes»)');

-- ── schedule: the Pro player's match gets its time ──
select tests.mk_match(:'p_pro'::uuid, :'p_x'::uuid, now() + interval '2 days') as m1 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m1'::uuid;
select is(core.schedule_alert(:'m1'::uuid, 'new', now()), 1, 'schedule: queued');
select is((select payload -> 'data' ->> 'url' from core.notifications where user_id = :'pro'::uuid and type = 'schedule'),
          '/tournament/' || :'t' || '?match=' || :'m1', 'schedule: queued with the match in its url');
select pg_temp.send() as n2 \gset
select is(pg_temp.url('pro', 'schedule'), '/tournament/' || :'t' || '?match=' || :'m1', 'schedule push: the tournament on the match');

-- a schedule push queued before this migration (the old url) keeps what it carries
insert into core.outbox (kind, payload, idempotency_key)
values ('push', jsonb_build_object('user_id', :'pro', 'dedupe_key', 'pl-old', 'type', 'schedule', 'message',
        jsonb_build_object('title', 'x', 'body', 'y', 'data', jsonb_build_object('tournament_id', :'t', 'match_id', :'m1', 'url', '/tournament/' || :'t'))),
        'push:pl-old');
select pg_temp.send() as n3 \gset
select is(pg_temp.url('pro', 'schedule'), '/tournament/' || :'t', 'a push queued with its own url keeps it');

-- ── the draw: the Pro push and the follower push, from the draw trigger ──
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw) values (:'t'::uuid, 'Α ΑΠΛΟ', 'MS', 'knockout', 4,
  jsonb_build_object(
    'entrants', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΠΡΟΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΠΡΟΟΣ', 'player_id', :'p_pro'))),
      jsonb_build_object('pos', 2, 'raw', 'ΤΡΙΤΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΤΡΙΤΟΣ', 'player_id', :'p_x'))),
      jsonb_build_object('pos', 3, 'raw', 'ΑΝΤΙΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΝΤΙΟΣ', 'player_id', :'p_opp'))),
      jsonb_build_object('pos', 4, 'raw', 'ΤΕΤΑΡΤΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΤΕΤΑΡΤΟΣ', 'player_id', :'p_y')))),
    'rounds', jsonb_build_array(
      jsonb_build_array(jsonb_build_object('round', 1, 'slot', 1, 'winner', null), jsonb_build_object('round', 1, 'slot', 2, 'winner', null)),
      jsonb_build_array(jsonb_build_object('round', 2, 'slot', 1, 'side1', 'ΠΡΟΟΣ', 'side2', 'ΑΝΤΙΟΣ', 'winner', null)))));
select pg_temp.send() as n4 \gset
select is(pg_temp.url('pro', 'draw'), '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'draw push: Ταμπλό on that draw');
select is(pg_temp.url('fan', 'follow'), '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'follower draw push: Ταμπλό on that draw');

-- the final gets its winner: the followers hear, on that draw
delete from sent;
update core.tournament_draws
   set draw = jsonb_set(jsonb_set(jsonb_set(draw, '{rounds,0,0,winner}', '"1"'), '{rounds,0,1,winner}', '"1"'), '{rounds,1,0,winner}', '"1"')
 where tournament_id = :'t'::uuid and tab = 'Α ΑΠΛΟ';
select pg_temp.send() as n5 \gset
select is(pg_temp.url('fan', 'follow'), '/tournament/' || :'t' || '?draw=%CE%91%20%CE%91%CE%A0%CE%9B%CE%9F', 'follower final push: Ταμπλό on that draw');

-- ── tomorrow's schedule, to the follower ──
select tests.mk_match(:'p_x'::uuid, :'p_y'::uuid, ((core.feed_day(now()) + 1) + time '11:00') at time zone 'Europe/Athens') as m2 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m2'::uuid;
select is(core.follow_schedule_alerts((core.feed_day(now()) + time '19:00') at time zone 'Europe/Athens'), 1, 'follower schedule: queued');
select pg_temp.send() as n6 \gset
select is(pg_temp.url('fan', 'follow'), '/tournament/' || :'t' || '?day=' || to_char(core.feed_day(now()) + 1, 'YYYY-MM-DD'),
          'follower schedule push: Πρόγραμμα on that day');

-- ── the reminder two hours before ──
select ((:'d'::date + 5) + time '12:00') at time zone 'Europe/Athens' as rnow \gset
select tests.mk_match(:'p_pro'::uuid, :'p_y'::uuid, :'rnow'::timestamptz + interval '1 hour') as m3 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m3'::uuid;
select is(core.match_reminders(:'rnow'::timestamptz), 1, 'reminder: queued');
select pg_temp.send() as n7 \gset
select is(pg_temp.url('pro', 'reminder'), '/scout/' || :'m3', 'reminder push: «Ο αντίπαλος πριν το ματς»');

-- ── a reaction to a played tournament match ──
select tests.mk_match(:'p_pro'::uuid, :'p_opp'::uuid, now() - interval '1 day') as m4 \gset
update core.matches set tournament_id = :'t'::uuid where id = :'m4'::uuid;
select tests.finish_match(:'m4'::uuid, 1) is not null as x2 \gset
select tests.login(:'fr'::uuid);
select api.react(:'m4'::uuid, 'lets_go') is not null as x3 \gset
select tests.logout();
select pg_temp.send() as n8 \gset
select is(pg_temp.url('opp', 'reaction'), '/results?tournament=' || :'t', 'reaction push: Αποτελέσματα on the tournament');
select is(pg_temp.url('pro', 'reaction'), '/results?tournament=' || :'t', 'reaction push: to both sides');
-- a friendly
select tests.mk_match(:'p_pro'::uuid, :'p_opp'::uuid, now() - interval '2 days') as m5 \gset
select tests.finish_match(:'m5'::uuid, 1) is not null as x4 \gset
select tests.login(:'fr'::uuid);
select api.react(:'m5'::uuid, 'lets_go') is not null as x5 \gset
select tests.logout();
delete from sent;
select pg_temp.send() as n9 \gset
select is(pg_temp.url('opp', 'reaction'), '/results', 'reaction push on a friendly: Αποτελέσματα');

-- ── claims ──
-- approved: Εγώ, where the player now shows
select tests.login(:'c1'::uuid);
select api.claim_player(:'p_c1'::uuid) is not null as x6 \gset
select tests.logout();
select is(tests.approve_claim(:'c1'::uuid, true) ->> 'decision', 'approved', 'claim: approved');
select pg_temp.send() as n10 \gset
select is(pg_temp.url('c1', 'claim'), '/me', 'claim approved push: Εγώ');
-- rejected: nothing held, so Παίκτες to find yourself
select tests.login(:'c2'::uuid);
select api.claim_player(:'p_c2'::uuid) is not null as x7 \gset
select tests.logout();
select is(tests.approve_claim(:'c2'::uuid, false) ->> 'decision', 'rejected', 'claim: rejected');
select pg_temp.send() as n11 \gset
select is(pg_temp.url('c2', 'claim'), '/players?focus=1', 'claim rejected push: Παίκτες, to find yourself');
-- released: staff unlink the player
delete from sent;
select tests.login(:'adm'::uuid);
select is(api.admin_unclaim(:'p_c1'::uuid) ->> 'claimed', 'false', 'claim: released');
select tests.logout();
select pg_temp.send() as n12 \gset
select is(pg_temp.url('c1', 'claim'), '/players?focus=1', 'claim released push: Παίκτες, to find the right one');
-- «Δεν είμαι εγώ» on your own player, dismissed: you keep it, Εγώ
select tests.login(:'h'::uuid);
select is(api.report_claim(:'p_h'::uuid, null, 'not_me_own') ->> 'reported', 'true', 'own report: filed');
select tests.logout();
select id as f_keep from core.identity_flags where reporter_user_id = :'h'::uuid and kind = 'not_me_own' \gset
select tests.login(:'adm'::uuid);
select is(api.admin_decide_identity(:'f_keep', 'dismiss') ->> 'status', 'dismissed', 'own report: dismissed');
select tests.logout();
select pg_temp.send() as n13 \gset
select is(pg_temp.url('h', 'claim'), '/me', 'claim report dismissed push (own player): Εγώ');

-- every push that went out carries a type and an app path
select is((select count(*)::int from sent where m -> 'data' ->> 'type' is null or m -> 'data' ->> 'url' not like '/%'), 0,
          'every push: data.type and data.url');

select * from finish();
rollback;
