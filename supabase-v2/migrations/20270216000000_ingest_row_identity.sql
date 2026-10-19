-- A sheet row keeps its match when the organiser edits it (18 Oct 2026: 28 matches stuck in three days). The
-- fingerprint is day|discipline|level|names, so a substitute («BINJAKU» for Παλαιολόγος), a category typo («MMEDIUM»,
-- «-40» for «-45») or a name typo («Σαρδάκης», «ΖΑΝNΗΣ» with a Latin N) made a new match: the new copy got the result,
-- the old one went «missing», was postponed for good («Αναβλήθηκε» in the feed) and its votes never resolved. Now:
--
-- 1. Row identity. A row whose fingerprint is not known first looks for an unresolved match of the same tournament at
--    the same time (and court, when both say), in a category equal after normalising (core.norm_level: case, Greek
--    look-alikes, spaces, dashes, a letter typed twice; one edit allowed) whose players overlap: a whole side the same,
--    or 3 of 4 in doubles, a surname one letter off counting as the same person. That match takes the row:
--      every place the same (only the category or a spelling changed): updated in place (category_changed, name_typo);
--      a doubles partner changed and each side keeps someone: updated in place, votes kept (lineup_changed);
--      a singles player or a whole side changed: the old match is voided as admin_void_match does (its votes close
--        with no points, provenance replaced_by) and the row makes a new match people can vote on.
--    The match's sides are compared in the sheet's order (votes are per side).
-- 2. Latin look-alike letters inside Greek words are Greek (core.fold_lookalikes) before a name is matched.
-- 3. A category the tournament already has under a typo («MMEDIUM») snaps to it instead of a new event.
-- 4. «Missing twice → postponed» only when nothing took the slot: a missing match whose twin is on the sheet hands its
--    votes to the twin and is voided (core.fix_stale_twin).
-- 5. api.admin_fix_stale_twins(p_dry): the matches already stuck. Each postponed sheet match (not called off for rain
--    by staff or the 15:00 rule) whose day has passed: with a twin (same tournament and time, players overlapping),
--    its open votes move to the twin (resolved at once against the twin's result if it has one) and it is voided;
--    without one, it is voided with its votes closed. Dry by default: it says what it would do. Not run here: staff
--    look at the dry run first.

create extension if not exists fuzzystrmatch with schema extensions;

-- ---------------------------------------------------------------------------
-- normalising
-- ---------------------------------------------------------------------------

-- Latin capitals that look Greek, inside a word with a Greek letter, become Greek («ΖΑΝNΗΣ» → «ΖΑΝΝΗΣ»); a Latin
-- word («BINJAKU») stays as it is
create or replace function core.fold_lookalikes(t text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select case when t is null then null else coalesce((
    select string_agg(case when x.m[1] ~ '[Ͱ-Ͽ]' then translate(x.m[1], 'ABEZHIKMNOPTYX', 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ') else x.m[1] end, '' order by x.n)
      from regexp_matches(t, '(\S+|\s+)', 'g') with ordinality as x(m, n)), '') end
$$;

-- a sheet person with its words folded
create or replace function core.fold_person(p jsonb)
returns jsonb
language sql immutable parallel safe set search_path = core, pg_temp
as $$
  select p || jsonb_strip_nulls(jsonb_build_object('surname', core.fold_lookalikes(p ->> 'surname'),
                                                   'first', core.fold_lookalikes(p ->> 'first'),
                                                   'raw', core.fold_lookalikes(p ->> 'raw')))
$$;

-- a category to compare: capitals, Greek look-alikes as Latin, no spaces, one kind of dash, no letter twice in a row
create or replace function core.norm_level(t text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(regexp_replace(translate(upper(coalesce(t, '')), 'ΜΕΝΧΑΟΤΡΙΔΚΒΗΖΥ−–—', 'MENXAOTPIDKBHZY---'), '\s+', '', 'g'),
                        '([A-Z])\1+', '\1', 'g')
$$;

-- two categories the same row could have: equal once normalised, or one edit apart («-40»/«-45», «MEDUIM»)
create or replace function core.level_close(a text, b text)
returns boolean
language sql immutable parallel safe set search_path = extensions, pg_temp
as $$
  select core.norm_level(a) = core.norm_level(b)
      or (length(core.norm_level(a)) >= 2 and levenshtein(core.norm_level(a), core.norm_level(b)) <= 1)
$$;

-- the tournament's event a written category means: the same name, else one it has under a typo (the same digits, at
-- most one letter off) in that format; null when it is new
create or replace function core.snap_event(p_tournament uuid, p_level text, p_format text)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select coalesce(
    (select id from core.tournament_events where tournament_id = p_tournament and name = p_level and format = p_format limit 1),
    (select min(e.id::text)::uuid from core.tournament_events e
      where e.tournament_id = p_tournament and e.format = p_format
        and (core.norm_level(e.name) = core.norm_level(p_level)
             or (regexp_replace(e.name, '\D', '', 'g') = regexp_replace(coalesce(p_level, ''), '\D', '', 'g')
                 and length(core.norm_level(p_level)) >= 4
                 and levenshtein(core.norm_level(e.name), core.norm_level(p_level)) <= 1))
     having count(*) = 1))
$$;

-- ---------------------------------------------------------------------------
-- comparing players
-- ---------------------------------------------------------------------------

-- one person on a row ({player_id?, surname, first}) and one roster player: the same player, or a surname one letter
-- off with first names that do not disagree
create or replace function core.same_person(p jsonb, p_player uuid)
returns boolean
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select coalesce((p ->> 'player_id')::uuid = p_player, false)
      or exists (select 1 from core.players pl
                  where pl.id = p_player
                    and length(pl.surname_norm) >= 5
                    and levenshtein(core.normalize_search(core.fold_lookalikes(p ->> 'surname')), pl.surname_norm) <= 1
                    and (coalesce(btrim(p ->> 'first'), '') = '' or pl.first_name_norm = ''
                         or core.first_alike(pl.first_name_norm, core.normalize_search(core.fold_lookalikes(p ->> 'first'))) >= 0.9))
$$;

-- a row's people against a match's players, side by side in the sheet's order:
-- {places: [{slot, player_id (the match's player it is, or null)}], full_sides, kept, total}
create or replace function core.lineup_match(p_match uuid, p_people jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_s      int;
  v_i      int;
  v_p      jsonb;
  v_old    uuid[];
  v_taken  uuid[];
  v_hit    uuid;
  v_places jsonb := '[]'::jsonb;
  v_full   int := 0;
  v_kept   int := 0;
  v_total  int := 0;
  v_side_n int;
  v_side_k int;
begin
  for v_s in 1..2 loop
    v_old := array(select player_id from core.match_participants where match_id = p_match and side = v_s order by position nulls last, player_id);
    v_taken := '{}';
    v_side_n := 0;
    v_side_k := 0;
    -- the same player first, then a typo, so a known player is never taken by a look-alike
    for v_i in 0 .. jsonb_array_length(coalesce(p_people -> ('side' || v_s), '[]'::jsonb)) - 1 loop
      v_p := p_people -> ('side' || v_s) -> v_i;
      v_side_n := v_side_n + 1;
      v_hit := (select o from unnest(v_old) o where o = nullif(v_p ->> 'player_id', '')::uuid and not (o = any (v_taken)) limit 1);
      if v_hit is not null then v_taken := v_taken || v_hit; end if;
      v_places := v_places || jsonb_build_array(jsonb_build_object('slot', v_s || ':' || v_i, 'player_id', v_hit));
    end loop;
    for v_i in 0 .. jsonb_array_length(v_places) - 1 loop
      if split_part(v_places -> v_i ->> 'slot', ':', 1)::int = v_s and v_places -> v_i ->> 'player_id' is null then
        v_p := p_people -> ('side' || v_s) -> split_part(v_places -> v_i ->> 'slot', ':', 2)::int;
        v_hit := (select o from unnest(v_old) o where not (o = any (v_taken)) and core.same_person(v_p, o) limit 1);
        if v_hit is not null then
          v_taken := v_taken || v_hit;
          v_places := jsonb_set(v_places, array[v_i::text], jsonb_build_object('slot', v_places -> v_i ->> 'slot', 'player_id', v_hit, 'typo', true));
        end if;
      end if;
    end loop;
    v_side_k := cardinality(v_taken);
    v_kept := v_kept + v_side_k;
    v_total := v_total + v_side_n;
    if v_side_n > 0 and v_side_k = v_side_n and v_side_n = cardinality(v_old) then v_full := v_full + 1; end if;
  end loop;
  return jsonb_build_object('places', v_places, 'full_sides', v_full, 'kept', v_kept, 'total', v_total,
                            'sides_kept', (select count(distinct split_part(x ->> 'slot', ':', 1)) from jsonb_array_elements(v_places) x
                                            where x ->> 'player_id' is not null));
end;
$$;

-- the people of a match as a row would write them
create or replace function core.match_people(p_match uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'side1', coalesce((select jsonb_agg(jsonb_build_object('player_id', pl.id, 'surname', pl.surname, 'first', pl.first_name) order by mp.position nulls last, pl.id)
                         from core.match_participants mp join core.players pl on pl.id = mp.player_id where mp.match_id = p_match and mp.side = 1), '[]'::jsonb),
    'side2', coalesce((select jsonb_agg(jsonb_build_object('player_id', pl.id, 'surname', pl.surname, 'first', pl.first_name) order by mp.position nulls last, pl.id)
                         from core.match_participants mp join core.players pl on pl.id = mp.player_id where mp.match_id = p_match and mp.side = 2), '[]'::jsonb))
$$;

-- enough overlap to be the same match: a whole side the same, or 3 of 4 in doubles
create or replace function core.lineup_same_match(p_lineup jsonb, p_format text)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_lineup ->> 'full_sides')::int >= 1 or (p_format <> 'singles' and (p_lineup ->> 'kept')::int >= 3)
$$;

-- ---------------------------------------------------------------------------
-- voiding a stale copy, moving its votes to its twin
-- ---------------------------------------------------------------------------

-- void a match that never got a result, the way admin_void_match does: status void, its votes close with no outcome
create or replace function core.void_stale_match(p_match uuid, p_note jsonb)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  update core.matches set status = 'void', updated_at = now(), provenance = provenance || p_note
   where id = p_match and status <> 'void';
  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match), 'resolve:' || p_match || ':void')
  on conflict (idempotency_key) do nothing;
end;
$$;

-- a missing match's twin: another live match of the tournament at the same time, a category close to it, players
-- overlapping (p_refs: only twins whose fingerprint is among these, e.g. the run's rows)
create or replace function core.find_twin(p_match uuid, p_refs text[] default null)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select t.id
    from core.matches m
    join core.matches t on t.tournament_id = m.tournament_id and t.starts_at = m.starts_at and t.id <> m.id
                       and t.status <> 'void' and t.format = m.format
    left join core.tournament_events em on em.id = m.event_id
    left join core.tournament_events et on et.id = t.event_id
   where m.id = p_match
     and (p_refs is null or t.source_ref = any (p_refs))
     and core.level_close(coalesce(em.name, ''), coalesce(et.name, ''))
     and core.lineup_same_match(core.lineup_match(m.id, core.match_people(t.id)), m.format)
   order by (t.resolved_at is not null) desc, t.created_at
   limit 1
$$;

-- a cast vote never changes; the one exception is an open match vote following its match to the twin that replaced
-- it (core.fix_stale_twin sets np.vote_move for that statement only), same user, same side
create or replace function core.votes_immutable()
returns trigger language plpgsql set search_path = pg_temp
as $$
begin
  if new.user_id <> old.user_id or new.subject_type <> old.subject_type
     or (new.subject_id <> old.subject_id
         and not (coalesce(current_setting('np.vote_move', true), '') = 'on' and old.subject_type = 'match' and old.resolved_at is null))
     or new.option <> old.option or new.created_at <> old.created_at then
    raise exception 'votes are immutable once cast' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- the stale copy's open votes go to its twin (a voter who has one there keeps that one), then the copy is voided
-- (what is left on it closes with no points); a twin already resolved settles the moved votes at once
create or replace function core.fix_stale_twin(p_stale uuid, p_twin uuid)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_moved int;
begin
  perform set_config('np.vote_move', 'on', true);
  update core.votes v set subject_id = p_twin
   where v.subject_type = 'match' and v.subject_id = p_stale and v.resolved_at is null
     and not exists (select 1 from core.votes o where o.subject_type = 'match' and o.subject_id = p_twin and o.user_id = v.user_id);
  get diagnostics v_moved = row_count;
  perform set_config('np.vote_move', '', true);
  perform core.void_stale_match(p_stale, jsonb_build_object('replaced_by', p_twin, 'replaced_at', now(), 'votes_moved', v_moved));
  if v_moved > 0 and exists (select 1 from core.matches where id = p_twin and resolved_at is not null) then
    insert into core.outbox (kind, payload, idempotency_key)
    values ('resolve_match', jsonb_build_object('match_id', p_twin), 'resolve:' || p_twin || ':twin:' || p_stale)
    on conflict (idempotency_key) do nothing;
  end if;
  return v_moved;
end;
$$;

-- ---------------------------------------------------------------------------
-- missing: postponed only when nothing took the slot (20261215000000_m4_postponed.sql otherwise)
-- ---------------------------------------------------------------------------
create or replace function core.ingest_missing(p_tournament_id uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_seen  text[] := array(select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x);
  v_id    uuid;
  v_twin  uuid;
  v_miss  int := 0;
  v_void  int := 0;
  v_post  int := 0;
  v_repl  int := 0;
begin
  update core.matches set provenance = provenance - 'missing_runs'
   where tournament_id = p_tournament_id and source = 'import' and source_ref = any (v_seen) and provenance ? 'missing_runs';
  for v_id in
    update core.matches m
       set provenance = provenance || jsonb_build_object('missing_runs', coalesce((provenance ->> 'missing_runs')::int, 0) + 1)
     where m.tournament_id = p_tournament_id and m.source = 'import' and m.status in ('announced', 'scheduled')
       and m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = m.id)
       and m.starts_at >= now() - interval '1 day' and m.postponed_at is null
       and not (m.source_ref = any (v_seen))
    returning m.id
  loop
    v_miss := v_miss + 1;
  end loop;
  -- missing twice in a row: if the sheet's row for that slot is another match now (an edit the identity check could
  -- not follow), the votes go there and this copy is voided; else postponed (rain, a moved day), keeping its votes
  for v_id in
    select id from core.matches
     where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
       and coalesce((provenance ->> 'missing_runs')::int, 0) >= 2 and postponed_at is null
  loop
    v_twin := core.find_twin(v_id, v_seen);
    if v_twin is not null then
      perform core.fix_stale_twin(v_id, v_twin);
      v_repl := v_repl + 1;
    else
      update core.matches set postponed_at = now() where id = v_id;
      v_post := v_post + 1;
    end if;
  end loop;
  -- postponed three weeks and never back: cancelled
  for v_id in
    select id from core.matches
     where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
       and postponed_at is not null and postponed_at < now() - interval '21 days'
  loop
    update core.matches set status = 'void', updated_at = now(),
                            provenance = provenance || jsonb_build_object('cancelled_at', now())
     where id = v_id;
    insert into core.outbox (kind, payload, idempotency_key)
    values ('resolve_match', jsonb_build_object('match_id', v_id), 'resolve:' || v_id || ':void')
    on conflict (idempotency_key) do nothing;
    v_void := v_void + 1;
  end loop;
  return jsonb_build_object('missing', v_miss, 'postponed', v_post, 'cancelled', v_void, 'replaced', v_repl);
end;
$$;
revoke all on function core.ingest_missing(uuid, jsonb) from public;

-- ---------------------------------------------------------------------------
-- the ones already stuck
-- ---------------------------------------------------------------------------
create or replace function api.admin_fix_stale_twins(p_dry boolean default true, p_tournament uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v       record;
  v_twin  uuid;
  v_with  jsonb := '[]'::jsonb;
  v_none  jsonb := '[]'::jsonb;
  v_votes int := 0;
  v_moved int := 0;
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  for v in
    select m.id, m.tournament_id, m.starts_at,
           (select count(*)::int from core.votes x where x.subject_type = 'match' and x.subject_id = m.id and x.resolved_at is null) as votes
      from core.matches m
     where m.source = 'import' and m.status in ('announced', 'scheduled') and m.postponed_at is not null
       and coalesce(m.provenance ->> 'postponed_by', '') = ''
       -- only what the «missing twice» rule postponed: a row the sheet itself marks «αναβολή» stays as it is
       and coalesce((m.provenance ->> 'missing_runs')::int, 0) >= 2
       and m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = m.id)
       and m.starts_at < now()
       and (p_tournament is null or m.tournament_id = p_tournament)
     order by m.starts_at
  loop
    v_twin := core.find_twin(v.id);
    v_votes := v_votes + v.votes;
    if v_twin is not null then
      v_with := v_with || jsonb_build_array(jsonb_build_object('match_id', v.id, 'twin', v_twin, 'starts_at', v.starts_at, 'open_votes', v.votes));
      if not p_dry then v_moved := v_moved + core.fix_stale_twin(v.id, v_twin); end if;
    else
      v_none := v_none || jsonb_build_array(jsonb_build_object('match_id', v.id, 'starts_at', v.starts_at, 'open_votes', v.votes));
      if not p_dry then
        perform core.void_stale_match(v.id, jsonb_build_object('stale_voided_at', now(), 'stale_voided_by', auth.uid()));
      end if;
    end if;
  end loop;
  return jsonb_build_object('dry', p_dry, 'with_twin', jsonb_array_length(v_with), 'without_twin', jsonb_array_length(v_none),
                            'open_votes', v_votes, 'votes_moved', v_moved, 'twins', v_with, 'alone', v_none);
end;
$$;
revoke all on function api.admin_fix_stale_twins(boolean, uuid) from public, anon;
grant execute on function api.admin_fix_stale_twins(boolean, uuid) to authenticated, service_role;

revoke all on function core.lineup_match(uuid, jsonb) from public;
revoke all on function core.match_people(uuid) from public;
revoke all on function core.same_person(jsonb, uuid) from public;
revoke all on function core.void_stale_match(uuid, jsonb) from public;
revoke all on function core.find_twin(uuid, text[]) from public;
revoke all on function core.fix_stale_twin(uuid, uuid) from public;
revoke all on function core.snap_event(uuid, text, text) from public;

-- a row's people for comparing with a match: each place with its player when linked, and the sheet's spelling
create or replace function core.ingest_row_people(p_row jsonb, p_sides jsonb)
returns jsonb
language sql immutable set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'side1', coalesce((select jsonb_agg((core.fold_person(coalesce(p_row -> 'side1' -> (y.i::int - 1), '{}'::jsonb)) - 'player_id')
                                        || jsonb_strip_nulls(jsonb_build_object('player_id', y.x ->> 'player_id')) order by y.i)
                         from jsonb_array_elements(coalesce(p_sides -> 'side1', '[]'::jsonb)) with ordinality y(x, i)), '[]'::jsonb),
    'side2', coalesce((select jsonb_agg((core.fold_person(coalesce(p_row -> 'side2' -> (y.i::int - 1), '{}'::jsonb)) - 'player_id')
                                        || jsonb_strip_nulls(jsonb_build_object('player_id', y.x ->> 'player_id')) order by y.i)
                         from jsonb_array_elements(coalesce(p_sides -> 'side2', '[]'::jsonb)) with ordinality y(x, i)), '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- the write path: a row keeps its match through an edit (20270215000000_ingest_smart_names.sql otherwise)
-- ---------------------------------------------------------------------------
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
  v_key     text;
  v_fresh   boolean;
  v_used    text[];
  v_moved   int := 0;
  v_attached int := 0;
  v_conflict int := 0;
  v_club    uuid;
  v_smart   jsonb;
  v_picks   jsonb;
  v_hold    jsonb;
  v_pick    jsonb;
  v_auto    jsonb := '{}'::jsonb;
  v_recat   int := 0;
  v_people_j jsonb;
  v_cand    uuid;
  v_twin    uuid;
  v_lu      jsonb;
  v_place   jsonb;
  v_newp    uuid;
  v_oldp    uuid;
  v_changed jsonb;
  v_typos   jsonb;
  v_relink  int := 0;
  v_replace int := 0;
  v_ename   text;
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_known := core.ingest_match_by_ref(r ->> 'fingerprint', p_tournament_id) is not null;
    v_picks := '[]'::jsonb;

    -- resolve the people the desk did not decide; an unclear one near an active user holds the row for review
    v_sides := jsonb_build_object('side1', r -> 'side1', 'side2', r -> 'side2');
    v_unclear := '[]'::jsonb;
    v_used := array(select x ->> 'player_id' from jsonb_array_elements(coalesce(r -> 'side1', '[]'::jsonb) || coalesce(r -> 'side2', '[]'::jsonb)) x
                     where x ? 'player_id');
    if not v_known then
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(r -> ('side' || v_side)) loop
          if v_person ? 'player_id' or v_person ? 'new' then
            null;
          else
            -- Latin look-alikes inside a Greek name are Greek («ΖΑΝNΗΣ»)
            v_person := core.fold_person(v_person);
            v_dec := core.ingest_person(v_person, p_tournament_id);
            if v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') and (v_dec ->> 'player_id') = any (v_used) then
              -- two people on one row cannot be the same player (brothers with initials): staff decide
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('slot', v_side || ':' || v_pos, 'candidates', core.ingest_candidates(v_person)));
            elsif v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') then
              v_used := v_used || (v_dec ->> 'player_id');
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('player_id', v_dec ->> 'player_id', 'raw', v_person ->> 'raw'));
              v_linked := v_linked + 1;
            elsif v_dec ->> 'how' = 'new' then
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('new', jsonb_build_object('surname', v_person ->> 'surname', 'first', v_person ->> 'first'),
                                                      'raw', v_person ->> 'raw'));
            else
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('slot', v_side || ':' || v_pos, 'candidates', v_dec -> 'candidates'));
            end if;
          end if;
          v_pos := v_pos + 1;
        end loop;
      end loop;
      -- the safe rules first (brothers, a known pair, the only one who played this category); never more
      v_picks := '[]'::jsonb;
      if jsonb_array_length(v_unclear) > 0 then
        v_smart := core.ingest_smart_names(p_tournament_id, r, v_sides, v_unclear);
        v_sides := v_smart -> 'sides';
        v_unclear := v_smart -> 'unclear';
        v_picks := v_smart -> 'picks';
      end if;
      if jsonb_array_length(v_unclear) > 0 then
        -- held: what a rule decided stays decided on the card; each name left gets its candidates with context
        v_hold := r;
        for v_pick in select * from jsonb_array_elements(v_picks) loop
          v_hold := jsonb_set(v_hold, array['side' || split_part(v_pick ->> 'slot', ':', 1), split_part(v_pick ->> 'slot', ':', 2)],
                              v_sides -> ('side' || split_part(v_pick ->> 'slot', ':', 1)) -> split_part(v_pick ->> 'slot', ':', 2)::int);
        end loop;
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
        values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
                jsonb_build_object('row', v_hold, 'unclear', core.ingest_enrich_unclear(p_tournament_id, r, v_sides, v_unclear)))
        on conflict (tournament_id, kind, fingerprint) where status = 'open'
        do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
        v_held := v_held + 1;
        continue;
      end if;
      for v_pick in select * from jsonb_array_elements(v_picks) loop
        v_auto := jsonb_set(v_auto, array[v_pick ->> 'rule'], to_jsonb(coalesce((v_auto ->> (v_pick ->> 'rule'))::int, 0) + 1));
        v_linked := v_linked + 1;
      end loop;
      if jsonb_array_length(v_picks) > 0 then
        -- the decision this row waited for was taken by a rule: it leaves the list, saying which
        update core.ingest_reviews
           set status = 'done', resolved_at = now(), updated_at = now(), payload = payload || jsonb_build_object('auto', v_picks)
         where tournament_id = p_tournament_id and kind = 'people' and fingerprint = r ->> 'fingerprint' and status = 'open';
      end if;
    end if;

    v_format := case r ->> 'discipline' when 'XD' then 'mixed' when 'MD' then 'doubles' when 'WD' then 'doubles' else 'singles' end;
    v_gender := case r ->> 'discipline' when 'XD' then 'mixed' when 'WS' then 'f' when 'WD' then 'f' else 'm' end;
    v_starts := ((r ->> 'date')::date + coalesce(nullif(r ->> 'time', '')::time, time '00:00')) at time zone 'Europe/Athens';

    -- the event is the organiser's category (level) in its format
    -- (a typo of one it already has, «MMEDIUM», is that one)
    v_event := core.snap_event(p_tournament_id, coalesce(r ->> 'level', 'OPEN'), v_format);
    if v_event is null then
      insert into core.tournament_events (tournament_id, name, format, gender)
      values (p_tournament_id, coalesce(r ->> 'level', 'OPEN'), v_format, v_gender) returning id into v_event;
    end if;

    v_m := null;
    v_fresh := false;
    select * into v_m from core.matches where id = core.ingest_match_by_ref(r ->> 'fingerprint', p_tournament_id);
    if v_m.id is null then
      v_key := core.ingest_row_key(v_sides);
      if v_key is not null then
        -- moved: the same people in the same category, still to play, under another day's fingerprint the sheet
        -- no longer has; it takes the new day and fingerprint, votes carry over
        select * into v_m from core.matches m
         where m.tournament_id = p_tournament_id and m.source = 'import' and m.event_id = v_event
           and m.status in ('announced', 'scheduled') and m.resolved_at is null
           and not exists (select 1 from core.match_results x where x.match_id = m.id)
           and core.match_people_key(m.id) = v_key
           and abs(extract(epoch from m.starts_at - v_starts)) < 21 * 86400
           and m.source_ref not in (select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x)
         order by abs(extract(epoch from m.starts_at - v_starts))
         limit 1;
        if v_m.id is not null then
          update core.matches
             set starts_at = v_starts, source_ref = r ->> 'fingerprint', updated_at = now(), postponed_at = null,
                 provenance = provenance - 'missing_runs' || jsonb_build_object('moved_from', v_m.source_ref, 'moved_at', now(),
                                                                                'moved_from_at', v_m.starts_at,
                                                                                'tab', r ->> 'tab', 'row', r -> 'row')
           where id = v_m.id returning * into v_m;
          v_moved := v_moved + 1;
          v_fresh := true;
        else
          -- a match a player logged: the same people, format and day (a day either way); the sheet becomes its
          -- official source, no second match
          select * into v_m from core.matches m
           where m.source = 'user' and m.status <> 'void' and m.format = v_format and m.source_ref is null
             and m.starts_at is not null
             and core.athens_day(m.starts_at) between (r ->> 'date')::date - 1 and (r ->> 'date')::date + 1
             and core.match_people_key(m.id) = v_key
           order by m.created_at
           limit 1;
          if v_m.id is not null then
            update core.matches
               set tournament_id = p_tournament_id, event_id = v_event, source_ref = r ->> 'fingerprint', updated_at = now(),
                   provenance = provenance || jsonb_build_object('official', jsonb_build_object(
                                  'tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                  'level', r ->> 'level', 'discipline', r ->> 'discipline', 'attached_at', now(), 'run_id', p_run))
             where id = v_m.id returning * into v_m;
            v_attached := v_attached + 1;
            v_fresh := true;
          end if;
        end if;
      end if;
      if v_m.id is null then
        -- the organiser edited the row (a substitute, a category or name typo): the match at the same time with
        -- these players is this row, not a new one
        v_people_j := core.ingest_row_people(r, v_sides);
        v_twin := null;
        for v_cand in
          select m.id from core.matches m left join core.tournament_events e on e.id = m.event_id
           where m.tournament_id = p_tournament_id and m.source = 'import' and m.status <> 'void'
             and m.starts_at = v_starts and m.format = v_format
             and (m.court is null or nullif(btrim(r ->> 'court'), '') is null or m.court = btrim(r ->> 'court'))
             and core.level_close(coalesce(e.name, m.provenance ->> 'level', ''), coalesce(r ->> 'level', 'OPEN'))
             and m.source_ref not in (select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x)
           order by m.created_at
        loop
          v_lu := core.lineup_match(v_cand, v_people_j);
          -- a match with a result takes the row only when everyone is the same (a new spelling or category of a
          -- played match, never a second copy of it); its players are never changed
          if core.lineup_same_match(v_lu, v_format)
             and ((v_lu ->> 'kept')::int = (v_lu ->> 'total')::int
                  and (v_lu ->> 'total')::int = (select count(*) from core.match_participants where match_id = v_cand)
                  or (not exists (select 1 from core.match_results x where x.match_id = v_cand)
                      and (select resolved_at is null and status in ('announced', 'scheduled') from core.matches where id = v_cand))) then
            v_twin := v_cand;
            exit;
          end if;
        end loop;
        if v_twin is not null then
          if ((v_lu ->> 'kept')::int = (v_lu ->> 'total')::int
              and (v_lu ->> 'total')::int = (select count(*) from core.match_participants where match_id = v_twin))
             or (v_format <> 'singles' and (v_lu ->> 'sides_kept')::int = 2) then
            -- everyone is still there, or one partner changed on a side that keeps someone: the same match, its
            -- votes stay
            v_changed := '[]'::jsonb;
            for v_place in select * from jsonb_array_elements(v_lu -> 'places') loop
              if v_place ->> 'player_id' is null then
                v_side := split_part(v_place ->> 'slot', ':', 1)::int;
                v_oldp := (select mp.player_id from core.match_participants mp
                            where mp.match_id = v_twin and mp.side = v_side
                              and mp.player_id not in (select (x ->> 'player_id')::uuid from jsonb_array_elements(v_lu -> 'places') x
                                                        where x ->> 'player_id' is not null)
                            limit 1);
                v_newp := core.import_person(v_sides -> ('side' || v_side) -> split_part(v_place ->> 'slot', ':', 2)::int, p_by);
                update core.match_participants set player_id = v_newp where match_id = v_twin and side = v_side and player_id = v_oldp;
                v_changed := v_changed || jsonb_build_array(jsonb_build_object('slot', v_place ->> 'slot', 'from', v_oldp, 'to', v_newp));
              end if;
            end loop;
            v_typos := (select coalesce(jsonb_agg(x ->> 'slot'), '[]'::jsonb) from jsonb_array_elements(v_lu -> 'places') x where (x ->> 'typo')::boolean);
            select e.name into v_ename from core.matches m left join core.tournament_events e on e.id = m.event_id where m.id = v_twin;
            update core.matches
               set source_ref = r ->> 'fingerprint', event_id = v_event, updated_at = now(), postponed_at = null,
                   provenance = (provenance - 'missing_runs') || jsonb_build_object('level', r ->> 'level', 'row_identity', jsonb_strip_nulls(jsonb_build_object(
                                  'from_ref', source_ref, 'at', now(), 'run_id', p_run,
                                  'lineup_changed', case when jsonb_array_length(v_changed) > 0 then v_changed end,
                                  'name_typo', case when jsonb_array_length(v_typos) > 0 then v_typos end,
                                  'category_changed', case when event_id is distinct from v_event
                                                           then jsonb_build_object('from', v_ename, 'to', r ->> 'level') end)))
             where id = v_twin returning * into v_m;
            v_relink := v_relink + 1;
            v_fresh := true;
          else
            -- a singles player or a whole side changed: another match; the old one is voided (its votes close with
            -- no points) and this row makes a new one people can vote on
            perform core.void_stale_match(v_twin, jsonb_build_object('replaced_by_ref', r ->> 'fingerprint', 'replaced_at', now(),
                                                                     'reason', 'lineup_changed'));
            v_replace := v_replace + 1;
          end if;
        end if;
      end if;
    end if;
    if v_fresh then
      null;  -- just moved or attached above
    elsif v_m.id is not null then
      -- a known match: follow the sheet's time while it is still to play; the sheet may say it is off for now
      if v_m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
        if coalesce((r ->> 'postponed')::boolean, false) then
          update core.matches set starts_at = v_starts, postponed_at = coalesce(postponed_at, now()) where id = v_m.id;
        elsif v_m.postponed_at is not null and v_m.provenance ->> 'postponed_by' in ('staff', 'auto') and v_m.starts_at = v_starts then
          null;  -- called off for rain (by staff, or by the 15:00 rule) and the sheet still shows the old day: it stays off until the sheet moves it
        else
          update core.matches set starts_at = v_starts, postponed_at = null, provenance = provenance - 'postponed_by'
           where id = v_m.id and (starts_at is distinct from v_starts or postponed_at is not null);
        end if;
      end if;
      -- the draw sheet put this row in another category (packages/ingest, level_from_draw): the match moves there
      if coalesce(r -> 'flags', '[]'::jsonb) ? 'level_from_draw' and v_m.event_id is distinct from v_event then
        update core.matches
           set event_id = v_event, updated_at = now(),
               provenance = provenance || jsonb_build_object('level', r ->> 'level', 'recategorised',
                              jsonb_build_object('from_event', v_m.event_id, 'from_level', v_m.provenance ->> 'level', 'at', now(), 'run_id', p_run))
         where id = v_m.id;
        v_recat := v_recat + 1;
      end if;
      v_upd := v_upd + 1;
    elsif exists (select 1 from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x
                   where not (x ? 'player_id')
                     and coalesce(btrim(x -> 'new' ->> 'surname'), '') = '') then
      -- a place on the card with no name we can use (an empty cell, a «/» with nobody after it): one row like this
      -- stopped the whole tournament's run (15 Oct, ΑΟΚ: «person_unresolved»). It waits for staff instead, showing
      -- what the sheet says; every other row goes on.
      insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
      values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
              jsonb_build_object('row', r, 'unclear', (
                select coalesce(jsonb_agg(x || jsonb_build_object('candidates', '[]'::jsonb, 'reason', 'no_name')), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x
                 where not (x ? 'player_id') and coalesce(btrim(x -> 'new' ->> 'surname'), '') = '')))
      on conflict (tournament_id, kind, fingerprint) where status = 'open'
      do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
      v_held := v_held + 1;
    elsif jsonb_array_length(coalesce(v_sides -> 'side1', '[]'::jsonb)) <> (case v_format when 'singles' then 1 else 2 end)
       or jsonb_array_length(coalesce(v_sides -> 'side2', '[]'::jsonb)) <> (case v_format when 'singles' then 1 else 2 end) then
      -- a side that does not fit the format (16 Oct, ΑΟΚ: «match_sides_incomplete»): held with the sheet's words
      insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
      values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
              jsonb_build_object('row', r, 'unclear', (
                select coalesce(jsonb_agg(x || jsonb_build_object('candidates', '[]'::jsonb, 'reason', 'side_incomplete')), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x)))
      on conflict (tournament_id, kind, fingerprint) where status = 'open'
      do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
      v_held := v_held + 1;
    else
      insert into core.matches (sport_id, format, status, starts_at, venue, area_id, tournament_id, event_id,
                                source, source_ref, counts_for_levels, provenance, club_id, court)
      values (v_t.sport_id, v_format, 'scheduled', v_starts, coalesce(nullif(btrim(r ->> 'club'), ''), v_t.venue), v_t.area_id, p_tournament_id, v_event,
              'import', r ->> 'fingerprint', true,
              jsonb_build_object('tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                 'level', r ->> 'level', 'discipline', r ->> 'discipline', 'flags', r -> 'flags',
                                 'imported_by', p_by, 'imported_at', now(), 'run_id', p_run)
              || case when jsonb_array_length(v_picks) > 0 then jsonb_build_object('smart_names', v_picks) else '{}'::jsonb end,
              core.club_for(r ->> 'club'), nullif(btrim(r ->> 'court'), ''))
      returning * into v_m;
      if coalesce((r ->> 'postponed')::boolean, false) then
        update core.matches set postponed_at = now() where id = v_m.id;
      end if;
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

    -- the source names the club and court (athenstennis.gr): the club decides the surface
    v_club := core.club_for(r ->> 'club');
    if v_club is not null then
      update core.matches set club_id = v_club, court = coalesce(nullif(btrim(r ->> 'court'), ''), court),
                              venue = btrim(r ->> 'club')
       where id = v_m.id and (club_id is distinct from v_club or court is distinct from coalesce(nullif(btrim(r ->> 'court'), ''), court));
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
      elsif v_m.source = 'user' then
        -- the organiser's score differs from what the players settled: staff decide (corrections of a resolved
        -- match go through the moderation desk)
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, match_id, payload)
        values (p_tournament_id, p_run, 'score_conflict', r ->> 'fingerprint', v_m.id, jsonb_build_object('row', r))
        on conflict (tournament_id, kind, fingerprint) where status = 'open' do nothing;
        if found then v_conflict := v_conflict + 1; end if;
      else
        v_skip := v_skip + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_new, 'updated', v_upd, 'results', v_res, 'results_skipped', v_skip,
                            'new_players', (select count(*) from core.players) - v_people,
                            'linked', v_linked, 'held_for_review', v_held, 'walkovers_to_decide', v_wo,
                            'moved', v_moved, 'attached', v_attached, 'score_conflicts', v_conflict,
                            'auto_brothers', coalesce((v_auto ->> 'brothers')::int, 0),
                            'auto_pair', coalesce((v_auto ->> 'known_pair')::int, 0),
                            'auto_category', coalesce((v_auto ->> 'category')::int, 0),
                            'recategorised', v_recat, 'relinked', v_relink, 'replaced', v_replace);
end;
$$;
revoke all on function core.ingest_apply(uuid, jsonb, uuid, uuid) from public;
