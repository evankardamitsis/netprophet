-- Registration audit (founder, 20 Oct 2026: "these steps are crucial pre launch, audit the registration scenarios").
-- The scenario matrix is docs/v2/registration-audit.md; tests in supabase-v2/tests/100_registration_audit.test.sql.
--
-- 1. «Είσαι ήδη εδώ;» finds more of the right people (api.find_matching_players, same reply shape):
--    - a roster first name cut short by a sheet («Βαγ», «Γ.») is found from the full one («Βαγγέλης»);
--    - common short forms find the full name and back («Γιάννης» = «Ιωάννης», «Κώστας» = «Κωνσταντίνος»);
--    - first name and surname the other way round («Καρδαμίτσης Βαγγέλης» in the search box);
--    - one word in the search box is a surname (it used to find nobody).
-- 2. The roster count in the claim step and on Παίκτες ({n}, get_players_home.total_players): every shown player
--    except sheet abbreviations and duplicates (founder, 20 Oct 2026). Counting only: no player row changes.
-- 3. A claimed candidate says how its account signs in, the provider only, never any part of an address
--    (api.claimed_sign_in), so a person who forgot which account they used can sign in with that one.
-- 4. «Δεν με βρίσκω, είμαι καινούριος» after a roster request (an earlier run, the app closed meanwhile): the latest
--    choice wins, as a second roster pick already does. The open request is cancelled and the new player is made.
--    It used to keep the request and the screen said «Θα φτιάξουμε το προφίλ σου», which nothing did.
-- 5. claim_player refuses a minor (the search never lists one; the RPC now says no as well).
-- 6. Deleting an account hides the new player it asked for when no match uses it, so it does not land in the
--    moderation «New players» list with nobody behind it.

-- ── 1. the claim search ──

