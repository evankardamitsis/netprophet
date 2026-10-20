-- Identity follow-ups (20270228000000_identity_followups.sql): a dismissed «Είμαι εγώ» has its own push text, and
-- «+ Ματς» applies the onboarding name rule to newly typed people and to the logger's own player made from the profile.
begin;
select plan(19);

select tests.create_user('if-adm@test.local', 'editor') as adm \gset
select tests.create_user('if-h@test.local') as h \gset
select tests.create_user('if-r@test.local') as r \gset
select tests.create_user('if-l@test.local') as l \gset
select tests.create_user('if-x@test.local') as x \gset
select tests.mk_player('Αλκιβιάδης', 'Πλακιάς') as pl \gset
select tests.mk_player('Αντί', 'Πάλος') as o \gset
update core.players set claimed_by_user_id = :'h'::uuid where id = :'pl'::uuid;
update core.profiles set claimed_player_id = :'pl'::uuid, claim_status = 'claimed' where user_id = :'h'::uuid;

create or replace function pg_temp.job(p_user uuid) returns jsonb language sql as $$
  select payload from core.outbox where kind = 'push' and payload ->> 'user_id' = p_user::text and payload ->> 'type' = 'claim'
   order by id desc limit 1
$$;

-- ── 1. the dismissed «Είμαι εγώ» ──
select ok(exists (select 1 from core.notification_texts where key = 'claim_report_rejected' and placeholders = '{name}'),
          'the text is in the editor list, with {name}');
select tests.login(:'r'::uuid);
select is(api.report_claim(:'pl', null, 'is_me') ->> 'reported', 'true', '«Είμαι εγώ»');
select tests.logout();
select id as f_me from core.identity_flags where kind = 'is_me' and reporter_user_id = :'r'::uuid \gset
select tests.login(:'adm'::uuid);
select is(api.admin_decide_identity(:'f_me', 'dismiss') ->> 'status', 'dismissed', 'staff dismiss it');
select throws_ok(format($$select api.admin_decide_identity(%L, 'dismiss')$$, :'f_me'), '22023', 'not_open', 'once');
select tests.logout();
select is(pg_temp.job(:'r'::uuid) -> 'message' ->> 'title', 'Το προφίλ μένει ως έχει', 'its own title');
select is(pg_temp.job(:'r'::uuid) -> 'message' ->> 'body',
          'Ελέγξαμε το Αλκιβιάδης Πλακιάς και δεν βρήκαμε κάτι λάθος. Αν έχεις κάτι να μας δείξεις, γράψε μας.',
          'the body names the player');
select is(pg_temp.job(:'r'::uuid) -> 'message' -> 'data' ->> 'player_id', :'pl', 'tapping it opens Εγώ (type claim, the player)');
select is((select count(*)::int from core.notifications where user_id = :'r'::uuid and type = 'claim_review'), 1, 'one notification');
select is((select count(*)::int from core.outbox where payload ->> 'user_id' = :'r' and payload ->> 'type' = 'claim'), 1, 'one push');
select is((select claimed_by_user_id from core.players where id = :'pl'::uuid), :'h'::uuid, 'the holder keeps the player');

-- an edit in the admin goes out with the next one
update core.notification_texts set title = 'Μένει όπως είναι' where key = 'claim_report_rejected';
select tests.login(:'x'::uuid);
select api.report_claim(:'pl', null, 'is_me') is not null as x1 \gset
select tests.logout();
select id as f_x from core.identity_flags where kind = 'is_me' and reporter_user_id = :'x'::uuid \gset
select tests.login(:'adm'::uuid);
select api.admin_decide_identity(:'f_x', 'dismiss') is not null as x2 \gset
select tests.logout();
select is(pg_temp.job(:'x'::uuid) -> 'message' ->> 'title', 'Μένει όπως είναι', 'the edited text');

-- ── 2. names in «+ Ματς» ──
update core.profiles set first_name = 'Λουκάς', surname = 'Λογκερ' where user_id = :'l'::uuid;
select tests.login(:'l'::uuid);
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Α", "surname": "Παππάς"}}]}')$$,
                        core.athens_day() + 1), '22023', 'name_shape', 'a one-letter first name is refused');
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νίκος", "surname": "x1"}}]}')$$,
                        core.athens_day() + 1), '22023', 'name_shape', 'a surname with a digit too');
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "doubles", "partner": {"new": {"first": "Συν", "surname": "Ε."}}, "opponents": [{"player_id": "%s"}, {"new": {"first": "Νέα", "surname": "Αντίπαλος"}}]}')$$,
                        core.athens_day() + 1, :'o'), '22023', 'name_shape', 'and a typed partner');
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"new": {"first": " ", "surname": "Παππάς"}}]}')$$,
                        core.athens_day() + 1), '22023', 'name_required', 'an empty name is still name_required');
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "ΜΑΡΙΑ", "surname": "καρρα"}}]}',
                            core.athens_day() + 1)::jsonb) ->> 'match_id' as m1 \gset
select lives_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}')$$,
                       core.athens_day() + 2, :'o'), 'a roster pick is untouched');
select tests.logout();
select is((select p.first_name || ' ' || p.surname from core.match_participants mp join core.players p on p.id = mp.player_id
            where mp.match_id = :'m1'::uuid and p.source = 'user' and p.claimed_by_user_id is null),
          'Μαρια Καρρα', 'a typed name is tidied like onboarding');
select is((select first_name || ' ' || surname from core.players where claimed_by_user_id = :'l'::uuid), 'Λουκάς Λογκερ',
          'the logger''s own player from the profile');

-- a legacy profile name without the shape cannot make the logger's own player
update core.profiles set first_name = 'Χ', surname = 'Ψ' where user_id = :'x'::uuid;
select tests.login(:'x'::uuid);
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}')$$,
                        core.athens_day() + 1, :'o'), '22023', 'name_shape', 'own player: name_shape from a one-letter profile name');
select tests.logout();

select * from finish();
rollback;
