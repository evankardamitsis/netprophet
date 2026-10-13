-- The v1 names accent pass (queued 9 Oct, founder go-ahead 13 Oct): the roster came from v1 in capitals without
-- accents (ΠΑΠΑΔΟΠΟΥΛΟΣ ΓΙΩΡΓΟΣ), which reads loud on cards and inside quiz sentences. A spelling dictionary maps each
-- capital word to its written form (Παπαδόπουλος, Γιώργος); every player whose name is in capitals gets a proposal
-- built from it, word by word, and staff approve in bulk on /v2/names. Only case and accents ever change (the
-- letters stay the same), so search, aliases and import matching (normalize_search) see the same name before and
-- after. The dictionary rows are data, loaded and fixed by staff; words staff approved also spell new imports.

create table core.name_spellings (
  kind        text not null check (kind in ('first', 'surname')),
  caps_key    text not null,
  spelling    text not null,
  confidence  text not null default 'review' check (confidence in ('high', 'review')),
  source      text not null default 'proposed' check (source in ('proposed', 'staff')),
  approved    boolean not null default false,       -- used in an applied name, or saved by staff
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (kind, caps_key)
);
alter table core.name_spellings enable row level security;
comment on table core.name_spellings is 'Written forms of capital name words (the v1 accent pass). Staff only, through api.admin_*.';

-- the key a word is filed under: capitals, no accents or dialytika, final σ
create or replace function core.name_caps_key(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select upper(translate(coalesce(p, ''), 'άέήίόύώϊϋΐΰςΆΈΉΊΌΎΏΪΫ', 'αεηιουωιυιυσΑΕΗΙΟΥΩΙΥ'))
$$;

-- a word that needs spelling: Greek, all capitals
create or replace function core.name_is_caps(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p ~ '[Α-Ω]' and p = upper(p) and p !~ '[A-Za-z]'
$$;

-- a name spelled word by word (spaces and hyphens kept). p_mode 'any' takes any dictionary word, 'approved' only
-- words staff approved. Returns null when a capital word has no spelling; confidence is the weakest word's.
create or replace function core.name_spell(p_kind text, p_name text, p_mode text default 'any', out spelling text, out confidence text)
language plpgsql stable set search_path = core, pg_temp
as $$
declare
  t   record;
  s   core.name_spellings;
begin
  spelling := ''; confidence := 'high';
  if p_name is null then spelling := null; return; end if;
  for t in select m[1] as w, m[2] as sep from regexp_matches(p_name, '([^ -]+)([ -]*)', 'g') m loop
    if core.name_is_caps(t.w) then
      select * into s from core.name_spellings
       where kind = p_kind and caps_key = core.name_caps_key(t.w) and (p_mode = 'any' or approved);
      if s.caps_key is null then spelling := null; confidence := null; return; end if;
      spelling := spelling || s.spelling || t.sep;
      if s.confidence = 'review' and not s.approved then confidence := 'review'; end if;
      s := null;
    else
      spelling := spelling || t.w || t.sep;
    end if;
  end loop;
end;
$$;

-- every active player with a capital word in their name, and what the dictionary makes of it
create or replace function core.name_proposals()
returns table (player_id uuid, first_name text, surname text, proposed_first text, proposed_surname text,
               confidence text, claimed boolean)
language sql stable set search_path = core, pg_temp
as $$
  select p.id, p.first_name, p.surname, f.spelling, s.spelling,
         case when f.spelling is null or s.spelling is null then 'missing'
              when f.confidence = 'high' and s.confidence = 'high' then 'high' else 'review' end,
         p.claimed_by_user_id is not null
    from core.players p
    cross join lateral core.name_spell('first', p.first_name) f
    cross join lateral core.name_spell('surname', p.surname) s
   where p.status <> 'merged'
     and (core.name_is_caps(p.first_name) or core.name_is_caps(p.surname)
          or p.first_name ~ '(^|[ -])[Α-Ω]{2,}($|[ -])' or p.surname ~ '(^|[ -])[Α-Ω]{2,}($|[ -])')
$$;

-- ---------------------------------------------------------------------------
-- Staff API
-- ---------------------------------------------------------------------------
-- the desk: counts by confidence and a page of proposals (p_confidence 'high', 'review' or 'missing')
create or replace function api.admin_name_pass(p_confidence text default 'high', p_limit int default 100, p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
                 'high', count(*) filter (where confidence = 'high'),
                 'review', count(*) filter (where confidence = 'review'),
                 'missing', count(*) filter (where confidence = 'missing'))
                 from core.name_proposals()),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.surname, x.first_name)
        from (select * from core.name_proposals() where confidence = p_confidence
               order by surname, first_name limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) x),
      '[]'::jsonb),
    'words', coalesce((   -- the words behind the review and missing rows, for fixing at the source
      select jsonb_agg(jsonb_build_object('kind', w.kind, 'word', w.word, 'spelling', ns.spelling,
                                          'confidence', ns.confidence, 'players', w.n) order by w.n desc, w.word)
        from (select kind, core.name_caps_key(word) as word, count(*) as n
                from (select 'first' as kind, regexp_split_to_table(first_name, '[ -]+') as word from core.name_proposals() where confidence = p_confidence
                      union all
                      select 'surname', regexp_split_to_table(surname, '[ -]+') from core.name_proposals() where confidence = p_confidence) q
               where core.name_is_caps(word) group by 1, 2) w
        left join core.name_spellings ns on ns.kind = w.kind and ns.caps_key = w.word
       where p_confidence <> 'high' and (ns.caps_key is null or (ns.confidence = 'review' and not ns.approved))),
      '[]'::jsonb));
