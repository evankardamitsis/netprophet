-- M4: sheet results that never came (founder, 14 Oct: "if results are not through from sheets for more than 2 days of
-- the match and the match is not cancelled they need to be passed on for human review on the admin"). Two days after
-- its day, a sheet match with no result, not cancelled and not called off by staff, is flagged `overdue` on the
-- Results desk (it moves to «Need you», also when the 15:00 rule called it off for rain, so a person confirms it), and
-- the morning email counts it. Staff answer with a result, «It didn't happen», or «Rained off, keep it».

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
               m.postponed_at is not null as postponed,
               m.provenance ->> 'postponed_by' as postponed_by,
               -- a sheet match with no result two days on, not cancelled and not called off by staff: a person decides
               (t.id is not null and r.match_id is null and m.status <> 'void'
                and core.athens_day(m.starts_at) <= core.athens_day(now()) - 2
                and coalesce(m.provenance ->> 'postponed_by', '') <> 'staff') as overdue,
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

-- «Rained off, keep it»: staff confirm a postponement (the rule's or none yet); it then waits for the sheet's new day
create or replace function api.admin_keep_postponed(p_match uuid)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.matches
     set postponed_at = coalesce(postponed_at, now()), provenance = provenance || '{"postponed_by": "staff"}'::jsonb, updated_at = now()
   where id = p_match and status in ('announced', 'scheduled')
     and not exists (select 1 from core.match_results r where r.match_id = p_match);
  if not found then raise exception 'not_open' using errcode = 'P0001'; end if;
end;
$$;
revoke all on function api.admin_keep_postponed(uuid) from public, anon;
grant execute on function api.admin_keep_postponed(uuid) to authenticated, service_role;

create or replace function api.admin_morning_digest()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_today date := core.athens_day(now());
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'date', v_today,
    'recipients', coalesce((
      select jsonb_agg(distinct u.email)
        from core.profiles p join auth.users u on u.id = p.user_id
       where p.role in ('admin', 'editor') and p.morning_email and p.deleted_at is null and u.email is not null), '[]'::jsonb),
    -- decisions waiting on the Tournaments page
    'decisions', jsonb_build_object(
      'people', (select count(*) from core.ingest_reviews where status = 'open' and kind = 'people'),
      'walkovers', (select count(*) from core.ingest_reviews where status = 'open' and kind = 'walkover'),
      'score_conflicts', (select count(*) from core.ingest_reviews where status = 'open' and kind = 'score_conflict')),
    -- started more than 3 hours ago, no result, and no tournament sheet will bring one
    'results_for_you', (
      select count(*) from core.matches m
        left join core.tournaments t on t.id = m.tournament_id
       where m.status in ('announced', 'scheduled') and m.postponed_at is null
         and m.starts_at < now() - interval '3 hours' and m.starts_at > now() - interval '14 days'
         and not exists (select 1 from core.match_results r where r.match_id = m.id)
         and (t.id is null or (t.source_url is null and t.draw_url is null))),
    -- a sheet tournament match with no result two days on, not cancelled and not called off by staff: it waits on
    -- Results › Need you (founder, 14 Oct)
    'overdue', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', x.name, 'matches', x.n) order by x.n desc)
        from (select t.name, count(*) as n
                from core.matches m join core.tournaments t on t.id = m.tournament_id
               where m.status in ('announced', 'scheduled')
                 and core.athens_day(m.starts_at) <= core.athens_day(now()) - 2 and m.starts_at > now() - interval '21 days'
                 and coalesce(m.provenance ->> 'postponed_by', '') <> 'staff'
                 and not exists (select 1 from core.match_results r where r.match_id = m.id)
               group by t.name) x), '[]'::jsonb),
    -- sheets that could not be read, or looked much shorter, in the last day (the latest run per tournament and kind)
    'sheet_problems', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', t.name, 'kind', r.kind, 'health', r.health, 'error', r.error,
                                          'at', r.started_at) order by t.name)
        from (select distinct on (tournament_id, kind) * from core.ingest_runs
               where trigger <> 'dry' and started_at > now() - interval '26 hours'
               order by tournament_id, kind, started_at desc) r
        join core.tournaments t on t.id = r.tournament_id
       where r.health in ('error', 'drop')), '[]'::jsonb),
    'postponed', (select count(*) from core.matches where postponed_at > now() - interval '1 day'
                                                     and status in ('announced', 'scheduled')),
    -- today's matches per tournament
    'today', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', x.name, 'matches', x.n) order by x.n desc)
        from (select coalesce(t.name, 'Friendlies') as name, count(*) as n
                from core.matches m left join core.tournaments t on t.id = m.tournament_id
               where core.athens_day(m.starts_at) = v_today and m.status <> 'void' and m.postponed_at is null
               group by 1) x), '[]'::jsonb),
    'last_runs', (select count(*) from core.ingest_runs where trigger = 'cron' and started_at > now() - interval '26 hours'),
    -- matches called off for rain in the last day, per tournament and day: by the 15:00 rule or by staff
    'rained_off', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', x.name, 'day', x.day, 'auto', x.auto, 'staff', x.staff) order by x.day, x.name)
        from (select t.name, core.athens_day(m.starts_at) as day,
                     count(*) filter (where m.provenance ->> 'postponed_by' = 'auto') as auto,
                     count(*) filter (where m.provenance ->> 'postponed_by' = 'staff') as staff
                from core.matches m join core.tournaments t on t.id = m.tournament_id
               where m.postponed_at > now() - interval '26 hours' and m.status in ('announced', 'scheduled')
                 and m.provenance ->> 'postponed_by' in ('auto', 'staff')
               group by 1, 2) x), '[]'::jsonb),
    -- people the schedules, results and draws added to the roster in the last day, per tournament they came from
    'new_players', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', x.tournament, 'count', x.n, 'names', x.names) order by x.n desc, x.tournament)
        from (select y.tournament, count(*) as n,
                     (array_agg(y.name order by y.name))[1:15] as names
                from (select p.id, btrim(p.surname || ' ' || p.first_name) as name,
                             coalesce((select t.name from core.match_participants mp
                                         join core.matches m on m.id = mp.match_id
                                         join core.tournaments t on t.id = m.tournament_id
                                        where mp.player_id = p.id order by m.created_at limit 1),
                                      (select t.name from core.tournament_draws d
                                         join core.tournaments t on t.id = d.tournament_id,
                                              jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
                                        where pl ->> 'player_id' = p.id::text limit 1),
                                      'Other') as tournament
                        from core.players p
                       where p.source = 'import' and p.status <> 'merged' and p.created_at > now() - interval '24 hours') y
               group by y.tournament) x), '[]'::jsonb));
end;
$$;
revoke all on function api.admin_morning_digest() from public, anon, authenticated;
grant execute on function api.admin_morning_digest() to service_role;
