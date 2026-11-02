-- «Νέο τουρνουά»: the first organiser match of a tournament queues one push to every account with a device, once,
-- never to someone who switched it off, never for a minor event or a user's own match.
begin;
select plan(8);

select tests.create_user('nt-a@test.local') as a \gset
select tests.create_user('nt-b@test.local') as b \gset
select tests.create_user('nt-c@test.local') as c \gset
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[nt-a]', :'a'::uuid, 'ios'), ('ExponentPushToken[nt-b]', :'b'::uuid, 'android');
-- b switched «Νέα τουρνουά» off; c has no device
update core.profiles set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || '{"new_tournaments": false}' where user_id = :'b'::uuid;

select tests.mk_player('Νέος', 'Ένα') as p1 \gset
select tests.mk_player('Νέος', 'Δύο') as p2 \gset
insert into core.tournaments (sport_id, name, source, source_kind, source_url)
values ('tennis', 'Νέο Open', 'import', 'site', 'https://example.test/new') returning id as t \gset
insert into core.tournaments (sport_id, name, source, is_minor_event)
values ('tennis', 'Μικρό Open', 'import', true) returning id as tm \gset

select is((select announced_at from core.tournaments where id = :'t'::uuid), null, 'a new tournament is not announced yet');

create or replace function pg_temp.row_(p_fp text, p1 uuid, p2 uuid) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', p_fp, 'date', current_date + 1, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN',
                            'side1', jsonb_build_array(jsonb_build_object('player_id', p1)),
                            'side2', jsonb_build_array(jsonb_build_object('player_id', p2)), 'result', null)
$$;
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('nt-1', :'p1', :'p2'), pg_temp.row_('nt-2', :'p2', :'p1')), 'cron', null);

select ok((select announced_at is not null from core.tournaments where id = :'t'::uuid), 'its first read announces it');
select is((select array_agg(user_id order by user_id) from core.notifications
             where type = 'new_tournament' and user_id in (:'a'::uuid, :'b'::uuid, :'c'::uuid) and payload -> 'data' ->> 'tournament_id' = :'t'),
          array[:'a'::uuid], 'one push, to the account with a device that did not switch it off');
select is((select count(*)::int from core.outbox where idempotency_key = 'push:new_tournament:' || :'a' || ':' || :'t'), 1, 'queued on the outbox');
select is((select payload -> 'message' ->> 'title' from core.outbox where idempotency_key = 'push:new_tournament:' || :'a' || ':' || :'t'),
          'Νέο τουρνουά: Νέο Open', 'with the tournament in the title');
select is((select payload -> 'message' -> 'data' ->> 'url' from core.outbox where idempotency_key = 'push:new_tournament:' || :'a' || ':' || :'t'),
          '/tournament/' || :'t', 'and the tap opens the tournament');

-- the next read brings more matches: nothing more
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('nt-1', :'p1', :'p2'), pg_temp.row_('nt-2', :'p2', :'p1'), pg_temp.row_('nt-3', :'p1', :'p2')), 'cron', null);
select is((select count(*)::int from core.notifications where type = 'new_tournament' and user_id = :'a'::uuid and payload -> 'data' ->> 'tournament_id' = :'t'), 1, 'once per tournament');

-- a minor event never
select is(core.new_tournament_alert(:'tm'::uuid), 0, 'never for a minor event');

select * from finish();
rollback;
