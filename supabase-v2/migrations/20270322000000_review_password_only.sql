-- Store review (founder, 26 Oct): Apple and Google review with a ready-made email and password, so one account,
-- review@monadlabs.gr, signs in with a password. Supabase's Email provider serves both the one-time code and the
-- password, and it has to stay on for the code. So the rule lives here: no account other than the review address can
-- ever have a password. No password means password sign-in has nothing to check against, for every other account.
--
-- Blocked for every other address: sign-up with a password (supabase.auth.signUp), setting or changing one
-- (updateUser, recovery, the Admin API, the dashboard). OTP, Google and Apple sign-ins never write a password, so they
-- are untouched. If the review account's email is changed to another address, its password is dropped.
-- The app holds the same address in apps/app/src/lib/reviewAccount.ts.

create or replace function core.review_password_only()
returns trigger language plpgsql set search_path = pg_catalog, pg_temp
as $$
declare
  v_review constant text := 'review@monadlabs.gr';
  v_is_review boolean := lower(trim(coalesce(new.email, ''))) = v_review;
begin
  if v_is_review or coalesce(new.encrypted_password, '') = '' then return new; end if;
  -- an account that leaves the review address leaves its password behind
  if tg_op = 'UPDATE' and new.encrypted_password is not distinct from old.encrypted_password then
    new.encrypted_password := '';
    return new;
  end if;
  raise exception 'password_not_allowed' using errcode = '42501',
    hint = 'only the store review account signs in with a password; everyone else uses the email code, Google or Apple';
end;
$$;

-- a trigger function cannot be called directly, so it needs no grants
create trigger review_password_only
  before insert or update of email, encrypted_password on auth.users
  for each row execute function core.review_password_only();
