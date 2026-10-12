-- Confirmations: the other side confirms, corrects the sets, or disputes; a dispute takes the points back.
begin;
select plan(13);

select tests.create_user('cf-u@test.local') as u \gset
select tests.create_user('cf-w@test.local') as w \gset
select tests.create_user('cf-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set claimed_player_id = :'o'::uuid where user_id = :'w'::uuid;
update core.players set claimed_by_user_id = :'w'::uuid where id = :'o'::uuid;

-- two matches logged as coming up, each with a vote for the logger, then won 2-0
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 2, :'o')::jsonb) ->> 'match_id' as m1 \gset
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}', core.athens_day() + 4, :'o')::jsonb) ->> 'match_id' as m2 \gset
select tests.login(:'v'::uuid);
select api.cast_vote(:'m1'::uuid, 1) is not null as x \gset
select api.cast_vote(:'m2'::uuid, 1) is not null as x \gset
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m1')::jsonb) is not null as x \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}', core.athens_day(), :'m2')::jsonb) is not null as x \gset
select tests.logout();
select core.process_outbox(50) is not null as x \gset
select is((select coalesce(sum(delta), 0)::int from core.points_ledger where user_id = :'v'::uuid and ref_id = :'m2'::uuid), 15, 'the vote paid at once (+10 and the chain bonus)');

select tests.as_anon();
select throws_ok($$select api.get_confirmations()$$, '42501', null, 'anonymous callers have nothing to confirm');

select tests.login(:'w'::uuid);
select is(jsonb_array_length(api.get_confirmations()), 2, 'the opponent sees both matches to confirm');
select is((api.get_confirmations() -> 0 ->> 'my_side')::int, 2, 'from their side');

-- same winner, other sets: corrected, confirmed, votes stand
select is((api.answer_confirmation(:'m1'::uuid, 'fix', '{"winner": "them", "sets": "2-1"}') ->> 'outcome'), 'corrected', 'a different score, same winner');
select tests.logout();
select is((select score_summary from core.match_results where match_id = :'m1'::uuid), '2-1', 'the sets are corrected');
select is((select counts_for_levels from core.matches where id = :'m1'::uuid), true, 'and the match counts for levels');

-- another winner: disputed, the points go back, the σερί stays
select tests.login(:'w'::uuid);
select is((api.answer_confirmation(:'m2'::uuid, 'fix', '{"winner": "me", "sets": "2-1"}') ->> 'outcome'), 'disputed', 'the other side says they won');
select tests.logout();
select is((select status from core.matches where id = :'m2'::uuid), 'disputed', 'the match waits for an admin');
select is((select coalesce(sum(delta), 0)::int from core.points_ledger where user_id = :'v'::uuid and ref_id = :'m2'::uuid), 0, 'the points are taken back');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and type = 'confirmation'), 'the logger hears back');

select tests.login(:'w'::uuid);
select throws_ok(format($$select api.answer_confirmation(%L, 'yes')$$, :'m1'), 'P0002', 'nothing_to_confirm', 'an answer counts once');

-- «Δεν έπαιξα εγώ» on a match logged as played
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-1"}}', core.athens_day(), :'o')::jsonb) ->> 'match_id' as m3 \gset
select tests.login(:'w'::uuid);
select is((api.answer_confirmation(:'m3'::uuid, 'not_me') ->> 'outcome'), 'disputed', '«Δεν έπαιξα εγώ» disputes it');

select * from finish();
rollback;
