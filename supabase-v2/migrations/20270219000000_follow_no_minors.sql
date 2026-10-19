-- Onboarding never suggests or follows a minor (founder, 19 Oct 2026: a new user who picks nobody gets the 6 most
-- followed players of their area). Both functions are security definer, so the players_read policy that keeps
-- minors out of lists does not apply to them: the filter is written here, next to the hidden one.

create or replace function api.suggest_players(p_limit int default 30)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_claimed uuid;
  v_areas   text[];
  v_limit   int := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, claimed_player_id,
         case when cardinality(area_ids) > 0 then area_ids when area_id is not null then array[area_id] else '{}' end
    into v_sport, v_claimed, v_areas
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  return coalesce((
    select jsonb_agg(core.player_card_json(s.id, v_uid, v_sport) || jsonb_build_object('followers', s.followers)
                     order by s.rank)
      from (
        select p.id, f.followers,
               row_number() over (
                 order by (p.area_id = any (v_areas)) desc,
                          (p.area_id in (select a.id from core.areas a
                                          where a.region in (select region from core.areas where id = any (v_areas)))) desc,
                          f.followers desc, mc.matches desc, p.surname, p.first_name) as rank
          from core.players p
          cross join lateral (select count(*)::int as followers from core.follows x where x.player_id = p.id) f
          cross join lateral (select count(*)::int as matches from core.match_participants mp where mp.player_id = p.id) mc
         where p.status = 'active' and not p.hidden and not p.is_minor and p.id is distinct from v_claimed
         order by rank
         limit v_limit
      ) s), '[]'::jsonb);
end;
$$;

-- onboarding's «Συνέχεια · 3 φίλοι» and the automatic 6: follow several people as 'known' in one call
create or replace function api.follow_players(p_player_ids uuid[], p_source text default 'onboarding')
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_source not in ('onboarding', 'profile', 'card', 'invite') then
    raise exception 'invalid_argument' using errcode = '22023';
  end if;
  insert into core.follows (user_id, player_id, relation, source)
  select v_uid, p.id, 'known', p_source
    from core.players p
   where p.id = any (coalesce(p_player_ids, '{}')) and p.status = 'active' and not p.hidden and not p.is_minor
  on conflict (user_id, player_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function api.suggest_players(int) from public, anon;
revoke all on function api.follow_players(uuid[], text) from public, anon;
grant execute on function api.suggest_players(int) to authenticated, service_role;
grant execute on function api.follow_players(uuid[], text) to authenticated, service_role;
