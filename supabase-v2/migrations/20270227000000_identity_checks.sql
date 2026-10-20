-- Identity checks (founder, 20 Oct 2026: "how do we know a person registering is who they say they are?").
-- Nothing here proves who someone is; it makes a wrong claim cheap to spot and easy to undo.
--
-- 1. Name shape. The onboarding name (first name and surname) is letters only, Greek or Latin, at least 2 of them,
--    with an inner hyphen, apostrophe or single space. ALL CAPS or all lower case is tidied to proper case per word
--    part («ΑΛΚΙΒΙΑΔΗΣ» → «Αλκιβιαδης», «αλκιβιάδης» → «Αλκιβιάδης»); mixed case stays as typed. api.update_profile
--    and core.new_player_request refuse anything else with 'name_shape'. Roster names are not touched, and the name
--    of the player the account holds or asks for is always accepted (the match link path saves that one).
-- 2. «Δεν είμαι εγώ;» on a claimed player's profile, and «Είμαι εγώ» on a claimed candidate in onboarding: a report
--    that the account holding the player is not that person (api.report_claim). One open report per person and
--    player, 5 a day. Nobody reads the reports but staff.
-- 3. Staff see, on every claim and new player request and on every report: how the account signs in (Google, Apple,
--    email), the name Google or Apple gave when it differs from the requested one, and how many requests the account
--    has made.
-- 4. The first official result (a tournament or sheet match, not a user-logged one) on a player a user made and
--    holds is flagged for a look. The result and its points are not held back. One flag per player, ever.
-- Staff close a report or flag with «Απόρριψη αναφοράς» / «Εντάξει», «Αποσύνδεση» (api.admin_unclaim) or, when the
-- reporter says it is them, «Δώσ’ το στον αναφέροντα» (unlink, then the reporter's claim approved as usual).

-- ── 1. name shape ──
-- Greek and Latin letters (Latin-1, Latin Extended-A/B, Greek and Coptic, Greek Extended), without × ÷ and Greek
-- punctuation. Spelled out: [[:alpha:]] depends on the database locale.
create or replace function core.name_letters()
returns text language sql immutable parallel safe set search_path = ''
as $$ select 'A-Za-zÀ-ÖØ-öø-ɏΆΈ-Ͽἀ-῿' $$;

create or replace function core.name_lower(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(
           lower(translate(p, 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏΪΫ', 'αβγδεζηθικλμνξοπρστυφχψωάέήίόύώϊϋ')),
           'σ($|[ ''’-])', 'ς\1', 'g')
$$;

create or replace function core.name_upper(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select upper(translate(p, 'αβγδεζηθικλμνξοπρσςτυφχψωάέήίόύώϊϋΐΰ', 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΣΤΥΦΧΨΩΆΈΉΊΌΎΏΪΫΪΫ'))
$$;

-- trim, one space between words, none around a hyphen or apostrophe; ALL CAPS or all lower case to proper case
create or replace function core.name_tidy(p text)
returns text language plpgsql immutable parallel safe set search_path = core, pg_temp
as $$
declare
  s   text;
  o   text;
  m   text[];
begin
  if p is null then return null; end if;
  s := btrim(regexp_replace(normalize(p, NFC), '\s+', ' ', 'g'));
  s := regexp_replace(s, ' *([''’-]) *', '\1', 'g');
  if regexp_replace(s, '[^' || core.name_letters() || ']', '', 'g') = '' then return s; end if;
  if s <> core.name_upper(s) and s <> core.name_lower(s) then return s; end if;   -- mixed case stays as typed
  o := coalesce(substring(s from '^[ ''’-]+'), '');
  for m in select regexp_matches(s, '([^ ''’-]+)([ ''’-]*)', 'g') loop
    o := o || core.name_upper(left(m[1], 1)) || core.name_lower(substr(m[1], 2)) || m[2];
  end loop;
  return core.name_lower_finals(o);
end;
$$;

-- the final sigma once the word parts are joined
create or replace function core.name_lower_finals(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$ select regexp_replace(p, 'σ($|[ ''’-])', 'ς\1', 'g') $$;

-- letters, with an inner hyphen, apostrophe or single space; at least 2 letters
create or replace function core.name_shape_ok(p text)
returns boolean language sql immutable parallel safe set search_path = core, pg_temp
as $$
  select p is not null
     and p ~ ('^[' || core.name_letters() || ']+([ ''’-][' || core.name_letters() || ']+)*$')
     and char_length(regexp_replace(p, '[^' || core.name_letters() || ']', '', 'g')) >= 2
$$;

revoke all on function core.name_letters() from public;
revoke all on function core.name_lower(text) from public;
revoke all on function core.name_upper(text) from public;
revoke all on function core.name_tidy(text) from public;
revoke all on function core.name_lower_finals(text) from public;
revoke all on function core.name_shape_ok(text) from public;
grant execute on function core.name_tidy(text), core.name_shape_ok(text), core.name_letters(), core.name_lower(text),
  core.name_upper(text), core.name_lower_finals(text) to authenticated, service_role;

-- update_profile (20270221000000_security_pass_2): first name and surname tidied and shape-checked
create or replace function api.update_profile(p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_row core.profiles; k text; v text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_argument: patch must be an object' using errcode = '22023';
  end if;
  -- names: 1 to 60 characters once trimmed (null still clears); the two jsonb blobs stay under 8 KB each
  foreach k in array array['first_name', 'surname', 'display_name'] loop
    if p_patch ? k and jsonb_typeof(p_patch -> k) <> 'null' then
      if jsonb_typeof(p_patch -> k) <> 'string' or char_length(btrim(p_patch ->> k)) not between 1 and 60 then
        raise exception 'invalid_argument: % must be 1 to 60 characters', k using errcode = '22023';
      end if;
      v := btrim(p_patch ->> k);
      if k <> 'display_name' then
        v := core.name_tidy(v);
        -- the name of the player this account holds or asks for is fine as the roster has it
        if not core.name_shape_ok(v) and not exists (
             select 1 from core.players p
              where (p.claimed_by_user_id = v_uid
                     or p.id in (select q.player_id from core.claim_requests q where q.user_id = v_uid and q.status = 'pending'))
                and btrim(case k when 'first_name' then p.first_name else p.surname end) = btrim(p_patch ->> k)) then
          raise exception 'name_shape: %', k using errcode = '22023';
        end if;
        if not core.name_shape_ok(v) then v := btrim(p_patch ->> k); end if;
      end if;
      p_patch := jsonb_set(p_patch, array[k], to_jsonb(v));
    end if;
  end loop;
  foreach k in array array['onboarding_state', 'notification_prefs'] loop
    if p_patch ? k and (jsonb_typeof(p_patch -> k) <> 'object' or pg_column_size(p_patch -> k) >= 8192) then
      raise exception 'invalid_argument: % must be an object under 8 KB', k using errcode = '22023';
    end if;
  end loop;
  update core.profiles set
    first_name = case when p_patch ? 'first_name' then p_patch ->> 'first_name' else first_name end,
    surname = case when p_patch ? 'surname' then p_patch ->> 'surname' else surname end,
    display_name = case when p_patch ? 'display_name' then p_patch ->> 'display_name' else display_name end,
    gender = case when p_patch ? 'gender' then p_patch ->> 'gender' else gender end,
    area_id = case when p_patch ? 'area_id' then p_patch ->> 'area_id' else area_id end,
    area_ids = case when p_patch ? 'area_ids' then array(select jsonb_array_elements_text(p_patch -> 'area_ids')) else area_ids end,
    primary_sport = case when p_patch ? 'primary_sport' then p_patch ->> 'primary_sport' else primary_sport end,
    hand = case when p_patch ? 'hand' then p_patch ->> 'hand' else hand end,
    tournament_experience = case when p_patch ? 'tournament_experience' then p_patch ->> 'tournament_experience' else tournament_experience end,
    locale = case when p_patch ? 'locale' then p_patch ->> 'locale' else locale end,
    tz = case when p_patch ? 'tz' then p_patch ->> 'tz' else tz end,
    hidden = case when p_patch ? 'hidden' then (p_patch ->> 'hidden')::boolean else hidden end,
    onboarding_state = case when p_patch ? 'onboarding_state' then p_patch -> 'onboarding_state' else onboarding_state end,
    notification_prefs = case when p_patch ? 'notification_prefs' then p_patch -> 'notification_prefs' else notification_prefs end
  where user_id = v_uid and deleted_at is null
  returning * into v_row;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('user_id', v_row.user_id, 'display_name', v_row.display_name,
                            'primary_sport', v_row.primary_sport, 'hidden', v_row.hidden);
end;
$$;

-- «είμαι καινούριος» (20270226000000_new_player_profile): a new player only from a real-looking name
create or replace function core.new_player_request(p_uid uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pr   core.profiles;
  v_q    core.claim_requests;
  v_id   uuid;
  v_f    text;
  v_s    text;
begin
  select * into v_pr from core.profiles where user_id = p_uid and deleted_at is null;
  if not found or v_pr.claim_status <> 'creation_requested' or v_pr.claimed_player_id is not null then return null; end if;
  if coalesce(btrim(v_pr.first_name), '') = '' or coalesce(btrim(v_pr.surname), '') = '' then return null; end if;
  v_f := core.name_tidy(v_pr.first_name);
  v_s := core.name_tidy(v_pr.surname);
  if not core.name_shape_ok(v_f) or not core.name_shape_ok(v_s) then
    raise exception 'name_shape' using errcode = '22023';
  end if;

  select * into v_q from core.claim_requests where user_id = p_uid and status = 'pending' for update;
  if found and v_q.via <> 'new' then return null; end if;   -- a roster claim waits for staff first
  if found then
    update core.players
       set first_name = v_f, surname = v_s,
           gender = coalesce(v_pr.gender, gender), area_id = coalesce(v_pr.area_id, area_id)
     where id = v_q.player_id and status = 'pending';
    update core.claim_requests set duplicate_of = core.same_name_player(v_f, v_s, v_q.player_id)
     where id = v_q.id;
    return v_q.player_id;
  end if;

  insert into core.players (first_name, surname, gender, area_id, source, status)
  values (v_f, v_s, v_pr.gender, v_pr.area_id, 'user', 'pending')
  returning id into v_id;
  perform core.request_claim(p_uid, v_id, 'new', null);   -- one open request, 5 a day
  update core.claim_requests set duplicate_of = core.same_name_player(v_f, v_s, v_id)
   where user_id = p_uid and status = 'pending';
  update core.profiles set claim_status = 'creation_requested' where user_id = p_uid;   -- request_claim wrote 'requested'
  return v_id;
end;
$$;
revoke all on function core.new_player_request(uuid) from public;

-- a profile change still saves when an older profile's name does not have the shape (the request waits for a fix)
create or replace function core.new_player_profile_sync()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.claim_status = 'creation_requested' and new.claimed_player_id is null and new.deleted_at is null then
    begin
      perform core.new_player_request(new.user_id);
    exception when sqlstate '54000' or sqlstate '22023' then
      null;   -- over the day's request limit, or a name to fix: the profile still saves, the next change tries again
    end;
  end if;
  return new;
end;
$$;
revoke all on function core.new_player_profile_sync() from public;

-- ── 2. claimed players in «Ποιος είσαι;» ──
-- api.find_matching_players (20270221000000_security_pass_2) now also lists players another account holds, marked
-- claimed (never who). The caller's own player is not marked. At the same score the free ones come first.
drop function api.find_matching_players(text, text);
create function api.find_matching_players(p_name text, p_surname text)
returns table (id uuid, first_name text, surname text, area_id text, match_score int, claimed boolean)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_sn  text := core.normalize_search(p_surname);
  v_fn  text := core.normalize_search(p_name);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_sn = '' then return; end if;
  return query
  select x.id, x.first_name, x.surname, x.area_id, x.match_score, x.claimed
    from (
      select p.id, p.first_name, p.surname, p.area_id,
             (case when p.surname_norm = v_sn then 70 else round(50 * similarity(p.surname_norm, v_sn))::int end
              + case when v_fn = '' then 0
                     when p.first_name_norm = v_fn then 30
                     when left(p.first_name_norm, length(v_fn)) = v_fn then 20
                     else round(15 * similarity(p.first_name_norm, v_fn))::int end) as match_score,
             (p.claimed_by_user_id is not null and p.claimed_by_user_id <> v_uid) as claimed
        from core.players p
       where (p.surname_norm = v_sn or similarity(p.surname_norm, v_sn) >= 0.55)
         and (v_fn = '' or p.first_name_norm = v_fn or left(p.first_name_norm, length(v_fn)) = v_fn
              or similarity(p.first_name_norm, v_fn) >= 0.5)
         and not p.hidden and not p.is_minor and p.status = 'active') x
   order by x.match_score desc, x.claimed, x.first_name, x.surname
   limit 20;
end;
$$;
revoke all on function api.find_matching_players(text, text) from public, anon;
grant execute on function api.find_matching_players(text, text) to authenticated, service_role;

-- ── 2. and 4. reports and flags ──
create table core.identity_flags (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('not_them', 'is_me', 'first_official')),
  player_id         uuid not null references core.players (id) on delete cascade,
  claimer_user_id   uuid references auth.users (id) on delete set null,
  reporter_user_id  uuid references auth.users (id) on delete cascade,
  match_id          uuid references core.matches (id) on delete set null,
  note              text check (char_length(note) <= 200),
  status            text not null default 'open' check (status in ('open', 'dismissed', 'unlinked', 'given')),
  decided_by        uuid references auth.users (id) on delete set null,
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),
  check ((kind = 'first_official') = (reporter_user_id is null))
);
comment on table core.identity_flags is
  'Is the account that holds a player that person? not_them: «Δεν είμαι εγώ;» on the profile; is_me: «Είμαι εγώ» on a '
  'claimed candidate in onboarding; first_official: the first official result on a player a user made. Staff only, '
  'through api.report_claim and api.admin_*.';
create unique index identity_flags_one_open on core.identity_flags (reporter_user_id, player_id)
  where status = 'open' and reporter_user_id is not null;
create unique index identity_flags_first_official on core.identity_flags (player_id) where kind = 'first_official';
create index identity_flags_open on core.identity_flags (created_at) where status = 'open';
create index identity_flags_reporter on core.identity_flags (reporter_user_id, created_at);
alter table core.identity_flags enable row level security;
revoke all on core.identity_flags from public, anon, authenticated;

-- «Δεν είμαι εγώ;» / «Είμαι εγώ»
create or replace function api.report_claim(p_player_id uuid, p_note text default null, p_reason text default 'not_them')
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_pl   core.players;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_reason is null or p_reason not in ('not_them', 'is_me') then raise exception 'invalid_argument: reason' using errcode = '22023'; end if;
  if char_length(v_note) > 200 then raise exception 'note_too_long' using errcode = '22023'; end if;
  select * into v_pl from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor;
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  if v_pl.claimed_by_user_id is null then raise exception 'not_claimed' using errcode = 'P0002'; end if;
  if v_pl.claimed_by_user_id = v_uid then raise exception 'own_player' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('identity:' || v_uid::text, 0));
  -- a replay keeps the one open report, with the newer note and reason
  update core.identity_flags set note = coalesce(v_note, note), kind = p_reason
   where reporter_user_id = v_uid and player_id = p_player_id and status = 'open';
  if found then return jsonb_build_object('reported', true, 'replayed', true); end if;
  if (select count(*) from core.identity_flags where reporter_user_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into core.identity_flags (kind, player_id, claimer_user_id, reporter_user_id, note)
  values (p_reason, p_player_id, v_pl.claimed_by_user_id, v_uid, v_note);
  return jsonb_build_object('reported', true, 'replayed', false);
end;
$$;
revoke all on function api.report_claim(uuid, text, text) from public, anon;
grant execute on function api.report_claim(uuid, text, text) to authenticated, service_role;

-- ── 4. the first official result on a player a user made ──
create or replace function core.flag_first_official(p_match uuid)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  insert into core.identity_flags (kind, player_id, claimer_user_id, match_id)
  select 'first_official', p.id, p.claimed_by_user_id, m.id
    from core.matches m
    join core.match_participants mp on mp.match_id = m.id
    join core.players p on p.id = mp.player_id
   where m.id = p_match and m.source <> 'user' and m.status <> 'void'
     and exists (select 1 from core.match_results r where r.match_id = m.id)
     and p.source = 'user' and p.claimed_by_user_id is not null
     and not exists (select 1 from core.match_participants o
                       join core.matches om on om.id = o.match_id
                       join core.match_results orr on orr.match_id = om.id
                      where o.player_id = p.id and om.id <> m.id and om.source <> 'user' and om.status <> 'void')
  on conflict do nothing;
end;
$$;
revoke all on function core.flag_first_official(uuid) from public;

create or replace function core.flag_first_official_trg()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.flag_first_official(new.match_id);
  return null;
end;
$$;
revoke all on function core.flag_first_official_trg() from public;
create trigger match_results_first_official after insert on core.match_results
  for each row execute function core.flag_first_official_trg();
create trigger match_participants_first_official after insert or update of player_id on core.match_participants
  for each row execute function core.flag_first_official_trg();

-- ── 3. what staff see about an account ──
-- how it signs in, the name Google or Apple gave when it is not p_name, and every request it has made
create or replace function core.account_hints(p_uid uuid, p_name text default null)
returns jsonb
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select jsonb_build_object(
           'user_id', p_uid,
           'name', nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''),
           'display_name', pr.display_name,
           'email', u.email,
           'joined_at', coalesce(pr.created_at, u.created_at),
           'providers', coalesce(
             (select jsonb_agg(distinct x) from jsonb_array_elements_text(
                case when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array' then u.raw_app_meta_data -> 'providers'
                     when u.raw_app_meta_data ? 'provider' then jsonb_build_array(u.raw_app_meta_data ->> 'provider')
                     else '[]'::jsonb end) x),
             '[]'::jsonb),
           'provider_name', case
             when nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '') is null then null
             when u.raw_user_meta_data ->> 'full_name' = u.email or u.raw_user_meta_data ->> 'name' = u.email then null
             when p_name is not null
              and core.normalize_search(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')))
                  in (core.normalize_search(p_name),
                      core.normalize_search(regexp_replace(btrim(p_name), '^(\S+)\s+(.+)$', '\2 \1'))) then null
             else btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')) end,
           'requests', (select count(*) from core.claim_requests q where q.user_id = p_uid and q.via <> 'new'),
           'new_players', (select count(*) from core.claim_requests q where q.user_id = p_uid and q.via = 'new'))
    from auth.users u
    left join core.profiles pr on pr.user_id = u.id
   where u.id = p_uid
$$;
revoke all on function core.account_hints(uuid, text) from public, anon, authenticated;

-- «Αιτήματα παικτών» (20270226000000_new_player_profile), now with the account's hints
create or replace function api.admin_claim_queue()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', q.user_id, 'via', q.via, 'created_at', q.created_at,
             'user', jsonb_build_object(
                       'name', nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''),
                       'display_name', pr.display_name, 'area_id', pr.area_id,
                       'email', (select u.email from auth.users u where u.id = q.user_id),
                       'joined_at', pr.created_at),
             'account', core.account_hints(q.user_id, p.first_name || ' ' || p.surname),
             'player', jsonb_build_object(
                         'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'area_id', p.area_id,
                         'area', (select a.name_el from core.areas a where a.id = p.area_id),
                         'birth_year', p.birth_year, 'source', p.source,
                         'claimed', p.claimed_by_user_id is not null and p.claimed_by_user_id <> q.user_id,
                         'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id)),
             'duplicate', (select jsonb_build_object('player_id', d.id, 'name', d.first_name || ' ' || d.surname,
                                                     'area_id', d.area_id, 'claimed', d.claimed_by_user_id is not null)
                             from core.players d where d.id = q.duplicate_of and q.via = 'new'),
             'similar', case when q.via = 'new' then (
                          select coalesce(jsonb_agg(jsonb_build_object('player_id', s.id, 'name', s.first_name || ' ' || s.surname,
                                                                       'claimed', s.claimed_by_user_id is not null)), '[]'::jsonb)
                            from (select o.* from core.players o
                                   where o.status = 'active' and o.id <> p.id and o.id is distinct from q.duplicate_of
                                     and similarity(o.search_norm, p.search_norm) > 0.3
                                   order by similarity(o.search_norm, p.search_norm) desc limit 3) s)
                        else '[]'::jsonb end,
             'others', (select count(*) from core.claim_requests o
                         where o.player_id = q.player_id and o.status = 'pending' and o.id <> q.id))
           order by q.created_at, q.id)
      from core.claim_requests q
      join core.profiles pr on pr.user_id = q.user_id
      join core.players p on p.id = q.player_id
     where q.status = 'pending'), '[]'::jsonb);
end;
$$;

-- «Ταυτότητα»: open reports and first official results
create or replace function api.admin_identity_queue()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', f.id, 'kind', f.kind, 'created_at', f.created_at, 'note', f.note,
             'player', jsonb_build_object(
                         'id', p.id, 'name', p.first_name || ' ' || p.surname, 'gender', p.gender,
                         'source', p.source, 'status', p.status,
                         'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id)),
             -- the account holding the player now (null once someone unlinked it)
             'claimer', case when p.claimed_by_user_id is not null
                             then core.account_hints(p.claimed_by_user_id, p.first_name || ' ' || p.surname) end,
             'reporter', case when f.reporter_user_id is not null
                              then core.account_hints(f.reporter_user_id, p.first_name || ' ' || p.surname)
                                   || jsonb_build_object('has_player', exists (select 1 from core.players o where o.claimed_by_user_id = f.reporter_user_id)) end,
             'reports', (select count(*) from core.identity_flags o
                          where o.player_id = f.player_id and o.status = 'open' and o.kind <> 'first_official'),
             'match', (select jsonb_build_object('id', m.id, 'starts_at', m.starts_at, 'sides', core.match_sides_json(m.id),
                                                 'tournament', (select t.name from core.tournaments t where t.id = m.tournament_id),
                                                 'score', (select r.score_summary from core.match_results r where r.match_id = m.id))
                         from core.matches m where m.id = f.match_id))
           order by f.created_at, f.id)
      from core.identity_flags f
      join core.players p on p.id = f.player_id
     where f.status = 'open'), '[]'::jsonb);
