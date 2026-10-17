-- Closed matches stay in Σήμερα: started, no result yet, within eight hours; marked closed, with the split, after
-- every open card; voting on them is refused; older ones and finished ones leave.
begin;
select plan(7);

select tests.create_user('fc-u@test.local') as u \gset
select tests.create_user('fc-v@test.local') as v \gset
select tests.mk_match_fresh(now() + interval '1 day') as open_m \gset
select tests.mk_match_fresh(now() + interval '2 hours') as live_m \gset
select tests.mk_match_fresh(now() + interval '2 hours') as old_m \gset
select tests.mk_match_fresh(now() + interval '2 hours') as done_m \gset
-- v votes on the live one before it starts
select tests.login(:'v'::uuid);
select api.cast_vote(:'live_m'::uuid, 1) is not null as x \gset
select tests.logout();
update core.matches set starts_at = now() - interval '1 hour' where id in (:'live_m', :'done_m');
update core.matches set starts_at = now() - interval '10 hours' where id = :'old_m';
select tests.finish_match(:'done_m'::uuid, 1) is not null as x \gset

select tests.login(:'u'::uuid);
create temp table f as select api.get_feed(100) as doc;
grant select on f to public;
create function pg_temp.card(p uuid) returns jsonb language sql as $$
  select c from f, jsonb_array_elements(f.doc -> 'items') c where c ->> 'match_id' = p::text $$;
create function pg_temp.pos(p uuid) returns int language sql as $$
  select (o - 1)::int from f, jsonb_array_elements(f.doc -> 'items') with ordinality x(c, o) where c ->> 'match_id' = p::text $$;

select is((pg_temp.card(:'live_m'::uuid) ->> 'closed')::boolean, true, 'a match that started stays, closed');
select is((pg_temp.card(:'open_m'::uuid) ->> 'closed')::boolean, false, 'an open match is not closed');
select is((pg_temp.card(:'live_m'::uuid) -> 'split' ->> 'total')::int, 1, 'a closed card shows how the crowd voted');
select ok(pg_temp.pos(:'live_m'::uuid) > pg_temp.pos(:'open_m'::uuid), 'closed cards come after the open ones');
select ok(pg_temp.card(:'old_m'::uuid) is null, 'after eight hours it leaves');
select ok(pg_temp.card(:'done_m'::uuid) is null, 'with a result it leaves (it comes back as a result)');
select throws_ok(format($$select api.cast_vote(%L, 2)$$, :'live_m'), null, null, 'voting on a closed match is refused');
select tests.logout();

select * from finish();
rollback;
