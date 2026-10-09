-- Admin results desk: admin_desk lists what to score first, staff only; admin_void_match closes votes with no points.
begin;
select plan(12);

select tests.create_user('dk-a@test.local') as a \gset
select tests.create_user('dk-ed@test.local', 'editor') as ed \gset
select tests.create_user('dk-adm@test.local', 'admin') as adm \gset

-- a match that has started (to score), one upcoming, one with a result
select tests.mk_match_fresh(now() + interval '2 hours') as m_play \gset
select tests.mk_match_fresh(now() + interval '1 day') as m_up \gset
select tests.mk_match_fresh(now() + interval '3 hours') as m_done \gset
select tests.login(:'a'::uuid);
select api.cast_vote(:'m_play'::uuid, 1) is not null as x \gset
reset role;
update core.matches set starts_at = now() - interval '1 hour' where id = :'m_play'::uuid;
update core.matches set starts_at = now() - interval '2 hours' where id = :'m_done'::uuid;
select tests.finish_match(:'m_done'::uuid, 1) is not null as x \gset

-- who may use it
select tests.login(:'a'::uuid);
select throws_ok($$select api.admin_desk(7)$$, '42501', null, 'a normal user cannot open the desk');
select throws_ok(format($$select api.admin_void_match(%L)$$, :'m_up'), '42501', null, 'a normal user cannot void');
select tests.login(:'ed'::uuid);
select lives_ok($$select api.admin_desk(7)$$, 'an editor can open the desk');

-- what it lists, and in which order
select tests.login(:'adm'::uuid);
select is((select e ->> 'bucket_name' from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_play'),
          'to_score', 'a started match without a result is to score');
select is((select e ->> 'bucket_name' from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_up'),
          'upcoming', 'a future match is upcoming');
select is((select e ->> 'bucket_name' from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_done'),
          'done', 'a match with a result is done');
select ok((select (e -> 'result' ->> 'winner_side') = '1' and (e ->> 'votes_resolved') is not null
             from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_done'),
          'done matches carry their result');
select is((select (e ->> 'votes')::int from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_play'),
          1, 'the vote count is there');
select is((select jsonb_array_length(e -> 'sides') from jsonb_array_elements(api.admin_desk(7)) e where e ->> 'match_id' = :'m_play'),
          2, 'with both sides');
select is((select e ->> 'bucket_name' from jsonb_array_elements(api.admin_desk(7)) e
            where e ->> 'match_id' in (:'m_play', :'m_up', :'m_done') limit 1),
          'to_score', 'matches to score come first');

-- void: no result possible, votes close with no points
select throws_ok(format($$select api.admin_void_match(%L)$$, :'m_done'), 'P0001', null, 'a match with a result cannot be voided');
select api.admin_void_match(:'m_play'::uuid) is not null as x \gset
select api.resolve_match(:'m_play'::uuid) is not null as x \gset
reset role;   -- votes are private to their owner; read them as the database
select is((select outcome from core.votes where subject_id = :'m_play'::uuid), 'none', 'votes on a voided match close with no points');

select * from finish();
rollback;
