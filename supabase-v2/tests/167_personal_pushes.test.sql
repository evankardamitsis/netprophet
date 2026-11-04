-- Personal pushes: grouped per person, one for what you already know, never for minors, at most 3 a day, nothing twice.
begin;
select plan(18);

select tests.create_user('pp-a@test.local') as a \gset
select tests.create_user('pp-b@test.local') as b \gset
select tests.create_user('pp-off@test.local') as off \gset
select tests.create_user('pp-none@test.local') as none \gset
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[pp-a]', :'a'::uuid, 'ios'), ('ExponentPushToken[pp-b]', :'b'::uuid, 'ios'), ('ExponentPushToken[pp-off]', :'off'::uuid, 'ios');
update core.profiles set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || '{"players": false, "followed": false}' where user_id = :'off'::uuid;

select tests.mk_player('Νίκος', 'Βλάχος') as p1 \gset
select tests.mk_player('Πέτρος', 'Παππάς') as p2 \gset
select tests.mk_player('Γιώργος', 'Μικρός') as kid \gset
update core.players set is_minor = true where id = :'kid'::uuid;
insert into core.tournaments (sport_id, name, source, announced_at) values ('tennis', 'Pushes Open', 'import', now()) returning id as t \gset

create or replace function pg_temp.match_(p_t uuid, p1 uuid, p2 uuid, p_round text, p_at timestamptz, p_status text default 'scheduled') returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into core.matches (sport_id, format, status, starts_at, tournament_id, round, source, approved)
  values ('tennis', 'singles', p_status, p_at, p_t, p_round, 'import', true) returning id into v;
  insert into core.match_participants (match_id, player_id, side, position) values (v, p1, 1, 1), (v, p2, 2, 1);
  return v;
end $$;
create or replace function pg_temp.result_(p_m uuid) returns void language sql as $$
  insert into core.match_results (match_id, winner_side, sets, score_summary, sets_won, sets_lost) values (p_m, 1, '[]', '6-4 6-2', 2, 0)
$$;
create or replace function pg_temp.got(p_u uuid, p_like text) returns int language sql as $$
  select count(*)::int from core.notifications where user_id = p_u and type = 'personal' and dedupe_key like p_like
$$;
create or replace function pg_temp.body(p_u uuid, p_like text) returns text language sql as $$
  select payload ->> 'body' from core.notifications where user_id = p_u and type = 'personal' and dedupe_key like p_like limit 1
$$;

-- a follows the two players; off follows them with the switches off; none has no device
insert into core.follows (user_id, player_id, relation, source) values
  (:'a'::uuid, :'p1'::uuid, 'friend', 'profile'), (:'off'::uuid, :'p1'::uuid, 'friend', 'profile'), (:'none'::uuid, :'p1'::uuid, 'friend', 'profile');
insert into core.tournament_follows (user_id, tournament_id) values (:'b'::uuid, :'t'::uuid);

-- noon Athens today: not an evening, no quiet hours
select (date_trunc('day', now() at time zone 'Europe/Athens') + interval '12 hours') at time zone 'Europe/Athens' as noon \gset

-- a result of a followed player
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'p2'::uuid, null, :'noon'::timestamptz - interval '1 day', 'confirmed') as m1 \gset
select pg_temp.result_(:'m1'::uuid);
update core.match_results set entered_at = :'noon'::timestamptz - interval '10 minutes' where match_id = :'m1'::uuid;
select core.personal_push_sweep(:'noon'::timestamptz);
select is(pg_temp.got(:'a'::uuid, 'personal:result:%'), 1, 'a followed player''s result reaches the follower');
select is(pg_temp.body(:'a'::uuid, 'personal:result:%'), 'Ν. Βλάχος νίκησε τον Π. Παππά · 6-4 6-2', 'and says who beat whom');
select is(pg_temp.got(:'off'::uuid, 'personal:%'), 0, 'not with the switch off');
select is(pg_temp.got(:'none'::uuid, 'personal:%'), 0, 'not without a device');
select core.personal_push_sweep(:'noon'::timestamptz + interval '10 minutes');
select is(pg_temp.got(:'a'::uuid, 'personal:result:%'), 1, 'and only once');

-- one you voted on is the results push's
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'p2'::uuid, null, :'noon'::timestamptz - interval '1 day', 'confirmed') as m2 \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key) values (:'a'::uuid, 'match', :'m2'::uuid, 1, current_date);
select pg_temp.result_(:'m2'::uuid);
update core.match_results set entered_at = :'noon'::timestamptz where match_id = :'m2'::uuid;
select core.personal_push_sweep(:'noon'::timestamptz + interval '20 minutes');
select is(pg_temp.got(:'a'::uuid, 'personal:result:%'), 1, 'a match you voted on never comes here');

