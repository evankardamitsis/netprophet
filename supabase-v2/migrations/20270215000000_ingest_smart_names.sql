-- Smarter names for organiser sheets (founder, 18 Oct 2026: «we have brothers playing together so I need to know which
-- is which, and you gave me multiple times the same names in wrong categories»). Sheets often give surnames only, so a
-- doubles side «ΧΑΜΑΜΗΣ ΧΑΜΑΜΗΣ» or «ΣΑΡΙΔΑΚΗΣ ΣΑΡΙΔΑΚΗΣ» was held with the same blind list on both places. Now:
--
-- 1. Three safe rules resolve a held name before it reaches staff, and nothing beyond them is guessed:
--    brothers   a doubles side with the same surname twice (no first names) where exactly two roster players carry it,
--               neither hidden nor a minor: one each (order does not matter in doubles);
--    known_pair the side's names fit exactly one pair of roster players who have played together as partners;
--    category   one unclear name where exactly one candidate has played this category (level) before.
--    The rule goes into the match's provenance (smart_names) and the run report (auto_brothers, auto_pair,
--    auto_category). A spelling a rule decided is never remembered as an alias (it would decide the next row blindly).
-- 2. A held name shows each candidate with context, best first: the categories they played (with counts), their last
--    match, usual partners, area; ranked up for the same category, this tournament, or the partner/opponent named on
--    the row; down when they only played other categories; a minor is never a candidate.
-- 3. Two candidates with one surname where one first name starts the other («Θαν»/«Θάνος», «Α.»/«Αγγ.») and one of
--    them has no matches: flagged likely_duplicate_of, for the merge on the card.
-- 4. A bare surname that two or more players carry is no longer an alias: one staff decision on «ΧΑΜΑΜΗΣ» used to send
--    every later «ΧΑΜΑΜΗΣ», in any category, to the same brother. Such aliases already stored are removed.
-- 5. core.ingest_rerun_reviews / api.admin_rerun_ingest_reviews run the open decisions through the new rules (also once
--    below), so the rows waiting today resolve without staff where a rule applies.
-- 6. A row whose level the draw sheet corrected (flag level_from_draw, packages/ingest) moves an already imported
--    match to the right category in place: same fingerprint, no second match.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- a first name for prefix checks: lower case, no accents, letters only («Αγγ.» → «αγγ»)
create or replace function core.fold_first(t text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(translate(lower(coalesce(t, '')),
           'άέήίόύώϊϋΐΰςàáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
           'αεηιουωιυιυσaaaaaaceeeeiiiinooooouuuuyy'), '[^[:alpha:]]', '', 'g')
$$;

-- the gender a discipline plays in (null for mixed or unknown)
create or replace function core.discipline_gender(p_discipline text)
returns text
language sql immutable parallel safe set search_path = ''
as $$ select case p_discipline when 'MS' then 'm' when 'MD' then 'm' when 'WS' then 'f' when 'WD' then 'f' end $$;

-- the roster players a sheet person can be for the rules: a surname alone means everyone with exactly that surname;
-- with a first name, the matcher's near-certain candidates. Never hidden, never a minor, never the other gender.
create or replace function core.ingest_pool(p jsonb, p_gender text)
returns uuid[]
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select case
    when coalesce(btrim(p ->> 'first'), '') = '' then
      array(select pl.id from core.players pl
             where pl.surname_norm = core.normalize_search(coalesce(p ->> 'surname', '')) and pl.surname_norm <> ''
               and pl.status = 'active' and not pl.hidden and not pl.is_minor
               and (p_gender is null or pl.gender is null or pl.gender = p_gender)
             order by pl.id)
    else
      array(select pl.id from jsonb_array_elements(core.ingest_candidates(p)) c join core.players pl on pl.id = (c ->> 'id')::uuid
             where (c ->> 'score')::numeric >= 0.8 and pl.status = 'active' and not pl.hidden and not pl.is_minor
               and (p_gender is null or pl.gender is null or pl.gender = p_gender)
             order by pl.id)
  end
$$;

-- how often two players were partners (one side of one match that was not voided)
create or replace function core.played_together(p_a uuid, p_b uuid)
returns int
language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int
    from core.match_participants a
    join core.match_participants b on b.match_id = a.match_id and b.side = a.side and b.player_id = p_b
    join core.matches m on m.id = a.match_id
   where a.player_id = p_a and m.status <> 'void'
$$;

-- how many matches (not voided) a player played in a category
create or replace function core.played_level(p_player uuid, p_level text)
returns int
language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int
    from core.match_participants mp join core.matches m on m.id = mp.match_id
    left join core.tournament_events e on e.id = m.event_id
   where mp.player_id = p_player and m.status <> 'void'
     and upper(btrim(coalesce(e.name, m.provenance ->> 'level', ''))) = upper(btrim(coalesce(p_level, '')))
     and btrim(coalesce(p_level, '')) <> ''
$$;

-- a junior category («U14», «Κ12», «ΠΑΙΔΩΝ», «JUNIOR»)
create or replace function core.junior_level(p_level text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$ select upper(coalesce(p_level, '')) ~ '(^|\s)(U|Κ|K)\s?\d{1,2}(\s|$)|JUNIOR|ΠΑΙΔ|ΕΦΗΒ|ΚΟΡΑΣ|ΠΑΓΚΟΡ|ΠΑΜΠΑΙΔ' $$;

-- ---------------------------------------------------------------------------
-- context for a candidate on a held name
-- ---------------------------------------------------------------------------
create or replace function core.ingest_candidate_context(p_player uuid, p_tournament uuid, p_level text,
                                                         p_with uuid[] default '{}', p_against uuid[] default '{}')
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with mine as (
    select m.id, m.starts_at, m.tournament_id, mp.side,
           nullif(btrim(coalesce(e.name, m.provenance ->> 'level', '')), '') as lvl
      from core.match_participants mp join core.matches m on m.id = mp.match_id
      left join core.tournament_events e on e.id = m.event_id
     where mp.player_id = p_player and m.status <> 'void'
  )
  select jsonb_build_object(
    'matches', (select count(*) from mine),
    'last_match', (select core.athens_day(max(starts_at)) from mine),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('name', x.lvl, 'n', x.n) order by x.n desc, x.lvl), '[]'::jsonb)
                     from (select lvl, count(*)::int n from mine where lvl is not null group by lvl order by count(*) desc, lvl limit 5) x),
    'partners', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'n', x.n) order by x.n desc, x.name), '[]'::jsonb)
                   from (select pl.id, btrim(pl.first_name || ' ' || pl.surname) as name, count(*)::int n
                           from mine join core.match_participants o on o.match_id = mine.id and o.side = mine.side and o.player_id <> p_player
                           join core.players pl on pl.id = o.player_id
                          group by pl.id, pl.first_name, pl.surname order by count(*) desc limit 3) x),
    'same_category', (select count(*) from mine where upper(lvl) = upper(btrim(coalesce(p_level, '')))),
    'same_tournament', (select count(*) from mine where tournament_id = p_tournament),
    'with_named', (select count(*) from mine join core.match_participants o on o.match_id = mine.id and o.side = mine.side
                    where o.player_id = any (coalesce(p_with, '{}'))),
    'against_named', (select count(*) from mine join core.match_participants o on o.match_id = mine.id and o.side <> mine.side
                       where o.player_id = any (coalesce(p_against, '{}'))),
    'junior_only', coalesce((select bool_and(core.junior_level(lvl)) from mine where lvl is not null), false)
  )
