-- v1 accounts, profiles and claims into v2 (supabase-v2/migration-from-v1.md, section 1).
-- Input: schema v1 staged by tools/migrate/stage_v1.py; players already imported by import_roster_matches.sql.
-- No passwords move: v2 login is the email code or Google. Coins and v1 game stats are dropped.
-- Idempotent. Runs on the local stack; tools/migrate/sql/export_users_claims.sql turns the result into
-- plain SQL for the hosted project.
-- Only accounts this run creates are filled in: an account that is already there (from an earlier run, or one
-- the person has used on v2 since) keeps its profile and claim as they are, and an email another account already
-- has is skipped (listed in etl.rejects). The hosted import ran on 9 Oct 2026; the cutover does not run it again
-- (docs/v2/cutover-runbook.md).
\set ON_ERROR_STOP on
begin;

create schema if not exists etl;
create table if not exists etl.rejects (
  tbl    text not null,
  v1_id  uuid not null,
  reason text not null,
  row    jsonb,
  at     timestamptz not null default now()
);
delete from etl.rejects where tbl = 'users';

insert into etl.rejects (tbl, v1_id, reason)
select 'users', u.id, 'email_taken: another account has this email'
  from v1.auth_users u
 where u.deleted_at is null and u.email is not null
   and not exists (select 1 from auth.users a where a.id = u.id)
   and exists (select 1 from auth.users a where lower(a.email) = lower(btrim(u.email)));

create temp table fresh (id uuid primary key) on commit drop;

-- accounts, same UUIDs. Token columns are '' (GoTrue cannot read NULL there). Unconfirmed emails are
-- confirmed: the first code login proves the address anyway.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, last_sign_in_at, is_sso_user, is_anonymous,
                        confirmation_token, recovery_token, email_change_token_new, email_change,
                        email_change_token_current, reauthentication_token, phone_change, phone_change_token)
select u.instance_id, u.id, coalesce(u.aud, 'authenticated'), coalesce(u.role, 'authenticated'), lower(btrim(u.email)),
       coalesce(u.email_confirmed_at, now()), coalesce(u.raw_app_meta_data, '{}'), coalesce(u.raw_user_meta_data, '{}'),
       u.created_at, u.updated_at, u.last_sign_in_at, false, false,
       '', '', '', '', '', '', '', ''
  from v1.auth_users u
 where u.deleted_at is null and u.email is not null
   and not exists (select 1 from etl.rejects x where x.tbl = 'users' and x.v1_id = u.id)
on conflict (id) do nothing;

insert into fresh (id)
select u.id from auth.users u join v1.auth_users v on v.id = u.id
 where not exists (select 1 from core.profiles p where p.user_id = u.id and p.updated_at < now());

-- sign-in identities: Google keeps working with the same Google account; email identities come along too
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select i.id, i.provider_id, i.user_id, i.identity_data, i.provider, i.last_sign_in_at, i.created_at, i.updated_at
  from v1.auth_identities i
 where i.provider in ('email', 'google') and i.user_id in (select id from fresh)
on conflict do nothing;

-- an account without any identity gets an email one, so the code login finds it
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now()
  from auth.users u
 where u.id in (select id from fresh)
   and not exists (select 1 from auth.identities i where i.user_id = u.id)
on conflict do nothing;

-- profiles: the new-user trigger made one per account; fill it from v1
update core.profiles c
   set first_name = coalesce(nullif(btrim(p.first_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'firstName'), ''), c.first_name),
       surname = coalesce(nullif(btrim(p.last_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'lastName'), ''), c.surname),
       display_name = coalesce(
         nullif(btrim(coalesce(nullif(btrim(p.first_name), ''), u.raw_user_meta_data ->> 'firstName', '') || ' ' ||
                      coalesce(nullif(btrim(p.last_name), ''), u.raw_user_meta_data ->> 'lastName', '')), ''),
         nullif(btrim(p.username), ''),
         split_part(u.email, '@', 1)),
       locale = case when coalesce(p.preferred_language, p.language_preference, 'el') = 'en' then 'en' else 'el' end,
       role = case when p.is_admin then 'admin' else 'user' end,
       claim_status = case p.profile_claim_status
                        when 'creation_requested' then 'creation_requested'
                        when 'skipped' then 'skipped'
                        else 'none' end,          -- 'claimed' is set by the claim sync below, from players
       onboarding_state = c.onboarding_state || case when p.terms_accepted
                            then jsonb_build_object('v1_terms', jsonb_build_object('accepted', true, 'at', p.terms_accepted_at))
                            else '{}'::jsonb end,
       created_at = coalesce(p.created_at, c.created_at)
  from v1.profiles p
  join v1.auth_users u on u.id = p.id
 where c.user_id = p.id
   and p.id in (select id from fresh);

-- claims: players are the source of truth; the player_claim_sync trigger updates the profile.
-- One player per account: if v1 has an account on two players, the latest claim wins. A player merged into
-- another on v2 is claimed as that one (core.current_player).
update core.players c
   set claimed_by_user_id = x.user_id
  from (select distinct on (v.claimed_by_user_id) core.current_player(v.id) as id, v.claimed_by_user_id as user_id
          from v1.players v
         where v.claimed_by_user_id is not null
         order by v.claimed_by_user_id, v.claimed_at desc nulls last) x
 where c.id = x.id
   and c.claimed_by_user_id is null
   and c.status <> 'merged'
   and x.user_id in (select id from fresh)
   and not exists (select 1 from core.players o where o.claimed_by_user_id = x.user_id);

select 'accounts created in this run' as what, count(*) from fresh;

commit;

select 'accounts' as what, count(*) from auth.users where id in (select id from v1.auth_users)
union all select '  with Google', count(distinct user_id) from auth.identities where provider = 'google' and user_id in (select id from v1.auth_users)
union all select 'profiles', count(*) from core.profiles where user_id in (select id from v1.auth_users)
union all select '  admins', count(*) from core.profiles where role = 'admin'
union all select 'claims', count(*) from core.players where claimed_by_user_id is not null
union all select '  profiles marked claimed', count(*) from core.profiles where claim_status = 'claimed'
union all select 'creation requests (for the admin)', count(*) from core.profiles where claim_status = 'creation_requested'
union all select 'v1 claims not carried (account missing or duplicate)',
  (select count(*) from v1.players where claimed_by_user_id is not null) - (select count(*) from core.players where claimed_by_user_id is not null)
union all select 'accounts skipped (email taken)', count(*) from etl.rejects where tbl = 'users'
union all select 'coins carried over', 0;
