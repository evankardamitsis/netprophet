-- M4 part 1: organiser sheets read on a schedule. A tournament can carry its sheet (source_url) and be marked
-- ongoing; the 08:00 and 22:00 runs (apps/admin cron, docs/v2/match-data-automation.md) and staff («Τρέξε τώρα»,
-- «Δοκιμή τώρα») send the parsed rows here. One write path for the import desk and the runs: core.ingest_apply,
-- the M1 api.admin_import_matches body, now also resolving people on its own:
--   an alias, or one roster player at 0.92 or more (with a clear lead) links;
--   an unclear name whose likely player is in an active user's circle (claimed by, or followed by, someone who
--     voted in the last 30 days) holds the whole row for staff review, so nobody's match lands on the wrong person;
--   anyone else becomes a new provisional player and the match publishes (founder, 12 Oct 2026: the match data
--     brief supersedes the plan's "no new player without review").
-- New names arrive as the sheet writes them (capitals); words approved on /v2/names spell them on arrival.
-- A walkover publishes with the sheet's raw text and waits for staff to pick the winner (the sheet never says).
-- «tbc» and unfinished scores publish without a result. Every run is logged with its counts; a run that sees far
-- fewer rows than the last one for the same tournament is flagged for the morning review.

alter table core.tournaments
  add column source_kind        text check (source_kind in ('sheet', 'csv', 'site')),
  add column source_url         text,
  add column ongoing            boolean not null default false,   -- read by the scheduled runs
  add column season_start_year  int check (season_start_year between 2020 and 2100),
  add column last_run_at        timestamptz;

create table core.ingest_runs (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references core.tournaments (id) on delete cascade,
  trigger        text not null check (trigger in ('cron', 'staff', 'dry')),
  started_by     uuid references auth.users (id) on delete set null,
  started_at     timestamptz not null default now(),
  rows_seen      int not null default 0,
  counts         jsonb not null default '{}'::jsonb,
  health         text not null default 'ok' check (health in ('ok', 'drop', 'empty', 'error')),
  error          text
);
create index ingest_runs_tournament_idx on core.ingest_runs (tournament_id, started_at desc);
alter table core.ingest_runs enable row level security;

create table core.ingest_reviews (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references core.tournaments (id) on delete cascade,
  run_id         uuid references core.ingest_runs (id) on delete set null,
  kind           text not null check (kind in ('people', 'walkover')),
  fingerprint    text not null,
  match_id       uuid references core.matches (id) on delete cascade,
  payload        jsonb not null,     -- people: {row, unclear: [{raw, surname, first, candidates}]}; walkover: {row}
  status         text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  resolved_by    uuid references auth.users (id) on delete set null,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index ingest_reviews_open_uq on core.ingest_reviews (tournament_id, kind, fingerprint) where status = 'open';
alter table core.ingest_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
-- a roster player someone active cares about: claimed by, or followed by, a user who voted in the last 30 days
create or replace function core.in_active_circle(p_player uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (
    select 1 from core.players p
     where p.id = p_player and p.claimed_by_user_id is not null
       and exists (select 1 from core.votes v where v.user_id = p.claimed_by_user_id and v.created_at > now() - interval '30 days'))
  or exists (
    select 1 from core.follows f
     where f.player_id = p_player
       and exists (select 1 from core.votes v where v.user_id = f.user_id and v.created_at > now() - interval '30 days'))
$$;

-- the M1 candidate scoring for one person (api.admin_match_people without the staff check)
create or replace function core.ingest_candidates(p jsonb)
returns jsonb
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'first_name', c.first_name, 'surname', c.surname,
                                               'score', round(c.score::numeric, 2)) order by c.score desc), '[]'::jsonb)
    from (
      select pl.id, pl.first_name, pl.surname,
             case when coalesce(p ->> 'first', '') = ''
                  then 0.85 * similarity(pl.surname_norm, core.normalize_search(p ->> 'surname'))
                  else 0.6 * similarity(pl.surname_norm, core.normalize_search(p ->> 'surname'))
                     + 0.4 * greatest(similarity(pl.first_name_norm, core.normalize_search(p ->> 'first')),
                                      similarity(pl.first_name_norm, core.normalize_search(coalesce(p ->> 'first_alt', p ->> 'first'))))
             end as score
        from core.players pl
       where pl.status = 'active' and not pl.hidden
         and similarity(pl.surname_norm, core.normalize_search(p ->> 'surname')) >= 0.4
       order by score desc
       limit 3
    ) c
