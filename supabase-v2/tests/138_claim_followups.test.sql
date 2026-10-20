-- Claim follow-ups (20270302000000_claim_followups.sql): «Δεν είμαι εγώ» on your own player, claiming after
-- onboarding, the claim_released push to the account that loses a player, and a new player who is likely a minor.
-- docs/v2/registration-audit.md points at these test names.
begin;
select plan(51);
\o /dev/null

select tests.create_user('cf-adm@test.local', 'editor') as adm \gset
select tests.create_user('cf-wrong@test.local') as w \gset
select tests.create_user('cf-other@test.local') as o \gset
select tests.create_user('cf-skip@test.local') as s \gset
select tests.create_user('cf-rej@test.local') as r \gset
select tests.create_user('cf-teen@test.local') as t \gset
select tests.create_user('cf-holder@test.local') as h \gset
select tests.create_user('cf-reporter@test.local') as rp \gset
select tests.create_user('cf-leaver@test.local') as lv \gset
select tests.mk_player('Ορέστης', 'Λαθόπουλος') as wp \gset
select tests.mk_player('Ορέστης', 'Σωστόπουλος') as rightp \gset
select tests.mk_player('Ζήνων', 'Παραλειπίδης') as free1 \gset
select tests.mk_player('Ζήνων', 'Απορριπτάκης') as free2 \gset
select tests.mk_player('Κίμων', 'Εφηβάκης') as minor \gset
select tests.mk_player('Αίας', 'Κρατημένος') as held \gset
select tests.mk_player('Αίας', 'Αποχωρητής') as leaving \gset
update core.players set is_minor = true where id = :'minor'::uuid;
update core.players set claimed_by_user_id = :'w'::uuid where id = :'wp'::uuid;
update core.players set claimed_by_user_id = :'h'::uuid where id = :'held'::uuid;
update core.players set claimed_by_user_id = :'lv'::uuid where id = :'leaving'::uuid;

create or replace function pg_temp.released(p_user uuid) returns int language sql as $$
  select count(*)::int from core.outbox
   where kind = 'push' and payload ->> 'user_id' = p_user::text and payload -> 'message' -> 'data' ->> 'decision' = 'released'
$$;
create or replace function pg_temp.job(p_user uuid) returns jsonb language sql as $$
  select payload from core.outbox where kind = 'push' and payload ->> 'user_id' = p_user::text and payload ->> 'type' = 'claim'
   order by id desc limit 1
$$;
\o

-- ── 1. «Δεν είμαι εγώ» on your own player ──
select tests.login(:'o'::uuid);
select throws_ok(format($$select api.report_claim(%L, null, 'not_me_own')$$, :'wp'), '22023', 'not_own_player',
                 'own report: refused on someone else''s player');
select tests.logout();
select tests.login(:'w'::uuid);
select throws_ok(format($$select api.report_claim(%L, null, 'not_them')$$, :'wp'), '22023', 'own_player',
                 'own report: the old «Δεν είμαι εγώ;» still refuses your own player');
select is(api.report_claim(:'wp', 'Δεν είμαι εγώ, λάθος πάτησα', 'not_me_own') ->> 'replayed', 'false',
          'own report: filed on your own player');
select is(api.report_claim(:'wp', null, 'not_me_own') ->> 'replayed', 'true', 'own report: a replay keeps the one open report');
select tests.logout();
select is((select count(*)::int from core.identity_flags where reporter_user_id = :'w'::uuid and status = 'open'), 1,
          'own report: one open report');
select id as f_own from core.identity_flags where reporter_user_id = :'w'::uuid and kind = 'not_me_own' \gset
select is((select claimer_user_id from core.identity_flags where id = :'f_own'::uuid), :'w'::uuid,
          'own report: the holder is the reporter');

select tests.login(:'adm'::uuid);
select is((select (f ->> 'kind') from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'id' = :'f_own'),
          'not_me_own', 'own report: staff see it in «Ταυτότητα»');
select throws_ok(format($$select api.admin_decide_identity(%L, 'give')$$, :'f_own'), '22023', 'no_reporter',
                 'own report: never given to the reporter');
