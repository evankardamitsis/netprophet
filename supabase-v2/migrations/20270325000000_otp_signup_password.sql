-- Sign-up with the email code works again (founder, 29 Oct 2026: «Κάτι στράβωσε» signing up a new address).
--
-- Supabase Auth gives every account it creates from a one-time code a random password of its own (all email accounts
-- made before 26 Oct have one). core.review_password_only (20270322000000, 20270323000000) refused any new account
-- with a password that is not a review address, so since 26 Oct 11:55 UTC no new email account could be made; Apple
-- and Google sign-ups, which carry no password, still worked.
--
-- A new account that is not a review address now has its password dropped instead of being refused: it is made, and
-- signs in with the code, Google or Apple as before; a sign-up that asked for a password gets an account with none,
-- so password sign-in still has nothing to check. Setting or changing a password later stays refused.

create or replace function core.review_password_only()
returns trigger language plpgsql set search_path = pg_catalog, pg_temp
as $$
declare
  v_review constant text[] := array['review@monadlabs.gr', 'play-review@monadlabs.gr'];
  v_is_review boolean := lower(trim(coalesce(new.email, ''))) = any (v_review);
begin
  if v_is_review or coalesce(new.encrypted_password, '') = '' then return new; end if;
  -- a new account (the code sign-up's own random password, or a sign-up asking for one): made, without it
  if tg_op = 'INSERT' then
    new.encrypted_password := '';
    return new;
  end if;
  -- an account that leaves a review address leaves its password behind
  if new.encrypted_password is not distinct from old.encrypted_password then
    new.encrypted_password := '';
    return new;
  end if;
  raise exception 'password_not_allowed' using errcode = '42501',
    hint = 'only the store review accounts sign in with a password; everyone else uses the email code, Google or Apple';
end;
$$;
