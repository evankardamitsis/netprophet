-- M4: Pro schedule alerts. A Pro player's claimed profile in a new sheet match, a moved one or a postponed one gets
-- a push with its own text; free players do not; results stay grouped in the same batch.
begin;
select plan(7);

select tests.create_user('alert-pro@test.local') as pro \gset
select tests.create_user('alert-free@test.local') as free \gset
select tests.mk_player('Πρω', 'Επαγγελματίας') as pp \gset
select tests.mk_player('Δωρ', 'Δωρεάν') as fp \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'pp'::uuid;
update core.players set claimed_by_user_id = :'free'::uuid where id = :'fp'::uuid;
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[pro]', :'pro'::uuid, 'ios'), ('ExponentPushToken[free]', :'free'::uuid, 'ios');
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Alert Open', 'import') returning id as t \gset

select core.ingest_run(:'t'::uuid, jsonb_build_array(jsonb_build_object('fingerprint', 'al-1', 'date', current_date + 2, 'time', '10:00',
  'discipline', 'MS', 'level', 'OPEN', 'side1', jsonb_build_array(jsonb_build_object('player_id', :'pp')),
  'side2', jsonb_build_array(jsonb_build_object('player_id', :'fp')), 'result', null)), 'cron', null);
set constraints core.schedule_alert_on_participant immediate;   -- as at the end of the run's transaction
-- between 23:00 and 08:00 Athens a push waits for 08:00 and a newer one for the match takes its place
-- (20270304000000_pro_notifications, tested there): here each one is due at once, whatever the hour
update core.outbox set run_after = now() where done_at is null and run_after > now();

select is((select count(*)::int from core.notifications where user_id = :'pro'::uuid and type = 'schedule'), 1, 'Pro: the new match');
select is((select count(*)::int from core.notifications where user_id = :'free'::uuid and type = 'schedule'), 0, 'free: nothing');
select ok((select payload ->> 'body' from core.notifications where user_id = :'pro'::uuid and type = 'schedule') ~ 'Alert Open · με Δωρεάν',
          'the body names the tournament and the opponent');

update core.matches set starts_at = starts_at + interval '1 day' where source_ref = 'al-1';
update core.outbox set run_after = now() where done_at is null and run_after > now();
select is((select count(*)::int from core.notifications where user_id = :'pro'::uuid and type = 'schedule'), 2, 'a new time: a second alert');
update core.matches set postponed_at = now() where source_ref = 'al-1';
select ok(exists (select 1 from core.notifications where user_id = :'pro'::uuid and payload ->> 'title' = 'Αναβλήθηκε το ματς σου'), 'postponed: told');

update core.outbox set run_after = now() where done_at is null and run_after > now();
select core.take_push_batch(200) as b \gset
select is(jsonb_array_length(:'b'::jsonb), 3, 'three typed pushes, one by one');
select ok(jsonb_path_exists(:'b'::jsonb, '$[*] ? (@.data.type == "schedule" && @.to == "ExponentPushToken[pro]")'), 'to the Pro device');

select * from finish();
rollback;
