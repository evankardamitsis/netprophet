-- No match can be invented (founder, 18 Oct 2026): what a player logs waits for staff. A new match is hidden and takes
-- no votes; a player's result pays nothing until approved; a rejected match or result pays nothing.
begin;
select plan(30);

select tests.create_user('mp-adm@test.local', 'editor') as adm \gset
select tests.create_user('mp-u@test.local') as u \gset
select tests.create_user('mp-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Ελέγχου') as me \gset
select tests.mk_player('Αντί', 'Ελέγχου') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set first_name = 'Λογ', surname = 'Ελέγχου' where user_id = :'u'::uuid;

-- a match coming up: hidden until staff approve it
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}',
                            core.athens_day() + 1, :'o')::jsonb) as r1 \gset
select is((:'r1'::jsonb ->> 'review'), 'pending', 'the logger hears it went for review');
select :'r1'::jsonb ->> 'match_id' as m1 \gset
select tests.logout();
select is((select approved from core.matches where id = :'m1'::uuid), false, 'a logged match starts hidden');

select tests.login(:'v'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'m1'),
          'it is not in the feed');
select throws_ok(format($$select api.cast_vote(%L, 1)$$, :'m1'), 'P0002', 'match_not_found', 'and nobody can vote on it');

-- only staff see the queue and decide
select throws_ok($$select api.admin_match_review_queue()$$, '42501', 'forbidden', 'players cannot see the queue');
select throws_ok(format($$select api.admin_review_match(%L, true)$$, :'m1'), '42501', 'forbidden', 'nor approve');
select tests.as_anon();
select throws_ok(format($$select api.admin_review_match(%L, true)$$, :'m1'), '42501', null, 'nor can anonymous callers');

select tests.login(:'adm'::uuid);
select is((select q ->> 'kind' from jsonb_array_elements(api.admin_match_review_queue()) q where q ->> 'match_id' = :'m1'),
          'match', 'staff see the new match in «Ματς παικτών»');
select is((select q -> 'logger' ->> 'name' from jsonb_array_elements(api.admin_match_review_queue()) q where q ->> 'match_id' = :'m1'),
          'Λογ Ελέγχου', 'with who logged it');
select is((api.admin_review_match(:'m1'::uuid, true) ->> 'decision'), 'approved', '«Έγκριση»');
select is((api.admin_review_match(:'m1'::uuid, true) ->> 'replayed')::boolean, true, 'a second tap changes nothing');
select tests.logout();
select is((select approved::text || ':' || review from core.matches where id = :'m1'::uuid), 'true:approved', 'it is live now');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and type = 'match_review'
                   and payload ->> 'match_id' = :'m1' and payload ->> 'decision' = 'approved'), 'the logger hears it');

select tests.login(:'v'::uuid);
select ok(exists (select 1 from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'m1'),
          'approved: it shows in the feed');
select api.cast_vote(:'m1'::uuid, 1) is not null as x \gset

-- the logger gives the result: stored, nothing pays until staff approve it
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day() + 1, :'m1')::jsonb) is not null as x \gset
select is((select r ->> 'review' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'),
          'pending', 'the logger sees their result marked «Σε έλεγχο»');
select tests.logout();
select is((select review from core.matches where id = :'m1'::uuid), 'pending', 'a player''s result waits for staff');
select ok(not exists (select 1 from core.outbox where kind = 'resolve_match' and payload ->> 'match_id' = :'m1'), 'no resolve job yet');
select core.process_outbox(50) is not null as x \gset
select is((select outcome from core.votes where user_id = :'v'::uuid and subject_id = :'m1'::uuid), null, 'the vote is still open');
select is((select coalesce(sum(delta), 0)::int from core.points_ledger where user_id = :'v'::uuid and ref_id = :'m1'::uuid), 0,
          'and has paid nothing');
select tests.login(:'v'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'),
          'others do not see a result staff have not checked');
select tests.logout();

select tests.approve_match(:'m1'::uuid) ->> 'kind' as k1 \gset
select is(:'k1'::text, 'result', 'staff approve the result');
select ok(exists (select 1 from core.outbox where kind = 'resolve_match' and idempotency_key = 'resolve:' || :'m1' || ':1'),
          'the resolve job, as set_result writes it');
select core.process_outbox(50) is not null as x \gset
select is((select outcome from core.votes where user_id = :'v'::uuid and subject_id = :'m1'::uuid), 'correct', 'approved: the vote pays');

-- a played match that is rejected: gone, and nothing pays
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Φαντα", "surname": "Σμένος"}}], "result": {"won": true, "sets": "2-1"}}',
                            core.athens_day())::jsonb) ->> 'match_id' as m2 \gset
select tests.logout();
select is(tests.approve_match(:'m2'::uuid, false) ->> 'decision', 'rejected', '«Απόρριψη»');
select is((select status || ':' || approved::text || ':' || review from core.matches where id = :'m2'::uuid), 'void:false:rejected',
          'a rejected match is gone for good');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and dedupe_key = 'match_review:' || :'m2' || ':rejected'),
          'the logger hears that too');
select core.process_outbox(50) is not null as x \gset
select is((select count(*)::int from core.points_ledger where ref_id = :'m2'::uuid), 0, 'it paid nothing');

-- a wrong result on a real match: the result goes, the match and its votes stay for the real result
select tests.mk_match(:'me'::uuid, :'o'::uuid, now() + interval '2 hours') as m3 \gset
select tests.login(:'v'::uuid);
select api.cast_vote(:'m3'::uuid, 2) is not null as x \gset
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day(), :'m3')::jsonb) is not null as x \gset
select tests.logout();
select tests.approve_match(:'m3'::uuid, false) is not null as x \gset
select is((select approved::text || ':' || review || ':' || status from core.matches where id = :'m3'::uuid), 'true:rejected:scheduled',
          'rejecting a result keeps the real match');
select ok(not exists (select 1 from core.match_results where match_id = :'m3'::uuid), 'without the result');
select core.process_outbox(50) is not null as x \gset
select is((select outcome from core.votes where user_id = :'v'::uuid and subject_id = :'m3'::uuid), null, 'the vote waits, unpaid');

select * from finish();
rollback;
