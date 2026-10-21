-- One person, one roster row (founder, 21 Oct 2026: "fix the duplicate players at the import").
--
-- On the live tournament 78 of 359 schedule players had another id (or none) in the draws: the schedule import and the
-- draw import resolved names on their own and made new rows where an existing one was meant. The causes, from the code:
--   * draws never folded Latin look-alike capitals («KAKKABHΣ»), the schedule did;
--   * a first name cut to three letters or more («ΧΑΡ») never reached the 0.92 score; only one or two letters counted
--     as a prefix;
--   * longer and shorter forms («ΑΝΤΩΝΙΟΣ», «Αντώνης») only matched when the family table knew them;
--   * spellings that sound the same («ΜΑΝΤΖΑΒΙΝΟΣ», «Ματζαβίνος») kept their difference in normalize_search.
--
-- 1. Name keys in SQL, the twins of nameKey and sameNamedPerson in packages/copy/src/greek.ts. Both sides run the same
--    vectors (packages/core/test-vectors/name-keys.json; vitest in packages/copy, pgTAP 141).
-- 2. core.ingest_person, after the remembered spellings and the new player waiting for staff, tries in order:
--    the same key in the roster (one player links, an account holder too; several: the one in this tournament, else
--    staff), then within this tournament's people (its matches and its draws) the same sound key, then a first name
--    that starts the other or shares four letters; then a first name that fits the only roster player with that
--    surname. Never across genders, never to a hidden player, a minor or an account holder on anything looser than the
--    same key (those go to staff). Draws now fold look-alikes and give the gender of their discipline to new players.
--    core.log_person (a typed opponent in «+ Ματς») links to the one roster player with the same key.
-- 3. core.merge_player moves everything a player owns (draw entries, open review cards, claim requests, identity flags,
--    quiz cards, gender, birth year, area, hand) and writes core.player_merges, the audit trail. A minor stays a minor.
-- 4. core.duplicate_candidates() lists the pairs already in the roster, sure or likely, with the evidence. Sure: the
--    same key with one row that has no match and no account, or an empty row a draw left next to the one player of
--    that tournament its name fits (what the import now links by itself). The rest is likely. Nothing is
--    merged here: staff do it on admin /v2/players/duplicates («Διπλοί παίκτες»), the sure ones in one go.

-- ── 1. name keys ──

