-- The round of a match (founder, 4 Nov 2026: «mark more prominently whether it is a semifinal or a final», and the pushes
-- that follow need it). core.matches.round has been empty on every match: the app can show it, the sources never wrote it.
-- A read now carries `round` on a row when the source says it for sure (packages/ingest rounds.ts: tournamentsoftware's
-- label, a word in a sheet's score cell, the match's place in its draw). It only ever writes a key the app knows, and a
-- row with no round leaves the match as it is, so a round staff set by hand stays. MT200 Queens fills in at its next read.
-- Staff set it by hand for the sources that do not say it (athenstennis, TAF): api.admin_set_match_round.

create or replace function core.ingest_rounds(p_tournament_id uuid, p_rows jsonb)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_n int;
begin
  update core.matches m
     set round = x.round
    from (select r ->> 'fingerprint' as fingerprint, r ->> 'round' as round from jsonb_array_elements(p_rows) r) x
   where m.tournament_id = p_tournament_id and m.source = 'import' and m.source_ref = x.fingerprint
     and x.round in ('round64', 'round32', 'round16', 'quarter', 'semi', 'final')
     and m.round is distinct from x.round;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function core.ingest_rounds(uuid, jsonb) from public, anon, authenticated;

create or replace function api.admin_set_match_round(p_match uuid, p_round text)
returns boolean
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_round is not null and p_round not in ('round64', 'round32', 'round16', 'quarter', 'semi', 'final') then
    raise exception 'bad_round' using errcode = '22023';
  end if;
  update core.matches set round = p_round where id = p_match;
  return found;
end;
$$;
revoke all on function api.admin_set_match_round(uuid, text) from public, anon;
grant execute on function api.admin_set_match_round(uuid, text) to authenticated, service_role;

create or replace function core.ingest_run(p_tournament_id uuid, p_rows jsonb, p_trigger text, p_by uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_run    uuid;
  v_counts jsonb;
  v_seen   int := coalesce(jsonb_array_length(p_rows), 0);
  v_prev   int;
  v_health text;
begin
  if not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  select rows_seen into v_prev from core.ingest_runs
   where tournament_id = p_tournament_id and kind = 'schedule' and trigger <> 'dry' and health <> 'error' order by started_at desc limit 1;
  v_health := case when v_seen = 0 then 'empty'
                   when v_prev is not null and v_prev >= 10 and v_seen < v_prev / 2 then 'drop'
                   else 'ok' end;

  if p_trigger = 'dry' then
    begin
      v_counts := core.ingest_apply(p_tournament_id, p_rows, p_by, null);
      if v_health = 'ok' then
        v_counts := v_counts || core.ingest_close_stale_reviews(p_tournament_id, p_rows, null);
      end if;
      raise exception 'np_dry_run' using detail = v_counts::text;
    exception when raise_exception then
      if sqlerrm <> 'np_dry_run' then raise; end if;
      get stacked diagnostics v_counts = pg_exception_detail;
    end;
    insert into core.ingest_runs (tournament_id, trigger, started_by, rows_seen, counts, health)
    values (p_tournament_id, 'dry', p_by, v_seen, v_counts, v_health) returning id into v_run;
  else
    insert into core.ingest_runs (tournament_id, trigger, started_by, rows_seen, health)
    values (p_tournament_id, p_trigger, p_by, v_seen, v_health) returning id into v_run;
    v_counts := core.ingest_apply(p_tournament_id, p_rows, p_by, v_run);
    perform core.ingest_rounds(p_tournament_id, p_rows);
    -- a match the sheet stopped listing: after two runs in a row without it (and only on a healthy read) it is
    -- postponed, its votes kept; a match with a result is never touched. Cards the sheet no longer supports close.
    if v_health = 'ok' then
      v_counts := v_counts || core.ingest_missing(p_tournament_id, p_rows)
                           || core.ingest_close_stale_reviews(p_tournament_id, p_rows, v_run);
    end if;
    update core.ingest_runs set counts = v_counts where id = v_run;
    update core.tournaments t
       set last_run_at = now(),
           starts_on = least(coalesce(t.starts_on, d.first_day), d.first_day),
           ends_on = greatest(coalesce(t.ends_on, d.last_day), d.last_day)
      from (select min((x ->> 'date')::date) as first_day, max((x ->> 'date')::date) as last_day
              from jsonb_array_elements(p_rows) x where x ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$') d
     where t.id = p_tournament_id;
    update core.tournaments set last_run_at = now() where id = p_tournament_id;
  end if;
  return jsonb_build_object('run_id', v_run, 'dry', p_trigger = 'dry', 'rows_seen', v_seen, 'health', v_health) || v_counts;
end;
$$;
