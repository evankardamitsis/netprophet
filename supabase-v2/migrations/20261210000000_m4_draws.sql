-- M4 part 3a: draws. Organisers publish a draw sheet next to the schedule (ΑΟΚ Κηφισιάς: one bracket tab per
-- category); packages/ingest parseDraws reads it and the runs store each category's bracket here, for the app's
-- Tournaments page. A draw is for showing: it never creates matches or players (the schedule does); names are
-- linked to roster players only where the matcher is sure (an alias, a certain match, a surname in this
-- tournament). Runs are now three a day (08:00, 15:00, 22:00 Athens; founder: schedules change during the day) and
-- log schedule and draw reads apart (ingest_runs.kind).

alter table core.tournaments add column draw_url text;
alter table core.ingest_runs add column kind text not null default 'schedule' check (kind in ('schedule', 'draws'));

create table core.tournament_draws (
  tournament_id  uuid not null references core.tournaments (id) on delete cascade,
  tab            text not null,
  title          text not null default '',
  discipline     text not null check (discipline in ('MS', 'WS', 'MD', 'WD', 'XD')),
  level          text not null default '',
  format         text not null check (format in ('knockout', 'round_robin')),
  size           int not null default 0,
  draw           jsonb not null,     -- {entrants: [{pos, raw, seed, bye, players: [{raw, player_id}]}], rounds: [[match]]}
  updated_at     timestamptz not null default now(),
  primary key (tournament_id, tab)
);
alter table core.tournament_draws enable row level security;

-- a draw person → a roster player only when the matcher is sure; never a new player
create or replace function core.draw_player(p jsonb, p_tournament uuid)
returns uuid
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare v jsonb;
begin
  if coalesce(btrim(p ->> 'surname'), '') = '' then return null; end if;
  v := core.ingest_person(p || jsonb_build_object('raw', btrim(coalesce(p ->> 'surname', '') || ' ' || coalesce(p ->> 'first', ''))), p_tournament);
  return case when v ->> 'how' in ('alias', 'match', 'tournament', 'surname') then (v ->> 'player_id')::uuid end;
end;
$$;

-- store a sheet's draws (p_draws: packages/ingest Draw[]); tabs gone from the sheet are removed
create or replace function core.ingest_draws(p_tournament_id uuid, p_draws jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  d       jsonb;
  v_ents  jsonb;
  v_n     int := 0;
  v_linked int := 0;
  v_people int := 0;
begin
  if not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_draws, '[]'::jsonb)) loop
    select coalesce(jsonb_agg(e - 'people' || jsonb_build_object('players', (
             select coalesce(jsonb_agg(jsonb_build_object('raw', btrim(coalesce(pp ->> 'surname', '') || ' ' || coalesce(pp ->> 'first', '')),
                                                          'player_id', core.draw_player(pp, p_tournament_id)) order by o), '[]'::jsonb)
               from jsonb_array_elements(e -> 'people') with ordinality x(pp, o)))
           order by (e ->> 'pos')::int), '[]'::jsonb)
      into v_ents from jsonb_array_elements(d -> 'entrants') e;
    v_people := v_people + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players'));
    v_linked := v_linked + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players') pl
                             where pl ->> 'player_id' is not null);
    insert into core.tournament_draws (tournament_id, tab, title, discipline, level, format, size, draw, updated_at)
    values (p_tournament_id, d ->> 'tab', coalesce(d ->> 'title', ''), d ->> 'discipline', coalesce(d ->> 'level', ''),
            d ->> 'format', coalesce((d ->> 'size')::int, 0),
            jsonb_build_object('entrants', v_ents, 'rounds', coalesce(d -> 'rounds', '[]'::jsonb), 'flags', coalesce(d -> 'flags', '[]'::jsonb)), now())
    on conflict (tournament_id, tab) do update
      set title = excluded.title, discipline = excluded.discipline, level = excluded.level, format = excluded.format,
          size = excluded.size, draw = excluded.draw, updated_at = now();
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    delete from core.tournament_draws
     where tournament_id = p_tournament_id
       and tab not in (select x ->> 'tab' from jsonb_array_elements(p_draws) x);
  end if;
  return jsonb_build_object('draws', v_n, 'people', v_people, 'linked', v_linked);
end;
$$;
revoke all on function core.ingest_draws(uuid, jsonb) from public;