-- a final to vote on: to the tournament's follower, once, with its name
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'p2'::uuid, 'final', :'noon'::timestamptz + interval '1 day') as f1 \gset
select core.personal_push_sweep(:'noon'::timestamptz + interval '30 minutes');
select is(pg_temp.got(:'b'::uuid, 'personal:stage_open:%'), 1, 'a final to vote on reaches the tournament''s follower');
select is((select payload ->> 'title' from core.notifications where user_id = :'b'::uuid and dedupe_key like 'personal:stage_open:%'), 'Τελικός στο Pushes Open', 'named as a final');
select is(pg_temp.got(:'a'::uuid, 'personal:stage_open:%'), 1, 'and the follower of its players');
select core.personal_push_sweep(:'noon'::timestamptz + interval '40 minutes');
select is(pg_temp.got(:'b'::uuid, 'personal:stage_open:%'), 1, 'once');

-- its result to the tournament's follower, not again to the player's follower
select pg_temp.result_(:'f1'::uuid);
update core.match_results set entered_at = :'noon'::timestamptz + interval '45 minutes' where match_id = :'f1'::uuid;
select core.personal_push_sweep(:'noon'::timestamptz + interval '50 minutes');
select is(pg_temp.got(:'b'::uuid, 'personal:stage_result:%'), 1, 'the final''s result reaches the tournament''s follower');
select is(pg_temp.got(:'a'::uuid, 'personal:stage_result:%'), 0, 'who follows only the player hears it once, as a result');

-- a minor in the match: nobody hears
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'kid'::uuid, 'final', :'noon'::timestamptz + interval '2 hours') as fk \gset
select is(core.personal_push_ok(:'fk'::uuid), false, 'a match with a minor is never spoken of');

-- someone follows your claimed player
update core.players set claimed_by_user_id = :'b'::uuid where id = :'p2'::uuid;
insert into core.follows (user_id, player_id, relation, source, created_at) values (:'a'::uuid, :'p2'::uuid, 'friend', 'profile', :'noon'::timestamptz + interval '55 minutes');
select core.personal_push_sweep(:'noon'::timestamptz + interval '60 minutes');
select is(pg_temp.got(:'b'::uuid, 'personal:follower:%'), 1, 'a new follower is told to the player');

-- tomorrow's matches, only from 18:00
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'p2'::uuid, null, :'noon'::timestamptz + interval '1 day 6 hours') as tm \gset
delete from core.notifications where user_id = :'a'::uuid and type = 'personal';
select core.personal_push_sweep(:'noon'::timestamptz + interval '70 minutes');
select is(pg_temp.got(:'a'::uuid, 'personal:tomorrow:%'), 0, 'not at noon');
select core.personal_push_sweep(:'noon'::timestamptz + interval '7 hours');
select is(pg_temp.got(:'a'::uuid, 'personal:tomorrow:%'), 1, 'in the evening');

-- the cap: b had the final, its result and the follower today
select is(core.personal_push(:'b'::uuid, 'cap-x', 't', 'b', '/', :'noon'::timestamptz + interval '8 hours'), false, 'the fourth of a day does not go');

-- your one result was an upset you called: 1 of 4 saw it coming
select pg_temp.match_(:'t'::uuid, :'p1'::uuid, :'p2'::uuid, null, :'noon'::timestamptz - interval '2 days', 'confirmed') as up \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key, resolved_at, outcome, is_upset_call) values
  (:'a'::uuid, 'match', :'up'::uuid, 1, current_date, now(), 'correct', true),
  (:'b'::uuid, 'match', :'up'::uuid, 2, current_date, now(), 'wrong', false),
  (:'off'::uuid, 'match', :'up'::uuid, 2, current_date, now(), 'wrong', false),
  (:'none'::uuid, 'match', :'up'::uuid, 2, current_date, now(), 'wrong', false);
insert into core.outbox (kind, payload, idempotency_key, run_after)
values ('push', jsonb_build_object('user_id', :'a'::uuid, 'dedupe_key', 'result:' || :'a' || ':' || :'up'), 'push:result:' || :'a' || ':' || :'up', now() - interval '1 minute');
select is((select j ->> 'body' from jsonb_array_elements(core.take_push_batch(500)) j
            where j -> 'data' ->> 'type' = 'results' and j ->> 'to' = 'ExponentPushToken[pp-a]'),
          'Μόνο το 25% το είδε να έρχεται. Μπες να δεις.', 'the results push names the upset you called');

select * from finish();
rollback;