$$;

-- the candidates of each held name, with context, ranked best first, likely duplicates flagged
create or replace function core.ingest_enrich_unclear(p_tournament uuid, p_row jsonb, p_sides jsonb, p_unclear jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  u       jsonb;
  v_out   jsonb := '[]'::jsonb;
  v_side  int;
  v_with  uuid[];
  v_vs    uuid[];
  v_level text := upper(btrim(coalesce(p_row ->> 'level', 'OPEN')));
  v_cands jsonb;
begin
  for u in select * from jsonb_array_elements(coalesce(p_unclear, '[]'::jsonb)) loop
    if u ? 'reason' or not (u ? 'slot') then
      v_out := v_out || jsonb_build_array(u);
      continue;
    end if;
    v_side := split_part(u ->> 'slot', ':', 1)::int;
    v_with := array(select (x ->> 'player_id')::uuid from jsonb_array_elements(coalesce(p_sides -> ('side' || v_side), '[]'::jsonb)) x where x ? 'player_id');
    v_vs := array(select (x ->> 'player_id')::uuid from jsonb_array_elements(coalesce(p_sides -> ('side' || (3 - v_side)), '[]'::jsonb)) x where x ? 'player_id');
    with base as (
      -- the matcher's candidates, and for a surname alone everyone who carries it
      select (c ->> 'id')::uuid as id, (c ->> 'score')::numeric as score
        from jsonb_array_elements(coalesce(u -> 'candidates', '[]'::jsonb)) c
      union all
      select pl.id, 0.85
        from core.players pl
       where coalesce(btrim(u ->> 'first'), '') = ''
         and pl.surname_norm = core.normalize_search(coalesce(u ->> 'surname', '')) and pl.surname_norm <> ''
         and pl.status = 'active' and not pl.hidden
    ), uniq as (
      select id, max(score) as score from base group by id
    ), ctx as (
      select pl.id, pl.first_name, pl.surname, pl.area_id, pl.surname_norm, core.fold_first(pl.first_name) as ff, uniq.score,
             core.ingest_candidate_context(pl.id, p_tournament, v_level, v_with, v_vs) as c
        from uniq join core.players pl on pl.id = uniq.id
       where pl.status = 'active' and not pl.hidden and not pl.is_minor
    ), ranked as (
      select ctx.*,
             round((score
               + case when (c ->> 'same_category')::int > 0 then 0.3 else 0 end
               + case when (c ->> 'same_tournament')::int > 0 then 0.1 else 0 end
               + case when (c ->> 'with_named')::int > 0 then 0.25 else 0 end
               + case when (c ->> 'against_named')::int > 0 then 0.05 else 0 end
               - case when (c ->> 'matches')::int > 0 and (c ->> 'same_category')::int = 0 then 0.1 else 0 end
               - case when (c ->> 'junior_only')::boolean then 1 else 0 end)::numeric, 2) as rank,
             array_remove(array[
               case when (c ->> 'same_category')::int > 0 then 'same_category' end,
               case when (c ->> 'same_tournament')::int > 0 then 'same_tournament' end,
               case when (c ->> 'with_named')::int > 0 then 'with_partner' end,
               case when (c ->> 'against_named')::int > 0 then 'against_opponent' end,
               case when (c ->> 'matches')::int > 0 and (c ->> 'same_category')::int = 0 then 'other_categories' end,
               case when (c ->> 'matches')::int = 0 then 'no_matches' end,
               case when (c ->> 'junior_only')::boolean then 'junior' end], null) as why
        from ctx
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id, 'first_name', r.first_name, 'surname', r.surname, 'area_id', r.area_id,
             'score', round(r.score, 2), 'rank', r.rank, 'why', to_jsonb(r.why),
             'matches', (r.c ->> 'matches')::int, 'last_match', r.c -> 'last_match', 'categories', r.c -> 'categories',
             'partners', r.c -> 'partners', 'same_category', (r.c ->> 'same_category')::int,
             'likely_duplicate_of', (
               select o.id from ranked o
                where o.id <> r.id and o.surname_norm = r.surname_norm and (r.c ->> 'matches')::int = 0
                  and r.ff <> '' and o.ff <> '' and (o.ff like r.ff || '%' or r.ff like o.ff || '%')
                order by (o.c ->> 'matches')::int desc limit 1))
           order by r.rank desc, (r.c ->> 'matches')::int desc, r.first_name), '[]'::jsonb)
      into v_cands
      from (select * from ranked order by rank desc limit 8) r;
    v_out := v_out || jsonb_build_array(u || jsonb_build_object('candidates', v_cands));
  end loop;
  return v_out;
