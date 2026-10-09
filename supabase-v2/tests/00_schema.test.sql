-- Schema-level guarantees: RLS everywhere, Greek search, ledger append-only, result coherence, match sides.
begin;
select plan(30);

-- RLS on every core table
select is((select count(*)::int from pg_class c where c.relnamespace = 'core'::regnamespace and c.relkind = 'r' and not c.relrowsecurity),
          0, 'every core table has RLS enabled');
select cmp_ok((select count(*)::int from pg_class c where c.relnamespace = 'core'::regnamespace and c.relkind = 'r'), '>=', 40, 'baseline has 40+ core tables');
select is((select array_agg(distinct table_name::text order by table_name::text) from information_schema.table_privileges
            where table_schema = 'core' and grantee = 'anon'), array['areas', 'sports'], 'anon can only read the sports and areas reference tables');
select is((select count(*)::int from information_schema.table_privileges
            where table_schema = 'core' and grantee = 'anon' and privilege_type <> 'SELECT'), 0, 'anon has no write privilege in core');
select is((select count(*)::int from information_schema.table_privileges
            where table_schema = 'core' and grantee = 'authenticated'
              and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
              and table_name in ('votes', 'points_ledger', 'user_game_state', 'freezes', 'streak_events',
                                 'feed_inbox', 'entitlements', 'notifications', 'outbox', 'profiles', 'follows')),
          0, 'authenticated has no write privilege on game, ledger, entitlement or profile tables');

-- api surface hygiene
select is((select count(*)::int from pg_proc where pronamespace = 'api'::regnamespace and not prosecdef), 0, 'every api function is SECURITY DEFINER');
select is((select count(*)::int from pg_proc where pronamespace = 'api'::regnamespace
            and (proconfig is null or not exists (select 1 from unnest(proconfig) c where c like 'search_path=%'))), 0, 'every api function pins its search_path');
select is((select count(*)::int from pg_proc p where pronamespace = 'api'::regnamespace and has_function_privilege('anon', p.oid, 'execute')), 0, 'anon can execute no api function');

-- seed sanity
select cmp_ok((select count(*)::int from core.players where id::text like '10000000-%'), '=', 20, 'seed: 20 players');
select cmp_ok((select count(*)::int from core.matches where source_ref like 'seed-m%'), '=', 10, 'seed: 10 matches');
select is((select count(*)::int from core.matches m join core.match_results r on r.match_id = m.id where m.source_ref like 'seed-m%'),
          4, 'seed: 4 finished matches with results');
select is((select count(*)::int from core.profiles where user_id::text like 'a0000000-%'), 3, 'seed: 3 test users got profiles from the trigger');
select is((select claimed_player_id from core.profiles where user_id = 'a0000000-0000-0000-0000-000000000002'),
          '10000000-0000-0000-0000-000000000011'::uuid, 'seed: claim trigger synced the profile');
select is((select active from core.sports where id = 'tennis'), true, 'tennis is seeded and active');

-- Greek / Greeklish search normalisation
select is(core.normalize_search('Παπαδόπουλος'), core.normalize_search('PAPADOPOULOS'), 'Greek = Greeklish uppercase');
select is(core.normalize_search('Παπαδόπουλος'), core.normalize_search('Papadopoulos'), 'Greek = Greeklish');
select is(core.normalize_search('Χρήστος'), core.normalize_search('Christos'), 'Χρήστος = Christos');
select is(core.normalize_search('ΑΛΈΞΑΝΔΡΟΣ'), core.normalize_search('alexandros'), 'accented capitals fold');
select is(core.normalize_search('Βαγγέλης'), core.normalize_search('Vaggelis'), 'Βαγγέλης = Vaggelis');
select is(core.normalize_search('Μιχάλης Κ.'), 'mihalis k', 'punctuation stripped');
select is((select search_norm from core.players where id = '10000000-0000-0000-0000-000000000001'),
          'giorgos papadopulos', 'players.search_norm is generated from first and last name');

-- ledger is append-only (even for the table owner)
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
values ('a0000000-0000-0000-0000-000000000002', 10, 'admin_adjust', 'admin', gen_random_uuid(), '2026-10', 'test:append-only');
select throws_ok($$update core.points_ledger set delta = 99 where idempotency_key = 'test:append-only'$$, '42501', null, 'ledger rows cannot be updated');
select throws_ok($$delete from core.points_ledger where idempotency_key = 'test:append-only'$$, '42501', null, 'ledger rows cannot be deleted');
select throws_ok($$insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
                   values ('a0000000-0000-0000-0000-000000000002', 5, 'purchase', 'admin', gen_random_uuid(), '2026-10', 'test:purchase')$$,
                  '23514', null, 'money cannot write to the ledger: no purchase reason');

-- result coherence
select tests.mk_player('Α', 'Coh1') as a \gset
select tests.mk_player('Β', 'Coh2') as b \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid) as m \gset
select lives_ok(format($$insert into core.match_results (match_id, winner_side, sets) values (%L, 1, '[{"w":6,"l":4},{"w":7,"l":6}]')$$, :'m'),
                'coherent 2-0 result is accepted');
select is((select score_summary from core.match_results where match_id = :'m'::uuid), '2-0', 'score_summary derived by trigger');
select throws_ok(format($$update core.match_results set winner_side = 1, sets = '[{"w":6,"l":4},{"w":3,"l":6}]' where match_id = %L$$, :'m'),
                 'P0001', null, 'winner without a majority of sets is rejected');
select throws_ok(format($$update core.match_results set sets = '[{"w":6,"l":4},{"w":6,"l":4},{"w":6,"l":1}]' where match_id = %L$$, :'m'),
                 'P0001', null, 'sets after the match was decided are rejected');
select lives_ok(format($$update core.match_results set sets = '[]', walkover = true where match_id = %L$$, :'m'),
                'a walkover may have no sets');

-- sides are checked per format
select tests.mk_player('Γ', 'Coh3') as c \gset
insert into core.matches (id, sport_id, format, status, starts_at, source) values ('31000000-0000-0000-0000-000000000001', 'tennis', 'singles', 'scheduled', now() + interval '1 day', 'admin');
insert into core.match_participants (match_id, side, player_id) values ('31000000-0000-0000-0000-000000000001', 1, :'a'::uuid);
select throws_ok($$set constraints core.match_participants_check immediate$$, 'P0001', null, 'a singles match with one side empty is rejected');

select * from finish();
rollback;
