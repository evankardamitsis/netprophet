-- RLS: a user cannot read or write other users' votes, ledger, game state or profile; no client writes to game tables.
begin;
select plan(29);

select tests.create_user('rls-a@test.local') as a \gset
select tests.create_user('rls-b@test.local') as b \gset
select tests.create_user('rls-admin@test.local', 'admin') as adm \gset
select tests.mk_match_fresh() as m \gset

-- both users vote on opposite sides, then the match finishes (side 1 wins) so the ledger has rows
select tests.login(:'a'::uuid);
select lives_ok(format($$select api.cast_vote(%L, 1)$$, :'m'), 'A can vote');
select tests.login(:'b'::uuid);
select lives_ok(format($$select api.cast_vote(%L, 2)$$, :'m'), 'B can vote');
select tests.logout();
select tests.finish_match(:'m'::uuid, 1) is not null as resolved \gset

-- votes
select tests.login(:'a'::uuid);
select is((select count(*)::int from core.votes), 1, 'A sees exactly one vote row (their own)');
select is((select count(*)::int from api.my_votes), 1, 'api.my_votes shows only A''s vote');
select is((select count(*)::int from core.votes where user_id = :'b'::uuid), 0, 'A cannot read B''s vote');
select throws_ok(format($$insert into core.votes (user_id, subject_type, subject_id, option) values (%L, 'match', %L, 1)$$, :'b', gen_random_uuid()),
                 '42501', null, 'A cannot insert a vote directly (not even for themselves)');
select throws_ok($$update core.votes set option = 1$$, '42501', null, 'A cannot update votes');
select throws_ok($$delete from core.votes$$, '42501', null, 'A cannot delete votes');

-- ledger and state
select is((select count(*)::int from core.points_ledger), 1, 'A sees only their own ledger row (correct vote)');
select is((select count(*)::int from core.points_ledger where user_id = :'b'::uuid), 0, 'A cannot read B''s ledger');
select throws_ok($$insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
                   values (auth.uid(), 1000, 'admin_adjust', 'admin', gen_random_uuid(), '2026-10', 'cheat')$$,
                 '42501', null, 'A cannot write the ledger');
select is((select count(*)::int from core.user_game_state), 1, 'A sees only their own game state');
select throws_ok($$update core.user_game_state set total_points = 99999$$, '42501', null, 'A cannot edit their own points');
select throws_ok($$update core.user_game_state set streak = 99$$, '42501', null, 'A cannot edit their own σερί');
select is((select count(*)::int from core.freezes), 0, 'no freezes yet');
select throws_ok($$insert into core.freezes (user_id, kind, source) values (auth.uid(), 'free', 'gift')$$, '42501', null, 'A cannot give themselves a freeze');
select throws_ok($$insert into core.entitlements (user_id, source, status) values (auth.uid(), 'promo', 'active')$$, '42501', null, 'A cannot give themselves Pro');

-- profiles
select is((select count(*)::int from core.profiles), 1, 'A reads only their own profile');
select throws_ok($$update core.profiles set role = 'admin'$$, '42501', null, 'A cannot write profiles directly');
select lives_ok($$select api.update_profile('{"role":"admin","display_name":"Alpha"}')$$, 'update_profile ignores unknown or protected keys');
select is((select role from core.profiles where user_id = auth.uid()), 'user', 'role did not change');
select is((select display_name from core.profiles where user_id = auth.uid()), 'Alpha', 'allowed field did change');

-- RPCs and internals
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), '42501', null, 'A cannot resolve matches');
select throws_ok($$select core.award_points(auth.uid(), 10, 'correct', 'match', gen_random_uuid(), 'x')$$, '42501', null, 'internal helpers are not callable by clients');
select throws_ok($$select count(*) from core.outbox$$, '42501', null, 'outbox is service-only');
select throws_ok($$insert into core.players (first_name, surname) values ('Hack', 'Er')$$, '42501', null, 'a plain user cannot add roster players');

-- anon
select tests.as_anon();
select throws_ok($$select * from api.my_votes$$, '42501', null, 'anon cannot read my_votes');
select cmp_ok((select count(*)::int from api.sports), '>=', 1, 'anon can read the sports reference view');

-- aggregates
select tests.logout();
select is((select total from api.match_splits where match_id = :'m'::uuid), 2, 'split view shows totals once the match has a result');
select * from finish();
rollback;
