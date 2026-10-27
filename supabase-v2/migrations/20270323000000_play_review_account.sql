-- A second store review account (founder, 27 Oct): play-review@monadlabs.gr for Google Play. Google's reviewers cannot
-- use free trials or buy, and Play's App access form says the sign-in details open everything, paid content too, so
-- this account will hold Pro (a 'promo' entitlement the founder approves after creating it). review@monadlabs.gr stays
-- without Pro for Apple, whose reviewer has to find and buy the subscription in the sandbox; the Pro screen hides the
-- plans from anyone who already has Pro.
--
-- Same rule as review_password_only, now for both addresses: no other account can ever have a password. The app holds
-- the same list in apps/app/src/lib/reviewAccount.ts.

create or replace function core.review_password_only()
returns trigger language plpgsql set search_path = pg_catalog, pg_temp
as $$
declare
  v_review constant text[] := array['review@monadlabs.gr', 'play-review@monadlabs.gr'];
  v_is_review boolean := lower(trim(coalesce(new.email, ''))) = any (v_review);
begin
  if v_is_review or coalesce(new.encrypted_password, '') = '' then return new; end if;
  -- an account that leaves a review address leaves its password behind
  if tg_op = 'UPDATE' and new.encrypted_password is not distinct from old.encrypted_password then
    new.encrypted_password := '';
    return new;
  end if;
  raise exception 'password_not_allowed' using errcode = '42501',
    hint = 'only the store review accounts sign in with a password; everyone else uses the email code, Google or Apple';
end;
$$;
