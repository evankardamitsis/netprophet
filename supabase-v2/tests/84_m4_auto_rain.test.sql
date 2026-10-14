-- Rain, automatically: yesterday's sheet matches still without a result are called off (postponed_by auto), results
-- and today's matches are left alone, the sheet does not undo it, and the morning digest lists it.
begin;
select plan(6);

select tests.mk_player('Αυ', 'Βροχούλης') as a \gset
select tests.mk_player('Το', 'Ομπρελάς') as b \gset
select tests.mk_player('Μα', 'Ηλιόλουστος') as c \gset
select tests.mk_player('Τι', 'Στεγνός') as d \gset
insert into core.tournaments (sport_id, name, source, source_url, ongoing) values ('tennis', 'Rainy Open', 'import', 'https://docs.google.com/spreadsheets/d/x', true) returning id as t \gset

select core.ingest_run(:'t'::uuid, jsonb_build_array(
  jsonb_build_object('fingerprint', 'ar-1', 'date', core.athens_day(now()) - 1, 'time', '10:00', 'discipline', 'MS', 'level', 'OPEN', 'result', null,
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b'))),
  jsonb_build_object('fingerprint', 'ar-2', 'date', core.athens_day(now()) - 1, 'time', '11:00', 'discipline', 'MS', 'level', 'OPEN',
    'result', jsonb_build_object('winner_side', 1, 'sets', '[{"w":6,"l":3},{"w":6,"l":2}]'::jsonb, 'walkover', false),
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'c')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'d'))),
  jsonb_build_object('fingerprint', 'ar-3', 'date', core.athens_day(now()) + 1, 'time', '12:00', 'discipline', 'MS', 'level', 'OPEN', 'result', null,
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'c')))), 'cron', null);

select is((core.auto_rain() -> 0 ->> 'matches')::int, 1, 'one match of yesterday had no result: called off');
select is((select provenance ->> 'postponed_by' from core.matches where source_ref = 'ar-1'), 'auto', 'marked as the rule''s');
select ok((select postponed_at is null from core.matches where source_ref = 'ar-2') and (select postponed_at is null from core.matches where source_ref = 'ar-3'),
          'a result and a match still to come are left alone');

-- the next run still lists the old day: it stays off
select core.ingest_run(:'t'::uuid, jsonb_build_array(
  jsonb_build_object('fingerprint', 'ar-1', 'date', core.athens_day(now()) - 1, 'time', '10:00', 'discipline', 'MS', 'level', 'OPEN', 'result', null,
    'side1', jsonb_build_array(jsonb_build_object('player_id', :'a')), 'side2', jsonb_build_array(jsonb_build_object('player_id', :'b')))), 'cron', null);
select ok((select postponed_at is not null from core.matches where source_ref = 'ar-1'), 'the sheet does not undo it');

select tests.as_service();
select api.admin_morning_digest() as dg \gset
select ok(jsonb_path_exists(:'dg'::jsonb, '$.rained_off[*] ? (@.tournament == "Rainy Open" && @.auto == 1)'), 'the morning digest lists it');
select tests.logout();
select tests.create_user('rain-auto-u@test.local') as u \gset
select tests.login(:'u'::uuid);
select throws_ok($$select api.cron_auto_rain()$$, '42501', null, 'the cron call is service only');
select tests.logout();

select * from finish();
rollback;