select is(api.admin_decide_identity(:'f_own', 'unlink') ->> 'status', 'unlinked', 'own report: «Αποσύνδεση»');
select tests.logout();
select is((select claimed_by_user_id from core.players where id = :'wp'::uuid), null, 'own report: the player is free again');
select is((select claim_status from core.profiles where user_id = :'w'::uuid), 'none', 'own report: the profile is back to none');
select is(pg_temp.released(:'w'::uuid), 1, 'own report: one claim_released push');
select tests.login(:'w'::uuid);
select is(api.claim_player(:'rightp') ->> 'requested', 'true', 'own report: then they ask for the right player');
select tests.logout();

-- dismissed: «Το προφίλ μένει ως έχει», the player stays
select tests.login(:'h'::uuid);
select is(api.report_claim(:'held', null, 'not_me_own') ->> 'reported', 'true', 'own report dismissed: filed');
select tests.logout();
select id as f_keep from core.identity_flags where reporter_user_id = :'h'::uuid and kind = 'not_me_own' \gset
select tests.login(:'adm'::uuid);
select is(api.admin_decide_identity(:'f_keep', 'dismiss') ->> 'status', 'dismissed', 'own report dismissed: «Απόρριψη»');
select tests.logout();
select is(pg_temp.job(:'h'::uuid) -> 'message' ->> 'title', 'Το προφίλ μένει ως έχει', 'own report dismissed: they hear it stays');
select is((select claimed_by_user_id from core.players where id = :'held'::uuid), :'h'::uuid, 'own report dismissed: they keep the player');
select is(pg_temp.released(:'h'::uuid), 0, 'own report dismissed: no claim_released');

-- the day's limit is shared with the other reports (5 a day)
insert into core.identity_flags (kind, player_id, reporter_user_id, status)
select 'not_them', :'free2'::uuid, :'h'::uuid, 'dismissed' from generate_series(1, 4);
select tests.login(:'h'::uuid);
select throws_ok(format($$select api.report_claim(%L, null, 'not_me_own')$$, :'held'), '54000', 'rate_limited',
                 'own report: 5 a day, like the other reports');
select tests.logout();
select tests.login(:'rp'::uuid);
\o /dev/null
select api.report_claim(id, null, 'not_them') from core.players where id in (:'held'::uuid, :'leaving'::uuid);
\o
select tests.logout();

-- ── 2. claiming after onboarding ──
update core.profiles set onboarding_state = '{"done": true}', claim_status = 'skipped' where user_id = :'s'::uuid;
select tests.login(:'s'::uuid);
select is(api.claim_player(:'free1') ->> 'requested', 'true', 'after onboarding: a skipped account asks for a player');
select tests.logout();
select is((select claim_status from core.profiles where user_id = :'s'::uuid), 'requested', 'after onboarding: the profile says requested');
select is(tests.approve_claim(:'s'::uuid) ->> 'decision', 'approved', 'after onboarding: staff approve as usual');
select is((select claimed_by_user_id from core.players where id = :'free1'::uuid), :'s'::uuid, 'after onboarding: the player is theirs');

-- an account whose «είμαι καινούριος» was rejected
select tests.login(:'r'::uuid);
select api.update_profile('{"first_name": "Φοίβος", "surname": "Απορριφθείς", "onboarding_state": {"done": true}}'::jsonb) is not null as x \gset
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'after a reject: «είμαι καινούριος» first');
select tests.logout();
select is(tests.approve_claim(:'r'::uuid, false) ->> 'decision', 'rejected', 'after a reject: staff reject the new player');
select tests.login(:'r'::uuid);
select is(api.claim_player(:'free2') ->> 'requested', 'true', 'after a reject: they ask for a roster player');
select throws_ok(format($$select api.claim_player(%L)$$, :'minor'), 'P0002', 'player_not_claimable',
                 'after onboarding: never a minor');
select tests.logout();
select tests.login(:'s'::uuid);
select throws_ok(format($$select api.claim_player(%L)$$, :'free2'), '23505', null,
                 'after onboarding: one player per account');
select tests.logout();

