-- resolve_match: admin/service only, +10 per correct vote, idempotent (run twice, points once).
begin;
select plan(31);

select tests.create_user('rs-a@test.local') as a \gset
select tests.create_user('rs-b@test.local') as b \gset
select tests.create_user('rs-c@test.local') as c \gset
select tests.create_user('rs-admin@test.local', 'admin') as adm \gset
select tests.create_user('rs-editor@test.local', 'editor') as ed \gset
select tests.mk_match_fresh() as m \gset

select tests.login(:'a'::uuid); select api.cast_vote(:'m'::uuid, 1) is not null as x \gset
select tests.login(:'b'::uuid); select api.cast_vote(:'m'::uuid, 2) is not null as x \gset
select tests.login(:'c'::uuid); select api.cast_vote(:'m'::uuid, 1) is not null as x \gset

-- authorisation
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), '42501', null, 'a normal user cannot resolve');
select throws_ok(format($$select api.admin_set_result(%L, 1, '[{"w":6,"l":3},{"w":6,"l":4}]')$$, :'m'), '42501', null, 'a normal user cannot enter a result');
select tests.login(:'ed'::uuid);
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), '42501', null, 'an editor cannot resolve (admin/service only)');

-- no result yet
select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), 'P0002', null, 'resolving without a result is refused');
select throws_ok(format($$select api.admin_set_result(%L, 1, '[{"w":6,"l":3}]')$$, :'m'), 'P0001', null, 'an incoherent result (one set only) is refused');
select lives_ok(format($$select api.admin_set_result(%L, 1, '[{"w":6,"l":3},{"w":6,"l":4}]')$$, :'m'), 'an admin can enter a coherent result');
select is((select status from core.matches where id = :'m'::uuid), 'confirmed', 'result entry confirms the match');

-- first run (as admin)
select (api.resolve_match(:'m'::uuid)) as r1 \gset
select is((:'r1'::jsonb ->> 'resolved')::int, 3, 'run 1: three votes resolved');
select is((:'r1'::jsonb ->> 'correct')::int, 2, 'run 1: two correct');
select is((:'r1'::jsonb ->> 'points_awarded')::int, 20, 'run 1: +10 for each correct vote');

select tests.logout();
select is((select count(*)::int from core.outbox where idempotency_key = 'resolve:' || :'m' || ':1'), 1, 'resolution is queued in the outbox');
select is((select total_points from tests.state(:'a'::uuid)), 10, 'A has 10 points');
select is((select total_points from tests.state(:'b'::uuid)), 0, 'B (wrong) has 0 points');
select is((select count(*)::int from core.points_ledger where idempotency_key like 'resolve:' || :'m' || ':%'), 2, 'two ledger rows, one per correct vote');
select is((select count(*)::int from core.votes where subject_id = :'m'::uuid and resolved_at is not null), 3, 'all votes marked resolved');
select is((select outcome from core.votes where user_id = :'b'::uuid and subject_id = :'m'::uuid), 'wrong', 'B''s vote is wrong');
select is((select count(*)::int from core.feed_inbox where kind = 'result' and ref = 'match:' || :'m'), 3, 'a result card was queued for each voter');
select is((select streak from tests.state(:'a'::uuid)), 1, 'A σερί is 1');
select is((select streak from tests.state(:'b'::uuid)), 0, 'B σερί is 0');

-- second run (as service): nothing changes
select tests.as_service();
select (api.resolve_match(:'m'::uuid)) as r2 \gset
select tests.logout();
select is((:'r2'::jsonb ->> 'resolved')::int, 0, 'run 2: nothing left to resolve');
select is((:'r2'::jsonb ->> 'already_resolved')::int, 3, 'run 2: reports 3 already resolved');
select is((select total_points from tests.state(:'a'::uuid)), 10, 'run 2: A still has 10 points (awarded once)');
select is((select count(*)::int from core.points_ledger where idempotency_key like 'resolve:' || :'m' || ':%'), 2, 'run 2: still two ledger rows');
select is((select streak from tests.state(:'a'::uuid)), 1, 'run 2: σερί did not advance again');
select is((select count(*)::int from core.feed_inbox where kind = 'result' and ref = 'match:' || :'m'), 3, 'run 2: no duplicate result cards');
select is((select sum(delta)::int from core.points_ledger where user_id = :'a'::uuid), (select total_points from tests.state(:'a'::uuid)), 'ledger sum equals total_points');

-- idempotency key is a hard guard even if state were lost: replaying the award itself writes nothing
select is(core.award_points(:'a'::uuid, 10, 'correct', 'match', :'m'::uuid, 'resolve:' || :'m' || ':' || :'a' || ':correct'), 0,
          'award_points with an existing idempotency key is a no-op');

-- a void match cannot be resolved
update core.matches set status = 'void' where id = :'m'::uuid;
select tests.as_service();
select throws_ok(format($$select api.resolve_match(%L)$$, :'m'), 'P0001', null, 'void match cannot be resolved');
select tests.logout();

-- upset: the winning side was backed by a small minority (>= 10 votes, < 35 percent) pays +30
select tests.mk_match_fresh() as mu \gset
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select tests.create_user('rs-u' || g || '@test.local'), 'match', :'mu'::uuid, case when g <= 2 then 1 else 2 end, clock_timestamp(), core.athens_day()
  from generate_series(1, 12) g;
select tests.finish_match(:'mu'::uuid, 1) ->> 'upset' as upset \gset
select is(:'upset'::text, 'true'::text, 'upset detected: 2 of 12 backed the winner');
select is((select points from core.votes where subject_id = :'mu'::uuid and option = 1 order by created_at limit 1), 30, 'correct call of an upset is worth +30');
select is((select count(*)::int from core.votes where subject_id = :'mu'::uuid and is_upset_call), 2, 'both upset calls are flagged');

select * from finish();
rollback;
