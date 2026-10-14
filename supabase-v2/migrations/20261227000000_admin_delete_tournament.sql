-- Admins (not editors): delete a tournament (founder, 14 Oct: "i cannot delete a tournament from there"). Its matches, results,
-- draws, runs and decisions go with it, and levels are worked out again without its results. Refused when people
-- voted on its matches: their points came from those votes; pause it instead.

create or replace function api.admin_delete_tournament(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_ids     uuid[];
  v_votes   int;
  v_results int;
  v_sport   text;
begin
  if not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select sport_id into v_sport from core.tournaments where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select coalesce(array_agg(id), '{}') into v_ids from core.matches where tournament_id = p_id;
  select count(*) into v_votes from core.votes where subject_type = 'match' and subject_id = any (v_ids);
  if v_votes > 0 then
    raise exception 'has_votes: people voted % times on its matches; pause it instead', v_votes using errcode = 'P0001';
  end if;
  select count(*) into v_results from core.match_results where match_id = any (v_ids);
  delete from core.feed_inbox where kind = 'result' and (payload ->> 'match_id')::uuid = any (v_ids);
  delete from core.matches where id = any (v_ids);
  delete from core.tournaments where id = p_id;
  if v_results > 0 then perform core.recompute_levels(v_sport); end if;
  return jsonb_build_object('matches', cardinality(v_ids), 'results', v_results);
end;
$$;
revoke all on function api.admin_delete_tournament(uuid) from public, anon;
grant execute on function api.admin_delete_tournament(uuid) to authenticated, service_role;