$$;

-- one sheet person {raw, surname, first, first_alt} → {how: alias|match|new|review, player_id, candidates}
create or replace function core.ingest_person(p jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_alias uuid;
  v_c     jsonb;
  v_top   numeric;
  v_next  numeric;
begin
  -- a remembered spelling links, hidden players included (they are never imported twice)
  select a.player_id into v_alias from core.player_aliases a
   where a.alias_norm in (core.normalize_search(btrim(coalesce(p ->> 'raw', ''))),
                          core.normalize_search(btrim(coalesce(p ->> 'surname', '') || ' ' || coalesce(p ->> 'first', ''))))
   limit 1;
  if v_alias is not null then return jsonb_build_object('how', 'alias', 'player_id', v_alias); end if;

  v_c := core.ingest_candidates(p);
  v_top := (v_c -> 0 ->> 'score')::numeric;
  v_next := coalesce((v_c -> 1 ->> 'score')::numeric, 0);
  if v_top >= 0.92 and v_top - v_next >= 0.05 then
    return jsonb_build_object('how', 'match', 'player_id', v_c -> 0 ->> 'id', 'candidates', v_c);
  end if;
  if v_top >= 0.6 and exists (select 1 from jsonb_array_elements(v_c) c
                               where (c ->> 'score')::numeric >= 0.6 and core.in_active_circle((c ->> 'id')::uuid)) then
    return jsonb_build_object('how', 'review', 'candidates', v_c);
  end if;
  return jsonb_build_object('how', 'new', 'candidates', coalesce(v_c, '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- The one write path
-- ---------------------------------------------------------------------------
-- p_rows: [{fingerprint, date, time, discipline (MS|WS|MD|WD|XD), level, category_raw, tab, row, flags, score_raw,
--           side1: [person], side2: [person], result: {winner_side, sets (winner-first), walkover} | null}]
-- person: {player_id} or {new: {surname, first}} (the desk decided), or {raw, surname, first, first_alt} (resolve here)
create or replace function core.ingest_apply(p_tournament_id uuid, p_rows jsonb, p_by uuid, p_run uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_t       core.tournaments;
  r         jsonb;
  v_m       core.matches;
  v_event   uuid;
  v_format  text;
  v_gender  text;
  v_starts  timestamptz;
  v_people  int := (select count(*) from core.players);
  v_new     int := 0;
  v_upd     int := 0;
  v_res     int := 0;
  v_skip    int := 0;
  v_held    int := 0;
  v_wo      int := 0;
  v_linked  int := 0;
  v_side    int;
  v_pos     int;
  v_person  jsonb;
  v_dec     jsonb;
  v_sides   jsonb;
  v_unclear jsonb;
  v_known   boolean;
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_known := exists (select 1 from core.matches where source = 'import' and source_ref = r ->> 'fingerprint');

    -- resolve the people the desk did not decide; an unclear one near an active user holds the row for review
    v_sides := jsonb_build_object('side1', r -> 'side1', 'side2', r -> 'side2');
    v_unclear := '[]'::jsonb;
    if not v_known then
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(r -> ('side' || v_side)) loop
          if v_person ? 'player_id' or v_person ? 'new' then
            null;
          else
            v_dec := core.ingest_person(v_person);
            if v_dec ->> 'how' in ('alias', 'match') then
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('player_id', v_dec ->> 'player_id', 'raw', v_person ->> 'raw'));
              v_linked := v_linked + 1;
            elsif v_dec ->> 'how' = 'new' then
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('new', jsonb_build_object('surname', v_person ->> 'surname', 'first', v_person ->> 'first'),
                                                      'raw', v_person ->> 'raw'));
            else
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('candidates', v_dec -> 'candidates'));
            end if;
          end if;
          v_pos := v_pos + 1;
        end loop;
      end loop;
      if jsonb_array_length(v_unclear) > 0 then
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
        values (p_tournament_id, p_run, 'people', r ->> 'fingerprint', jsonb_build_object('row', r, 'unclear', v_unclear))
        on conflict (tournament_id, kind, fingerprint) where status = 'open'
        do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
        v_held := v_held + 1;
        continue;
      end if;
    end if;

    v_format := case r ->> 'discipline' when 'XD' then 'mixed' when 'MD' then 'doubles' when 'WD' then 'doubles' else 'singles' end;
    v_gender := case r ->> 'discipline' when 'XD' then 'mixed' when 'WS' then 'f' when 'WD' then 'f' else 'm' end;
    v_starts := ((r ->> 'date')::date + coalesce(nullif(r ->> 'time', '')::time, time '00:00')) at time zone 'Europe/Athens';

    -- the event is the organiser's category (level) in its format
    select id into v_event from core.tournament_events
     where tournament_id = p_tournament_id and name = coalesce(r ->> 'level', 'OPEN') and format = v_format;
    if v_event is null then
      insert into core.tournament_events (tournament_id, name, format, gender)
      values (p_tournament_id, coalesce(r ->> 'level', 'OPEN'), v_format, v_gender) returning id into v_event;
    end if;

    select * into v_m from core.matches where source = 'import' and source_ref = r ->> 'fingerprint';
    if found then
      -- a known match: follow the sheet's time while it is still to play
      if v_m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
        update core.matches set starts_at = v_starts where id = v_m.id and starts_at is distinct from v_starts;
      end if;
      v_upd := v_upd + 1;
    else
      insert into core.matches (sport_id, format, status, starts_at, venue, area_id, tournament_id, event_id,
                                source, source_ref, counts_for_levels, provenance)
      values (v_t.sport_id, v_format, 'scheduled', v_starts, v_t.venue, v_t.area_id, p_tournament_id, v_event,
              'import', r ->> 'fingerprint', true,
              jsonb_build_object('tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                 'level', r ->> 'level', 'discipline', r ->> 'discipline', 'flags', r -> 'flags',
                                 'imported_by', p_by, 'imported_at', now(), 'run_id', p_run))
      returning * into v_m;
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(v_sides -> ('side' || v_side)) loop
          v_pos := v_pos + 1;
          insert into core.match_participants (match_id, side, player_id, position)
          values (v_m.id, v_side, core.import_person(v_person, p_by), v_pos);
        end loop;
      end loop;
      v_new := v_new + 1;
    end if;

    -- the organiser's score is the result; it cannot change a match that already resolved
    if r -> 'result' is not null and jsonb_typeof(r -> 'result') = 'object' then
      if coalesce((r -> 'result' ->> 'walkover')::boolean, false) and r -> 'result' ->> 'winner_side' is null then
        -- the sheet says «wo» and not who: staff pick the winner
        if not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
          insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, match_id, payload)
          values (p_tournament_id, p_run, 'walkover', r ->> 'fingerprint', v_m.id, jsonb_build_object('row', r))
          on conflict (tournament_id, kind, fingerprint) where status = 'open' do nothing;
          if found then v_wo := v_wo + 1; end if;
        end if;
      elsif exists (select 1 from core.match_results x
                     where x.match_id = v_m.id and x.winner_side = (r -> 'result' ->> 'winner_side')::int
                       and x.sets = r -> 'result' -> 'sets') then
        null;  -- the same score as last time: nothing to do
      elsif v_m.resolved_at is null then
        perform core.set_result(v_m.id, (r -> 'result' ->> 'winner_side')::int, r -> 'result' -> 'sets', null, null,
                                false, coalesce((r -> 'result' ->> 'walkover')::boolean, false), p_by);
        v_res := v_res + 1;
      else
        v_skip := v_skip + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_new, 'updated', v_upd, 'results', v_res, 'results_skipped', v_skip,
                            'new_players', (select count(*) from core.players) - v_people,
                            'linked', v_linked, 'held_for_review', v_held, 'walkovers_to_decide', v_wo);