end;
$$;

-- «Απόρριψη αναφοράς» / «Εντάξει» (dismiss), «Αποσύνδεση» (unlink), «Δώσ’ το στον αναφέροντα» (give)
create or replace function api.admin_decide_identity(p_flag uuid, p_action text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_f     core.identity_flags;
  v_pl    core.players;
  v_open  core.claim_requests;
  v_had   boolean;
  v_name  text;
  v_txt   record;
  v_msg   jsonb;
  v_key   text;
  v_state text := case p_action when 'dismiss' then 'dismissed' when 'unlink' then 'unlinked' when 'give' then 'given' end;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_state is null then raise exception 'bad_action' using errcode = '22023'; end if;
  select * into v_f from core.identity_flags where id = p_flag for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_f.status <> 'open' then raise exception 'not_open' using errcode = '22023'; end if;
  select * into v_pl from core.players where id = v_f.player_id for update;

  if p_action = 'dismiss' then
    update core.identity_flags set status = 'dismissed', decided_by = auth.uid(), decided_at = now() where id = v_f.id;
    -- «Είμαι εγώ»: they were told «Θα σου πούμε»
    if v_f.kind = 'is_me' and exists (select 1 from core.profiles where user_id = v_f.reporter_user_id and deleted_at is null) then
      v_name := btrim(concat_ws(' ', v_pl.first_name, v_pl.surname));
      select * into v_txt from core.ntext('claim_rejected', jsonb_build_object('name', v_name));
      v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                  'data', jsonb_build_object('player_id', v_pl.id, 'decision', 'rejected'));
      v_key := 'identity_review:' || v_f.id;
      insert into core.notifications (user_id, type, payload, channel, dedupe_key)
      values (v_f.reporter_user_id, 'claim_review', v_msg || jsonb_build_object('player_id', v_pl.id, 'decision', 'rejected'), 'push', v_key)
      on conflict (dedupe_key) do nothing;
      if found then
        insert into core.outbox (kind, payload, idempotency_key)
        values ('push', jsonb_build_object('user_id', v_f.reporter_user_id, 'dedupe_key', v_key, 'type', 'claim', 'message', v_msg), 'push:' || v_key)
        on conflict (idempotency_key) do nothing;
      end if;
    end if;
    return jsonb_build_object('id', v_f.id, 'status', 'dismissed');
  end if;

  if p_action = 'give' then
    if v_f.reporter_user_id is null then raise exception 'no_reporter' using errcode = '22023'; end if;
    if exists (select 1 from core.players where claimed_by_user_id = v_f.reporter_user_id and id <> v_pl.id) then
      raise exception 'already_claimed_other' using errcode = '23505';
    end if;
  end if;

  -- the account and the player part (20261120000000_m2_roster_minors)
  if v_pl.claimed_by_user_id is not null and v_pl.claimed_by_user_id is distinct from v_f.reporter_user_id then
    perform api.admin_unclaim(v_pl.id);
  end if;

  if p_action = 'give' then
    -- the reporter's request, approved as staff approve any claim (the claim_approved push included)
    perform pg_advisory_xact_lock(hashtextextended('user:' || v_f.reporter_user_id::text, 0));
    select * into v_open from core.claim_requests where user_id = v_f.reporter_user_id and status = 'pending' for update;
    v_had := found and v_open.player_id = v_pl.id;
    if found and v_open.player_id <> v_pl.id then
      update core.claim_requests set status = 'cancelled', decided_at = now() where id = v_open.id;
      if v_open.via = 'new' then
        update core.players set hidden = true where id = v_open.player_id and status = 'pending' and claimed_by_user_id is null;
      end if;
    end if;
    if not v_had then
      insert into core.claim_requests (user_id, player_id, via) values (v_f.reporter_user_id, v_pl.id, 'app');
    end if;
    update core.profiles set claim_status = 'requested'
     where user_id = v_f.reporter_user_id and claimed_player_id is null;
    perform api.admin_review_claim(v_f.reporter_user_id, true);
  end if;

  -- every open report on this player is answered by this
  update core.identity_flags set status = v_state, decided_by = auth.uid(), decided_at = now()
   where player_id = v_pl.id and status = 'open' and (id = v_f.id or kind <> 'first_official');
  return jsonb_build_object('id', v_f.id, 'status', v_state, 'player_id', v_pl.id);