end;
$$;

-- fix or add a word: the spelling must be the same letters (case and accents only); it counts as approved
create or replace function api.admin_save_spelling(p_kind text, p_word text, p_spelling text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_key text := core.name_caps_key(btrim(p_word));
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('first', 'surname') then raise exception 'bad_kind' using errcode = '22023'; end if;
  if p_spelling is null or core.name_caps_key(btrim(p_spelling)) <> v_key or v_key = '' then
    raise exception 'not_same_letters' using errcode = '22023';
  end if;
  insert into core.name_spellings (kind, caps_key, spelling, confidence, source, approved, updated_by)
  values (p_kind, v_key, btrim(p_spelling), 'high', 'staff', true, auth.uid())
  on conflict (kind, caps_key) do update
    set spelling = excluded.spelling, confidence = 'high', source = 'staff', approved = true,
        updated_by = excluded.updated_by, updated_at = now();
  return jsonb_build_object('kind', p_kind, 'word', v_key, 'spelling', btrim(p_spelling));
end;
$$;

-- apply: the given players, or with null every proposal of that confidence. Only case and accents change; a
-- name edited since (no longer the same letters) is skipped. The words used become approved.
create or replace function api.admin_apply_names(p_player_ids uuid[] default null, p_confidence text default 'high')
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_player_ids is null and p_confidence is distinct from 'high' then
    raise exception 'pick_players' using errcode = '22023';   -- review rows are approved one by one or in a picked set
  end if;
  create temp table np_apply on commit drop as
  select * from core.name_proposals() x
   where x.confidence in ('high', 'review')
     and (p_player_ids is null and x.confidence = 'high' or x.player_id = any (p_player_ids))
     and core.name_caps_key(x.proposed_first) = core.name_caps_key(x.first_name)
     and core.name_caps_key(x.proposed_surname) = core.name_caps_key(x.surname);
  update core.players p set first_name = a.proposed_first, surname = a.proposed_surname, updated_at = now()
    from np_apply a where p.id = a.player_id;
  get diagnostics v_n = row_count;
  update core.name_spellings ns set approved = true
   where not ns.approved and exists (
     select 1 from np_apply a
      where (ns.kind = 'first' and ns.caps_key = any (regexp_split_to_array(core.name_caps_key(a.first_name), '[ -]+')))
         or (ns.kind = 'surname' and ns.caps_key = any (regexp_split_to_array(core.name_caps_key(a.surname), '[ -]+'))));
  drop table np_apply;
  return jsonb_build_object('applied', v_n);
end;
$$;

revoke all on function api.admin_name_pass(text, int, int) from public, anon;
revoke all on function api.admin_save_spelling(text, text, text) from public, anon;
revoke all on function api.admin_apply_names(uuid[], text) from public, anon;
grant execute on function api.admin_name_pass(text, int, int) to authenticated, service_role;
grant execute on function api.admin_save_spelling(text, text, text) to authenticated, service_role;
grant execute on function api.admin_apply_names(uuid[], text) to authenticated, service_role;

-- new players that arrive in capitals (organiser sheets) are spelled with the approved words, when every word is known
create or replace function core.players_spell_on_insert()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare f record; s record;
begin
  if core.name_is_caps(new.first_name) or core.name_is_caps(new.surname) then
    select * into f from core.name_spell('first', new.first_name, 'approved');
    select * into s from core.name_spell('surname', new.surname, 'approved');
    if f.spelling is not null and s.spelling is not null then
      new.first_name := f.spelling;
      new.surname := s.spelling;
    end if;
  end if;
  return new;
end;
$$;
create trigger players_spell_on_insert before insert on core.players
  for each row execute function core.players_spell_on_insert();
