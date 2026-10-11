-- Αποτελέσματα: get_results lists finished matches with the split, the upset flag and only the viewer's own vote.
begin;
select plan(11);

select tests.create_user('rs-a@test.local') as a \gset
select tests.create_user('rs-b@test.local') as b \gset
select tests.create_user('rs-c@test.local') as c \gset

-- m1: a picks side 1, b side 2, side 1 wins
select tests.mk_match_fresh(now() + interval '3 hours') as m1 \gset
select tests.login(:'a'::uuid);
select api.cast_vote(:'m1'::uuid, 1) is not null as x \gset
select tests.login(:'b'::uuid);
select api.cast_vote(:'m1'::uuid, 2) is not null as x \gset
reset role;
update core.matches set starts_at = now() - interval '2 hours' where id = :'m1'::uuid;
select tests.finish_match(:'m1'::uuid, 1) is not null as x \gset

-- m_up: ten votes for side 1, side 2 wins: an upset by the sport's rules
select tests.mk_match_fresh(now() + interval '3 hours') as m_up \gset
insert into core.votes (user_id, subject_type, subject_id, option)
select tests.create_user('rs-v' || g || '@test.local'), 'match', :'m_up'::uuid, 1 from generate_series(1, 10) g;
update core.matches set starts_at = now() - interval '1 hour' where id = :'m_up'::uuid;
select tests.finish_match(:'m_up'::uuid, 2) as resolved_up \gset

-- m_void: has a result but was voided afterwards
select tests.mk_match_fresh(now() + interval '3 hours') as m_void \gset
update core.matches set starts_at = now() - interval '3 hours' where id = :'m_void'::uuid;
select tests.finish_match(:'m_void'::uuid, 1) is not null as x \gset
update core.matches set status = 'void' where id = :'m_void'::uuid;

-- who may call it
select tests.as_anon();
select throws_ok($$select api.get_results(14, 60)$$, '42501', null, 'anonymous callers cannot read results');

-- a's view
select tests.login(:'a'::uuid);
select ok(exists(select 1 from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          'a finished match is listed');
select is((select e -> 'my' ->> 'pick' from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          '1', 'the viewer sees their own pick');
select is((select e -> 'my' ->> 'outcome' from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          'correct', 'and how it went');
select ok((select (e -> 'my' ->> 'points')::int > 0 from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          'with the points it earned');
select is((select (e -> 'split' ->> 'total')::int from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          2, 'the split counts every vote');
select is((select (e ->> 'winner_side')::int from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          1, 'the winner is there');

-- b sees their own vote, never a's
select tests.login(:'b'::uuid);
select is((select e -> 'my' ->> 'outcome' from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          'wrong', 'another viewer sees only their own vote');

-- c did not vote
select tests.login(:'c'::uuid);
select ok((select e -> 'my' = 'null'::jsonb or e -> 'my' is null
             from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m1'),
          'no vote, no pill');

-- upset parity with the resolver, and void matches stay out
select is((select (e ->> 'upset')::boolean from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m_up'),
          (:'resolved_up'::jsonb ->> 'upset')::boolean, 'the upset flag matches what resolve_match decided');
select ok(not exists(select 1 from jsonb_array_elements(api.get_results(14, 60)) e where e ->> 'match_id' = :'m_void'),
          'a voided match is not a result');

select * from finish();
rollback;
