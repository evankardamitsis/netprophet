-- Remove any match from the app (founder, 16 Oct 2026: «I need to be able to remove matches from the app from the
-- admin»). admin_void_match refused a match with a result; now an admin can remove it too. The votes on it close with
-- no outcome, the points they earned are taken back, it stops counting for levels (they are worked out again) and its
-- result cards leave the inbox. A σερί is never rewritten, as when a disputed match is voided. With no result, staff
-- can still remove it as before.

create or replace function api.admin_void_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m       core.matches;
  v_result  boolean;
  v_back    int := 0;
  r         record;
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.status = 'void' then
    return jsonb_build_object('match_id', p_match_id, 'status', 'void', 'points_taken_back', 0);
  end if;
  v_result := v_m.resolved_at is not null or exists (select 1 from core.match_results where match_id = p_match_id);

  if v_result then
    -- taking points back is an admin's call, as deleting a tournament is
    if not (core.is_service() or core.is_admin()) then
      raise exception 'admin_only: only an admin can remove a match that has a result' using errcode = '42501';
    end if;
    update core.votes set outcome = 'none', points = 0
     where subject_type = 'match' and subject_id = p_match_id and resolved_at is not null;
    -- one entry per user, dated in the month the points were earned so this month's Ladder is not charged for an
    -- older match; the ledger keeps one row per reason per match, so it is a correction unless one is there already
    for r in select l.user_id, sum(l.delta)::int as net, min(l.created_at) as earned_at,
                    bool_or(l.reason = 'correction') as corrected
               from core.points_ledger l
              where l.ref_type = 'match' and l.ref_id = p_match_id
              group by l.user_id having sum(l.delta) <> 0
    loop
      v_back := v_back + r.net;
      perform core.award_points(r.user_id, -r.net, case when r.corrected then 'admin_adjust' else 'correction' end,
                                'match', p_match_id, 'remove:' || p_match_id || ':' || r.user_id, r.earned_at);
    end loop;
    delete from core.feed_inbox where kind = 'result' and (payload ->> 'match_id')::uuid = p_match_id;
  end if;

  update core.matches
     set status = 'void', counts_for_levels = case when v_result then false else counts_for_levels end, updated_at = now(),
         provenance = provenance || jsonb_build_object('removed', jsonb_build_object('by', auth.uid(), 'at', now(), 'had_result', v_result))
   where id = p_match_id;
  if v_result then
    perform core.recompute_levels(v_m.sport_id);
  end if;
  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':void')
  on conflict (idempotency_key) do nothing;
  return jsonb_build_object('match_id', p_match_id, 'status', 'void', 'points_taken_back', v_back);
end;
$$;

revoke all on function api.admin_void_match(uuid) from public, anon;
grant execute on function api.admin_void_match(uuid) to authenticated, service_role;
