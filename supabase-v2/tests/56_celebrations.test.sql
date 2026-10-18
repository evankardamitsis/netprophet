-- Celebrations: each σερί milestone queues one, with the reward it actually gave (3: freeze, 5: the lime headband,
-- 7: Frame Επτά, 10: Frame Δέκα); the feed hands them over until they are seen.
begin;
select plan(9);

select tests.create_user('cb-u@test.local') as u \gset
select tests.create_user('cb-v@test.local') as v \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
create temp table opp as select tests.mk_player('Αντί' || g, 'Παλος' || g) as id, g from generate_series(1, 10) g;
grant select on opp to public;

-- ten right calls in a row, one result at a time
do $$
declare
  v_u uuid := (select user_id from core.profiles p join auth.users a on a.id = p.user_id where a.email = 'cb-u@test.local');
  v_v uuid := (select id from auth.users where email = 'cb-v@test.local');
  v_m uuid;
  o   record;
begin
  for o in select * from opp order by g loop
    perform tests.login(v_u);
    v_m := (api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}',
                                 core.athens_day() + 1, o.id)::jsonb) ->> 'match_id')::uuid;
    perform tests.logout();
    perform tests.approve_match(v_m);   -- staff check every match and result a player logs
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

select is((select streak from core.user_game_state where user_id = :'v'::uuid), 10, 'ten right calls in a row');
select is((select string_agg(payload ->> 'streak', ',' order by (payload ->> 'streak')::int) from core.feed_inbox
            where user_id = :'v'::uuid and kind = 'celebration'), '3,5,7,10', 'one celebration per milestone');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'v'::uuid and kind = 'celebration' and payload ->> 'streak' = '3'),
          '{"frame": null, "freeze": true, "gear": null}'::jsonb, 'σερί 3: the first free freeze');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'v'::uuid and kind = 'celebration' and payload ->> 'streak' = '5'),
          '{"frame": null, "freeze": false, "gear": "gear_headband"}'::jsonb, 'σερί 5: the lime headband');
select is((select payload -> 'reward' ->> 'frame' from core.feed_inbox where user_id = :'v'::uuid and kind = 'celebration' and payload ->> 'streak' = '7'),
          'frame_seven', 'σερί 7: Frame Επτά');
select is((select payload -> 'reward' from core.feed_inbox where user_id = :'v'::uuid and kind = 'celebration' and payload ->> 'streak' = '10'),
          '{"frame": "frame_ten", "freeze": false, "gear": null}'::jsonb, 'σερί 10: Frame Δέκα');
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items ci on ci.id = uc.item_id
            where uc.user_id = :'v'::uuid and ci.key in ('frame_seven', 'frame_ten')), 2, 'both frames are owned');

select tests.login(:'v'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_feed(20) -> 'celebrations') c where c -> 'payload' ->> 'type' = 'streak_milestone'),
          4, 'the feed hands them over');
select api.mark_inbox_seen(array(select (c ->> 'id')::uuid from jsonb_array_elements(api.get_feed(20) -> 'celebrations') c)) is not null as x \gset
select is(jsonb_array_length(api.get_feed(20) -> 'celebrations'), 0, 'and they are gone once seen');

select * from finish();
rollback;
