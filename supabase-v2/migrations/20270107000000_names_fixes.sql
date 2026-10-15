-- Names (founder, 15 Oct 2026: "some do not save", "i need to edit suggestions if wrong", "remove some that are
-- wrong", and the 339 we did not know: "i think you can get most of them").
--
-- 1. A single letter (Α, Κ.) is an initial, not a word in capitals: it never needs spelling. «Α Γκόργκα» was listed
--    as ready, «Fix» changed nothing and the row stayed, so it looked like it did not save. A proposal that changes
--    nothing is no longer listed.
-- 2. Staff can leave a name as it is (dismiss: draw placeholders like «1 ΠΡΟΚΡΙΜΑΤΙΚΑ», «LL …») or rename a player by
--    hand to any spelling, typos included; the old name stays an alias so imports still find the player.
-- 3. «Fix» says which names it skipped (renamed since) instead of counting them silently.
-- 4. A wrong dictionary word can be removed.
-- 5. 315 of the 340 unknown words, spelled (only case and accents; 33 marked to check). Staff still press «Fix».

create or replace function core.name_is_caps(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p ~ '[Α-Ω][^Α-Ω]*[Α-Ω]' and p = upper(p) and p !~ '[A-Za-z]'
$$;

create table core.name_dismissals (
  player_id    uuid primary key references core.players (id) on delete cascade,
  dismissed_by uuid references auth.users (id) on delete set null,
  dismissed_at timestamptz not null default now()
);
alter table core.name_dismissals enable row level security;
comment on table core.name_dismissals is 'Names staff chose to leave as they are on /v2/names. Staff only, through api.admin_*.';

create or replace function core.name_proposals()
returns table (player_id uuid, first_name text, surname text, proposed_first text, proposed_surname text,
               confidence text, claimed boolean)
language sql stable set search_path = core, pg_temp
as $$
  select * from (
    select p.id, p.first_name, p.surname, f.spelling, s.spelling,
           case when f.spelling is null or s.spelling is null then 'missing'
                when f.spelling ~ '[Α-ΩA-Z]{2}' or s.spelling ~ '[Α-ΩA-Z]{2}' then 'review'   -- a word still in capitals
                when f.confidence = 'high' and s.confidence = 'high' then 'high' else 'review' end,
           p.claimed_by_user_id is not null
      from core.players p
      cross join lateral core.name_spell('first', p.first_name) f
      cross join lateral core.name_spell('surname', p.surname) s
     where p.status <> 'merged'
       and not exists (select 1 from core.name_dismissals d where d.player_id = p.id)
       and (core.name_is_caps(p.first_name) or core.name_is_caps(p.surname)
            or p.first_name ~ '(^|[ -])[Α-Ω]{2,}($|[ -])' or p.surname ~ '(^|[ -])[Α-Ω]{2,}($|[ -])')
  ) x (player_id, first_name, surname, proposed_first, proposed_surname, confidence, claimed)
  -- a proposal that changes nothing is not a proposal
  where x.proposed_first is null or x.proposed_surname is null
     or x.proposed_first is distinct from x.first_name or x.proposed_surname is distinct from x.surname
$$;

-- apply: as before, and the names it skipped (renamed since, no longer the same letters) come back by name
create or replace function api.admin_apply_names(p_player_ids uuid[] default null, p_confidence text default 'high')
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_n       int;
  v_skipped jsonb;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_player_ids is null and p_confidence is distinct from 'high' then
    raise exception 'pick_players' using errcode = '22023';   -- review rows are approved one by one or in a picked set
  end if;
  create temp table np_pick on commit drop as
  select * from core.name_proposals() x
   where x.confidence in ('high', 'review')
     and (p_player_ids is null and x.confidence = 'high' or x.player_id = any (p_player_ids));
  create temp table np_apply on commit drop as
  select * from np_pick x
   where core.name_caps_key(x.proposed_first) = core.name_caps_key(x.first_name)
     and core.name_caps_key(x.proposed_surname) = core.name_caps_key(x.surname);
  select coalesce(jsonb_agg(jsonb_build_object('player_id', x.player_id, 'name', btrim(coalesce(x.first_name, '') || ' ' || coalesce(x.surname, '')))), '[]'::jsonb)
    into v_skipped
    from np_pick x where not exists (select 1 from np_apply a where a.player_id = x.player_id);
  update core.players p set first_name = a.proposed_first, surname = a.proposed_surname, updated_at = now()
    from np_apply a where p.id = a.player_id;
  get diagnostics v_n = row_count;
  -- the words those names used become approved (collected once: one lookup per word, not per word and name)
  update core.name_spellings ns set approved = true
    from (select distinct 'first' as kind, w from np_apply, unnest(regexp_split_to_array(core.name_caps_key(first_name), '[ -]+')) w
          union
          select distinct 'surname', w from np_apply, unnest(regexp_split_to_array(core.name_caps_key(surname), '[ -]+')) w) x
   where ns.kind = x.kind and ns.caps_key = x.w and not ns.approved;
  drop table np_apply;
  drop table np_pick;
  return jsonb_build_object('applied', v_n, 'skipped', v_skipped);
end;
$$;

-- leave a name as it is: it leaves the list (a draw placeholder, a name that is right as written)
create or replace function api.admin_dismiss_name(p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from core.players where id = p_player_id) then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  insert into core.name_dismissals (player_id, dismissed_by) values (p_player_id, auth.uid()) on conflict (player_id) do nothing;
  return jsonb_build_object('player_id', p_player_id, 'dismissed', true);
end;
$$;

-- rename one player by hand, any letters (a typo in the source, a wrong suggestion); the old name stays an alias so
-- imports and search still find them
create or replace function api.admin_rename_player(p_player_id uuid, p_first text, p_surname text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_p     core.players;
  v_first text := btrim(coalesce(p_first, ''));
  v_sur   text := btrim(coalesce(p_surname, ''));
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_sur = '' then raise exception 'name_required' using errcode = '22023'; end if;
  select * into v_p from core.players where id = p_player_id and status <> 'merged' for update;
  if v_p.id is null then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  insert into core.player_aliases (alias_norm, player_id, created_by)
  values (core.normalize_search(btrim(coalesce(v_p.surname, '') || ' ' || coalesce(v_p.first_name, ''))), p_player_id, auth.uid())
  on conflict (alias_norm) do nothing;
  update core.players set first_name = nullif(v_first, ''), surname = v_sur, updated_at = now() where id = p_player_id;
  return jsonb_build_object('player_id', p_player_id, 'first_name', nullif(v_first, ''), 'surname', v_sur);
end;
$$;

-- remove a wrong word from the dictionary; names already fixed keep their spelling
create or replace function api.admin_forget_spelling(p_kind text, p_word text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from core.name_spellings where kind = p_kind and caps_key = core.name_caps_key(btrim(p_word));
  get diagnostics v_n = row_count;
  return jsonb_build_object('removed', v_n);
end;
$$;

revoke all on function api.admin_dismiss_name(uuid) from public, anon;
revoke all on function api.admin_rename_player(uuid, text, text) from public, anon;
revoke all on function api.admin_forget_spelling(text, text) from public, anon;
grant execute on function api.admin_dismiss_name(uuid) to authenticated, service_role;
grant execute on function api.admin_rename_player(uuid, text, text) to authenticated, service_role;
grant execute on function api.admin_forget_spelling(text, text) to authenticated, service_role;

-- the words we did not know (15 Oct): a staff-checked list of spellings, same letters only. Words staff already
-- spelled are left alone.
insert into core.name_spellings (kind, caps_key, spelling, confidence, source)
values
  ('first', 'ΔΗΜ', 'Δημ', 'high', 'proposed'),
  ('first', 'ΝΙΚ', 'Νικ', 'high', 'proposed'),
  ('first', 'ΘΑΝ', 'Θαν', 'high', 'proposed'),
  ('first', 'ΒΑΣ', 'Βασ', 'high', 'proposed'),
  ('surname', 'ΣΑΡΛΗ', 'Σαρλή', 'high', 'proposed'),
  ('first', 'ΜΙΧ', 'Μιχ', 'high', 'proposed'),
  ('first', 'ΘΟΔ', 'Θοδ', 'high', 'proposed'),
  ('surname', 'ΜΙΚΡΑΚΗΣ', 'Μικράκης', 'high', 'proposed'),
  ('surname', 'ΜΑΝΟΠΟΥΛΟΣ', 'Μανόπουλος', 'high', 'proposed'),
  ('surname', 'ΚΑΠΕΛΛΑ', 'Καπέλλα', 'high', 'proposed'),
  ('surname', 'ΣΚΟΡΔΑΚΗ', 'Σκορδάκη', 'high', 'proposed'),
  ('surname', 'ΒΑΟΥΤΣΗ', 'Βαούτση', 'high', 'proposed'),
  ('surname', 'ΚΑΠΠΑΤΟΥ', 'Καππάτου', 'high', 'proposed'),
  ('surname', 'ΟΛΥΜΠΙΟΣ', 'Ολύμπιος', 'high', 'proposed'),
  ('first', 'ΜΑΡΙΝΑ', 'Μαρίνα', 'high', 'proposed'),
  ('surname', 'ΣΤΕΦΑΝΙΔΟΥ', 'Στεφανίδου', 'high', 'proposed'),
  ('first', 'ΙΑΚ', 'Ιακ', 'high', 'proposed'),
  ('surname', 'ΛΙΑΠΗ', 'Λιάπη', 'high', 'proposed'),
  ('first', 'ΑΝΝΑ', 'Άννα', 'high', 'proposed'),
  ('surname', 'ΧΡΥΣΑΝΘΑΚΗ', 'Χρυσανθάκη', 'high', 'proposed'),
  ('surname', 'ΜΠΕΛΕΚΟΥ', 'Μπελέκου', 'review', 'proposed'),
  ('first', 'ΜΑΝ', 'Μαν', 'high', 'proposed'),
  ('surname', 'ΜΠΙΤΖΙΔΗΣ', 'Μπιτζίδης', 'high', 'proposed'),
  ('surname', 'ΤΣΙΡΙΓΩΤΗΣ', 'Τσιριγώτης', 'high', 'proposed'),
  ('first', 'ΡΕΝΑ', 'Ρένα', 'high', 'proposed'),
  ('surname', 'ΣΟΥΣΟΥΔΗΣ', 'Σουσούδης', 'high', 'proposed'),
  ('surname', 'ΜΟΥΡΙΚΗ', 'Μουρίκη', 'high', 'proposed'),
  ('surname', 'ΣΑΡΡΗΣ', 'Σαρρής', 'high', 'proposed'),
  ('first', 'ΚΩΣΤΑΝΤΙΝΟΣ', 'Κωσταντίνος', 'high', 'proposed'),
  ('surname', 'ΠΑΥΛΟΥ', 'Παύλου', 'high', 'proposed'),
  ('surname', 'ΓΙΑΝΝΙΚΟΥ', 'Γιαννίκου', 'review', 'proposed'),
  ('first', 'ΧΑΡ', 'Χαρ', 'high', 'proposed'),
  ('surname', 'ΠΕΠΠΑ', 'Πέππα', 'high', 'proposed'),
  ('surname', 'ΡΑΦΤΟΠΟΥΛΟΥ', 'Ραφτοπούλου', 'high', 'proposed'),
  ('surname', 'ΣΑΓΙΑΣ', 'Σάγιας', 'high', 'proposed'),
  ('surname', 'ΛΑΓΟΥ', 'Λάγου', 'high', 'proposed'),
  ('surname', 'ΚΡΟΝΤΗΡΗ', 'Κροντήρη', 'high', 'proposed'),
  ('surname', 'ΚΟΡΔΑΛΗ', 'Κορδαλή', 'high', 'proposed'),
  ('surname', 'ΚΑΖΑΝΤΖΙΔΟΥ', 'Καζαντζίδου', 'high', 'proposed'),
  ('surname', 'ΓΙΑΚΟΣ', 'Γιάκος', 'high', 'proposed'),
  ('surname', 'ΚΟΡΥΛΟΣ', 'Κορύλος', 'review', 'proposed'),
  ('surname', 'ΜΟΣΧΟΝΑΣ', 'Μοσχονάς', 'high', 'proposed'),
  ('first', 'ΕΥΑΓ', 'Ευαγ', 'high', 'proposed'),
  ('surname', 'ΤΖΟΥΣΤΑΚΗ', 'Τζουστάκη', 'high', 'proposed'),
  ('surname', 'ΜΠΑΚΟΛΑΣ', 'Μπακόλας', 'high', 'proposed'),
  ('surname', 'ΚΑΠΕΤΑΝΟΣ', 'Καπετάνος', 'high', 'proposed'),
  ('surname', 'ΜΑΡΙΝΟΥ', 'Μαρίνου', 'high', 'proposed'),
  ('surname', 'ΡΕΒΒΑ', 'Ρέββα', 'high', 'proposed'),
  ('surname', 'ΓΑΤΟΣ', 'Γάτος', 'high', 'proposed'),
  ('surname', 'ΣΩΤΗΡΙΟΥ', 'Σωτηρίου', 'high', 'proposed'),
  ('surname', 'ΓΚΙΝΗ', 'Γκίνη', 'high', 'proposed'),
  ('surname', 'ΓΕΜΟΥΧΙΔΗΣ', 'Γεμουχίδης', 'high', 'proposed'),
  ('surname', 'ΜΠΡΙΛΑΚΗΣ', 'Μπριλάκης', 'high', 'proposed'),
  ('surname', 'ΜΑΡΓΕΤΗ', 'Μαργέτη', 'high', 'proposed'),
  ('first', 'ΙΑΣΩΝΑΣ', 'Ιάσωνας', 'high', 'proposed'),
  ('surname', 'ΙΩΑΝΝΟΥ', 'Ιωάννου', 'high', 'proposed'),
  ('surname', 'ΕΥΣΤΡΑΤΙΟΥ', 'Ευστρατίου', 'high', 'proposed'),
  ('first', 'ΚΥΡ', 'Κυρ', 'high', 'proposed'),
  ('first', 'ΔΑΝΑΗ', 'Δανάη', 'high', 'proposed'),
  ('surname', 'ΠΕΤΖΕΤΑΚΗ', 'Πετζετάκη', 'high', 'proposed'),
  ('first', 'ΝΕΛΛΗ', 'Νέλλη', 'high', 'proposed'),
  ('surname', 'ΣΑΚΑΛΟΓΛΟΥ', 'Σακάλογλου', 'high', 'proposed'),
  ('surname', 'ΚΛΟΥΔΑΣ', 'Κλούδας', 'high', 'proposed'),
  ('surname', 'ΚΑΛΠΟΓΙΑΝΝΗΣ', 'Καλπογιάννης', 'high', 'proposed'),
  ('first', 'ΧΡ', 'Χρ', 'high', 'proposed'),
  ('first', 'ΜΑΡΙΑΝΝΑ', 'Μαριάννα', 'high', 'proposed'),
  ('surname', 'ΧΡΟΝΗΣ', 'Χρόνης', 'high', 'proposed'),
  ('surname', 'ΣΜΥΡΝΙΟΤΟΠΟΥΛΟΣ', 'Σμυρνιοτόπουλος', 'high', 'proposed'),
  ('first', 'ΓΙΑΓΚ.', 'Γιαγκ.', 'high', 'proposed'),
  ('first', 'ΒΕΛΙΣΚΟ', 'Βελίσκο', 'review', 'proposed'),
  ('surname', 'ΧΑΜΠΕΡΗΣ', 'Χαμπέρης', 'high', 'proposed'),
  ('surname', 'ΠΑΠΑΣΚΑΡΛΑΤΟΣ', 'Παπασκαρλάτος', 'high', 'proposed'),
  ('surname', 'ΣΤΑΥΡΟΠΟΥΛΟΣ', 'Σταυρόπουλος', 'high', 'proposed'),
  ('first', 'ΦΑΝΗ', 'Φανή', 'high', 'proposed'),
  ('first', 'ΓΕΩΡΓ', 'Γεωργ', 'high', 'proposed'),
  ('surname', 'ΧΛΟΨΙΔΗΣ', 'Χλοψίδης', 'high', 'proposed'),
  ('first', 'ΧΡΥΣΑ', 'Χρύσα', 'high', 'proposed'),
  ('first', 'ΣΜΑΡ.', 'Σμαρ.', 'high', 'proposed'),
  ('first', 'ΒΛΑΔ', 'Βλαδ', 'high', 'proposed'),
  ('first', 'ΕΛΣΑ', 'Έλσα', 'high', 'proposed'),
  ('first', 'ΑΛΕΚΟΣ', 'Αλέκος', 'high', 'proposed'),
  ('surname', 'ΚΑΤΑΠΟΔΗ', 'Καταπόδη', 'high', 'proposed'),
  ('first', 'ΒΙΒΙΑΝ', 'Βίβιαν', 'high', 'proposed'),
  ('surname', 'ΖΑΦΕΙΡΑΚΟΥ', 'Ζαφειράκου', 'high', 'proposed'),
  ('surname', 'ΚΑΡΑΜΠΑΤΣΟΥ', 'Καραμπάτσου', 'high', 'proposed'),
  ('surname', 'ΒΟΥΡΚΟΥΤΙΩΤΗΣ', 'Βουρκουτιώτης', 'high', 'proposed'),
  ('surname', 'ΣΙΔΗΡΑ', 'Σιδηρά', 'review', 'proposed'),
  ('first', 'ΑΝΘΗ', 'Ανθή', 'high', 'proposed'),
  ('first', 'ΣΙΣΣΥ', 'Σίσσυ', 'high', 'proposed'),
  ('surname', 'ΘΕΟΔΩΡΕΛΗ', 'Θεοδωρέλη', 'high', 'proposed'),
  ('surname', 'ΒΕΡΙΓΟΣ', 'Βερίγος', 'high', 'proposed'),
  ('surname', 'ΛΕΜΠΕΡΟΥ', 'Λεμπέρου', 'review', 'proposed'),
  ('first', 'ΠΑΥΛ', 'Παυλ', 'high', 'proposed'),
  ('first', 'ΠΕΤΡ', 'Πετρ', 'high', 'proposed'),
  ('surname', 'ΠΑΝΑΓΙΟΤΙΔΗΣ', 'Παναγιοτίδης', 'review', 'proposed'),
  ('first', 'ΑΛΕΞΙΑ', 'Αλεξία', 'high', 'proposed'),
  ('surname', 'ΠΕΡΙΣΤΕΡΑ', 'Περιστερά', 'high', 'proposed'),
  ('surname', 'ΛΟΥΚΑΙΤΗΣ', 'Λουκαΐτης', 'high', 'proposed'),
  ('first', 'ΜΑΡΙΛΕΝΑ', 'Μαριλένα', 'high', 'proposed'),
  ('surname', 'ΤΖΙΩΤΖΙΟΣ', 'Τζιώτζιος', 'high', 'proposed'),
  ('first', 'ΛΟΥΚ', 'Λουκ', 'high', 'proposed'),
  ('first', 'ΑΛΚ', 'Αλκ', 'high', 'proposed'),
  ('surname', 'ΣΙΑΧΑΜΗΣ', 'Σιαχάμης', 'high', 'proposed'),
  ('surname', 'ΓΕΜΙΔΟΠΟΥΛΟΥ', 'Γεμιδοπούλου', 'high', 'proposed'),
  ('first', 'ΜΗΝ', 'Μην', 'high', 'proposed'),
  ('surname', 'ΚΑΛΛΙΒΡΟΥΣΗΣ', 'Καλλιβρούσης', 'high', 'proposed'),
  ('surname', 'ΝΤΟΥΡΝΤΟΥΡΕΚΑ', 'Ντουρντουρέκα', 'high', 'proposed'),
  ('surname', 'ΦΥΛΑΚΤΟΥ', 'Φυλακτού', 'high', 'proposed'),
  ('surname', 'ΚΑΝΕΛΟΣ', 'Κανέλος', 'high', 'proposed'),
  ('first', 'ΕΥΓ', 'Ευγ', 'high', 'proposed'),
  ('first', 'ΑΔΑΜ', 'Αδάμ', 'high', 'proposed'),
  ('first', 'ΒΑΓΓ', 'Βαγγ', 'high', 'proposed'),
  ('surname', 'ΝΤΡΑΓΚΙΣΕΒΙΤΣ', 'Ντραγκίσεβιτς', 'high', 'proposed'),
  ('surname', 'ΠΑΠΑΚΩΣΤΑΝΤΙΝΟΥ', 'Παπακωσταντίνου', 'high', 'proposed'),
  ('surname', 'ΑΝΑΓΝΩΣΤΟΠΟΥΛΟΥ', 'Αναγνωστοπούλου', 'high', 'proposed'),
  ('first', 'ΗΡΩ', 'Ηρώ', 'high', 'proposed'),
  ('surname', 'ΠΑΛΑΜΗΔΗΣ', 'Παλαμήδης', 'high', 'proposed'),
  ('surname', 'ΧΡΙΣΤΟΛΟΥΚΑΣ', 'Χριστολούκας', 'high', 'proposed'),
  ('surname', 'ΚΑΡΔΑΜΗΤΣΗΣ', 'Καρδαμήτσης', 'high', 'proposed'),
  ('first', 'ΤΖΙΝΑ', 'Τζίνα', 'high', 'proposed'),
  ('surname', 'ΤΣΙΛΙΒΙΓΚΟΣ', 'Τσιλιβίγκος', 'high', 'proposed'),
  ('surname', 'ΠΑΙΠΕΤΗΣ', 'Παϊπέτης', 'high', 'proposed'),
  ('surname', 'ΝΙΚΟΛΑΚΗ', 'Νικολάκη', 'high', 'proposed'),
  ('surname', 'ΑΣΛΑΝΙΔΗΣ', 'Ασλανίδης', 'high', 'proposed'),
  ('first', 'ΛΑΡΥ', 'Λάρυ', 'high', 'proposed'),
  ('surname', 'ΒΑΡΟΥΤΣΑΣ', 'Βαρούτσας', 'high', 'proposed'),
  ('surname', 'ΚΡΑΝΙΔΗΣ', 'Κρανίδης', 'high', 'proposed'),
  ('first', 'ΔΕΥ', 'Δευ', 'review', 'proposed'),
  ('surname', 'ΓΙΑΝΝΑΚΟΠΟΥΛΟΥ', 'Γιαννακοπούλου', 'high', 'proposed'),
  ('first', 'ΠΑΡΑΣΚΕΥΗ', 'Παρασκευή', 'high', 'proposed'),
  ('first', 'ΜΑΡΙ', 'Μαρι', 'review', 'proposed'),
  ('surname', 'ΝΙΚΗΤΟΥ', 'Νικήτου', 'review', 'proposed'),
  ('first', 'ΚΡΕΜΥΔΑ', 'Κρεμύδα', 'review', 'proposed'),
  ('first', 'ΘΑΝ.', 'Θαν.', 'high', 'proposed'),
  ('first', 'ΡΟΔΟΛΦ', 'Ροδολφ', 'review', 'proposed'),
  ('surname', 'ΤΣΕΡΠΕΣ', 'Τσέρπες', 'high', 'proposed'),
  ('surname', 'ΑΡΜΑΟΣ', 'Αρμάος', 'high', 'proposed'),
  ('first', 'ΜΑΝΩΛ', 'Μανωλ', 'high', 'proposed'),
  ('first', 'ΑΝΔΡ.', 'Ανδρ.', 'high', 'proposed'),
  ('first', 'ΔΟΝΑΤΟΣ', 'Δονάτος', 'review', 'proposed'),
  ('first', 'ΣΤΕΡΓΙΑ', 'Στεργία', 'high', 'proposed'),
  ('first', 'ΑΡΙΑΝΝΑ', 'Αριάννα', 'high', 'proposed'),
  ('surname', 'ΜΠΕΛΙΤΣΗΣ', 'Μπελίτσης', 'high', 'proposed'),
  ('first', 'ΣΩΤ', 'Σωτ', 'high', 'proposed'),
  ('surname', 'ΠΑΠΑΕΛΕΥΘΕΡΙΟΥ', 'Παπαελευθερίου', 'high', 'proposed'),
  ('first', 'ΔΟΥΚ', 'Δουκ', 'high', 'proposed'),
  ('surname', 'ΤΣΙΝΤΖΟΥ', 'Τσίντζου', 'high', 'proposed'),
  ('first', 'ΑΝΑΣΤΑΣΙΑ', 'Αναστασία', 'high', 'proposed'),
  ('surname', 'ΣΙΑΒΕΛΗ', 'Σιαβέλη', 'high', 'proposed'),
  ('surname', 'ΠΕΤΡΑΚΗ', 'Πετράκη', 'high', 'proposed'),
  ('surname', 'ΧΕΛΜΗΣ', 'Χέλμης', 'high', 'proposed'),
  ('first', 'ΓΙΟΛΑΝΤΑ', 'Γιολάντα', 'high', 'proposed'),
  ('surname', 'ΜΑΙΛΛΗ', 'Μαΐλλη', 'review', 'proposed'),
  ('first', 'ΚΙΚΗ', 'Κική', 'high', 'proposed'),
  ('first', 'ΓΩΝΗ', 'Γωνή', 'review', 'proposed'),
  ('surname', 'ΚΩΣΤΑΝΤΕΛΟΥ', 'Κωσταντέλου', 'high', 'proposed'),
  ('first', 'ΧΡΙΣΤ', 'Χριστ', 'high', 'proposed'),
  ('first', 'ΑΓΓΕΛΙΚΗ', 'Αγγελική', 'high', 'proposed'),
  ('surname', 'ΤΡΙΓΚΑΚΗ', 'Τριγκάκη', 'high', 'proposed'),
  ('surname', 'ΚΟΛΩΝΙΑΣ', 'Κολωνιάς', 'review', 'proposed'),
  ('first', 'ΑΛ', 'Αλ', 'high', 'proposed'),
  ('surname', 'ΚΑΠΟΓΙΑΝΝΗ', 'Καπογιάννη', 'high', 'proposed'),
  ('surname', 'ΩΡΟΛΟΓΙΔΗΣ', 'Ωρολογίδης', 'high', 'proposed'),
  ('surname', 'ΣΑΡΑΦΙΔΗΣ', 'Σαραφίδης', 'high', 'proposed'),
  ('surname', 'ΚΟΥΜΙΤΖΕΛΗΣ', 'Κουμιτζέλης', 'high', 'proposed'),
  ('surname', 'ΠΑΝΑΓΙΩΤΙΔΗ', 'Παναγιωτίδη', 'high', 'proposed'),
  ('surname', 'ΜΟΥΣΑΒΕΡΕΣ', 'Μουσαβέρες', 'review', 'proposed'),
  ('surname', 'ΔΕΛΛΗΓΙΑΝΝΑΚΗΣ', 'Δελληγιαννάκης', 'review', 'proposed'),
  ('surname', 'ΜΠΟΥΡΤΖΟΣ', 'Μπούρτζος', 'high', 'proposed'),
  ('surname', 'ΦΛΑΣΚΗΣ', 'Φλάσκης', 'high', 'proposed'),
  ('first', 'ΚΛΕΩΝ', 'Κλέων', 'high', 'proposed'),
  ('first', 'ΑΓΓ.', 'Αγγ.', 'high', 'proposed'),
  ('surname', 'ΚΟΤΖΑΚΟΛΙΟΥ', 'Κοτζακολίου', 'high', 'proposed'),
  ('first', 'ΖΩΗ', 'Ζωή', 'high', 'proposed'),
  ('first', 'ΝΤ', 'Ντ', 'high', 'proposed'),
  ('first', 'ΚΙΜ', 'Κιμ', 'high', 'proposed'),
  ('surname', 'ΣΑΒΒΑ', 'Σάββα', 'high', 'proposed'),
  ('first', 'ΑΦΡΟΔ.', 'Αφροδ.', 'high', 'proposed'),
  ('surname', 'ΑΓΑΤΣΑ', 'Αγάτσα', 'high', 'proposed'),
  ('first', 'ΔΩΡΑ', 'Δώρα', 'high', 'proposed'),
  ('surname', 'ΠΑΝΑΓΙΩΤΙΔΟΥ', 'Παναγιωτίδου', 'high', 'proposed'),
  ('surname', 'ΚΟΥΤΣΟΥΛΗΣ', 'Κουτσούλης', 'high', 'proposed'),
  ('surname', 'ΚΑΡΟΥΝΟΥ', 'Καρούνου', 'review', 'proposed'),
  ('first', 'ΜΑΓΔΑ', 'Μάγδα', 'high', 'proposed'),
  ('surname', 'ΜΑΤΖΑΒΙΝΟΣ', 'Ματζαβίνος', 'high', 'proposed'),
  ('surname', 'ΚΟΡΟΠΟΥΛΗ', 'Κοροπούλη', 'high', 'proposed'),
  ('surname', 'ΠΑΝΑΓΙΩΤΟΠΟΥΛΟΥ', 'Παναγιωτοπούλου', 'high', 'proposed'),
  ('first', 'ΒΑΣΙΛ', 'Βασιλ', 'high', 'proposed'),
  ('first', 'ΑΘΗΝΑ', 'Αθηνά', 'high', 'proposed'),
  ('first', 'ΣΤ.', 'Στ.', 'high', 'proposed'),
  ('surname', 'ΑΠΟΣΤΟΛΟΠΟΥΛΟΥ', 'Αποστολοπούλου', 'high', 'proposed'),
  ('surname', 'ΖΥΓΟΓΙΑΝΝΗ', 'Ζυγογιάννη', 'high', 'proposed'),
  ('first', 'ΚΩΣΤ', 'Κωστ', 'high', 'proposed'),
  ('first', 'ΧΡΥΣΟΣΤ', 'Χρυσοστ', 'high', 'proposed'),
  ('surname', 'ΒΑΤΖΕΔΑΚΗΣ', 'Βατζεδάκης', 'high', 'proposed'),
  ('surname', 'ΚΑΡΑΦΥΛΛΙΔΗΣ', 'Καραφυλλίδης', 'high', 'proposed'),
  ('surname', 'ΚΑΚΚΑΒΗΣ', 'Κακκάβης', 'review', 'proposed'),
  ('surname', 'ΓΙΑΝΝΙΩΤΗ', 'Γιαννιώτη', 'high', 'proposed'),
  ('surname', 'ΒΟΥΡΟΥ', 'Βούρου', 'high', 'proposed'),
  ('surname', 'ΧΟΥ', 'Χου', 'review', 'proposed'),
  ('first', 'ΤΑΚ', 'Τακ', 'high', 'proposed'),
  ('first', 'ΒΑΓ', 'Βαγ', 'high', 'proposed'),
  ('first', 'ΔΗΜΗΤΡ.', 'Δημητρ.', 'high', 'proposed'),
  ('surname', 'ΡΕΤΣΟΣ', 'Ρέτσος', 'high', 'proposed'),
  ('first', 'ΑΝΔ', 'Ανδ', 'high', 'proposed'),
  ('surname', 'ΠΑΛΙΟΛΟΓΟΣ', 'Παλιολόγος', 'high', 'proposed'),
  ('first', 'ΒΑΣΩ', 'Βάσω', 'high', 'proposed'),
  ('surname', 'ΜΑΛΕΑΣ', 'Μαλέας', 'high', 'proposed'),
  ('surname', 'ΤΑΤΑΡΙΔΑ', 'Ταταρίδα', 'high', 'proposed'),
  ('surname', 'ΛΟΙΖΟΥ', 'Λοΐζου', 'high', 'proposed'),
  ('surname', 'ΚΟΡΔΩΣΗΣ', 'Κορδώσης', 'high', 'proposed'),
  ('surname', 'ΔΕΛΛΗ', 'Δέλλη', 'review', 'proposed'),
  ('first', 'ΠΕΡΙΚ.', 'Περικ.', 'high', 'proposed'),
  ('first', 'ΓΡ', 'Γρ', 'high', 'proposed'),
  ('surname', 'ΖΑΝΝΗΣ', 'Ζάννης', 'high', 'proposed'),
  ('first', 'ΚΑΤ.', 'Κατ.', 'high', 'proposed'),
  ('surname', 'ΣΑΡΡΗ', 'Σαρρή', 'high', 'proposed'),
  ('surname', 'ΗΛΙΟΠΟΥΛΟΥ', 'Ηλιοπούλου', 'high', 'proposed'),
  ('first', 'ΒΙΚΥ', 'Βίκυ', 'high', 'proposed'),
  ('first', 'ΕΛ', 'Ελ', 'high', 'proposed'),
  ('surname', 'ΦΙΤΣΙΟΥ', 'Φίτσιου', 'review', 'proposed'),
  ('first', 'ΑΡΙΑ.', 'Αρια.', 'high', 'proposed'),
  ('first', 'ΣΑΒ', 'Σαβ', 'high', 'proposed'),
  ('first', 'ΜΥΡΤΩ', 'Μυρτώ', 'high', 'proposed'),
  ('first', 'ΣΤΕΛΛΑ', 'Στέλλα', 'high', 'proposed'),
  ('surname', 'ΑΝΔΡΙΑ', 'Ανδριά', 'review', 'proposed'),
  ('surname', 'ΣΙΑΜΙΔΗΣ', 'Σιαμίδης', 'high', 'proposed'),
  ('first', 'ΑΝΤΖΕΛΑ', 'Άντζελα', 'high', 'proposed'),
  ('surname', 'ΚΟΣΤΖΕΒΑ', 'Κοστζέβα', 'high', 'proposed'),
  ('first', 'ΣΤΕΦΗ', 'Στέφη', 'high', 'proposed'),
  ('first', 'ΧΡΗΣΤ', 'Χρηστ', 'high', 'proposed'),
  ('first', 'ΙΟΛΗ', 'Ιόλη', 'high', 'proposed'),
  ('surname', 'ΚΑΤΣΙΜΙΧΑΣ', 'Κατσιμίχας', 'high', 'proposed'),
  ('first', 'ΕΥΘ.', 'Ευθ.', 'high', 'proposed'),
  ('surname', 'ΜΥΡΩΝΙΔΗΣ', 'Μυρωνίδης', 'high', 'proposed'),
  ('surname', 'ΑΓΙΑΚΛΟΓΛΟΥ', 'Αγιάκλογλου', 'review', 'proposed'),
  ('first', 'ΣΤΑΥΡΟΥΛΑ', 'Σταυρούλα', 'high', 'proposed'),
  ('first', 'ΑΦΡΟΔΙΤ.', 'Αφροδιτ.', 'high', 'proposed'),
  ('surname', 'ΜΑΝΑΚΟΣ', 'Μανάκος', 'high', 'proposed'),
  ('first', 'ΠΕΝΥ', 'Πένυ', 'high', 'proposed'),
  ('surname', 'ΠΑΧΥΓΙΑΝΝΗΣ', 'Παχυγιάννης', 'high', 'proposed'),
  ('surname', 'ΓΕΝΝΗΜΑΤΑ', 'Γεννηματά', 'high', 'proposed'),
  ('first', 'ΠΕΠΥ', 'Πέπυ', 'high', 'proposed'),
  ('surname', 'ΒΑΡΤΗΣ', 'Βάρτης', 'high', 'proposed'),
  ('first', 'ΣΥΛΙΑ', 'Σύλια', 'review', 'proposed'),
  ('surname', 'ΧΟΝΔΡΟΣ', 'Χόνδρος', 'high', 'proposed'),
  ('surname', 'ΑΡΜΟΥ', 'Άρμου', 'review', 'proposed'),
  ('first', 'ΜΑΡ', 'Μαρ', 'high', 'proposed'),
  ('surname', 'ΟΚΣΑΝΑ', 'Οκσάνα', 'high', 'proposed'),
  ('first', 'ΘΕΟΔΩΡΑ', 'Θεοδώρα', 'high', 'proposed'),
  ('surname', 'ΛΟΥΠΟΣ', 'Λούπος', 'high', 'proposed'),
  ('first', 'ΧΡΥΣ', 'Χρυσ', 'high', 'proposed'),
  ('first', 'ΣΕΜΙΝΑ', 'Σεμίνα', 'review', 'proposed'),
  ('first', 'ΓΙΩ', 'Γιω', 'high', 'proposed'),
  ('surname', 'ΚΥΡΙΤΣΗΣ', 'Κυρίτσης', 'high', 'proposed'),
  ('surname', 'ΧΑΡΑΛΑΜΠΙΔΗΣ', 'Χαραλαμπίδης', 'high', 'proposed'),
  ('surname', 'ΕΥΑΓΓΕΛΟΥ', 'Ευαγγέλου', 'high', 'proposed'),
  ('surname', 'ΧΕΝΡΙ', 'Χένρι', 'high', 'proposed'),
  ('first', 'ΦΡΑΝΚ', 'Φρανκ', 'high', 'proposed'),
  ('surname', 'ΓΑΤΟΥ', 'Γάτου', 'high', 'proposed'),
  ('surname', 'ΣΩΤΗΡΧΟΣ', 'Σωτήρχος', 'high', 'proposed'),
  ('surname', 'ΣΑΝΙΔΑΣ', 'Σανιδάς', 'review', 'proposed'),
  ('surname', 'ΠΑΠΑΔΟΓΓΟΝΑΣ', 'Παπαδογγονάς', 'high', 'proposed'),
  ('first', 'ΛΕΝΑ', 'Λένα', 'high', 'proposed'),
  ('first', 'ΠΑΡ', 'Παρ', 'high', 'proposed'),
  ('first', 'ΑΥΓ', 'Αυγ', 'high', 'proposed'),
  ('surname', 'ΣΑΡΔΑΚΗΣ', 'Σαρδάκης', 'high', 'proposed'),
  ('first', 'ΠΑΡΙΣ', 'Πάρις', 'high', 'proposed'),
  ('surname', 'ΓΚΡΙΟΓΛΟΥ', 'Γκρίογλου', 'high', 'proposed'),
  ('first', 'ΑΝΤΩΝΙΟΣ', 'Αντώνιος', 'high', 'proposed'),
  ('surname', 'ΠΕΤΣΕΤΑΚΗ', 'Πετσετάκη', 'high', 'proposed'),
  ('first', 'ΑΓΝΕΣ', 'Άγνες', 'high', 'proposed'),
  ('surname', 'ΜΕΤΑΞΟΠΟΥΛΟΣ', 'Μεταξόπουλος', 'high', 'proposed'),
  ('surname', 'ΕΥΤΑΞΙΑΣ', 'Ευταξίας', 'high', 'proposed'),
  ('first', 'ΛΟΥΚΙΑ', 'Λουκία', 'high', 'proposed'),
  ('first', 'ΜΠΕΚΥ', 'Μπέκυ', 'high', 'proposed'),
  ('surname', 'ΜΙΧΑΛΟΠΟΥΛΟΥ', 'Μιχαλοπούλου', 'high', 'proposed'),
  ('surname', 'ΦΛΩΡΟΠΟΥΛΟΣ', 'Φλωρόπουλος', 'high', 'proposed'),
  ('surname', 'ΠΡΟΕΔΡΟΥ', 'Προέδρου', 'high', 'proposed'),
  ('first', 'ΦΙΛ', 'Φιλ', 'high', 'proposed'),
  ('surname', 'ΚΡΕΜΜΥΔΑΣ', 'Κρεμμυδάς', 'high', 'proposed'),
  ('first', 'ΕΥΣΤ.', 'Ευστ.', 'high', 'proposed'),
  ('surname', 'ΜΑΖΛΟΥΜΙΑΝ', 'Μαζλουμιάν', 'high', 'proposed'),
  ('surname', 'ΧΡΗΣΤΑΚΟΣ', 'Χρηστάκος', 'high', 'proposed'),
  ('surname', 'ΚΩΣΤΖΕΒΑ', 'Κωστζέβα', 'high', 'proposed'),
  ('surname', 'ΤΖΑΚΟΥ', 'Τζάκου', 'high', 'proposed'),
  ('first', 'ΜΠΑΡΜ', 'Μπαρμ', 'high', 'proposed'),
  ('first', 'ΑΛΙΚΗ', 'Αλίκη', 'high', 'proposed'),
  ('surname', 'ΒΕΛΙΣΚΟ', 'Βελίσκο', 'review', 'proposed'),
  ('surname', 'ΔΟΥΡΛΙΑ', 'Δουρλιά', 'review', 'proposed'),
  ('surname', 'ΤΖΕΒΕΛΕΚΟΣ', 'Τζεβελέκος', 'high', 'proposed'),
  ('surname', 'ΚΑΖΑΚΙΑΣ', 'Καζάκιας', 'review', 'proposed'),
  ('first', 'ΦΩΤ', 'Φωτ', 'high', 'proposed'),
  ('first', 'ΕΥΘΥΜ.', 'Ευθυμ.', 'high', 'proposed'),
  ('surname', 'ΠΙΤΤΑΣ', 'Πίττας', 'high', 'proposed'),
  ('surname', 'ΒΑΣΙΛΑΚΟΣ', 'Βασιλάκος', 'high', 'proposed'),
  ('first', 'ΛΑΜΠΡ', 'Λαμπρ', 'high', 'proposed'),
  ('surname', 'ΠΑΝΕΘΥΜΙΤΑΚΗ', 'Πανεθυμιτάκη', 'high', 'proposed'),
  ('first', 'ΧΡΙΣΤΙΝΗ', 'Χριστίνη', 'high', 'proposed'),
  ('surname', 'ΒΑΓΙΑΚΟΥ', 'Βαγιάκου', 'high', 'proposed'),
  ('surname', 'ΜΑΟΥΝΗ', 'Μαούνη', 'high', 'proposed'),
  ('first', 'ΑΛΕΞΑΝ', 'Αλεξαν', 'high', 'proposed'),
  ('surname', 'ΜΑΡΙΑΝΟΣ', 'Μαριανός', 'high', 'proposed'),
  ('first', 'ΓΕΡ', 'Γερ', 'high', 'proposed'),
  ('surname', 'ΚΑΣΚΑΡΑ', 'Κασκαρά', 'review', 'proposed'),
  ('surname', 'ΜΠΡΕΣΤΑ', 'Μπρέστα', 'high', 'proposed'),
  ('first', 'ΛΙΖΑ', 'Λίζα', 'high', 'proposed'),
  ('surname', 'ΓΑΛΑΝΟΠΟΥΛΟΣ', 'Γαλανόπουλος', 'high', 'proposed'),
  ('first', 'ΜΗΝΑΣ', 'Μηνάς', 'high', 'proposed'),
  ('surname', 'ΤΑΒΟΥΛΑΡΗΣ', 'Ταβουλάρης', 'high', 'proposed'),
  ('surname', 'ΜΑΥΡΟΥΔΗ', 'Μαυρούδη', 'high', 'proposed'),
  ('surname', 'ΜΑΡΟΥΔΑΣ', 'Μαρούδας', 'high', 'proposed'),
  ('first', 'ΕΥΑ', 'Εύα', 'high', 'proposed'),
  ('first', 'ΓΕΩΡΓΙΑ', 'Γεωργία', 'high', 'proposed'),
  ('surname', 'ΑΝΕΥΛΑΒΗ', 'Ανευλαβή', 'high', 'proposed')
on conflict (kind, caps_key) do update
  set spelling = excluded.spelling, confidence = excluded.confidence, updated_at = now()
  where core.name_spellings.source = 'proposed' and not core.name_spellings.approved;