-- nameKey: capitals, no accents, no dots or commas, one space; Latin look-alikes read as Greek when the name has any
-- Greek capital. translate, not upper(): the test and hosted databases have different locales.
create or replace function core.name_key(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when x.k ~ '[Α-Ω]' then translate(x.k, 'ABEHIKMNOPTXYZ', 'ΑΒΕΗΙΚΜΝΟΡΤΧΥΖ') else x.k end
    from (select btrim(regexp_replace(regexp_replace(
                   translate(regexp_replace(normalize(coalesce(t, ''), NFD), '[̀-ͯ]', '', 'g'),
                             'αβγδεζηθικλμνξοπρστυφχψωςabcdefghijklmnopqrstuvwxyz',
                             'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΣABCDEFGHIJKLMNOPQRSTUVWXYZ'),
                   '[.·,]', ' ', 'g'), '\s+', ' ', 'g')) as k) x
$$;
comment on function core.name_key(text) is 'nameKey in packages/copy: a name folded for comparing, never for showing';

-- the key spelled as it sounds («ΤΖΙΩΤΖΙΟΣ» = «ΤΖΙΟΤΖΙΟΣ», «ΜΠΡΙΛΛΑΚΗΣ» = «ΜΠΡΙΛΑΚΗΣ»): sameNamedPerson's single()
create or replace function core.name_sound(k text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(replace(replace(replace(replace(
           regexp_replace(coalesce(k, ''), 'ΕΙ|ΟΙ|Η|Υ', 'Ι', 'g'),
           'ΑΙ', 'Ε'), 'Ω', 'Ο'), 'ΝΤ', 'Τ'), 'ΜΠ', 'Π'), '(.)\1+', '\1', 'g')
$$;

-- sameNamedPerson: a sheet name («ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ», surname first) and a roster player: the same surname as it
-- sounds, and first names that agree where both are given (one starts the other, or the first four letters match)
create or replace function core.same_named_person(p_sheet text, p_surname text, p_first text, p_any_first boolean default false)
returns boolean language plpgsql immutable parallel safe set search_path = 'core', 'pg_temp' as $$
declare
  v_raw   text := core.name_sound(core.name_key(p_sheet));
  v_sur   text := core.name_sound(core.name_key(p_surname));
  v_rest  text;
  v_known text;
  a text;
  b text;
begin
  if v_sur = '' or v_raw = '' then return false; end if;
  if v_raw <> v_sur and left(v_raw, length(v_sur) + 1) <> v_sur || ' ' then return false; end if;
  v_rest := btrim(substr(v_raw, length(v_sur) + 1));
  v_known := core.name_sound(core.name_key(p_first));
  if coalesce(p_any_first, false) or v_rest = '' or v_known = '' then return true; end if;
  a := split_part(v_rest, ' ', 1);
  b := split_part(v_known, ' ', 1);
  return left(a, length(b)) = b or left(b, length(a)) = a
      or (length(a) >= 4 and length(b) >= 4 and left(a, 4) = left(b, 4));
end;
$$;

-- a gender read off a whole Greek first name (-ς a man; -α, -η, -ω, -ου a woman); a cut name or a Latin one says nothing
create or replace function core.first_gender(p_first text)
returns text language sql immutable parallel safe set search_path = 'core', 'pg_temp' as $$
  select case when length(w) < 4 then null
              when w ~ 'Σ$' then 'm'
              when w ~ '(Α|Η|Ω|ΟΥ)$' then 'f' end
    from (select split_part(core.name_key(p_first), ' ', 1) as w) x
$$;

-- two genders that can be one person: unknown fits anything
create or replace function core.gender_fits(p_a text, p_b text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select p_a is null or p_b is null or p_a not in ('m', 'f') or p_b not in ('m', 'f') or p_a = p_b
$$;

create index if not exists players_name_key_idx on core.players (core.name_key(surname || ' ' || first_name));
create index if not exists players_surname_sound_idx on core.players (core.name_sound(core.name_key(surname)));

-- everyone a tournament has seen: its matches and its draws
create or replace function core.tournament_entrants(p_tournament uuid)
returns uuid[] language sql stable security definer set search_path = 'core', 'pg_temp' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select mp.player_id as x from core.matches m join core.match_participants mp on mp.match_id = m.id
     where m.tournament_id = p_tournament
    union
    select (pp ->> 'player_id')::uuid from core.tournament_draws d,
           jsonb_array_elements(coalesce(d.draw -> 'entrants', '[]'::jsonb)) e,
           jsonb_array_elements(coalesce(e -> 'players', '[]'::jsonb)) pp
     where d.tournament_id = p_tournament and pp ->> 'player_id' is not null) s
   where p_tournament is not null
$$;

-- ── 2. the resolver ──

create or replace function core.ingest_person(p jsonb, p_tournament uuid default null)
returns jsonb language plpgsql stable security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v_alias uuid;
  v_s     text := core.normalize_search(coalesce(p ->> 'surname', ''));
  v_sur   text := btrim(coalesce(p ->> 'surname', ''));
  v_first text := btrim(coalesce(p ->> 'first', ''));
  v_k1    text;
  v_k2    text;
  v_ss    text;
  v_g     text;
  v_ent   uuid[];
  v_ids   uuid[];
  v_sound uuid[];
  v_pl    core.players;
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

  -- someone who joined as a new player and waits for staff: their own profile, not another new one
  v_alias := core.new_player_by_name(p ->> 'first', p ->> 'surname');
  if v_alias is not null then
    return jsonb_build_object('how', 'match', 'player_id', v_alias, 'candidates', '[]'::jsonb);
  end if;

  v_g := case when p ->> 'gender' in ('m', 'f') then p ->> 'gender' else core.first_gender(v_first) end;
  v_k1 := core.name_key(v_sur || ' ' || v_first);
  v_k2 := core.name_key(v_first || ' ' || v_sur);
  v_ss := core.name_sound(core.name_key(v_sur));

  -- the same name once folded (case, accents, look-alikes): the one roster player, an account holder too
  if v_sur <> '' then
    select array_agg(pl.id order by pl.id) into v_ids from core.players pl
     where core.name_key(pl.surname || ' ' || pl.first_name) in (v_k1, v_k2) and pl.status = 'active'
       and core.gender_fits(v_g, coalesce(pl.gender, core.first_gender(pl.first_name)));
    if cardinality(v_ids) = 1 then
      return jsonb_build_object('how', 'match', 'rule', 'key', 'player_id', v_ids[1], 'candidates', '[]'::jsonb);
    end if;
    if cardinality(v_ids) > 1 then
      v_ent := core.tournament_entrants(p_tournament);
      select array_agg(x) into v_sound from unnest(v_ids) x where x = any (v_ent);
      if cardinality(v_sound) = 1 then
        return jsonb_build_object('how', 'match', 'rule', 'key_tournament', 'player_id', v_sound[1], 'candidates', '[]'::jsonb);
      end if;
      return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));   -- the same name twice
    end if;
  end if;

  -- this tournament's people: the same name as it sounds, else a first name that fits («ΧΑΡ», «ΑΝΤΩΝΙΟΣ»)
  if p_tournament is not null and v_sur <> '' and v_first <> '' then
    v_ent := coalesce(v_ent, core.tournament_entrants(p_tournament));
    select array_agg(pl.id order by pl.id) into v_ids from core.players pl
     where pl.id = any (v_ent) and pl.status = 'active'
       and core.name_sound(core.name_key(pl.surname)) = v_ss
       and core.same_named_person(v_sur || ' ' || v_first, pl.surname, pl.first_name)
       and core.gender_fits(v_g, coalesce(pl.gender, core.first_gender(pl.first_name)));
    if cardinality(v_ids) > 1 then
      select array_agg(pl.id order by pl.id) into v_sound from core.players pl
       where pl.id = any (v_ids)
         and core.name_sound(core.name_key(pl.surname || ' ' || pl.first_name)) in (core.name_sound(v_k1), core.name_sound(v_k2));
      if cardinality(v_sound) = 1 then v_ids := v_sound; end if;
    end if;
    if cardinality(v_ids) = 1 then
      select * into v_pl from core.players where id = v_ids[1];
      -- an account holder, a hidden player or a minor only on the same key: staff look at the rest
      if v_pl.claimed_by_user_id is not null or v_pl.hidden or v_pl.is_minor then
        return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));
      end if;
      return jsonb_build_object('how', 'match', 'rule', 'name_in_tournament', 'player_id', v_pl.id, 'candidates', '[]'::jsonb);
    end if;
  end if;

  -- a surname alone: the one in this tournament, else the one in the roster; several are for staff
  if v_first = '' and v_s <> '' then
    if p_tournament is not null then
      select array_agg(distinct pl.id) into v_ids
        from core.matches m join core.match_participants mp on mp.match_id = m.id join core.players pl on pl.id = mp.player_id
       where m.tournament_id = p_tournament and pl.surname_norm = v_s and pl.status = 'active';
      if cardinality(v_ids) = 1 then return jsonb_build_object('how', 'tournament', 'player_id', v_ids[1]); end if;
    end if;
    select array_agg(id) into v_ids from core.players where surname_norm = v_s and status = 'active' and not hidden;
    if cardinality(v_ids) = 1 then return jsonb_build_object('how', 'surname', 'player_id', v_ids[1]); end if;
    if cardinality(v_ids) > 1 then
      return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));
    end if;
  end if;

  -- a first name that fits the only roster player with this surname (stricter than the surname alone above)
  if v_first <> '' and v_ss <> '' then
    select array_agg(pl.id) into v_ids from core.players pl
     where core.name_sound(core.name_key(pl.surname)) = v_ss and pl.status = 'active';
    if cardinality(v_ids) = 1 then
      select * into v_pl from core.players where id = v_ids[1];
      if v_pl.claimed_by_user_id is null and not v_pl.hidden and not v_pl.is_minor
         and core.same_named_person(v_sur || ' ' || v_first, v_pl.surname, v_pl.first_name)
         and core.gender_fits(v_g, coalesce(v_pl.gender, core.first_gender(v_pl.first_name))) then
        return jsonb_build_object('how', 'match', 'rule', 'only_surname', 'player_id', v_pl.id, 'candidates', '[]'::jsonb);
      end if;
    end if;
  end if;

  v_c := core.ingest_candidates(p);
  v_top := (v_c -> 0 ->> 'score')::numeric;
  v_next := coalesce((v_c -> 1 ->> 'score')::numeric, 0);
  if v_top >= 0.92 then
    if v_top - v_next >= 0.05 then
      return jsonb_build_object('how', 'match', 'player_id', v_c -> 0 ->> 'id', 'candidates', v_c);
    end if;
    return jsonb_build_object('how', 'review', 'candidates', v_c);   -- the same name twice in the roster
  end if;
  if v_top >= 0.6 and exists (select 1 from jsonb_array_elements(v_c) c
                               where (c ->> 'score')::numeric >= 0.6 and core.in_active_circle((c ->> 'id')::uuid)) then
    return jsonb_build_object('how', 'review', 'candidates', v_c);
  end if;
  return jsonb_build_object('how', 'new', 'candidates', coalesce(v_c, '[]'::jsonb));
