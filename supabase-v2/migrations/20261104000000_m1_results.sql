-- M1 Αποτελέσματα: the scoreboard of finished matches, newest first.
-- One row per match with a result (not void): players, score, the vote split, whether the winner was an
-- upset (same rule as resolve_match) and the viewer's own vote. Other people's votes are only counted.

create or replace function api.get_results(p_days int default 14, p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_days  int := least(greatest(coalesce(p_days, 14), 1), 90);
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.name as tournament,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.retired, r.walkover,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where m.approved
           and m.status <> 'void'
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

revoke all on function api.get_results(int, int) from public, anon;
grant execute on function api.get_results(int, int) to authenticated, service_role;
