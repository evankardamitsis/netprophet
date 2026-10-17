-- Αποτελέσματα filters (founder, 17 Oct 2026: "subtle filters on top based on tournament that loads only the
-- tournament results instead of someone searching endlessly, and a search that searches names"). get_results takes a
-- tournament and a name: a tournament loads all of its results, a name finds that player's matches this past year,
-- in any spelling (core.normalize_search folds accents, case and Greeklish). Rows carry tournament_id. And
-- results_tournaments lists the tournaments with results lately, the ones you play in or follow people in first.

drop function api.get_results(int, int);

create or replace function api.get_results(p_days int default 14, p_limit int default 60,
                                           p_tournament uuid default null, p_query text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_q     text := nullif(core.normalize_search(btrim(coalesce(p_query, ''))), '');
  -- a tournament or a name looks further back: the whole tournament, a player's whole season so far
  v_days  int := case when p_tournament is not null or v_q is not null then 365
                      else least(greatest(coalesce(p_days, 14), 1), 90) end;
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.id as tournament_id, t.name as tournament, e.name as level, m.provenance ->> 'discipline' as discipline,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.tournament_events e on e.id = m.event_id
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
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and (p_tournament is null or m.tournament_id = p_tournament)
           and (v_q is null or exists (
                 select 1 from core.match_participants mq join core.players pq on pq.id = mq.player_id
                  where mq.match_id = m.id and not pq.hidden
                    and (position(v_q in core.normalize_search(coalesce(pq.first_name, '') || ' ' || coalesce(pq.surname, ''))) > 0
                         or position(v_q in core.normalize_search(coalesce(pq.surname, '') || ' ' || coalesce(pq.first_name, ''))) > 0)))
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;
revoke all on function api.get_results(int, int, uuid, text) from public, anon;
grant execute on function api.get_results(int, int, uuid, text) to authenticated, service_role;

create or replace function api.results_tournaments(p_days int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_me   uuid;
  v_days int := least(greatest(coalesce(p_days, 60), 1), 365);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_me from core.players where claimed_by_user_id = v_uid limit 1;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'results', x.n) order by x.mine desc, x.last_at desc)
      from (
        select t.id, t.name, count(*)::int as n, max(m.starts_at) as last_at,
               bool_or(exists (select 1 from core.match_participants mp
                                where mp.match_id = m.id
                                  and (mp.player_id = v_me
                                       or mp.player_id in (select f.player_id from core.follows f where f.user_id = v_uid))))
                 as mine
          from core.matches m
          join core.match_results r on r.match_id = m.id
          join core.tournaments t on t.id = m.tournament_id and not t.is_minor_event
         where m.approved and m.status <> 'void' and m.starts_at >= now() - make_interval(days => v_days)
         group by t.id, t.name
      ) x), '[]'::jsonb);
end;
$$;
revoke all on function api.results_tournaments(int) from public, anon;
grant execute on function api.results_tournaments(int) to authenticated, service_role;