end;
$$;
revoke all on function core.ingest_apply(uuid, jsonb, uuid, uuid) from public;

-- the import desk keeps its function, now on the shared path
create or replace function api.admin_import_matches(p_tournament_id uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.ingest_apply(p_tournament_id, p_rows, auth.uid(), null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Runs
-- ---------------------------------------------------------------------------
-- a run: apply the rows (or, dry, apply and roll back), log it with its counts and health
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
   where tournament_id = p_tournament_id and trigger <> 'dry' and health <> 'error' order by started_at desc limit 1;
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
revoke all on function core.ingest_run(uuid, jsonb, text, uuid) from public;

-- staff: «Τρέξε τώρα» or «Δοκιμή τώρα» (p_dry) with rows the admin server fetched and parsed
create or replace function api.admin_ingest_run(p_tournament_id uuid, p_rows jsonb, p_dry boolean default true)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.ingest_run(p_tournament_id, p_rows, case when p_dry then 'dry' else 'staff' end, auth.uid());
end;
$$;

-- the scheduled run (service role only): which tournaments to read, then one call per tournament
create or replace function api.ingest_due()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'source_kind', source_kind,
                                                       'source_url', source_url, 'season_start_year', season_start_year,
                                                       'last_run_at', last_run_at) order by name)
                     from core.tournaments where ongoing and source_url is not null), '[]'::jsonb);
