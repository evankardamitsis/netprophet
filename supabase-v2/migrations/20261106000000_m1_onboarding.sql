-- M1 onboarding: claim status, suggestions for «Ποια είναι η παρέα σου;», following several at once,
-- and marking everyone who exists today (v1 imports, the founder) as done so they are not sent through it.

-- the claim step's outcome when no player was claimed: «Δεν με βρίσκω, είμαι καινούριος» or skipped
create or replace function api.set_claim_status(p_status text)
returns text
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_status not in ('skipped', 'creation_requested') then
    raise exception 'invalid_argument: claim status' using errcode = '22023';
  end if;
  select claim_status into v_now from core.profiles where user_id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_now = p_status then return v_now; end if;   -- replay
  if v_now = 'claimed' then raise exception 'already_claimed' using errcode = '23505'; end if;
  -- none -> skipped | creation_requested; skipped -> creation_requested (changed their mind)
  if not (v_now = 'none' or (v_now = 'skipped' and p_status = 'creation_requested')) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  update core.profiles set claim_status = p_status where user_id = v_uid;
  return p_status;
end;
$$;

-- «Ποια είναι η παρέα σου;»: people the viewer may know, from their areas first (then their region, then
-- anywhere), most followed and most active first; never their own player
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
         where p.status = 'active' and not p.hidden and p.id is distinct from v_claimed
         order by rank
         limit v_limit
      ) s), '[]'::jsonb);
end;
$$;

-- onboarding's «Συνέχεια · 3 φίλοι»: follow several people as 'known' in one call (replays are harmless)
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
   where p.id = any (coalesce(p_player_ids, '{}')) and p.status = 'active' and not p.hidden
  on conflict (user_id, player_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function api.set_claim_status(text) from public, anon;
revoke all on function api.suggest_players(int) from public, anon;
revoke all on function api.follow_players(uuid[], text) from public, anon;
grant execute on function api.set_claim_status(text) to authenticated, service_role;
grant execute on function api.suggest_players(int) to authenticated, service_role;
grant execute on function api.follow_players(uuid[], text) to authenticated, service_role;

-- everyone who exists before onboarding ships has done it (v1 accounts carry their area and claim already)
update core.profiles
   set onboarding_state = onboarding_state || jsonb_build_object('done', true, 'via', 'before-onboarding')
 where not (onboarding_state ? 'done');
