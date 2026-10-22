-- Emits plain SQL (one statement per line) that applies the local import_users_claims.sql result to another
-- v2 database through `supabase db query --linked`. Run on the local stack:
--   psql -X -tA -f tools/migrate/sql/export_users_claims.sql > apply.sql
-- Re-running apply.sql is safe: inserts skip existing rows (and an email another account already has), and the
-- identities, the profile and the claim are only filled for an account this same apply.sql created (its row was
-- written by the current transaction: xmin = pg_current_xact_id()). People who have used v2 since keep what they
-- changed. A claim goes only to a player nobody holds and that is not merged (core.current_player follows merges).
-- Not covered: an account someone deleted on v2 comes back if apply.sql runs again. Check first
-- (docs/v2/cutover-runbook.md); the cutover does not run this.
\set ON_ERROR_STOP on
select 'begin;';

select format(
  'insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at, is_sso_user, is_anonymous, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token) select %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, false, false, '''', '''', '''', '''', '''', '''', '''', '''' where not exists (select 1 from auth.users x where lower(x.email) = lower(%L)) on conflict (id) do nothing;',
  u.instance_id, u.id, u.aud, u.role, u.email, u.email_confirmed_at, u.raw_app_meta_data, u.raw_user_meta_data,
  u.created_at, u.updated_at, u.last_sign_in_at, u.email)
  from auth.users u where u.id in (select id from v1.auth_users) order by u.created_at;

select format(
  'insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) select %L, %L, %L, %L, %L, %L, %L, %L where exists (select 1 from auth.users x where x.id = %3$L and x.xmin = pg_current_xact_id()::xid) on conflict do nothing;',
  i.id, i.provider_id, i.user_id, i.identity_data, i.provider, i.last_sign_in_at, i.created_at, i.updated_at)
  from auth.identities i where i.user_id in (select id from v1.auth_users) order by i.created_at;

select format(
  'update core.profiles set first_name = %L, surname = %L, display_name = %L, locale = %L, role = %L, claim_status = %L, onboarding_state = %L, created_at = %L where user_id = %L and xmin = pg_current_xact_id()::xid;',
  p.first_name, p.surname, p.display_name, p.locale, p.role,
  case when p.claim_status = 'claimed' then 'none' else p.claim_status end,   -- the claim below sets 'claimed'
  p.onboarding_state, p.created_at, p.user_id)
  from core.profiles p where p.user_id in (select id from v1.auth_users) order by p.created_at;

select format('update core.players set claimed_by_user_id = %1$L where id = core.current_player(%2$L) and claimed_by_user_id is null and status <> ''merged'' and not exists (select 1 from core.players o where o.claimed_by_user_id = %1$L) and exists (select 1 from auth.users x where x.id = %1$L and x.xmin = pg_current_xact_id()::xid);',
              c.claimed_by_user_id, c.id)
  from core.players c where c.claimed_by_user_id is not null order by c.id;

select 'commit;';
