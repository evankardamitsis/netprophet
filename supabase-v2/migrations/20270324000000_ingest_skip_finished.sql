-- A finished tournament is left alone by the scheduled reads (founder, 29 Oct 2026: "when a tournament is marked as
-- finished you should not read the draws daily or try to figure out results").
--
-- Staff mark a tournament done with core.tournaments.finished (20270313000000_week_window_finished.sql), but the
-- three daily reads still picked it up because api.ingest_due only looked at `ongoing`: the schedule and the draw sheet
-- were read, draw results were applied (core.ingest_draw_results) and the 15:00 rain rule could call off its matches.
--   1. api.ingest_due leaves out finished tournaments, so the cron reads neither sheet and applies no results.
--   2. core.auto_rain leaves out their matches.
-- «Update now» on the tournament page is a staff action and still reads it on request.

create or replace function api.ingest_due()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'source_kind', source_kind,
                                                       'source_url', source_url, 'draw_url', draw_url, 'season_start_year', season_start_year,
                                                       'last_run_at', last_run_at) order by name)
                     from core.tournaments
                    where ongoing and not finished and (source_url is not null or draw_url is not null)), '[]'::jsonb);
end;
$$;

create or replace function core.auto_rain()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_today date := core.athens_day(now());
  v_out   jsonb;
begin
  with off as (
    update core.matches m
       set postponed_at = now(), provenance = m.provenance || '{"postponed_by": "auto"}'::jsonb, updated_at = now()
      from core.tournaments t
     where t.id = m.tournament_id and t.ongoing and not t.finished and (t.source_url is not null or t.draw_url is not null)
       and core.athens_day(m.starts_at) between v_today - 2 and v_today - 1
       and m.status in ('announced', 'scheduled') and m.postponed_at is null and m.source = 'import'
       and not exists (select 1 from core.match_results r where r.match_id = m.id)
    returning t.name, core.athens_day(m.starts_at) as day
  )
  select coalesce(jsonb_agg(jsonb_build_object('tournament', name, 'day', day, 'matches', n)), '[]'::jsonb)
    into v_out
    from (select name, day, count(*) as n from off group by 1, 2) x;
  return v_out;
end;
$$;
revoke all on function core.auto_rain() from public;
