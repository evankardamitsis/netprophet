-- Σήμερα holds every match of the day, whoever plays: p_limit counts only the later days, most relevant first.
begin;
select plan(3);

select tests.create_user('day-u@test.local') as u \gset

-- six of today's matches between strangers (twenty minutes on is always the feed's day, even after 23:00), four later on
create temp table today_m as select tests.mk_match_fresh(now() + interval '20 minutes') as id from generate_series(1, 6);
create temp table later_m as select tests.mk_match_fresh(now() + interval '3 days') as id from generate_series(1, 4);
grant select on today_m, later_m to public;

select tests.login(:'u'::uuid);
create temp table f as select api.get_feed(2) as doc;
grant select on f to public;

select is((select count(*)::int from f, jsonb_array_elements(doc -> 'items') c
            where c ->> 'kind' = 'match' and (c ->> 'match_id')::uuid in (select id from today_m)),
          6, 'every match of the day, past the limit');
-- later days (ours or any other open match in the database): only as many as the limit
select is((select count(*)::int from f, jsonb_array_elements(doc -> 'items') c
            join core.matches m on m.id = (c ->> 'match_id')::uuid
            where c ->> 'kind' = 'match' and (m.starts_at at time zone 'Europe/Athens')::date > ((now() + interval '1 hour') at time zone 'Europe/Athens')::date),
          2, 'the later days keep the limit');
select is((select count(*)::int from jsonb_array_elements(api.get_feed(100) -> 'items') c
            where c ->> 'kind' = 'match' and (c ->> 'match_id')::uuid in (select id from later_m)),
          4, 'a bigger limit brings ours too');
select tests.logout();

select * from finish();
rollback;