-- ── 3. the push to the account that loses the player ──
select ok(exists (select 1 from core.notification_texts where key = 'claim_released' and placeholders = '{name}'),
          'released: the text is in the editor list, with {name}');
select tests.login(:'adm'::uuid);
select is(api.admin_unclaim(:'free1') ->> 'claimed', 'false', 'released: staff unlink from the players list');
select throws_ok(format($$select api.admin_unclaim(%L)$$, :'free1'), 'P0002', 'not_claimed', 'released: once');
select tests.logout();
select is(pg_temp.released(:'s'::uuid), 1, 'released: exactly one push');
select is(pg_temp.job(:'s'::uuid) -> 'message' ->> 'title', 'Το προφίλ αποσυνδέθηκε', 'released: the title');
select is(pg_temp.job(:'s'::uuid) -> 'message' ->> 'body',
          'Αποσυνδέσαμε το Ζήνων Παραλειπίδης από τον λογαριασμό σου. Αν νομίζεις ότι έγινε λάθος, γράψε μας από τις Ρυθμίσεις.',
          'released: the body names the player');
select is(pg_temp.job(:'s'::uuid) ->> 'type', 'claim', 'released: tapping it opens Εγώ');
select is((select claim_status from core.profiles where user_id = :'s'::uuid), 'none', 'released: the profile is back to none');

-- «Δώσ' το στον αναφέροντα»: the holder hears it once, the reporter gets the claim
select id as f_give from core.identity_flags where reporter_user_id = :'rp'::uuid and player_id = :'held'::uuid and status = 'open' \gset
select tests.login(:'adm'::uuid);
select is(api.admin_decide_identity(:'f_give', 'give') ->> 'status', 'given', 'released: given to the reporter');
select tests.logout();
select is(pg_temp.released(:'h'::uuid), 1, 'released: the holder got one push on give');
select is((select claimed_by_user_id from core.players where id = :'held'::uuid), :'rp'::uuid, 'released: the reporter holds it');
select is(pg_temp.released(:'rp'::uuid), 0, 'released: the reporter gets no claim_released');

-- deleting your own account sends nothing
select tests.login(:'lv'::uuid);
select is(api.delete_my_account() ->> 'deleted', 'true', 'released: a holder deletes their account');
select tests.logout();
select is((select claimed_by_user_id from core.players where id = :'leaving'::uuid), null, 'released: the player is free');
select is((select count(*)::int from core.outbox where payload -> 'message' -> 'data' ->> 'player_id' = :'leaving'
            and payload -> 'message' -> 'data' ->> 'decision' = 'released'), 0, 'released: no push when you delete your own account');

-- ── 4. a new player who is likely a minor ──
select tests.login(:'t'::uuid);
select api.update_profile('{"first_name": "Κίμων", "surname": "Εφηβάκης", "onboarding_state": {"done": true}}'::jsonb) is not null as x \gset
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'minor: a 15 to 17 year old presses «είμαι καινούριος»');
select is(jsonb_array_length(api.find_players('Εφηβάκης', 20)), 0, 'minor: neither the minor nor the new player is listed');
select tests.logout();
select player_id as teen_np, duplicate_of as teen_dup from core.claim_requests where user_id = :'t'::uuid and status = 'pending' \gset
select is(:'teen_dup'::uuid, :'minor'::uuid, 'minor: the likely duplicate is the minor');
select tests.login(:'adm'::uuid);
select is((select (q -> 'duplicate' ->> 'is_minor') || '/' || (q ->> 'duplicate_minor')
             from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'t'),
          'true/true', 'minor: staff see «ανήλικος» on the request');
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'t'), '22023', 'duplicate_minor',
                 'minor: approving is refused');
select tests.logout();
select is((select status || '/' || hidden from core.players where id = :'teen_np'::uuid), 'pending/false',
          'minor: the new player is still pending (never public)');
select is(tests.approve_claim(:'t'::uuid, false) ->> 'decision', 'rejected', 'minor: staff reject');
select is(pg_temp.job(:'t'::uuid) -> 'message' ->> 'title', 'Δεν φτιάξαμε το προφίλ', 'minor: the usual new_player_rejected push');

select * from finish();
rollback;
