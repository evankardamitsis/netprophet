-- Pro, part 1: who has Pro, what the Pro screen shows, and a staff grant so the founder can test Pro before
-- checkout exists. No payment provider here: checkout and its webhook (subscriptions, billing events) come in
-- their own migration once the account and the web domain exist. Pro is keyed on the user, never the platform,
-- so a web purchase unlocks the phone apps too.

-- one rule for «has Pro now», shared by every RPC that gates a perk (same as get_me's inline check)
create or replace function core.is_pro(p_user uuid)
returns boolean
language sql stable set search_path = core, pg_temp
as $$
  select exists (
    select 1 from core.entitlements e
     where e.user_id = p_user and e.key = 'pro' and e.status = 'active'
       and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()))
$$;

-- the Pro screen: whether you have it, until when and from where; whether you are on the list for it
create or replace function api.get_pro()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'pro', core.is_pro(v_uid),
    'current', (select jsonb_build_object('source', e.source, 'starts_at', e.starts_at, 'ends_at', e.ends_at)
                  from core.entitlements e
                 where e.user_id = v_uid and e.key = 'pro' and e.status = 'active'
                   and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
                 order by e.ends_at desc nulls first
                 limit 1),
    'waitlisted', exists (select 1 from core.entitlements e
                           where e.user_id = v_uid and e.key = 'pro' and e.status = 'waitlist'));
end;
$$;

-- «Γίνε μέλος» while checkout is not live yet (the phone apps before store billing): note the interest once
create or replace function api.join_pro_waitlist()
returns boolean
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from core.entitlements where user_id = v_uid and key = 'pro' and status = 'waitlist') then
    return false;
  end if;
  insert into core.entitlements (user_id, key, source, status) values (v_uid, 'pro', 'waitlist', 'waitlist');
  return true;
end;
$$;

-- staff grant: Pro for p_days (a promo), e.g. the founder testing perks or a beta tester; replaces an earlier promo
create or replace function api.admin_grant_pro(p_user_id uuid, p_days int default 30)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 366);
  v_id   uuid;
begin
  if not (core.is_admin() or core.is_service()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from core.profiles where user_id = p_user_id and deleted_at is null) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  update core.entitlements set status = 'expired', ends_at = now()
   where user_id = p_user_id and key = 'pro' and source = 'promo' and status = 'active';
  insert into core.entitlements (user_id, key, source, status, ends_at)
  values (p_user_id, 'pro', 'promo', 'active', now() + make_interval(days => v_days))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'ends_at', now() + make_interval(days => v_days));
end;
$$;

revoke all on function api.get_pro() from public, anon;
revoke all on function api.join_pro_waitlist() from public, anon;
revoke all on function api.admin_grant_pro(uuid, int) from public, anon;
grant execute on function api.get_pro() to authenticated, service_role;
grant execute on function api.join_pro_waitlist() to authenticated, service_role;
grant execute on function api.admin_grant_pro(uuid, int) to authenticated, service_role;
