-- Pro sees everything on every player card (founder, 2 Nov 2026: "improve the player card on the free version and add
-- incentives there to get Pro, tease what you can see and make it attractive to purchase"; asked whether Pro should
-- see the full report on any player or only on your own match, the founder chose every card).
--
-- This replaces, for the player card, the monetization plan's «scouting only for your own match, so votes stay fair».
-- Money still buys no points, ranking or outcome; it shows information. api.get_scout keeps its own-match rule.
--
-- api.get_player_pro(p_player): Pro is decided first, before anything about the player is read.
--   Pro:  core.scout_player_json for that player (history, μεταξύ σας, the numbers of «Τα στατιστικά σου» with the
--         surfaces, deciding sets, tie-breaks, common opponents), from the viewer's claimed player when they have one;
--         has_player says whether «μεταξύ σας» means anything.
--   Free: the teaser, counts only, never a result: how many matches, how many meetings with you, matches per surface,
--         how many went to a deciding set or had a tie-break. The app shows these with the values locked.
-- Never a minor or a hidden player.

create or replace function api.get_player_pro(p_player uuid)
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

  if core.is_pro(v_uid) then
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
revoke all on function api.get_player_pro(uuid) from public, anon;
grant execute on function api.get_player_pro(uuid) to authenticated, service_role;