end;
$$;

-- ---------------------------------------------------------------------------
-- the three rules
-- ---------------------------------------------------------------------------
-- p_sides: the row's sides as the matcher left them ({player_id, raw} | {new, raw} | the sheet person);
-- p_unclear: the held people, each with its place «side:index». Returns {sides, unclear, picks: [{slot, rule, player_id}]}.
create or replace function core.ingest_smart_names(p_tournament uuid, p_row jsonb, p_sides jsonb, p_unclear jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_sides  jsonb := p_sides;
  v_open   text[] := array(select u ->> 'slot' from jsonb_array_elements(coalesce(p_unclear, '[]'::jsonb)) u where u ? 'slot' and not u ? 'reason');
  v_picks  jsonb := '[]'::jsonb;
  v_gender text := core.discipline_gender(p_row ->> 'discipline');
  v_level  text := upper(btrim(coalesce(p_row ->> 'level', 'OPEN')));
  v_s      int;
  v_i      int;
  v_p0     jsonb;
  v_p1     jsonb;
  v_id0    uuid;
  v_id1    uuid;
  v_ids    uuid[];
  v_all    int;
  v_others uuid[];
  v_o0     uuid[];
  v_o1     uuid[];
  v_pair   uuid[];
  v_n      int;
  v_rule   text;
  v_slot   text;
  v_pool   uuid[];
  v_used   uuid[];
begin
  if coalesce(array_length(v_open, 1), 0) = 0 then
    return jsonb_build_object('sides', p_sides, 'unclear', coalesce(p_unclear, '[]'::jsonb), 'picks', '[]'::jsonb);
  end if;

  -- a side at a time: brothers, then a known pair
  for v_s in 1..2 loop
    if jsonb_array_length(coalesce(v_sides -> ('side' || v_s), '[]'::jsonb)) <> 2
       or not (v_s || ':0' = any (v_open) or v_s || ':1' = any (v_open)) then
      continue;
    end if;
    v_p0 := p_row -> ('side' || v_s) -> 0;
    v_p1 := p_row -> ('side' || v_s) -> 1;
    v_id0 := nullif(v_sides -> ('side' || v_s) -> 0 ->> 'player_id', '')::uuid;
    v_id1 := nullif(v_sides -> ('side' || v_s) -> 1 ->> 'player_id', '')::uuid;
    -- a place decided as a new player takes no part
    if (v_sides -> ('side' || v_s) -> 0) ? 'new' or (v_sides -> ('side' || v_s) -> 1) ? 'new' then continue; end if;
    v_others := array(select (x ->> 'player_id')::uuid from jsonb_array_elements(coalesce(v_sides -> ('side' || (3 - v_s)), '[]'::jsonb)) x
                       where x ? 'player_id');
    v_pair := null;
    v_rule := null;

    -- brothers: the same surname twice, no first names, exactly two players carry it, both can play here
    if coalesce(btrim(v_p0 ->> 'first'), '') = '' and coalesce(btrim(v_p1 ->> 'first'), '') = ''
       and core.normalize_search(coalesce(v_p0 ->> 'surname', '')) = core.normalize_search(coalesce(v_p1 ->> 'surname', ''))
       and core.normalize_search(coalesce(v_p0 ->> 'surname', '')) <> '' then
      select count(*) into v_all from core.players
       where surname_norm = core.normalize_search(v_p0 ->> 'surname') and status = 'active';
      v_ids := core.ingest_pool(jsonb_build_object('surname', v_p0 ->> 'surname', 'first', ''), v_gender);
      if v_all = 2 and cardinality(v_ids) = 2 and not (v_ids && v_others)
         and (v_id0 is null or v_id0 = any (v_ids)) and (v_id1 is null or v_id1 = any (v_ids))
         and (v_id0 is null or v_id1 is null or v_id0 <> v_id1) then
        if v_id0 is not null then v_pair := array[v_id0, (select x from unnest(v_ids) x where x <> v_id0)];
        elsif v_id1 is not null then v_pair := array[(select x from unnest(v_ids) x where x <> v_id1), v_id1];
        else v_pair := v_ids; end if;
        v_rule := 'brothers';
      end if;
    end if;

    -- a known pair: exactly one pair of possible players has played together as partners
    if v_pair is null then
      v_o0 := case when v_id0 is not null and not (v_s || ':0' = any (v_open)) then array[v_id0]
                   else core.ingest_pool(v_p0, v_gender) end;
      v_o1 := case when v_id1 is not null and not (v_s || ':1' = any (v_open)) then array[v_id1]
                   else core.ingest_pool(v_p1, v_gender) end;
      with ok as (
        select a, b from unnest(v_o0) a, unnest(v_o1) b
         where a <> b and not (a = any (v_others)) and not (b = any (v_others))
           and core.played_together(a, b) > 0)
      -- the same two people read either way round are one pair
      select (select count(distinct least(a::text, b::text) || greatest(a::text, b::text)) from ok),
             (select array[a, b] from ok order by a, b limit 1)
        into v_n, v_pair;
      if v_n = 1 then v_rule := 'known_pair'; else v_pair := null; end if;
    end if;

    if v_pair is not null then
      for v_i in 0..1 loop
        v_slot := v_s || ':' || v_i;
        if v_slot = any (v_open) then
          v_sides := jsonb_set(v_sides, array['side' || v_s, v_i::text],
                       jsonb_build_object('player_id', v_pair[v_i + 1], 'raw', p_row -> ('side' || v_s) -> v_i ->> 'raw',
                                          'no_alias', true, 'rule', v_rule));
          v_picks := v_picks || jsonb_build_array(jsonb_build_object('slot', v_slot, 'rule', v_rule, 'player_id', v_pair[v_i + 1]));
          v_open := array_remove(v_open, v_slot);
        end if;
      end loop;
    end if;
  end loop;

  -- one name at a time: the only candidate who has played this category
  foreach v_slot in array v_open loop
    v_s := split_part(v_slot, ':', 1)::int;
    v_i := split_part(v_slot, ':', 2)::int;
    v_used := array(select (x ->> 'player_id')::uuid from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x
                     where x ? 'player_id');
    v_pool := array(select x from unnest(core.ingest_pool(p_row -> ('side' || v_s) -> v_i, v_gender)) x
                     where not (x = any (v_used)) and core.played_level(x, v_level) > 0);
    if cardinality(v_pool) = 1 then
      v_sides := jsonb_set(v_sides, array['side' || v_s, v_i::text],
                   jsonb_build_object('player_id', v_pool[1], 'raw', p_row -> ('side' || v_s) -> v_i ->> 'raw',
                                      'no_alias', true, 'rule', 'category'));
      v_picks := v_picks || jsonb_build_array(jsonb_build_object('slot', v_slot, 'rule', 'category', 'player_id', v_pool[1]));
      v_open := array_remove(v_open, v_slot);
    end if;
  end loop;

  return jsonb_build_object(
    'sides', v_sides,
    'unclear', (select coalesce(jsonb_agg(u), '[]'::jsonb) from jsonb_array_elements(coalesce(p_unclear, '[]'::jsonb)) u
                 where u ? 'reason' or not (u ? 'slot') or (u ->> 'slot') = any (v_open)),
    'picks', v_picks);
end;
$$;

-- ---------------------------------------------------------------------------
-- aliases: never a bare surname two players carry
-- ---------------------------------------------------------------------------
create or replace function core.import_person(p jsonb, p_by uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id    uuid := nullif(p ->> 'player_id', '')::uuid;
  v_alias text := core.normalize_search(btrim(coalesce(p ->> 'raw', '')));
begin
  if v_id is null then
    if p -> 'new' is null or coalesce(btrim(p -> 'new' ->> 'surname'), '') = '' then
      raise exception 'person_unresolved' using errcode = '22023';
    end if;
    insert into core.players (first_name, surname, source)
    -- as the sheet writes it (often capitals); the queued accent pass fixes spelling for the whole roster
    values (coalesce(btrim(p -> 'new' ->> 'first'), ''), btrim(p -> 'new' ->> 'surname'), 'import')
    returning id into v_id;
  end if;
  -- a rule's pick, or a surname alone that several players carry, says nothing about the next row
  if v_alias <> '' and not coalesce((p ->> 'no_alias')::boolean, false)
     and (select count(*) from core.players where surname_norm = v_alias and status = 'active') < 2 then
    insert into core.player_aliases (alias_norm, player_id, created_by) values (v_alias, v_id, p_by)
    on conflict (alias_norm) do update set player_id = excluded.player_id, created_by = excluded.created_by;
  end if;
  return v_id;
end;
$$;
revoke all on function core.import_person(jsonb, uuid) from public;

delete from core.player_aliases a
 where (select count(*) from core.players p where p.surname_norm = a.alias_norm and p.status = 'active') >= 2;


-- ---------------------------------------------------------------------------
-- the write path: the rules before a hold, context on a hold, the draw's category on a known match
-- (20270115000000_ingest_hold_incomplete.sql otherwise)
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
    select id into v_event from core.tournament_events
     where tournament_id = p_tournament_id and name = coalesce(r ->> 'level', 'OPEN') and format = v_format;
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
                            'recategorised', v_recat);
end;
$$;
revoke all on function core.ingest_apply(uuid, jsonb, uuid, uuid) from public;

-- ---------------------------------------------------------------------------
-- the open decisions through the rules again
-- ---------------------------------------------------------------------------
-- every open «people» decision (one tournament, or all) goes through the write path again: a rule may now decide it
-- (the match goes in, the decision closes), else it stays with its candidates' context refreshed. A row that fails
-- stays as it was; the rest go on.
create or replace function core.ingest_rerun_reviews(p_tournament uuid default null, p_by uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v        core.ingest_reviews;
  v_checked int := 0;
  v_done    int := 0;
  v_failed  int := 0;
begin
  for v in select * from core.ingest_reviews o
            where o.kind = 'people' and o.status = 'open' and (p_tournament is null or o.tournament_id = p_tournament)
              and not exists (select 1 from jsonb_array_elements(coalesce(o.payload -> 'unclear', '[]'::jsonb)) u where u ? 'reason')
            order by o.created_at loop
    v_checked := v_checked + 1;
    begin
      perform core.ingest_apply(v.tournament_id, jsonb_build_array(v.payload -> 'row'), p_by, v.run_id);
    exception when others then
      v_failed := v_failed + 1;
      continue;
    end;
    update core.ingest_reviews set status = 'done', resolved_by = p_by, resolved_at = now(), updated_at = now()
     where id = v.id and status = 'open'
       and exists (select 1 from core.matches m where m.tournament_id = v.tournament_id and m.source = 'import' and m.source_ref = v.fingerprint);
    if exists (select 1 from core.ingest_reviews where id = v.id and status = 'done') then v_done := v_done + 1; end if;
  end loop;
  return jsonb_build_object('checked', v_checked, 'resolved', v_done, 'still_open', v_checked - v_done - v_failed, 'failed', v_failed);
end;
$$;
revoke all on function core.ingest_rerun_reviews(uuid, uuid) from public;

-- «Check again»: staff run the rules over the decisions waiting
create or replace function api.admin_rerun_ingest_reviews(p_tournament_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return core.ingest_rerun_reviews(p_tournament_id, auth.uid());
end;
$$;
revoke all on function api.admin_rerun_ingest_reviews(uuid) from public, anon;
grant execute on function api.admin_rerun_ingest_reviews(uuid) to authenticated, service_role;

revoke all on function core.ingest_smart_names(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function core.ingest_enrich_unclear(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function core.ingest_candidate_context(uuid, uuid, text, uuid[], uuid[]) from public;
revoke all on function core.ingest_pool(jsonb, text) from public;
revoke all on function core.played_together(uuid, uuid) from public;
revoke all on function core.played_level(uuid, text) from public;

-- the decisions waiting today, once, through the new rules (a failure never stops the migration)
do $$
begin
  perform core.ingest_rerun_reviews(null, null);
exception when others then
  raise notice 'ingest_rerun_reviews: %', sqlerrm;
end;
$$;
