-- One written form per category. The same age group stood as «60» on one match and «60+» on the next (the AOK Tennis
-- Open schedule), and the app shows the stored string as it is. packages/ingest now normalises a category when it
-- reads a sheet (normalizeCategory in packages/ingest/src/category.ts); this is the same function in the database,
-- so every way in (the sheet runs, a CSV, staff forms) ends the same, and the rows already stored are brought along.
--
-- Rules (the shared vectors are packages/core/test-vectors/category.json, run by vitest and by pgTAP 142):
--   - spaces trimmed and collapsed, no space around «/»
--   - senior age groups «60», «60 +» → «60+» (a bare number only from 35 to 85 in steps of 5)
--   - younger-than «-40», «40-», «- 40», «U40» → «-40»; a range «40-54» keeps its dash
--   - the words MASTER(S), MEDIUM, OPEN, ROOKIES, MED/ADV in capitals; a Greek look-alike capital inside a Latin word
--     (ΜASTER) becomes Latin, a typed-twice letter (MMEDIUM) is mended, MED → MEDIUM, ROOK(IE) 2 → ROOKIES 2
--   - a Greek word with a Latin look-alike capital in it becomes all Greek
--   - everything else stays as written
--
-- Where it applies: core.tournament_events.name, core.tournament_draws.level and the level kept in a match's
-- provenance (triggers), and core.snap_event looks the event up by the normalised name. A draw's tab (the key of
-- ?draw= and of the push data.url) is the sheet tab's own name and is not touched. Row fingerprints are not touched
-- either (packages/ingest still builds them from the level as the sheet wrote it, so stored matches are still found).

create or replace function core.category_token(t text)
returns text
language plpgsql immutable parallel safe set search_path = ''
as $$
declare
  vocab   constant text[] := array['ADVANCED', 'MASTERS', 'ROOKIES', 'ROOKIE', 'MASTER', 'MEDIUM', 'OPEN', 'ROOK', 'ADV', 'MED'];
  m       text[];
  v_word  text;
  v_dig   text;
  v_latin text;
  w       text;
