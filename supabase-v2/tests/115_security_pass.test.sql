-- Security pass (18 Oct): the quiz keeps the right answer until you answer; a Pro event without an end grants
-- nothing; one free week row per account; «shown» counts once a day; the purchases list is for admins; a hidden
-- player is never taken through a link; core functions are not executable by anon.
begin;
select plan(9);

select tests.create_user('sp-a@test.local') as a \gset
select tests.create_user('sp-ed@test.local', 'editor') as ed \gset

-- the quiz: before an answer the card has no right answer and no reveal
select tests.login(:'a'::uuid);
select ok(not exists (select 1 from jsonb_array_elements(api.get_quiz() -> 'cards') c
                       where c -> 'my_option' = 'null'::jsonb and ((c -> 'content') ? 'right' or (c -> 'content') ? 'reveal')),
          'an unanswered card carries no right answer and no reveal');
-- offers: once a day
select api.pro_offer_shown('me');
select api.pro_offer_shown('quiz');
select tests.logout();
select is((select count(*)::int from core.pro_offers_shown where user_id = :'a'::uuid), 1, 'shown counts once a day');

-- the store: a Pro event without an end grants nothing
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 'sp1', 'type', 'INITIAL_PURCHASE', 'app_user_id', :'a', 'product_id', 'pro_monthly')));
select tests.logout();
select ok(not core.is_pro(:'a'::uuid), 'a Pro event without an end never gives Pro for ever');
select is((select note from core.purchases where event_id = 'sp1'), 'no expiry', 'it is kept, marked');

-- one free week row per account
insert into core.entitlements (user_id, key, source, status, ends_at) values (:'a'::uuid, 'pro', 'trial', 'expired', now());
select throws_ok(format($$insert into core.entitlements (user_id, key, source, status, ends_at)
                          values (%L, 'pro', 'trial', 'active', now() + interval '7 days')$$, :'a'), '23505', null,
                 'a second free week row cannot exist');

-- purchases: admins only
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_purchases()$$, '42501', null, 'an editor cannot read purchases');
select tests.logout();

-- core functions: nothing for anon
select ok(not has_function_privilege('anon', 'core.is_pro(uuid)', 'execute'), 'anon cannot run core functions');
select ok(has_function_privilege('authenticated', 'core.is_staff()', 'execute'), 'signed-in users keep the helpers policies use');

-- a hidden player is never taken through a link
select is((select count(*)::int from pg_proc where proname = 'claim_via_link'
            and prosrc like '%player_hidden%' and prosrc not like '%hidden = false%'), 1, 'claiming through a link respects hiding');

select * from finish();
rollback;
