-- Votes move live and can change (founder, 23 Nov 2026): a vote switches sides until the lock without counting
-- again, the feed shows the split before you vote, api.vote_splits gives the splits for the app to poll.
begin;
select plan(17);

select tests.create_user('vl-a@test.local') as a \gset
select tests.create_user('vl-b@test.local') as b \gset
select tests.mk_match_fresh() as m \gset
select tests.mk_match_fresh() as other \gset
select tests.mk_match_fresh(now() + interval '2 hours') as soon \gset

select tests.login(:'a'::uuid);
select api.cast_vote(:'m'::uuid, 1) is not null as x \gset
select api.cast_vote(:'soon'::uuid, 1) is not null as x \gset
create temp table before_state as
  select to_jsonb(g) as g, (select to_jsonb(v) - 'option' from core.votes v where v.user_id = :'a'::uuid and v.subject_id = :'m'::uuid) as v
    from core.user_game_state g where g.user_id = :'a'::uuid;
grant select on before_state to public;

-- ten changes of mind
select api.cast_vote(:'m'::uuid, case when i % 2 = 1 then 2 else 1 end) from generate_series(1, 10) i;
select is((select option::int from core.votes where user_id = :'a'::uuid and subject_id = :'m'::uuid), 1, 'ten switches: the last one counts');
select is((api.cast_vote(:'m'::uuid, 2) ->> 'changed')::boolean, true, 'a switch says changed');
select is((select count(*)::int from core.votes where user_id = :'a'::uuid and subject_id = :'m'::uuid), 1, 'still one vote row');
select is((select to_jsonb(g) from core.user_game_state g where g.user_id = :'a'::uuid), (select g from before_state),
          'votes_cast, active days, freezes and the version are as the first vote left them');
select is((select to_jsonb(v) - 'option' from core.votes v where v.user_id = :'a'::uuid and v.subject_id = :'m'::uuid), (select v from before_state),
          'the vote keeps its day, its time and everything but the side');
select is((api.cast_vote(:'m'::uuid, 2) ->> 'replayed')::boolean, true, 'the same side again is a replay');

-- after the lock: no more switching
select tests.logout();
update core.matches set starts_at = now() - interval '1 minute' where id = :'soon'::uuid;
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.cast_vote(%L, 2)$$, :'soon'), '55000', null, 'after the lock the vote stays');
select is((api.cast_vote(:'soon'::uuid, 1) ->> 'replayed')::boolean, true, 'the same side after the lock is still a replay');

-- only cast_vote can switch: a direct update is refused, a resolved vote never moves
select tests.logout();
select tests.as_service();
select throws_ok(format($$update core.votes set option = 1 where user_id = %L and subject_id = %L$$, :'a', :'m'), '42501', null,
                 'the side of a vote cannot be updated directly');
select tests.logout();

-- the feed shows the split before you vote
select tests.login(:'b'::uuid);
create temp table f as select api.get_feed(100) as doc;
grant select on f to public;
create function pg_temp.card(p uuid) returns jsonb language sql as $$
  select c from f, jsonb_array_elements(f.doc -> 'items') c where c ->> 'match_id' = p::text $$;
select is((pg_temp.card(:'m'::uuid) -> 'split' ->> 'total')::int, 1, 'before your vote the card shows the split');
select is((pg_temp.card(:'m'::uuid) -> 'split' ->> 'pct2')::int, 100, 'with the crowd''s real numbers');
select is((pg_temp.card(:'other'::uuid) -> 'split' ->> 'total')::int, 0, 'no votes yet: total 0');

-- api.vote_splits (the 101 extra matches come after the feed read, so they never push the others out of it)
select tests.logout();
create temp table many as select tests.mk_match_fresh() as id from generate_series(1, 101);
grant select on many to public;
select tests.login(:'b'::uuid);
select is((api.vote_splits(array[:'m'::uuid, :'other'::uuid]) -> :'m' ->> 'side2')::int, 1, 'vote_splits gives the counts');
select is((api.vote_splits(array[:'other'::uuid]) -> :'other' ->> 'total')::int, 0, 'and a match with no votes');
select is(api.vote_splits(array[gen_random_uuid()]), '{}'::jsonb, 'an unknown match is left out');
select is((select count(*)::int from jsonb_object_keys(api.vote_splits(array(select id from many)))), 100,
          'at most 100 matches a call');
select tests.logout();

select tests.as_anon();
select throws_ok(format($$select api.vote_splits(array[%L::uuid])$$, :'m'), '42501', null, 'signed out: no splits');
select tests.logout();

select * from finish();
rollback;
