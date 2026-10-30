-- The morning email leaves a finished tournament alone (founder, 30 Oct 2026: ΑΟΚ was marked closed and still showed
-- up). 20270324000000_ingest_skip_finished.sql stopped the sheet reads for a finished tournament, but
-- api.admin_morning_digest builds its lists from the matches directly: ΑΟΚ Tennis Open had 19 matches the organiser never
-- gave a result for, so «no result 2 days on» named it every morning.
-- Copied from 20270111000000_email_clubs.sql; a finished tournament is left out of what asks staff for work:
--   overdue, results_for_you, sheet_problems and rained_off. Today's matches and new players still count.

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
         and (t.id is null or (t.source_url is null and t.draw_url is null and not t.finished))),
    -- a sheet tournament match with no result two days on, not cancelled and not called off by staff: it waits on
    -- Results › Need you (founder, 14 Oct)
    'overdue', coalesce((
      select jsonb_agg(jsonb_build_object('tournament', x.name, 'matches', x.n) order by x.n desc)
        from (select t.name, count(*) as n
                from core.matches m join core.tournaments t on t.id = m.tournament_id
               where m.status in ('announced', 'scheduled') and not t.finished
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
       where r.health in ('error', 'drop') and not t.finished), '[]'::jsonb),
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
               where m.postponed_at > now() - interval '26 hours' and m.status in ('announced', 'scheduled') and not t.finished
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
               group by y.tournament) x), '[]'::jsonb),
    -- clubs a sheet named that have no surface yet: their matches fall back to the tournament's until staff set it
    'clubs_no_surface', coalesce((
      select jsonb_agg(jsonb_build_object('club', x.name, 'matches', x.n, 'tournaments', x.tournaments) order by x.n desc, x.name)
        from (select c.name, count(m.id) as n,
                     (array_agg(distinct t.name) filter (where t.name is not null))[1:3] as tournaments
                from core.clubs c
                join core.matches m on m.club_id = c.id
                left join core.tournaments t on t.id = m.tournament_id
               where c.surface is null
               group by c.id, c.name) x), '[]'::jsonb));
end;
$$;