end;
$$;

-- a new import player keeps the gender its draw gives (MS, MD men; WS, WD women; mixed says nothing)
create or replace function core.import_person(p jsonb, p_by uuid)
returns uuid language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v_id    uuid := nullif(p ->> 'player_id', '')::uuid;
  v_alias text := core.normalize_search(btrim(coalesce(p ->> 'raw', '')));
  v_g     text := p -> 'new' ->> 'gender';
begin
  if v_id is null then
    if p -> 'new' is null or coalesce(btrim(p -> 'new' ->> 'surname'), '') = '' then
      raise exception 'person_unresolved' using errcode = '22023';
    end if;
    insert into core.players (first_name, surname, source, gender)
    -- as the sheet writes it (often capitals); the queued accent pass fixes spelling for the whole roster
    values (coalesce(btrim(p -> 'new' ->> 'first'), ''), btrim(p -> 'new' ->> 'surname'), 'import',
            case when v_g in ('m', 'f') then v_g end)
    returning id into v_id;
  else
    -- a payload written before a merge still names the old row: follow it to the one that stayed
    v_id := core.current_player(v_id);
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

-- the row a merged player now lives in (merges can chain)
create or replace function core.current_player(p_id uuid)
returns uuid language sql stable security definer set search_path = 'core', 'pg_temp' as $$
  with recursive c(id, into_id, depth) as (
    select p.id, p.merged_into, 0 from core.players p where p.id = p_id
    union all
    select p.id, p.merged_into, c.depth + 1 from c join core.players p on p.id = c.into_id where c.depth < 20)
  select coalesce((select id from c where into_id is null order by depth desc limit 1), p_id)
$$;

-- draws: Latin look-alikes folded like the schedule, and the discipline's gender for new players
create or replace function core.draw_player(p jsonb, p_tournament uuid)
returns uuid language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v   jsonb;
  q   jsonb := core.fold_person(p);
  raw text := btrim(coalesce(q ->> 'surname', '') || ' ' || coalesce(q ->> 'first', ''));
