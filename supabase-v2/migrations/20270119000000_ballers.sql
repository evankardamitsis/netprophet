-- Other players' Ballers (founder, 17 Oct 2026: Baller everywhere, the Ladder podium first). Given a few players with
-- accounts, their Baller as others see it: the style they picked (or 'default'), gender for the default, the name
-- they gave it, and the kit and gear they wear. Hidden and deleted profiles are left out. Looks only.

create or replace function api.get_ballers(p_users uuid[])
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', p.user_id,
             'avatar', coalesce(p.avatar, 'default'),
             'gender', p.gender,
             'name', p.baller_name,
             'kit', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id
                      where e.user_id = p.user_id and e.category = 'kit'),
             'gear', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id
                       where e.user_id = p.user_id and e.category = 'gear')))
      from core.profiles p
     where p.user_id = any (p_users[1:50]) and p.deleted_at is null and not p.hidden), '[]'::jsonb);
end;
$$;

revoke all on function api.get_ballers(uuid[]) from public, anon;
grant execute on function api.get_ballers(uuid[]) to authenticated, service_role;
