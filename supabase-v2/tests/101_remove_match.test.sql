-- Removing a match that has a result (founder, 16 Oct): votes close with no outcome, their points come back off,
-- the match stops counting for levels and leaves the result inbox; the σερί is not rewritten. Admin only.
begin;
select plan(8);

select tests.create_user('rm-a@test.local') as a \gset
select tests.create_user('rm-ed@test.local', 'editor') as ed \gset
select tests.create_user('rm-adm@test.local', 'admin') as adm \gset

-- a right call on a match that then gets its result
select tests.play(:'a'::uuid, true) as m \gset
select (select total_points from core.user_game_state where user_id = :'a'::uuid) as earned \gset
select (select streak from core.user_game_state where user_id = :'a'::uuid) as streak \gset
select ok(:'earned'::int > 0, 'the right call earned points');

select tests.login(:'ed'::uuid);
select throws_ok(format($$select api.admin_void_match(%L)$$, :'m'), '42501', null, 'an editor cannot remove a match with a result');
select tests.login(:'adm'::uuid);
select is((api.admin_void_match(:'m'::uuid) ->> 'points_taken_back')::int, :'earned'::int, 'an admin can, and the points come back off');
reset role;

select is((select coalesce(sum(delta), 0)::int from core.points_ledger where ref_type = 'match' and ref_id = :'m'::uuid and user_id = :'a'::uuid),
          0, 'the match is worth nothing to the voter now');
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), 0, 'their total drops back');
select is((select streak from core.user_game_state where user_id = :'a'::uuid), :'streak'::int, 'the σερί is not rewritten');
select ok((select status = 'void' and not counts_for_levels from core.matches where id = :'m'::uuid), 'the match is removed and stops counting for levels');
select is((select count(*)::int from core.feed_inbox where kind = 'result' and (payload ->> 'match_id')::uuid = :'m'::uuid), 0, 'its result card is gone');

select * from finish();
rollback;