begin
  if coalesce(btrim(q ->> 'surname'), '') = '' then return null; end if;
  v := core.ingest_person(q || jsonb_build_object('raw', raw), p_tournament);
  if v ->> 'how' in ('alias', 'match', 'tournament', 'surname') then return core.current_player((v ->> 'player_id')::uuid); end if;
  if v ->> 'how' = 'new' then
    return core.import_person(jsonb_build_object('new', jsonb_strip_nulls(jsonb_build_object(
                                'surname', q ->> 'surname', 'first', coalesce(q ->> 'first', ''), 'gender', q ->> 'gender')),
                              'raw', raw), null);
  end if;
  return null;
end;
$$;

create or replace function core.ingest_draws(p_tournament_id uuid, p_draws jsonb)
returns jsonb language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  d        jsonb;
  v_ents   jsonb;
  v_g      text;
  v_n      int := 0;
  v_linked int := 0;
  v_people int := 0;
begin
  if not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_draws, '[]'::jsonb)) loop
    v_g := case d ->> 'discipline' when 'MS' then 'm' when 'MD' then 'm' when 'WS' then 'f' when 'WD' then 'f' end;
    select coalesce(jsonb_agg(e - 'people' || jsonb_build_object('players', (
             select coalesce(jsonb_agg(jsonb_build_object('raw', btrim(coalesce(pp ->> 'surname', '') || ' ' || coalesce(pp ->> 'first', '')),
                                                          'player_id', core.draw_player(pp || jsonb_strip_nulls(jsonb_build_object('gender', v_g)), p_tournament_id))
                                       order by o), '[]'::jsonb)
               from jsonb_array_elements(e -> 'people') with ordinality x(pp, o)))
           order by (e ->> 'pos')::int), '[]'::jsonb)
      into v_ents from jsonb_array_elements(d -> 'entrants') e;
    v_people := v_people + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players'));
    v_linked := v_linked + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players') pl
                             where pl ->> 'player_id' is not null);
    insert into core.tournament_draws (tournament_id, tab, title, discipline, level, format, size, draw, updated_at)
    values (p_tournament_id, d ->> 'tab', coalesce(d ->> 'title', ''), d ->> 'discipline', coalesce(d ->> 'level', ''),
            d ->> 'format', coalesce((d ->> 'size')::int, 0),
            jsonb_build_object('entrants', v_ents, 'rounds', coalesce(d -> 'rounds', '[]'::jsonb), 'groups', coalesce(d -> 'groups', '[]'::jsonb),
                               'flags', coalesce(d -> 'flags', '[]'::jsonb)), now())
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

-- a typed opponent with exactly a roster player's name is that player (one, visible, not a minor); else as before
create or replace function core.log_person(p jsonb)
returns uuid language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v_id  uuid := nullif(p ->> 'player_id', '')::uuid;
  v_f   text;
  v_s   text;
  v_ids uuid[];