-- the usual short forms of Greek first names, as normalize_search keys: short form -> the full name's key
create or replace function core.first_name_key(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select coalesce((select v.k from (values
    ('thanos', 'athanasios'), ('thanasis', 'athanasios'), ('katia', 'ekaterini'), ('katerina', 'ekaterini'),
    ('aleks', 'aleksandros'), ('alekos', 'aleksandros'), ('aleksis', 'aleksandros'), ('anastasis', 'anastasios'),
    ('tasos', 'anastasios'), ('natasa', 'anastasia'), ('tasula', 'anastasia'), ('adonis', 'adonios'),
    ('apostolis', 'apostolos'), ('tolis', 'apostolos'), ('vasilis', 'vasilios'), ('vaso', 'vasiliki'),
    ('viki', 'vasiliki'), ('giorgia', 'georgia'), ('george', 'georgios'), ('giorgakis', 'georgios'),
    ('giorgis', 'georgios'), ('giorgos', 'georgios'), ('grigoris', 'grigorios'), ('dimitris', 'dimitrios'),
    ('dimitrakis', 'dimitrios'), ('mitsos', 'dimitrios'), ('dionisis', 'dionisios'), ('lena', 'eleni'),
    ('levteris', 'elevtherios'), ('manos', 'emanuil'), ('manolis', 'emanuil'), ('evangelos', 'evagelos'),
    ('vagelas', 'evagelos'), ('vagelis', 'evagelos'), ('vagelitsa', 'evagelia'), ('vagelio', 'evagelia'),
    ('thimios', 'evthimios'), ('stathis', 'evstathios'), ('stratos', 'evstratios'), ('stratis', 'evstratios'),
    ('dora', 'theodora'), ('thodoris', 'theodoros'), ('thodoros', 'theodoros'), ('giana', 'ioana'),
    ('john', 'ioanis'), ('gianis', 'ioanis'), ('gianos', 'ioanis'), ('gianakis', 'ioanis'),
    ('kostula', 'konstadina'), ('dina', 'konstadina'), ('kostas', 'konstadinos'), ('konstadis', 'konstadinos'),
    ('kostakis', 'konstadinos'), ('kostis', 'konstadinos'), ('dinos', 'konstadinos'), ('meri', 'maria'),
    ('marula', 'maria'), ('mihael', 'mihel'), ('mihalis', 'mihel'), ('nikos', 'nikolaos'), ('nikolis', 'nikolaos'),
    ('nikolas', 'nikolaos'), ('giota', 'panagiota'), ('giotis', 'panagiotis'), ('panos', 'panagiotis'),
    ('panagis', 'panagiotis'), ('padelis', 'padelimon'), ('hronis', 'polihronis'), ('spiridonas', 'spiridon'),
    ('spiros', 'spiridon'), ('stela', 'stiliani'), ('stelios', 'stilianos'), ('sotiris', 'sotirios'),
    ('fotis', 'fotios'), ('labis', 'haralabos'), ('babis', 'haralabos'), ('haris', 'haralabos')
  ) v(n, k) where v.n = p), p)
$$;

-- how well a roster first name answers the typed one (normalize_search keys); null: not a match
create or replace function core.claim_first_score(p_row text, p_typed text)
returns int
language sql immutable parallel safe set search_path = core, extensions, pg_temp
as $$
  select case
    when p_typed = '' then 0
    when p_row = p_typed then 30
    when core.first_name_key(p_row) = core.first_name_key(p_typed) then 25
    when left(p_row, length(p_typed)) = p_typed then 20
    -- a sheet's short form («Βαγ», «Γ.») is the start of the typed name
    when length(p_row) between 1 and 3 and left(p_typed, length(p_row)) = p_row then 18
    when similarity(p_row, p_typed) >= 0.5 then round(15 * similarity(p_row, p_typed))::int
  end
$$;

-- how well a roster surname answers the typed one; null: not a match
create or replace function core.claim_surname_score(p_row text, p_typed text)
returns int
language sql immutable parallel safe set search_path = core, extensions, pg_temp
as $$
  select case
    when p_typed = '' then null
    when p_row = p_typed then 70
    when similarity(p_row, p_typed) >= 0.55 then round(50 * similarity(p_row, p_typed))::int
  end
$$;
revoke all on function core.first_name_key(text) from public;
revoke all on function core.claim_first_score(text, text) from public;
revoke all on function core.claim_surname_score(text, text) from public;

-- api.find_matching_players (20270227000000_identity_checks): same reply, the matching above. The typed order is
-- scored first; the other way round only counts when the typed order finds nothing on that row.
create or replace function api.find_matching_players(p_name text, p_surname text)
returns table (id uuid, first_name text, surname text, area_id text, match_score int, claimed boolean)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_sn  text := core.normalize_search(p_surname);
  v_fn  text := core.normalize_search(p_name);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- one word in the search box: a surname
  if v_sn = '' then v_sn := v_fn; v_fn := ''; end if;
  if v_sn = '' then return; end if;
  return query
  select x.id, x.first_name, x.surname, x.area_id, x.match_score, x.claimed
    from (
      select p.id, p.first_name, p.surname, p.area_id,
             coalesce(core.claim_surname_score(p.surname_norm, v_sn) + core.claim_first_score(p.first_name_norm, v_fn),
                      case when v_fn <> '' then
                        core.claim_surname_score(p.surname_norm, v_fn) + core.claim_first_score(p.first_name_norm, v_sn) - 5
                      end) as match_score,
             (p.claimed_by_user_id is not null and p.claimed_by_user_id <> v_uid) as claimed
        from core.players p
       where not p.hidden and not p.is_minor and p.status = 'active'
         and (similarity(p.surname_norm, v_sn) >= 0.55 or p.surname_norm = v_sn
              or (v_fn <> '' and (similarity(p.surname_norm, v_fn) >= 0.55 or p.surname_norm = v_fn)))) x
   where x.match_score is not null
   order by x.match_score desc, x.claimed, x.first_name, x.surname
   limit 20;
end;
$$;
revoke all on function api.find_matching_players(text, text) from public, anon;
grant execute on function api.find_matching_players(text, text) to authenticated, service_role;

-- ── 2. the roster count ──
-- A shown player (active, not hidden, not a minor) counts unless a sheet abbreviated the first name (3 letters or
-- fewer, or it ends with a dot) or it is a duplicate: another shown player with the same surname key whose first
-- name key starts with this one's and is longer (the shorter is the duplicate), or has exactly the same name key
-- and an earlier id (counted once).
create or replace function core.roster_countable(p core.players)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select p.status = 'active' and not p.hidden and not p.is_minor
     and length(p.first_name_norm) > 3
     and btrim(p.first_name) !~ '\.$'
     and not exists (
       select 1 from core.players q
        where q.id <> p.id and q.status = 'active' and not q.hidden and not q.is_minor
          and q.surname_norm = p.surname_norm
          and ((length(q.first_name_norm) > length(p.first_name_norm)
                and left(q.first_name_norm, length(p.first_name_norm)) = p.first_name_norm)
               or (q.first_name_norm = p.first_name_norm and q.id < p.id)))
$$;
revoke all on function core.roster_countable(core.players) from public;

create or replace function core.roster_count()
returns bigint
language sql stable security definer set search_path = core, pg_temp
as $$ select count(*) from core.players p where p.status = 'active' and not p.hidden and not p.is_minor and core.roster_countable(p) $$;
revoke all on function core.roster_count() from public;

-- api.get_players_home (20261120000000_m2_roster_minors), total_players from core.roster_count()
create or replace function api.get_players_home(p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_claimed uuid;
  v_limit   int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, claimed_player_id into v_sport, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  return jsonb_build_object(
    'total_players', core.roster_count(),
    'players', coalesce((
      with today as (
        -- everyone in today's matches (Athens day), in start time, side and position order
        select x.player_id, min(x.ord) as ord
          from (
            select mp.player_id, row_number() over (order by m.starts_at, mp.side, mp.position) as ord
              from core.matches m
              join core.match_participants mp on mp.match_id = m.id
             where m.approved and m.status <> 'void' and m.sport_id = v_sport
               and core.athens_day(m.starts_at) = core.athens_day()
          ) x
         group by x.player_id
      ),
      friends as (
        select f.player_id, row_number() over (order by f.created_at) as ord
          from core.follows f where f.user_id = v_uid
      ),
      listed as (
        select fr.player_id, 0 as grp, fr.ord from friends fr
         where not exists (select 1 from today t where t.player_id = fr.player_id)
        union all
        select t.player_id, 1, t.ord from today t
      )
      select jsonb_agg(core.player_card_json(l.player_id, v_uid, v_sport) order by l.grp, l.ord)
        from (
          select l.* from listed l
            join core.players p on p.id = l.player_id
           where p.status = 'active' and not p.hidden and not p.is_minor
             and l.player_id is distinct from v_claimed
           order by l.grp, l.ord
           limit v_limit
        ) l
    ), '[]'::jsonb));
end;
$$;

-- ── 3. how a claimed candidate's account signs in ──
-- 'apple', 'google' or 'email' (Apple first, then Google: the ones people forget), null when the player is not held
-- by another account. Never an address, a name or who it is.
create or replace function api.claimed_sign_in(p_player_id uuid)
returns text
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ps  jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select case when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array' then u.raw_app_meta_data -> 'providers'
              when u.raw_app_meta_data ? 'provider' then jsonb_build_array(u.raw_app_meta_data ->> 'provider')
              else '[]'::jsonb end
    into v_ps
    from core.players p
    join auth.users u on u.id = p.claimed_by_user_id
   where p.id = p_player_id and p.status = 'active' and not p.hidden and not p.is_minor
     and p.claimed_by_user_id <> v_uid;
  if v_ps is null then return null; end if;
  return case when v_ps ? 'apple' then 'apple' when v_ps ? 'google' then 'google' when v_ps ? 'email' then 'email' end;
end;
$$;
revoke all on function api.claimed_sign_in(uuid) from public, anon;
grant execute on function api.claimed_sign_in(uuid) to authenticated, service_role;

-- ── 4. «είμαι καινούριος» after a roster request ──
-- api.set_claim_status (20270226000000_new_player_profile): from 'requested', «creation_requested» cancels the open
-- roster or link request and makes the new player (5 requests a day as before)
create or replace function api.set_claim_status(p_status text)
returns text
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_status not in ('skipped', 'creation_requested') then
    raise exception 'invalid_argument: claim status' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));
  select claim_status into v_now from core.profiles where user_id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_now = p_status then   -- replay
    if p_status = 'creation_requested' then perform core.new_player_request(v_uid); end if;
    return v_now;
  end if;
  if v_now = 'requested' and p_status = 'creation_requested' then
    -- they asked for a roster player before and now say they are new: the latest choice wins
    update core.claim_requests set status = 'cancelled', decided_at = now()
     where user_id = v_uid and status = 'pending' and via <> 'new';
    update core.profiles set claim_status = 'creation_requested' where user_id = v_uid;   -- the sync trigger is on names
    perform core.new_player_request(v_uid);
    return p_status;
  end if;
  if v_now = 'requested' then return v_now; end if;   -- a skip leaves the request with staff
  if v_now = 'claimed' then raise exception 'already_claimed' using errcode = '23505'; end if;
  -- none -> skipped | creation_requested; skipped -> creation_requested (changed their mind)
  if not (v_now = 'none' or (v_now = 'skipped' and p_status = 'creation_requested')) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  update core.profiles set claim_status = p_status where user_id = v_uid;
  if p_status = 'creation_requested' then perform core.new_player_request(v_uid); end if;
  return p_status;
