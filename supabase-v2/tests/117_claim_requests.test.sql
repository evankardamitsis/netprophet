-- Claiming a real roster player needs staff approval (founder, 18 Oct 2026): a request, then «Έγκριση» or
-- «Απόρριψη». A pending player made from a logged match is still taken at once through its link.
begin;
select plan(24);

select tests.create_user('cr-adm@test.local', 'editor') as adm \gset
select tests.create_user('cr-u@test.local') as u \gset
select tests.create_user('cr-v@test.local') as v \gset
select tests.create_user('cr-l@test.local') as l \gset
select tests.create_user('cr-n@test.local') as n \gset
select tests.mk_player('Ρόστερ', 'Πρώτος') as p1 \gset
select tests.mk_player('Ρόστερ', 'Δεύτερος') as p2 \gset
select tests.mk_player('Λογ', 'Αιτήσεων') as lp \gset
update core.players set claimed_by_user_id = :'l'::uuid where id = :'lp'::uuid;
update core.profiles set first_name = 'Χρήστης', surname = 'Ένα' where user_id = :'u'::uuid;

-- «Εγώ είμαι» asks, it does not take
select tests.login(:'u'::uuid);
select is((api.claim_player(:'p2'::uuid) ->> 'requested')::boolean, true, 'claiming a roster player sends a request');
select is((api.claim_player(:'p1'::uuid) ->> 'replayed')::boolean, false, 'another pick replaces it');
select is((api.claim_player(:'p1'::uuid) ->> 'replayed')::boolean, true, 'the same pick again is a replay');
select tests.logout();
select is((select claim_status || ':' || coalesce(claimed_player_id::text, '-') from core.profiles where user_id = :'u'::uuid),
          'requested:-', 'the profile says requested, with no player yet');
select is((select claimed_by_user_id from core.players where id = :'p1'::uuid), null, 'the player is not theirs yet');
select is((select count(*)::int from core.claim_requests where user_id = :'u'::uuid and status = 'pending'), 1, 'one open request');
select is((select status from core.claim_requests where user_id = :'u'::uuid and player_id = :'p2'::uuid), 'cancelled', 'the old pick is cancelled');

-- what the user can read: their own requests only
select tests.login(:'v'::uuid);
select is((select count(*)::int from core.claim_requests), 0, 'nobody reads someone else''s request');

-- only staff decide
select throws_ok($$select api.admin_claim_queue()$$, '42501', 'forbidden', 'players cannot see the queue');
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'u'), '42501', 'forbidden', 'nor approve');
select tests.as_anon();
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'u'), '42501', null, 'nor can anonymous callers');

select tests.login(:'adm'::uuid);
select is((select q -> 'player' ->> 'id' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'u'),
          :'p1', 'staff see the request in «Αιτήματα παικτών»');
select is((select q -> 'user' ->> 'name' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'u'),
          'Χρήστης Ένα', 'with who asks');

-- reject clears it
select is((api.admin_review_claim(:'u'::uuid, false) ->> 'decision'), 'rejected', '«Απόρριψη»');
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'u'), 'P0002', 'no_request', 'a decision is final');
select tests.logout();
select is((select claim_status from core.profiles where user_id = :'u'::uuid), 'none', 'rejected: the request is gone');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and type = 'claim_review' and payload ->> 'decision' = 'rejected'),
          'and the user hears it');

-- ask again, approved: the claim as claim_player made it
select tests.login(:'u'::uuid);
select api.claim_player(:'p1'::uuid) is not null as x \gset
select tests.logout();
select is(tests.approve_claim(:'u'::uuid) ->> 'decision', 'approved', '«Έγκριση»');
select is((select claim_status || ':' || claimed_player_id::text from core.profiles where user_id = :'u'::uuid), 'claimed:' || :'p1',
          'approved: the player is theirs');
select ok(exists (select 1 from core.notifications where user_id = :'u'::uuid and type = 'claim_review' and payload ->> 'decision' = 'approved'),
          'and the user hears it');

-- links: a roster player through a link is a request too; a pending player made from the match is taken at once
select tests.login(:'l'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day(), :'p2')::jsonb) ->> 'match_id' as m1 \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νέα", "surname": "Αίτηση"}}], "result": {"won": true, "sets": "2-1"}}',
                            core.athens_day() - 1)::jsonb) ->> 'match_id' as m2 \gset
select api.match_links(:'m1'::uuid) -> 0 ->> 'token' as tok1 \gset
select api.match_links(:'m2'::uuid) -> 0 ->> 'token' as tok2 \gset
select tests.login(:'v'::uuid);
select is((api.claim_via_link(:'tok1') ->> 'requested')::boolean, true, 'a roster player through a link is a request');
select tests.login(:'n'::uuid);
select is((api.claim_via_link(:'tok2') ->> 'claimed')::boolean, true, 'a pending player through its link is taken at once');
select tests.logout();
select is(tests.approve_claim(:'v'::uuid) ->> 'decision', 'approved', 'staff approve the link request');
select ok((select claimed_at is not null from core.match_links where match_id = :'m1'::uuid), 'and the link counts as used');

select * from finish();
rollback;