begin
  if v_id is not null then
    if not exists (select 1 from core.players where id = v_id and status <> 'merged') then
      raise exception 'player_not_found' using errcode = 'P0002';
    end if;
    return v_id;
  end if;
  if coalesce(btrim(p -> 'new' ->> 'first'), '') = '' or coalesce(btrim(p -> 'new' ->> 'surname'), '') = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;
  v_f := core.name_tidy(p -> 'new' ->> 'first');
  v_s := core.name_tidy(p -> 'new' ->> 'surname');
  if not core.name_shape_ok(v_f) or not core.name_shape_ok(v_s) then
    raise exception 'name_shape' using errcode = '22023';
  end if;
  v_id := core.new_player_by_name(v_f, v_s);
  if v_id is not null then return v_id; end if;
  select array_agg(pl.id) into v_ids from core.players pl
   where core.name_key(pl.surname || ' ' || pl.first_name) in (core.name_key(v_s || ' ' || v_f), core.name_key(v_f || ' ' || v_s))
     and pl.status = 'active' and not pl.hidden and not pl.is_minor
     and core.gender_fits(core.first_gender(v_f), coalesce(pl.gender, core.first_gender(pl.first_name)));
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  insert into core.players (first_name, surname, source, status)
  values (v_f, v_s, 'user', 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

-- ── 3. merging, with an audit trail ──

create table if not exists core.player_merges (
  id         uuid primary key default gen_random_uuid(),
  src_id     uuid not null references core.players (id),
  dst_id     uuid not null references core.players (id),
  merged_by  uuid references auth.users (id) on delete set null,
  how        text not null default 'manual' check (how in ('manual', 'moderation', 'duplicates')),
  evidence   jsonb not null default '{}'::jsonb,
  src        jsonb not null,
  moved      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table core.player_merges is 'every merge of two roster rows: who, why, the merged row as it was, and what moved';
create index if not exists player_merges_dst_idx on core.player_merges (dst_id);
alter table core.player_merges enable row level security;
drop policy if exists player_merges_staff_read on core.player_merges;
create policy player_merges_staff_read on core.player_merges for select to authenticated using (core.is_staff());

-- staff said «not the same person»: the pair stops showing
create table if not exists core.duplicate_dismissals (
  a          uuid not null references core.players (id) on delete cascade,
  b          uuid not null references core.players (id) on delete cascade,
  by_user    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table core.duplicate_dismissals enable row level security;
drop policy if exists duplicate_dismissals_staff_read on core.duplicate_dismissals;
create policy duplicate_dismissals_staff_read on core.duplicate_dismissals for select to authenticated using (core.is_staff());

-- a merge rewrites draws: that is not a new draw, so nobody hears about it
create or replace function core.draw_alert_on_change()
returns trigger language plpgsql security definer set search_path = 'core', 'pg_temp' as $$
begin
  if coalesce(current_setting('np.player_merge', true), '') = 'on' then return null; end if;
  perform core.draw_alert(new.tournament_id, new.tab);
  perform core.follow_draw_alert(new.tournament_id, new.tab);
  if tg_op = 'UPDATE' and new.format = 'knockout'
     and core.draw_final_winner(old.draw) is null and core.draw_final_winner(new.draw) is not null then
    perform core.follow_final_alert(new.tournament_id, new.tab);
  end if;
  return null;
end;
$$;

create or replace function core.merge_player_how(p_src uuid, p_dst uuid, p_by uuid, p_how text, p_evidence jsonb)
returns void language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v_s     core.players;
  v_d     core.players;
  v_moved jsonb := '{}'::jsonb;
  v_n     int;
  v_txt   text := p_src::text;
begin
  if p_src = p_dst then raise exception 'same_player' using errcode = '22023'; end if;
  select * into v_s from core.players where id = p_src for update;
  select * into v_d from core.players where id = p_dst for update;
  if v_s.id is null or v_d.id is null then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  if v_s.status = 'merged' or v_d.status = 'merged' then raise exception 'already_merged' using errcode = '23505'; end if;
  if v_s.claimed_by_user_id is not null and v_d.claimed_by_user_id is not null then
    raise exception 'both_claimed' using errcode = '23505';
  end if;
  if exists (select 1 from core.match_participants a join core.match_participants b on b.match_id = a.match_id
              where a.player_id = p_src and b.player_id = p_dst) then
    raise exception 'same_match: both players are in one match' using errcode = '23505';
  end if;

  update core.match_participants set player_id = p_dst where player_id = p_src;
  get diagnostics v_n = row_count; v_moved := v_moved || jsonb_build_object('matches', v_n);
  update core.match_confirmations set player_id = p_dst where player_id = p_src;
  update core.match_links set player_id = p_dst where player_id = p_src;
  update core.gifts set receiver_player_id = p_dst where receiver_player_id = p_src;
  -- rows that would be duplicates on the target go; the rest move
  delete from core.follows f where f.player_id = p_src
     and exists (select 1 from core.follows g where g.user_id = f.user_id and g.player_id = p_dst);
  update core.follows set player_id = p_dst where player_id = p_src;
  get diagnostics v_n = row_count; v_moved := v_moved || jsonb_build_object('follows', v_n);
  delete from core.kudos k where k.to_player_id = p_src
     and exists (select 1 from core.kudos j where j.from_user_id = k.from_user_id and j.match_id = k.match_id and j.to_player_id = p_dst);
  update core.kudos set to_player_id = p_dst where to_player_id = p_src;
  delete from core.trait_votes t where t.player_id = p_src
     and exists (select 1 from core.trait_votes u where u.voter_user_id = t.voter_user_id and u.player_id = p_dst and u.trait_id = t.trait_id);
  update core.trait_votes set player_id = p_dst where player_id = p_src;
  update core.player_aliases set player_id = p_dst where player_id = p_src;
  insert into core.player_aliases (alias_norm, player_id, created_by)
  values (core.normalize_search(v_s.first_name || ' ' || v_s.surname), p_dst, p_by)
  on conflict (alias_norm) do nothing;
  -- the sheet's order too («ΣΕΠΕΡΗΣ ΧΑΡ»): the next import finds the survivor at once
  insert into core.player_aliases (alias_norm, player_id, created_by)
  values (core.normalize_search(v_s.surname || ' ' || v_s.first_name), p_dst, p_by)
  on conflict (alias_norm) do nothing;

  -- draw entries and the open review cards name players inside their jsonb; a uuid is unique, so its text is too
  perform set_config('np.player_merge', 'on', true);
  update core.tournament_draws set draw = replace(draw::text, v_txt, p_dst::text)::jsonb
   where draw::text like '%' || v_txt || '%';
  get diagnostics v_n = row_count; v_moved := v_moved || jsonb_build_object('draws', v_n);
  perform set_config('np.player_merge', '', true);
  update core.ingest_reviews set payload = replace(payload::text, v_txt, p_dst::text)::jsonb, updated_at = now()
   where status = 'open' and payload::text like '%' || v_txt || '%';
  update core.quiz_cards set subject_player_ids = array_replace(subject_player_ids, p_src, p_dst) where p_src = any (subject_player_ids);
  update core.quiz_set_cards set player_ids = array_replace(player_ids, p_src, p_dst) where p_src = any (player_ids);
  update core.identity_flags set player_id = p_dst where player_id = p_src;
  update core.claim_requests set player_id = p_dst where player_id = p_src;
  get diagnostics v_n = row_count; v_moved := v_moved || jsonb_build_object('claim_requests', v_n);
  update core.claim_requests set duplicate_of = case when player_id = p_dst then null else p_dst end where duplicate_of = p_src;
  -- hand and starting level, when the survivor has none
  insert into core.player_sports (player_id, sport_id, hand, initial_level)
  select p_dst, s.sport_id, s.hand, s.initial_level from core.player_sports s where s.player_id = p_src
  on conflict (player_id, sport_id) do update
    set hand = coalesce(core.player_sports.hand, excluded.hand),
        initial_level = coalesce(core.player_sports.initial_level, excluded.initial_level);

  if v_s.claimed_by_user_id is not null then
    update core.players set claimed_by_user_id = null where id = p_src;            -- the trigger frees the profile
    update core.players set claimed_by_user_id = v_s.claimed_by_user_id where id = p_dst;
  end if;
  update core.profiles set claimed_player_id = p_dst
   where claimed_player_id = p_src
     and (v_d.claimed_by_user_id is null or v_d.claimed_by_user_id = profiles.user_id);

  -- what the survivor lacks comes over; a minor on either side stays a minor (never shown)
  update core.players d
     set gender = coalesce(d.gender, v_s.gender),
         birth_year = coalesce(d.birth_year, v_s.birth_year),
         area_id = coalesce(d.area_id, v_s.area_id),
         first_name = case when d.claimed_by_user_id is null and v_s.first_name <> ''
                            and length(core.name_key(d.first_name)) < length(core.name_key(v_s.first_name))
                            and core.same_named_person(d.surname || ' ' || d.first_name, d.surname, v_s.first_name)
                           then v_s.first_name else d.first_name end
   where d.id = p_dst;
  update core.players set is_minor = true where id = p_dst and v_s.is_minor and not is_minor;
  update core.players set status = 'merged', merged_into = p_dst, hidden = true where id = p_src;

  insert into core.player_merges (src_id, dst_id, merged_by, how, evidence, src, moved)
  values (p_src, p_dst, p_by, coalesce(p_how, 'manual'), coalesce(p_evidence, '{}'::jsonb), to_jsonb(v_s), v_moved);
end;
$$;

-- the merge every desk uses (moderation, Players): now with the audit trail
create or replace function core.merge_player(p_src uuid, p_dst uuid, p_by uuid)
returns void language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
begin
  perform core.merge_player_how(p_src, p_dst, p_by, 'manual', '{}'::jsonb);
end;
$$;

-- ── 4. duplicates already in the roster ──

-- which of two rows stays: the account holder's, then the active one, then the one with more matches, a first
-- name, the longer first name, the older
create or replace function core.merge_survivor(p_a uuid, p_b uuid)
returns uuid language sql stable security definer set search_path = 'core', 'pg_temp' as $$
  select pl.id from core.players pl
   where pl.id in (p_a, p_b)
   order by (pl.claimed_by_user_id is not null) desc, (pl.status = 'active') desc,
            (select count(*) from core.match_participants mp where mp.player_id = pl.id) desc,
            (btrim(pl.first_name) <> '') desc, length(pl.first_name) desc, pl.created_at, pl.id
   limit 1
$$;

create or replace function core.duplicate_candidates()
returns table (a uuid, b uuid, keep_id uuid, drop_id uuid, confidence text, evidence jsonb)
language sql stable security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
  with p as materialized (
    select pl.id, pl.first_name, pl.surname, pl.status, pl.is_minor, pl.hidden, pl.birth_year, pl.created_at,
           pl.claimed_by_user_id is not null as claimed,
           core.name_key(pl.surname || ' ' || pl.first_name) as k1,
           core.name_key(pl.first_name || ' ' || pl.surname) as k2,
           core.name_sound(core.name_key(pl.surname)) as ss,
           coalesce(pl.gender, core.first_gender(pl.first_name)) as g,
           btrim(pl.first_name) = '' as no_first,
           core.name_sound(split_part(core.name_key(pl.first_name), ' ', 1)) as fw,
           (select count(*)::int from core.match_participants mp where mp.player_id = pl.id) as n
      from core.players pl
     where pl.status in ('active', 'pending')
       -- «είμαι καινούριος» requests are decided on moderation, which already shows «πιθανό ίδιο με …»
       and not exists (select 1 from core.claim_requests q where q.player_id = pl.id and q.via = 'new' and q.status = 'pending')),
  seen as materialized (
    select mp.player_id as id, m.tournament_id as t, null::text as tab
      from core.match_participants mp join core.matches m on m.id = mp.match_id where m.tournament_id is not null
    union
    select (pp ->> 'player_id')::uuid, d.tournament_id, d.tab
      from core.tournament_draws d, jsonb_array_elements(coalesce(d.draw -> 'entrants', '[]'::jsonb)) e,
           jsonb_array_elements(coalesce(e -> 'players', '[]'::jsonb)) pp
     where pp ->> 'player_id' is not null),
  raw_pairs as (
    select x.id as a, y.id as b from p x join p y on y.ss = x.ss and x.id < y.id
     where x.ss <> ''
       and (x.k1 = y.k1 or core.name_sound(x.k1) = core.name_sound(y.k1)
            or core.same_named_person(x.surname || ' ' || x.first_name, y.surname, y.first_name))
    union
    select least(x.id, y.id), greatest(x.id, y.id) from p x join p y on y.k2 = x.k1 and x.id <> y.id where x.k1 <> x.k2),
  pairs as (
    select r.a, r.b, x.n as an, y.n as bn, x.claimed as ac, y.claimed as bc,
           x.is_minor = y.is_minor and x.hidden = y.hidden as same_flags,
           -- a row nothing hangs on: no match, no account, not hidden, not a minor
           x.n = 0 and not x.claimed and not x.hidden and not x.is_minor as a_empty,
           y.n = 0 and not y.claimed and not y.hidden and not y.is_minor as b_empty,
           least(length(x.fw), length(y.fw)) as short,
           case when x.k1 = y.k1 or x.k1 = y.k2 then 'exact'
                when core.name_sound(x.k1) in (core.name_sound(y.k1), core.name_sound(y.k2)) then 'sound'
                else 'prefix' end as key,
           (select coalesce(jsonb_agg(distinct t.name), '[]'::jsonb) from core.tournaments t
             where t.id in (select s1.t from seen s1 join seen s2 on s2.t = s1.t where s1.id = r.a and s2.id = r.b)) as shared
      from raw_pairs r join p x on x.id = r.a join p y on y.id = r.b
     where core.gender_fits(x.g, y.g)
       and not (x.claimed and y.claimed)
       and (x.birth_year is null or y.birth_year is null or abs(x.birth_year - y.birth_year) <= 1)
       and not exists (select 1 from core.match_participants m1 join core.match_participants m2 on m2.match_id = m1.match_id
                        where m1.player_id = r.a and m2.player_id = r.b)
       -- two entries in one draw are two people
       and not exists (select 1 from seen s1 join seen s2 on s2.t = s1.t and s2.tab = s1.tab where s1.id = r.a and s2.id = r.b)
       and not exists (select 1 from core.duplicate_dismissals dd where dd.a = r.a and dd.b = r.b)),
  kept as (
    select pr.* from pairs pr
     -- a first name that only fits needs the same tournament, or a row with nothing in it, to be worth a look
     where pr.key <> 'prefix' or jsonb_array_length(pr.shared) > 0 or least(pr.an, pr.bn) = 0),
  deg as (select z.id, count(*)::int as pairs from (select k.a as id from kept k union all select k.b from kept k) z group by z.id),
  judged as (
    select k.a, k.b, k.key, k.shared, k.an, k.bn, k.ac, k.bc,
           case
             -- the same name, and one of the two rows has no match and no account: nothing can be lost
             when k.key = 'exact' and k.same_flags and ((k.an = 0 and not k.ac) or (k.bn = 0 and not k.bc)) then 'sure'
             -- what the import now links by itself: an empty row from a draw and the one player of that tournament its
             -- name fits, with at least three letters of first name (an initial is not enough)
             when k.key <> 'exact' and jsonb_array_length(k.shared) > 0 and k.short >= 3
                  and ((k.a_empty and da.pairs = 1) or (k.b_empty and db.pairs = 1)) then 'sure'
             else 'likely' end as confidence
      from kept k join deg da on da.id = k.a join deg db on db.id = k.b)
  select j.a, j.b, s.keep, case when s.keep = j.a then j.b else j.a end, j.confidence,
         jsonb_build_object('key', j.key, 'shared_tournaments', j.shared, 'matches', jsonb_build_array(j.an, j.bn),
                            'claimed', jsonb_build_array(j.ac, j.bc))
    from judged j, lateral (select core.merge_survivor(j.a, j.b) as keep) s
$$;

-- one player as the duplicates desk shows them, side by side
create or replace function core.duplicate_side(p_id uuid)
returns jsonb language sql stable security definer set search_path = 'core', 'pg_temp' as $$
  select jsonb_build_object(
    'player_id', pl.id, 'first_name', pl.first_name, 'surname', pl.surname, 'gender', pl.gender,
    'birth_year', pl.birth_year, 'is_minor', pl.is_minor, 'hidden', pl.hidden, 'status', pl.status, 'source', pl.source,
    'area', (select ar.name_el from core.areas ar where ar.id = pl.area_id),
    'claimed_by', (select coalesce(pr.display_name, nullif(btrim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.surname, '')), ''))
                     from core.profiles pr where pr.user_id = pl.claimed_by_user_id),
    'matches', (select count(*) from core.match_participants mp where mp.player_id = pl.id),
    'tournaments', (select coalesce(jsonb_agg(x.name order by x.name), '[]'::jsonb) from (
                      select distinct t.name from core.tournaments t
                       where t.id in (select m.tournament_id from core.matches m join core.match_participants mp on mp.match_id = m.id
                                       where mp.player_id = pl.id)
                          or t.id in (select d.tournament_id from core.tournament_draws d where d.draw::text like '%' || pl.id::text || '%')
                       limit 6) x),
    'created_at', pl.created_at)
    from core.players pl where pl.id = p_id
$$;

-- «Διπλοί παίκτες»: counts, and one page of pairs for a tab (sure or likely)
create or replace function api.admin_duplicates(p_confidence text default 'sure', p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    with c as materialized (select * from core.duplicate_candidates())
    select jsonb_build_object(
      'counts', jsonb_build_object('sure', (select count(*) from c where confidence = 'sure'),
                                   'likely', (select count(*) from c where confidence = 'likely')),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object('a', core.duplicate_side(r.a), 'b', core.duplicate_side(r.b), 'keep', r.keep_id,
                                            'confidence', r.confidence, 'evidence', r.evidence) order by r.n)
          from (select c.*, row_number() over (order by (c.evidence ->> 'key') = 'exact' desc, c.a, c.b) as n
                  from c where c.confidence = coalesce(p_confidence, 'sure')
                 order by n
                 offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 25), 1), 200)) r), '[]'::jsonb)));
