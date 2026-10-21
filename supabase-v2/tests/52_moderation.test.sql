-- Moderation: disputes kept, turned round or voided; pending players approved or merged; «Άλλο» tournaments linked.
begin;
select plan(16);

select tests.create_user('md-adm@test.local', 'admin') as adm \gset
select tests.create_user('md-u@test.local') as u \gset
select tests.create_user('md-w@test.local') as w \gset
select tests.create_user('md-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
select tests.mk_player('Νέστορας', 'Παπαδόπουλος') as real \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set claimed_by_user_id = :'w'::uuid where id = :'o'::uuid;

-- three matches coming up; the voter picks the logger on m1, the opponent on m2
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 2, :'o')::jsonb) ->> 'match_id' as m1 \gset
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 4, :'o')::jsonb) ->> 'match_id' as m2 \gset
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 6, :'o')::jsonb) ->> 'match_id' as m3 \gset
select tests.logout();
-- staff approve each match a player logs, and each result a player gives
select tests.approve_match(:'m1'::uuid) is not null as x \gset
select tests.approve_match(:'m2'::uuid) is not null as x \gset
select tests.approve_match(:'m3'::uuid) is not null as x \gset
select tests.login(:'v'::uuid);
select api.cast_vote(:'m1'::uuid, 1) is not null as x \gset
select api.cast_vote(:'m2'::uuid, 2) is not null as x \gset
-- the logger says they won all three, 2-0
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m1')::jsonb) is not null as x \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m2')::jsonb) is not null as x \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m3')::jsonb) is not null as x \gset
select tests.logout();
select tests.approve_match(:'m1'::uuid) is not null as x \gset
select tests.approve_match(:'m2'::uuid) is not null as x \gset
select tests.approve_match(:'m3'::uuid) is not null as x \gset
select core.process_outbox(50) is not null as x \gset
-- the opponent says they won each one, 2-1
select tests.login(:'w'::uuid);
select api.answer_confirmation(:'m1'::uuid, 'fix', '{"winner": "me", "sets": "2-1"}') is not null as x \gset
select api.answer_confirmation(:'m2'::uuid, 'fix', '{"winner": "me", "sets": "2-1"}') is not null as x \gset
select api.answer_confirmation(:'m3'::uuid, 'not_me') is not null as x \gset
select tests.logout();
select is((select coalesce(sum(delta), 0)::int from core.points_ledger where user_id = :'v'::uuid and ref_id = :'m1'::uuid), 0,
          'the dispute took the right call''s points back');

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_moderation()$$, '42501', null, 'only staff see the queue');
select tests.login(:'adm'::uuid);
select is(jsonb_array_length(api.admin_moderation() -> 'disputes'), 3, 'three disputes waiting');

-- keep: the logger was right
select is((api.admin_resolve_dispute(:'m1'::uuid, 'keep') ->> 'points')::int, 10, 'keep: the points come back');
select tests.logout();
select is((select status from core.matches where id = :'m1'::uuid), 'confirmed', 'and the match stands');

-- flip: the other side won 2-1
select tests.login(:'adm'::uuid);
select is((api.admin_resolve_dispute(:'m2'::uuid, 'flip') ->> 'points')::int, 10, 'flip: the new right call earns');
select tests.logout();
select is((select winner_side::int || ':' || score_summary from core.match_results where match_id = :'m2'::uuid), '2:2-1',
          'the result is turned round with their sets');
select is((select outcome from core.votes where user_id = :'v'::uuid and subject_id = :'m2'::uuid), 'correct', 'and the vote is now right');

-- void
select tests.login(:'adm'::uuid);
select api.admin_resolve_dispute(:'m3'::uuid, 'void') is not null as x \gset
select throws_ok(format($$select api.admin_resolve_dispute(%L, 'keep')$$, :'m3'), 'P0002', 'not_disputed', 'a decision is final');
select tests.logout();
select is((select status from core.matches where id = :'m3'::uuid), 'void', 'void: the match is gone');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and type = 'moderation'), 'the logger hears the decision');

-- pending players: a typo of a roster player is merged into them (the same name without accents is the roster player
-- itself since 20270307000000_player_dedupe, so the typo doubles a letter), a new person is approved with the spelling fixed
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νεστορας", "surname": "Παπαδοπουλλος"}}], "result": {"won": true, "sets": "2-0"}, "tournament_suggestion": "Κύπελλο Άνοιξης"}',
                            core.athens_day() - 1)::jsonb) ->> 'match_id' as m4 \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "μαρια", "surname": "καρρα"}}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day() - 2)::jsonb) ->> 'match_id' as m5 \gset
select tests.logout();
select id as typo from core.players where surname = 'Παπαδοπουλλος' \gset
select id as maria from core.players where surname = 'Καρρα' \gset
select tests.login(:'adm'::uuid);
select is((select p -> 'similar' -> 0 ->> 'player_id' from jsonb_array_elements(api.admin_moderation() -> 'players') p where p ->> 'player_id' = :'typo'),
          :'real', 'the queue suggests the roster player it looks like');
select api.admin_decide_player(:'typo'::uuid, 'merge', :'real'::uuid) is not null as x \gset
select api.admin_decide_player(:'maria'::uuid, 'approve', null, 'Μαρία', 'Καρρά') is not null as x \gset
select tests.logout();
select ok(exists (select 1 from core.match_participants where match_id = :'m4'::uuid and player_id = :'real'::uuid)
          and (select status from core.players where id = :'typo'::uuid) = 'merged', 'merged: the match is now the roster player''s');
select is((select status || ' ' || first_name || ' ' || surname from core.players where id = :'maria'::uuid), 'active Μαρία Καρρά',
          'approved with the spelling fixed');

-- «Άλλο» tournaments
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Κύπελλο Άνοιξης 2026"}') as t \gset
select is((api.admin_tournament_suggestion('Κύπελλο Άνοιξης', :'t'::uuid) ->> 'matches')::int, 1, 'the typed name links to a tournament');
select is(jsonb_array_length(api.admin_moderation() -> 'tournaments'), 0, 'and leaves the queue');

select * from finish();
rollback;