end;
$$;
revoke all on function api.set_claim_status(text) from public, anon;
grant execute on function api.set_claim_status(text) to authenticated, service_role;

-- ── 5. never a minor ──
-- api.claim_player (20270210000000_claim_requests), refusing a minor like a hidden player
create or replace function api.claim_player(p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_pr  core.profiles;
  v_pl  core.players;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));

  select * into v_pr from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  select * into v_pl from core.players where id = p_player_id for update;
  if not found or v_pl.status <> 'active' then
    raise exception 'player_not_claimable' using errcode = 'P0002';
  end if;

  if v_pr.claimed_player_id is not null then
    if v_pr.claimed_player_id = p_player_id then   -- replay
      return jsonb_build_object('player_id', p_player_id, 'claimed', true, 'requested', false, 'replayed', true);
    end if;
    raise exception 'already_claimed_other: this account already claimed a player' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  if v_pl.hidden or v_pl.is_minor then
    raise exception 'player_not_claimable' using errcode = 'P0002';
  end if;

  return core.request_claim(v_uid, p_player_id, 'app', null);
end;
$$;
revoke all on function api.claim_player(uuid) from public, anon;
grant execute on function api.claim_player(uuid) to authenticated, service_role;

-- ── 6. deleting an account ──
-- api.delete_my_account (20270113000000_delete_account): the new player it asked for, unused by any match, is hidden
-- first (the request goes with the account)
create or replace function api.delete_my_account()
returns jsonb
language plpgsql security definer set search_path = core, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update core.players p set hidden = true
   where p.status = 'pending' and not p.hidden
     and p.id in (select q.player_id from core.claim_requests q where q.user_id = v_uid and q.via = 'new' and q.status = 'pending')
     and not exists (select 1 from core.match_participants mp where mp.player_id = p.id);
  delete from auth.users where id = v_uid;
  return jsonb_build_object('deleted', true);
end;
$$;
revoke all on function api.delete_my_account() from public, anon;
grant execute on function api.delete_my_account() to authenticated;