-- a draw read, logged like a schedule run (kind draws); dry applies and rolls back
create or replace function core.ingest_draw_run(p_tournament_id uuid, p_draws jsonb, p_trigger text, p_by uuid, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_counts jsonb;
  v_seen   int := coalesce(jsonb_array_length(p_draws), 0);
  v_run    uuid;
begin
  if p_error is not null then
    insert into core.ingest_runs (tournament_id, kind, trigger, started_by, health, error)
    values (p_tournament_id, 'draws', p_trigger, p_by, 'error', left(p_error, 500)) returning id into v_run;
    return jsonb_build_object('run_id', v_run, 'health', 'error');
  end if;
  if p_trigger = 'dry' then
    begin
      v_counts := core.ingest_draws(p_tournament_id, p_draws);
      raise exception 'np_dry_run' using detail = v_counts::text;
    exception when raise_exception then
      if sqlerrm <> 'np_dry_run' then raise; end if;
      get stacked diagnostics v_counts = pg_exception_detail;
    end;
  else
    v_counts := core.ingest_draws(p_tournament_id, p_draws);
  end if;
  insert into core.ingest_runs (tournament_id, kind, trigger, started_by, rows_seen, counts, health)
  values (p_tournament_id, 'draws', p_trigger, p_by, v_seen, v_counts, case when v_seen = 0 then 'empty' else 'ok' end)
  returning id into v_run;
  return jsonb_build_object('run_id', v_run, 'dry', p_trigger = 'dry', 'rows_seen', v_seen) || v_counts;
end;
$$;
revoke all on function core.ingest_draw_run(uuid, jsonb, text, uuid, text) from public;

create or replace function api.admin_ingest_draws(p_tournament_id uuid, p_draws jsonb, p_dry boolean default true)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.ingest_draw_run(p_tournament_id, p_draws, case when p_dry then 'dry' else 'staff' end, auth.uid());
end;
$$;

create or replace function api.ingest_cron_draws(p_tournament_id uuid, p_draws jsonb, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.ingest_draw_run(p_tournament_id, p_draws, 'cron', null, p_error);
end;
$$;

revoke all on function api.admin_ingest_draws(uuid, jsonb, boolean) from public, anon;
revoke all on function api.ingest_cron_draws(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function api.admin_ingest_draws(uuid, jsonb, boolean) to authenticated, service_role;
grant execute on function api.ingest_cron_draws(uuid, jsonb, text) to service_role;

-- the schedule run compares with the last schedule run only; the due list, the desk's list and saving know draw_url

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
    update core.ingest_runs set counts = v_counts where id = v_run;
    update core.tournaments set last_run_at = now() where id = p_tournament_id;
  end if;
  return jsonb_build_object('run_id', v_run, 'dry', p_trigger = 'dry', 'rows_seen', v_seen, 'health', v_health) || v_counts;
end;
$$;

create or replace function api.ingest_due()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'source_kind', source_kind,
                                                       'source_url', source_url, 'draw_url', draw_url, 'season_start_year', season_start_year,
                                                       'last_run_at', last_run_at) order by name)
                     from core.tournaments where ongoing and (source_url is not null or draw_url is not null)), '[]'::jsonb);
end;
$$;

create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active,
             'source_kind', t.source_kind, 'source_url', t.source_url, 'draw_url', t.draw_url, 'ongoing', t.ongoing,
             'season_start_year', t.season_start_year, 'last_run_at', t.last_run_at,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id),
             'open_reviews', (select count(*) from core.ingest_reviews r where r.tournament_id = t.id and r.status = 'open'),
             'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
             'last_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'schedule' order by r.started_at desc limit 1),
             'last_draw_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'draws' order by r.started_at desc limit 1))
           order by t.ongoing desc, t.active desc, t.starts_on desc nulls last, t.name)
      from core.tournaments t), '[]'::jsonb);
end;
$$;

create or replace function api.admin_save_tournament(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  if coalesce((p ->> 'ongoing')::boolean, false) and coalesce(btrim(p ->> 'source_url'), '') = '' and coalesce(btrim(p ->> 'draw_url'), '') = '' then
    raise exception 'source_required' using errcode = '22023';
  end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source,
                                  source_kind, source_url, draw_url, ongoing, season_start_year)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import',
            nullif(p ->> 'source_kind', ''), nullif(btrim(p ->> 'source_url'), ''), nullif(btrim(p ->> 'draw_url'), ''),
            coalesce((p ->> 'ongoing')::boolean, false), nullif(p ->> 'season_start_year', '')::int)
    returning id into v_id;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date,
           source_kind = case when p ? 'source_kind' then nullif(p ->> 'source_kind', '') else source_kind end,
           source_url = case when p ? 'source_url' then nullif(btrim(p ->> 'source_url'), '') else source_url end,
           draw_url = case when p ? 'draw_url' then nullif(btrim(p ->> 'draw_url'), '') else draw_url end,
           ongoing = case when p ? 'ongoing' then (p ->> 'ongoing')::boolean else ongoing end,
           season_start_year = case when p ? 'season_start_year' then nullif(p ->> 'season_start_year', '')::int else season_start_year end
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;
