-- «Δες το σαν free» on a player card (founder, 2 Nov 2026: "i want to see what the free version sees on a player card
-- because my account has Pro"). api.get_player_pro takes p_as_free: true answers with the free teaser even for Pro.
-- It only ever gives less, so nobody needs a role for it; the app shows the switch to staff only.
-- The one-argument call keeps working (the flag defaults to false); the old signature goes so the call is not ambiguous.

drop function api.get_player_pro(uuid);

create function api.get_player_pro(p_player uuid, p_as_free boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_claimed uuid;
  v_sport   text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.players where id = p_player and status = 'active' and not hidden and not is_minor) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  select claimed_player_id, coalesce(primary_sport, 'tennis') into v_claimed, v_sport
    from core.profiles where user_id = v_uid and deleted_at is null;
  v_sport := coalesce(v_sport, 'tennis');

  if core.is_pro(v_uid) and not coalesce(p_as_free, false) then
    return jsonb_build_object('pro', true, 'has_player', v_claimed is not null and v_claimed <> p_player,
                              'player', core.scout_player_json(p_player, v_claimed, v_uid, v_sport, null));
  end if;

  -- free: counts only
  return jsonb_build_object('pro', false, 'has_player', v_claimed is not null and v_claimed <> p_player, 'teaser', (
    with res as (select * from core.player_results(p_player, v_sport))
    select jsonb_build_object(
      'matches', (select count(*) from res),
      'meetings', (select count(*) from res r
                    where v_claimed is not null and v_claimed <> p_player
                      and exists (select 1 from core.match_participants o
                                   where o.match_id = r.match_id and o.side <> r.side and o.player_id = v_claimed)),
      'surfaces', coalesce((select jsonb_agg(jsonb_build_object('surface', x.surface, 'matches', x.n) order by x.n desc, x.surface)
                              from (select core.match_surface(r.match_id) as surface, count(*) as n
                                      from res r group by 1) x
                             where x.surface is not null), '[]'::jsonb),
      'deciding', (select count(*) from res where not walkover and jsonb_array_length(coalesce(sets, '[]'::jsonb)) >= 3),
      'tiebreaks', (select count(*) from res r
                     where not r.walkover
                       and exists (select 1 from jsonb_array_elements(coalesce(r.sets, '[]'::jsonb)) s
                                    where (s ? 'tb') or (s ? 'stb')
                                       or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7
                                           and least((s ->> 'w')::int, (s ->> 'l')::int) = 6))))
    from (select 1) one));
end;
$$;
revoke all on function api.get_player_pro(uuid, boolean) from public, anon;
grant execute on function api.get_player_pro(uuid, boolean) to authenticated, service_role;
