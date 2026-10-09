-- Emits plain SQL (one statement per line) that applies the local import_users_claims.sql result to another
-- v2 database through `supabase db query --linked`. Run on the local stack:
--   psql -X -tA -f tools/migrate/sql/export_users_claims.sql > apply.sql
-- Re-running apply.sql is safe: inserts skip existing rows, updates set the same values.
\set ON_ERROR_STOP on
select 'begin;';

select format(
  'insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at, is_sso_user, is_anonymous, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token) values (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, false, false, '''', '''', '''', '''', '''', '''', '''', '''') on conflict (id) do nothing;',
  u.instance_id, u.id, u.aud, u.role, u.email, u.email_confirmed_at, u.raw_app_meta_data, u.raw_user_meta_data,
  u.created_at, u.updated_at, u.last_sign_in_at)
  from auth.users u where u.id in (select id from v1.auth_users) order by u.created_at;

select format(
  'insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values (%L, %L, %L, %L, %L, %L, %L, %L) on conflict do nothing;',
  i.id, i.provider_id, i.user_id, i.identity_data, i.provider, i.last_sign_in_at, i.created_at, i.updated_at)
  from auth.identities i where i.user_id in (select id from v1.auth_users) order by i.created_at;

select format(
  'update core.profiles set first_name = %L, surname = %L, display_name = %L, locale = %L, role = %L, claim_status = %L, onboarding_state = %L, created_at = %L where user_id = %L;',
  p.first_name, p.surname, p.display_name, p.locale, p.role,
  case when p.claim_status = 'claimed' then 'none' else p.claim_status end,   -- the claim below sets 'claimed'
  p.onboarding_state, p.created_at, p.user_id)
  from core.profiles p where p.user_id in (select id from v1.auth_users) order by p.created_at;

select format('update core.players set claimed_by_user_id = %L where id = %L and claimed_by_user_id is null;',
              c.claimed_by_user_id, c.id)
  from core.players c where c.claimed_by_user_id is not null order by c.id;

select 'commit;';