end;
$$;

create or replace function api.ingest_cron_run(p_tournament_id uuid, p_rows jsonb, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_run uuid;
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_error is not null then   -- the sheet could not be read: log it, the morning review shows it red
    insert into core.ingest_runs (tournament_id, trigger, health, error) values (p_tournament_id, 'cron', 'error', left(p_error, 500))
    returning id into v_run;
    return jsonb_build_object('run_id', v_run, 'health', 'error');
  end if;
  return core.ingest_run(p_tournament_id, p_rows, 'cron', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff: tournaments with their source, runs, reviews
-- ---------------------------------------------------------------------------
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
             'source_kind', t.source_kind, 'source_url', t.source_url, 'ongoing', t.ongoing,
             'season_start_year', t.season_start_year, 'last_run_at', t.last_run_at,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id),
             'open_reviews', (select count(*) from core.ingest_reviews r where r.tournament_id = t.id and r.status = 'open'),
             'last_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id order by r.started_at desc limit 1))
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
  if coalesce((p ->> 'ongoing')::boolean, false) and coalesce(btrim(p ->> 'source_url'), '') = '' then
    raise exception 'source_required' using errcode = '22023';
  end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source,
                                  source_kind, source_url, ongoing, season_start_year)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import',
            nullif(p ->> 'source_kind', ''), nullif(btrim(p ->> 'source_url'), ''),
            coalesce((p ->> 'ongoing')::boolean, false), nullif(p ->> 'season_start_year', '')::int)
    returning id into v_id;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date,
           source_kind = case when p ? 'source_kind' then nullif(p ->> 'source_kind', '') else source_kind end,
           source_url = case when p ? 'source_url' then nullif(btrim(p ->> 'source_url'), '') else source_url end,
           ongoing = case when p ? 'ongoing' then (p ->> 'ongoing')::boolean else ongoing end,
           season_start_year = case when p ? 'season_start_year' then nullif(p ->> 'season_start_year', '')::int else season_start_year end
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

