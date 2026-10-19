-- The admin «Team» page (founder, 19 Oct 2026): admins invite, change and remove admins and editors.
--   Roles stay in core.profiles.role ('user' | 'editor' | 'admin'). Every change is written to core.staff_changes.
--   Nobody changes their own role here, and the last admin can never be removed or demoted.
--   api.admin_staff_by_email is for the server only (service role): the admin login sends a code only to staff,
--   and the invite looks up an existing account with it.

create table core.staff_changes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  old_role    text not null,
  new_role    text not null,
  changed_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
comment on table core.staff_changes is 'Who made whom admin or editor, and when. Read through api.admin_team only.';
create index staff_changes_user on core.staff_changes (user_id, created_at desc);
alter table core.staff_changes enable row level security;
revoke all on core.staff_changes from public, anon, authenticated;

-- one staff member as the Team page shows it
create or replace function core.staff_member(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'user_id', pr.user_id,
           'email', u.email,
           'name', coalesce(nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''), pr.display_name),
           'role', pr.role,
           'last_sign_in_at', u.last_sign_in_at,
           'added_at', c.created_at,
           'added_by', c.by_name,
           'is_me', pr.user_id = auth.uid())
    from core.profiles pr
    join auth.users u on u.id = pr.user_id
    left join lateral (
      select sc.created_at,
             coalesce(nullif(btrim(concat_ws(' ', bp.first_name, bp.surname)), ''), bp.display_name) as by_name
        from core.staff_changes sc
        left join core.profiles bp on bp.user_id = sc.changed_by
       where sc.user_id = pr.user_id and sc.new_role in ('admin', 'editor')
       order by sc.created_at desc, sc.id desc
       limit 1) c on true
   where pr.user_id = p_user
$$;
revoke all on function core.staff_member(uuid) from public;

-- the last admin stays. Through api.admin_set_staff_role only a race reaches this (two admins demoting each other at
-- once: the second waits on the lock, then finds itself the only admin left), so it is its own function to test.
create or replace function core.assert_admin_remains(p_user uuid, p_old text, p_new text)
returns void
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if p_old = 'admin' and p_new is distinct from 'admin' and not exists (
       select 1 from core.profiles
        where role = 'admin' and deleted_at is null and user_id <> p_user) then
    raise exception 'last_admin' using errcode = '42501';
  end if;
end;
$$;
revoke all on function core.assert_admin_remains(uuid, text, text) from public;

-- the team: every admin and editor, admins first
create or replace function api.admin_team()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(core.staff_member(pr.user_id)
                     order by (pr.role = 'admin') desc, lower(coalesce(pr.display_name, '')), pr.user_id)
      from core.profiles pr
     where pr.role in ('admin', 'editor') and pr.deleted_at is null), '[]'::jsonb);
end;
$$;

-- make someone admin or editor, or back to 'user' (removed from the team)
create or replace function api.admin_set_staff_role(p_user uuid, p_role text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_me  uuid := auth.uid();
  v_old text;
begin
  if not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('user', 'editor', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_user is null or p_user = v_me then raise exception 'cannot_change_self' using errcode = '42501'; end if;

  -- the admins first, in a fixed order, so two admins demoting each other at once cannot leave nobody
  perform 1 from core.profiles where role = 'admin' and deleted_at is null order by user_id for update;
  select role into v_old from core.profiles where user_id = p_user and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  perform core.assert_admin_remains(p_user, v_old, p_role);

  if v_old is distinct from p_role then
    update core.profiles set role = p_role where user_id = p_user;
    insert into core.staff_changes (user_id, old_role, new_role, changed_by) values (p_user, v_old, p_role, v_me);
  end if;
  return core.staff_member(p_user) || jsonb_build_object('changed', v_old is distinct from p_role, 'old_role', v_old);
end;
$$;

-- server only: the account behind an email and its role, or null when there is none
create or replace function api.admin_staff_by_email(p_email text)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_email is null or btrim(p_email) = '' then return null; end if;
  return (
    select jsonb_build_object('user_id', u.id, 'role', coalesce(pr.role, 'user'))
      from auth.users u
      left join core.profiles pr on pr.user_id = u.id and pr.deleted_at is null
     where lower(u.email) = lower(btrim(p_email))
     limit 1);
end;
$$;

revoke all on function api.admin_team() from public, anon;
revoke all on function api.admin_set_staff_role(uuid, text) from public, anon;
revoke all on function api.admin_staff_by_email(text) from public, anon, authenticated;
grant execute on function api.admin_team() to authenticated;
grant execute on function api.admin_set_staff_role(uuid, text) to authenticated;
grant execute on function api.admin_staff_by_email(text) to service_role;