end;
$$;

revoke all on function api.admin_claim_queue() from public, anon;
revoke all on function api.admin_identity_queue() from public, anon;
revoke all on function api.admin_decide_identity(uuid, text) from public, anon;
grant execute on function api.admin_claim_queue() to authenticated, service_role;
grant execute on function api.admin_identity_queue() to authenticated, service_role;
grant execute on function api.admin_decide_identity(uuid, text) to authenticated, service_role;

-- ── «Δεν είμαι εγώ;» needs to know the player is held by an account ──
-- api.get_player (20270106000000_match_category) plus 'claimed'
create or replace function api.get_player(p_player_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sport text;
  v_year  int := extract(year from core.athens_day())::int;
  v_out   jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid;
  v_sport := coalesce(v_sport, 'tennis');

  v_out := core.player_card_json(p_player_id, v_uid, v_sport);

  return v_out || jsonb_build_object(
    'is_me', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id = v_uid),
    -- an account holds this player (never which one)
    'claimed', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id is not null),
    'record_year', (
      select jsonb_build_object('w', count(*) filter (where mp.side = r.winner_side),
                                'l', count(*) filter (where mp.side <> r.winner_side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
         and extract(year from core.athens_day(m.starts_at)) = v_year),
    'last_matches', coalesce((
      select jsonb_agg(x.j order by x.starts_at desc)
        from (
          select m.starts_at, jsonb_build_object(
                   'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
                   'won', mp.side = r.winner_side, 'score', r.score_summary,
                   'level', (select e.name from core.tournament_events e where e.id = m.event_id),
                   'discipline', m.provenance ->> 'discipline',
                   'retired', r.retired, 'walkover', r.walkover,
                   'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                 from core.match_participants o
                                where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
                   'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                   from core.match_participants o
                                  where o.match_id = m.id and o.side <> mp.side)) as j
            from core.match_participants mp
            join core.matches m on m.id = mp.match_id
            join core.match_results r on r.match_id = m.id
           where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
           order by m.starts_at desc
           limit 5
        ) x), '[]'::jsonb),
    'next_match', (
      select jsonb_build_object(
               'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
               'level', (select e.name from core.tournament_events e where e.id = m.event_id),
               'discipline', m.provenance ->> 'discipline',
               'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                             from core.match_participants o
                            where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
               'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                               from core.match_participants o
                              where o.match_id = m.id and o.side <> mp.side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
       where mp.player_id = p_player_id and m.approved and m.status in ('announced', 'scheduled')
         and m.starts_at > now()
       order by m.starts_at
       limit 1));
end;
$$;
