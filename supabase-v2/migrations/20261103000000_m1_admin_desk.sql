-- M1 admin results desk (apps/admin /v2/results).
--   api.admin_desk(p_days): the matches the desk works on, staff only: those waiting for a result (started, no
--   result, not void) first, then upcoming, then recently done; with names, result and vote counts.
--   api.admin_void_match(p_match_id): the match did not happen. Votes close with no points (outcome 'none')
--   when the resolve job runs; the desk runs api.resolve_match right after for an admin.

create or replace function api.admin_desk(p_days int default 7)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 7), 1), 60);
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.bucket, d.sort_at)
      from (
        select m.id as match_id, m.format, m.status, m.starts_at, m.venue, m.round, m.source, m.resolved_at,
               t.name as tournament,
               core.match_sides_json(m.id) as sides,
               case when r.match_id is not null then jsonb_build_object(
                 'winner_side', r.winner_side, 'sets', r.sets, 'score', r.score_summary,
                 'retired', r.retired, 'walkover', r.walkover, 'version', r.result_version) end as result,
               (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id) as votes,
               (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id
                  and v.resolved_at is not null) as votes_resolved,
               case
                 when r.match_id is null and m.status not in ('void') and m.starts_at <= now() then 'to_score'
                 when r.match_id is null and m.status not in ('void') then 'upcoming'
                 else 'done' end as bucket_name,
               case
                 when r.match_id is null and m.status not in ('void') and m.starts_at <= now() then 1
                 when r.match_id is null and m.status not in ('void') then 2
                 else 3 end as bucket,
               -- oldest first while waiting, soonest first upcoming, newest first when done
               case
                 when r.match_id is null and m.status not in ('void') then extract(epoch from m.starts_at)
                 else -extract(epoch from coalesce(m.starts_at, m.created_at)) end as sort_at
          from core.matches m
          left join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
         where m.approved
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and m.starts_at <= now() + make_interval(days => v_days)
      ) d), '[]'::jsonb);
end;
$$;

create or replace function api.admin_void_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m core.matches;
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.resolved_at is not null or exists (select 1 from core.match_results where match_id = p_match_id) then
    raise exception 'has_result: a match with a result cannot be voided yet';
  end if;

  update core.matches set status = 'void', updated_at = now() where id = p_match_id;
  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':void')
  on conflict (idempotency_key) do nothing;
  return jsonb_build_object('match_id', p_match_id, 'status', 'void');
end;
$$;

revoke all on function api.admin_desk(int) from public, anon;
revoke all on function api.admin_void_match(uuid) from public, anon;
grant execute on function api.admin_desk(int) to authenticated, service_role;
grant execute on function api.admin_void_match(uuid) to authenticated, service_role;