-- the review list: open items, newest first, with what the database suggests
create or replace function api.admin_ingest_reviews(p_tournament_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'tournament_id', r.tournament_id,
                                        'tournament', t.name, 'match_id', r.match_id, 'payload', r.payload,
                                        'created_at', r.created_at) order by r.created_at desc)
      from core.ingest_reviews r join core.tournaments t on t.id = r.tournament_id
     where r.status = 'open' and (p_tournament_id is null or r.tournament_id = p_tournament_id)), '[]'::jsonb);
end;
$$;

-- decide one: people → p = {decisions: [{raw, player_id} | {raw, new: true}]}, the row then imports;
-- walkover → p = {winner_side: 1|2}; or p = {dismiss: true}
create or replace function api.admin_resolve_ingest_review(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v    core.ingest_reviews;
  v_row jsonb;
  v_s  int;
  v_i  int;
  v_pp jsonb;
  v_d  jsonb;
  v_out jsonb := '{}'::jsonb;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from core.ingest_reviews where id = p_id and status = 'open' for update;
  if not found then raise exception 'review_not_found' using errcode = 'P0002'; end if;

  if coalesce((p ->> 'dismiss')::boolean, false) then
    update core.ingest_reviews set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;
    return jsonb_build_object('dismissed', true);
  end if;

  if v.kind = 'people' then
    v_row := v.payload -> 'row';
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        select d into v_d from jsonb_array_elements(p -> 'decisions') d where d ->> 'raw' = v_pp ->> 'raw' limit 1;
        if v_d is not null then
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when coalesce((v_d ->> 'new')::boolean, false)
                          then jsonb_build_object('new', jsonb_build_object('surname', v_pp ->> 'surname', 'first', v_pp ->> 'first'), 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw') end);
        end if;
        v_d := null;
      end loop;
    end loop;
    -- the people the run was sure about: the same rules again (an alias or a certain match links, else new);
    -- an unclear one staff did not decide is an error
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        if not (v_pp ? 'player_id' or v_pp ? 'new') then
          if (v_pp ->> 'raw') in (select u ->> 'raw' from jsonb_array_elements(v.payload -> 'unclear') u) then
            raise exception 'person_undecided' using errcode = '22023', detail = coalesce(v_pp ->> 'raw', '');
          end if;
          v_d := core.ingest_person(v_pp);
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when v_d ->> 'how' in ('alias', 'match')
                          then jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('new', jsonb_build_object('surname', v_pp ->> 'surname', 'first', v_pp ->> 'first'), 'raw', v_pp ->> 'raw') end);
        end if;
      end loop;
    end loop;
    v_out := core.ingest_apply(v.tournament_id, jsonb_build_array(v_row), auth.uid(), v.run_id);
  elsif v.kind = 'walkover' then
    if (p ->> 'winner_side') not in ('1', '2') then raise exception 'winner_required' using errcode = '22023'; end if;
    perform core.set_result(v.match_id, (p ->> 'winner_side')::int, '[]'::jsonb, null, null, false, true, auth.uid());
    v_out := jsonb_build_object('results', 1);
  end if;

  update core.ingest_reviews set status = 'done', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;
  return v_out;
end;
$$;

revoke all on function api.admin_ingest_run(uuid, jsonb, boolean) from public, anon;
revoke all on function api.ingest_due() from public, anon, authenticated;
revoke all on function api.ingest_cron_run(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function api.admin_ingest_reviews(uuid) from public, anon;
revoke all on function api.admin_resolve_ingest_review(uuid, jsonb) from public, anon;
grant execute on function api.admin_ingest_run(uuid, jsonb, boolean) to authenticated, service_role;
grant execute on function api.ingest_due() to service_role;
grant execute on function api.ingest_cron_run(uuid, jsonb, text) to service_role;
grant execute on function api.admin_ingest_reviews(uuid) to authenticated, service_role;
grant execute on function api.admin_resolve_ingest_review(uuid, jsonb) to authenticated, service_role;