begin
  m := regexp_match(t, '^(\D*)(\d*)$');
  v_word := coalesce(m[1], t);
  v_dig := coalesce(m[2], '');
  v_latin := upper(translate(v_word, 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ', 'ABEZHIKMNOPTYX'));
  if v_latin ~ '^[A-Z]+$' then
    foreach w in array vocab loop
      if w = v_latin then return w || v_dig; end if;
    end loop;
    if length(v_latin) >= 5 then
      foreach w in array vocab loop
        if length(w) >= 5 and regexp_replace(w, '([A-Z])\1+', '\1', 'g') = regexp_replace(v_latin, '([A-Z])\1+', '\1', 'g') then
          return w || v_dig;
        end if;
      end loop;
    end if;
  end if;
  -- a Greek word (a Greek letter with no Latin twin in it): its Latin look-alikes become Greek
  if translate(t, 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ', '') ~ '[Ͱ-Ͽ]' then
    return translate(t, 'ABEZHIKMNOPTYX', 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ');
  end if;
  return t;
end
$$;

create or replace function core.normalize_category(p text)
returns text
language plpgsql immutable parallel safe set search_path = core, pg_temp
as $$
declare
  s text;
  m text[];
  n int;
  d constant text := '[-' || chr(8722) || chr(8211) || chr(8212) || ']';
begin
  if p is null then return null; end if;
  s := btrim(regexp_replace(p, '[[:space:]' || chr(160) || ']+', ' ', 'g'));
  s := regexp_replace(s, ' ?/ ?', '/', 'g');
  s := coalesce((select string_agg(case when x.m[1] ~ '^[ /]$' then x.m[1] else core.category_token(x.m[1]) end, '' order by x.n)
                   from regexp_matches(s, '[^ /]+|[ /]', 'g') with ordinality as x(m, n)), '');
  m := regexp_match(s, '^(\d{2}) ?\+$');
  if m is not null then return m[1] || '+'; end if;
  m := regexp_match(s, '^(\d{2})$');
  if m is not null then
    n := m[1]::int;
    return case when n >= 35 and n <= 85 and n % 5 = 0 then m[1] || '+' else s end;
  end if;
  m := regexp_match(s, '^(\d{2}) ?' || d || ' ?(\d{2})$');
  if m is not null then return m[1] || '-' || m[2]; end if;
  m := regexp_match(s, '^' || d || ' ?(\d{2})$');
  if m is not null then return '-' || m[1]; end if;
  m := regexp_match(s, '^(\d{2}) ?' || d || '$');
  if m is not null then return '-' || m[1]; end if;
  m := regexp_match(s, '^[Uu] ?' || d || '? ?(\d{2})$');
  if m is not null then return '-' || m[1]; end if;
  m := regexp_match(s, '^ROOK(?:IES|IE)? ?(\d)?$');
  if m is not null then return case when m[1] is not null then 'ROOKIES ' || m[1] else 'ROOKIES' end; end if;
  if s ~ '^MED[ /]ADV$' then return 'MED/ADV'; end if;
  if s = 'MED' then return 'MEDIUM'; end if;
  return s;
end
$$;

comment on function core.normalize_category(text) is 'One written form of a category («60» and «60 +» → «60+», «40-» → «-40», look-alike letters folded). Same as packages/ingest normalizeCategory; vectors in packages/core/test-vectors/category.json.';

-- the tournament's event a written category means (core.snap_event of 20270216, now by the normalised name)
create or replace function core.snap_event(p_tournament uuid, p_level text, p_format text)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  with l as (select core.normalize_category(p_level) as v)
  select coalesce(
    (select e.id from core.tournament_events e, l
      where e.tournament_id = p_tournament and e.name = l.v and e.format = p_format limit 1),
    (select min(e.id::text)::uuid from core.tournament_events e, l
      where e.tournament_id = p_tournament and e.format = p_format
        and (core.norm_level(e.name) = core.norm_level(l.v)
             or (regexp_replace(e.name, '\D', '', 'g') = regexp_replace(coalesce(l.v, ''), '\D', '', 'g')
                 and length(core.norm_level(l.v)) >= 4
                 and levenshtein(core.norm_level(e.name), core.norm_level(l.v)) <= 1))
     having count(*) = 1))
$$;

-- whichever way a category comes in, it is stored in the one form
create or replace function core.category_event_name()
returns trigger
language plpgsql set search_path = core, pg_temp
as $$
begin
  new.name := core.normalize_category(new.name);
  return new;
end
$$;
create trigger tournament_events_category before insert or update of name on core.tournament_events
  for each row execute function core.category_event_name();

create or replace function core.category_draw_level()
returns trigger
language plpgsql set search_path = core, pg_temp
as $$
begin
  new.level := core.normalize_category(new.level);
  return new;
end
$$;
create trigger tournament_draws_category before insert or update of level on core.tournament_draws
  for each row execute function core.category_draw_level();

create or replace function core.category_match_level()
returns trigger
language plpgsql set search_path = core, pg_temp
as $$
begin
  if new.provenance ? 'level' and jsonb_typeof(new.provenance -> 'level') = 'string'
     and new.provenance ->> 'level' is distinct from core.normalize_category(new.provenance ->> 'level') then
    new.provenance := jsonb_set(new.provenance, '{level}', to_jsonb(core.normalize_category(new.provenance ->> 'level')));
  end if;
  return new;
end
$$;
create trigger matches_category before insert or update of provenance on core.matches
  for each row execute function core.category_match_level();

-- ---------------------------------------------------------------------------
-- the rows already stored
-- ---------------------------------------------------------------------------

-- events that are the same after normalising (in one tournament, format and gender) become one: matches move to the
-- one that already has the written form, else the oldest. Only what differs changes, so it can run again; with
-- p_dry it only counts. Returns how many events were merged away and renamed, draws and matches changed.
create or replace function core.category_backfill(p_dry boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_merged int;
  v_renamed int;
  v_draws int;
  v_prov int;
begin
  create temp table np_event_merge on commit drop as
    select e.id, k.keep_id
      from (select id, tournament_id, format, gender, core.normalize_category(name) as nn from core.tournament_events) e
      join (select distinct on (tournament_id, format, gender, nn) id as keep_id, tournament_id, format, gender, nn
              from (select id, tournament_id, format, gender, core.normalize_category(name) as nn,
                           (name = core.normalize_category(name)) as canon, created_at
                      from core.tournament_events) z
             order by tournament_id, format, gender, nn, canon desc, created_at, id) k
        on k.tournament_id = e.tournament_id and k.format = e.format and k.gender is not distinct from e.gender and k.nn = e.nn
     where e.id <> k.keep_id;
  select count(*) into v_merged from np_event_merge;
  select count(*) into v_renamed from core.tournament_events e
   where e.name is distinct from core.normalize_category(e.name) and not exists (select 1 from np_event_merge x where x.id = e.id);
  select count(*) into v_draws from core.tournament_draws where level is distinct from core.normalize_category(level);
  select count(*) into v_prov from core.matches
   where jsonb_typeof(provenance -> 'level') = 'string' and provenance ->> 'level' is distinct from core.normalize_category(provenance ->> 'level');
  if not p_dry then
    update core.matches m set event_id = x.keep_id from np_event_merge x where m.event_id = x.id;
    delete from core.tournament_events e using np_event_merge x where e.id = x.id;
    update core.tournament_events set name = core.normalize_category(name) where name is distinct from core.normalize_category(name);
    update core.tournament_draws set level = core.normalize_category(level) where level is distinct from core.normalize_category(level);
    update core.matches set provenance = jsonb_set(provenance, '{level}', to_jsonb(core.normalize_category(provenance ->> 'level')))
     where jsonb_typeof(provenance -> 'level') = 'string' and provenance ->> 'level' is distinct from core.normalize_category(provenance ->> 'level');
  end if;
  drop table np_event_merge;
  return jsonb_build_object('events_merged', v_merged, 'events_renamed', v_renamed, 'draws', v_draws, 'matches', v_prov);
end
$$;
revoke all on function core.category_backfill(boolean) from public, anon, authenticated;

select core.category_backfill();
