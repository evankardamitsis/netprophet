-- Report and block: reports reach the queue and close there; a block hides the blocked person's matches and kudos.
begin;
select plan(14);

select tests.create_user('rb-adm@test.local', 'admin') as adm \gset
select tests.create_user('rb-u@test.local') as u \gset
select tests.create_user('rb-w@test.local') as w \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set claimed_by_user_id = :'w'::uuid where id = :'o'::uuid;

select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day(), :'o')::jsonb) ->> 'match_id' as m1 \gset
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "doubles", "partner": {"new": {"first": "Συν", "surname": "Εργάτης"}}, "opponents": [{"new": {"first": "Α", "surname": "Ένας"}}, {"new": {"first": "Β", "surname": "Δύο"}}]}',
                            core.athens_day() + 1)::jsonb) ->> 'match_id' as m2 \gset
select tests.logout();
-- staff check every match a player logs
select tests.approve_match(:'m1'::uuid) is not null as x \gset
-- block the person who logged them
select tests.approve_match(:'m2'::uuid) is not null as x \gset
select tests.login(:'w'::uuid);
select ok(exists (select 1 from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'before: the match shows');
select is((api.block_target(null, :'m1'::uuid) ->> 'first_name'), 'Λογ', 'the sheet knows who logged it');
select is((api.block(null, :'m1'::uuid) ->> 'blocked')::boolean, true, '«Μπλοκ» the one who logged it');
select ok(not exists (select 1 from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'their results are gone');
select ok(not exists (select 1 from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'m2'), 'and their matches in the feed');
select is((api.get_blocks() -> 0 ->> 'first_name'), 'Λογ', 'Εγώ lists who you blocked');
select tests.login(:'u'::uuid);
select throws_ok(format($$select api.give_kudo(%L, 'stamina')$$, :'m1'), '42501', 'nobody_to_thank', 'a blocked person cannot send kudos');
select tests.login(:'w'::uuid);
select api.unblock(:'u'::uuid);
select ok(exists (select 1 from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'), 'unblocked: it shows again');

-- reports
select tests.as_anon();
select throws_ok(format($$select api.report('match', %L, 'wrong_result')$$, :'m1'), '42501', null, 'anonymous callers cannot report');
select tests.login(:'w'::uuid);
select api.report('match', :'m1'::uuid, 'wrong_result') is not null as x \gset
select api.report('match', :'m1'::uuid, 'never_played', 'Δεν έπαιξα ποτέ μαζί του') is not null as x \gset
select api.report('player', :'me'::uuid, 'offensive') is not null as x \gset
select throws_ok($$select api.report('player', gen_random_uuid(), 'fake')$$, 'P0002', 'not_found', 'only real things');
select tests.login(:'adm'::uuid);
select is(jsonb_array_length(api.admin_moderation() -> 'reports'), 2, 'one open report per person and thing, in the queue');
select tests.logout();
select id as rm from core.reports where entity_type = 'match' \gset
select id as rp from core.reports where entity_type = 'player' \gset
select tests.login(:'adm'::uuid);
select api.admin_close_report(:'rm'::uuid, true) is not null as x \gset
select api.admin_close_report(:'rp'::uuid, false) is not null as x \gset
select tests.logout();
select is((select approved from core.matches where id = :'m1'::uuid), false, 'hidden: the match leaves every feed');
select is((select hidden from core.players where id = :'me'::uuid), false, 'dismissed: the player stays');
select is((select count(*)::int from core.reports where status = 'open'), 0, 'and both reports are closed');

select * from finish();
rollback;
