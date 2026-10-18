-- Founder, 18 Oct: «σερί 5» and «σερί 3» on two screens. Results that resolve together (one sheet import, one
-- transaction) queued their cards and σερί moments with the same created_at (now() is the transaction's start), so
-- the feed handed them over in no fixed order: σερί 5 could play before σερί 3, a later result card before an earlier
-- one. Inbox rows now take the clock at insert, so they come back in the order they happened.
begin;
select plan(7);

select tests.create_user('io-u@test.local') as u \gset
select tests.create_user('io-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
create temp table opp as select tests.mk_player('Αντί' || g, 'Παλος' || g) as id, g from generate_series(1, 5) g;
grant select on opp to public;

-- five right calls, all in this one transaction
do $$
declare
  v_u uuid := (select id from auth.users where email = 'io-u@test.local');
  v_v uuid := (select id from auth.users where email = 'io-v@test.local');
  v_m uuid;
  o   record;
begin
  for o in select * from opp order by g loop
    perform tests.login(v_u);
    v_m := (api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}',
                                 core.athens_day() + 1, o.id)::jsonb) ->> 'match_id')::uuid;
    perform tests.logout();
    perform tests.approve_match(v_m);
    perform tests.login(v_v);
    perform api.cast_vote(v_m, 1);
    perform tests.login(v_u);
    perform api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}',
                                 core.athens_day(), v_m)::jsonb);
    perform tests.logout();
    perform tests.approve_match(v_m);
    perform core.process_outbox(50);
  end loop;
end $$;

select is((select streak from core.user_game_state where user_id = :'v'::uuid), 5, 'σερί 5 after five right calls in one go');
select is((select count(*)::int from core.feed_inbox where user_id = :'v'::uuid and kind = 'celebration'
            and payload ->> 'type' = 'streak_milestone'), 2, 'a σερί moment for 3 and for 5, none for 1, 2 or 4');
select is((select count(distinct created_at)::int from core.feed_inbox where user_id = :'v'::uuid),
          (select count(*)::int from core.feed_inbox where user_id = :'v'::uuid),
          'no two inbox rows share a time, even inside one transaction');

select tests.login(:'v'::uuid);
select api.get_feed(30) as feed \gset
select is((select string_agg(c -> 'payload' ->> 'streak', ',' order by n) from jsonb_array_elements(:'feed'::jsonb -> 'celebrations') with ordinality x(c, n)
            where c -> 'payload' ->> 'type' = 'streak_milestone'), '3,5', 'the feed hands σερί 3 over before σερί 5');
select is((select string_agg(i -> 'payload' ->> 'streak', ',' order by n) from jsonb_array_elements(:'feed'::jsonb -> 'items') with ordinality x(i, n)
            where i ->> 'kind' = 'result'), '1,2,3,4,5', 'result cards come in the order they happened, σερί 1 to 5');
-- the moment shows only what was actually given: the 3 its free freeze, the 5 the lime headband
select is((select c -> 'payload' -> 'reward' from jsonb_array_elements(:'feed'::jsonb -> 'celebrations') c where c -> 'payload' ->> 'streak' = '3'),
          '{"frame": null, "freeze": true, "gear": null}'::jsonb, 'σερί 3 gave the first freeze');
select is((select c -> 'payload' -> 'reward' from jsonb_array_elements(:'feed'::jsonb -> 'celebrations') c where c -> 'payload' ->> 'streak' = '5'),
          '{"frame": null, "freeze": false, "gear": "gear_headband"}'::jsonb, 'σερί 5 gave the lime headband');

select * from finish();
rollback;
