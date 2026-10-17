-- A retired match can stop at any score (17 Oct); a finished one still has to be a real tennis score.
begin;
select plan(4);

select tests.create_user('ra-adm@test.local', 'admin') as adm \gset
select tests.mk_match_fresh(now() - interval '2 hours') as m1 \gset
select tests.mk_match_fresh(now() - interval '2 hours') as m2 \gset
select tests.mk_match_fresh(now() - interval '2 hours') as m3 \gset
select tests.login(:'adm'::uuid);

select lives_ok(format($$select api.admin_set_result(%L, 1, '[{"w":6,"l":3},{"w":3,"l":3}]', true, false)$$, :'m1'),
                'retired with the second set level');
select lives_ok(format($$select api.admin_set_result(%L, 1, '[{"w":2,"l":6},{"w":1,"l":0}]', true, false)$$, :'m2'),
                'retired with the winner behind');
select throws_ok(format($$select api.admin_set_result(%L, 1, '[{"w":6,"l":3},{"w":3,"l":3}]', false, false)$$, :'m3'),
                 'P0001', null, 'a finished match still cannot have a level set');
reset role;
select is((select score_summary from core.match_results where match_id = :'m1'::uuid), '1-0', 'the summary counts the sets each side led');

select * from finish();
rollback;