end;
$$;

-- every pair of a tab, light: the bulk merge walks this list in chunks and shows its progress
create or replace function api.admin_duplicate_pairs(p_confidence text default 'sure')
returns jsonb language plpgsql stable security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('keep', c.keep_id, 'drop', c.drop_id) order by c.a, c.b)
                     from core.duplicate_candidates() c where c.confidence = coalesce(p_confidence, 'sure')), '[]'::jsonb);
end;
$$;

-- merge pairs: [{keep, drop}]. Each pair on its own, so one refusal does not stop the rest. A pair given as sure is
-- checked against the sure list now; an account holder's row always stays.
create or replace function api.admin_merge_duplicates(p_pairs jsonb, p_confidence text default 'likely')
returns jsonb language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  r        jsonb;
  v_keep   uuid;
  v_drop   uuid;
  v_t      uuid;
  v_sure   jsonb := '[]'::jsonb;
  v_ev     jsonb;
  v_merged int := 0;
  v_skip   jsonb := '[]'::jsonb;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_pairs) <> 'array' or jsonb_array_length(p_pairs) > 100 then
    raise exception 'bad_pairs' using errcode = '22023';
  end if;
  if p_confidence = 'sure' then
    select coalesce(jsonb_agg(jsonb_build_object('a', c.a, 'b', c.b, 'evidence', c.evidence)), '[]'::jsonb) into v_sure
      from core.duplicate_candidates() c where c.confidence = 'sure';
  end if;
  for r in select * from jsonb_array_elements(p_pairs) loop
    begin
      -- a row merged earlier in this batch (a group of three) is followed to the one that stayed
      v_keep := core.current_player((r ->> 'keep')::uuid);
      v_drop := core.current_player((r ->> 'drop')::uuid);
      if v_keep = v_drop then
        v_skip := v_skip || jsonb_build_array(r || jsonb_build_object('reason', 'already_one'));
        continue;
      end if;
      if exists (select 1 from core.players where id = v_drop and claimed_by_user_id is not null) then
        v_t := v_keep; v_keep := v_drop; v_drop := v_t;
      end if;
      v_ev := null;
      if p_confidence = 'sure' then
        select e -> 'evidence' into v_ev from jsonb_array_elements(v_sure) e
         where (e ->> 'a')::uuid = least(v_keep, v_drop) and (e ->> 'b')::uuid = greatest(v_keep, v_drop);
        if v_ev is null then
          v_skip := v_skip || jsonb_build_array(r || jsonb_build_object('reason', 'not_sure_now'));
          continue;
        end if;
      end if;
      perform core.merge_player_how(v_drop, v_keep, auth.uid(), 'duplicates',
                                    coalesce(v_ev, '{}'::jsonb) || jsonb_build_object('confidence', coalesce(p_confidence, 'likely')));
      v_merged := v_merged + 1;
    exception when others then
      v_skip := v_skip || jsonb_build_array(r || jsonb_build_object('reason', sqlerrm));
    end;
  end loop;
  return jsonb_build_object('merged', v_merged, 'skipped', v_skip);
end;
$$;

-- «Not the same person»: the pair leaves the list for good
create or replace function api.admin_dismiss_duplicate(p_a uuid, p_b uuid)
returns jsonb language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_a is null or p_b is null or p_a = p_b then raise exception 'bad_pair' using errcode = '22023'; end if;
  insert into core.duplicate_dismissals (a, b, by_user) values (least(p_a, p_b), greatest(p_a, p_b), auth.uid())
  on conflict (a, b) do nothing;
  return jsonb_build_object('a', least(p_a, p_b), 'b', greatest(p_a, p_b));
end;
$$;

revoke all on function core.tournament_entrants(uuid) from public;
revoke all on function core.current_player(uuid) from public;
revoke all on function core.merge_player_how(uuid, uuid, uuid, text, jsonb) from public;
revoke all on function core.merge_survivor(uuid, uuid) from public;
revoke all on function core.duplicate_candidates() from public;
revoke all on function core.duplicate_side(uuid) from public;
revoke all on function api.admin_duplicates(text, int, int) from public, anon;
revoke all on function api.admin_duplicate_pairs(text) from public, anon;
revoke all on function api.admin_merge_duplicates(jsonb, text) from public, anon;
revoke all on function api.admin_dismiss_duplicate(uuid, uuid) from public, anon;
grant execute on function api.admin_duplicates(text, int, int) to authenticated, service_role;
grant execute on function api.admin_duplicate_pairs(text) to authenticated, service_role;
grant execute on function api.admin_merge_duplicates(jsonb, text) to authenticated, service_role;
grant execute on function api.admin_dismiss_duplicate(uuid, uuid) to authenticated, service_role;
