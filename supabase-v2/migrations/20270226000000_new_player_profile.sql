-- A user who does not find themselves can still become a player (founder, 20 Oct 2026: "a user that doesn't find
-- himself should still be able to register").
--
-- Until now «Δεν με βρίσκω, είμαι καινούριος» only set profiles.claim_status = 'creation_requested' and nothing read it.
-- Now that choice makes a pending player from the onboarding name (and area, gender once the profile has them) and a
-- claim request with via 'new' that links it to the user. It waits in admin moderation «Αιτήματα παικτών» as «Νέος
-- παίκτης», next to the roster claims, with a hint when the roster already has the same name («πιθανό ίδιο με …»).
--   Approve: the player becomes active and theirs (the claim sync trigger fills the profile), the claim_approved push.
--   Reject: the player stays pending and is hidden, the profile goes back to 'none', the new_player_rejected push.
-- The pending player is not public meanwhile: search, profiles and the roster only show active players. It is kept
-- out of the «New players» tab, where it would get a second set of buttons.
-- Idempotent: one open request per user (the existing unique index); a replay or a name, area or gender change only
-- updates the pending player. Logging a match while the request waits uses that same player (core.own_player), and a
-- logged opponent or a sheet row with exactly that name links to it instead of making another one.
-- Existing 'creation_requested' accounts (v1 had 15) get their request here too.

-- ── the request kind and the duplicate hint ──
alter table core.claim_requests drop constraint claim_requests_via_check;
alter table core.claim_requests add constraint claim_requests_via_check check (via in ('app', 'link', 'new'));
alter table core.claim_requests add column duplicate_of uuid references core.players (id) on delete set null;
comment on column core.claim_requests.via is 'app: «Εγώ είμαι» on a roster player; link: a match link; new: «είμαι καινούριος», the player was made from the profile';
comment on column core.claim_requests.duplicate_of is 'via new: an active roster player with the same normalised name, for staff to look at';
create index claim_requests_new_player on core.claim_requests (player_id) where via = 'new';

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('new_player_rejected', 'Δεν φτιάξαμε το προφίλ νέου παίκτη που ζήτησε ο χρήστης ({name}: όνομα και επώνυμο)',
   'Δεν φτιάξαμε το προφίλ', 'Δεν φτιάξαμε το προφίλ {name}. Αν είσαι ήδη στο ρόστερ, γράψε μας και θα σε βρούμε.',
   '{name}', false, 155)
on conflict (key) do nothing;

-- an active roster player with the same name, in either order
create or replace function core.same_name_player(p_first text, p_surname text, p_except uuid)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select p.id from core.players p
   where p.status = 'active' and p.id is distinct from p_except
     and p.search_norm in (core.normalize_search(btrim(p_first) || ' ' || btrim(p_surname)),
                           core.normalize_search(btrim(p_surname) || ' ' || btrim(p_first)))
   order by p.hidden, (p.claimed_by_user_id is not null), p.created_at
   limit 1
$$;
revoke all on function core.same_name_player(text, text, uuid) from public;

-- the user's open «είμαι καινούριος» request: made once, kept in step with the profile after that
create or replace function core.new_player_request(p_uid uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pr   core.profiles;
  v_q    core.claim_requests;
  v_id   uuid;
begin
  select * into v_pr from core.profiles where user_id = p_uid and deleted_at is null;
  if not found or v_pr.claim_status <> 'creation_requested' or v_pr.claimed_player_id is not null then return null; end if;
  if coalesce(btrim(v_pr.first_name), '') = '' or coalesce(btrim(v_pr.surname), '') = '' then return null; end if;

  select * into v_q from core.claim_requests where user_id = p_uid and status = 'pending' for update;
  if found and v_q.via <> 'new' then return null; end if;   -- a roster claim waits for staff first
  if found then
    update core.players
       set first_name = btrim(v_pr.first_name), surname = btrim(v_pr.surname),
           gender = coalesce(v_pr.gender, gender), area_id = coalesce(v_pr.area_id, area_id)
     where id = v_q.player_id and status = 'pending';
    update core.claim_requests set duplicate_of = core.same_name_player(v_pr.first_name, v_pr.surname, v_q.player_id)
     where id = v_q.id;
    return v_q.player_id;
  end if;

  insert into core.players (first_name, surname, gender, area_id, source, status)
  values (btrim(v_pr.first_name), btrim(v_pr.surname), v_pr.gender, v_pr.area_id, 'user', 'pending')
  returning id into v_id;
  perform core.request_claim(p_uid, v_id, 'new', null);   -- one open request, 5 a day
  update core.claim_requests set duplicate_of = core.same_name_player(v_pr.first_name, v_pr.surname, v_id)
   where user_id = p_uid and status = 'pending';
  update core.profiles set claim_status = 'creation_requested' where user_id = p_uid;   -- request_claim wrote 'requested'
  return v_id;
end;
$$;
revoke all on function core.new_player_request(uuid) from public;

-- the name step comes first, the area step after the choice: whatever the profile gets later reaches the player
create or replace function core.new_player_profile_sync()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.claim_status = 'creation_requested' and new.claimed_player_id is null and new.deleted_at is null then
    begin
      perform core.new_player_request(new.user_id);
    exception when sqlstate '54000' then
      null;   -- over the day's request limit: the profile still saves, the next change tries again
    end;
  end if;
  return new;
end;
$$;
create trigger profiles_new_player_sync
  after update of first_name, surname, area_id, gender on core.profiles
  for each row execute function core.new_player_profile_sync();

-- «Δεν με βρίσκω» / skip (20270210000000_claim_requests), now making the player and the request
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
  select claim_status into v_now from core.profiles where user_id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_now = p_status then   -- replay
    if p_status = 'creation_requested' then perform core.new_player_request(v_uid); end if;
    return v_now;
  end if;
  if v_now = 'requested' then return v_now; end if;   -- staff decide the request first
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

-- the request (20270221000000_security_pass_2): picking a roster player after «είμαι καινούριος» cancels the new
-- player's request, and that player is hidden (it stays pending, nobody sees it)
create or replace function core.request_claim(p_uid uuid, p_player uuid, p_via text, p_link uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_open core.claim_requests;
begin
  select * into v_open from core.claim_requests where user_id = p_uid and status = 'pending' for update;
  if found and v_open.player_id = p_player then
    return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', true);
  end if;
  -- 5 requests a day: each new one cancels the open one, so cancelled rows count too (a replay above does not)
  if (select count(*) from core.claim_requests where user_id = p_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if v_open.id is not null then
    update core.claim_requests set status = 'cancelled', decided_at = now() where id = v_open.id;
    if v_open.via = 'new' then
      update core.players set hidden = true
       where id = v_open.player_id and status = 'pending' and claimed_by_user_id is null;
    end if;
  end if;
  insert into core.claim_requests (user_id, player_id, via, link_id) values (p_uid, p_player, p_via, p_link);
  update core.profiles set claim_status = 'requested' where user_id = p_uid;
  return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', false);
end;
$$;
revoke all on function core.request_claim(uuid, uuid, text, uuid) from public;

-- the logger's own player (20261114000000_m2_log_match): while «είμαι καινούριος» waits, that player
create or replace function core.own_player(p_uid uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pr core.profiles;
  v_id uuid;
begin
  select * into v_pr from core.profiles where user_id = p_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_pr.claimed_player_id is not null then return v_pr.claimed_player_id; end if;
  select q.player_id into v_id
    from core.claim_requests q join core.players p on p.id = q.player_id
   where q.user_id = p_uid and q.status = 'pending' and q.via = 'new' and p.status = 'pending' and p.claimed_by_user_id is null;
  if v_id is not null then
    update core.players set claimed_by_user_id = p_uid where id = v_id;   -- still pending; the request stays open
    return v_id;
  end if;
  if coalesce(btrim(v_pr.first_name), '') = '' or coalesce(btrim(v_pr.surname), '') = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;
  insert into core.players (first_name, surname, gender, area_id, source, status, claimed_by_user_id)
  values (btrim(v_pr.first_name), btrim(v_pr.surname), v_pr.gender, v_pr.area_id, 'user', 'pending', p_uid)
  returning id into v_id;
  update core.profiles set claimed_player_id = v_id, claim_status = 'claimed' where user_id = p_uid;
  return v_id;
end;
$$;
revoke all on function core.own_player(uuid) from public;

-- the waiting new player with exactly this name (either order), when there is one and only one
create or replace function core.new_player_by_name(p_first text, p_surname text)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select case when count(*) = 1 then min(p.id::text)::uuid end
    from core.players p
   where p.status = 'pending' and not p.hidden
     and length(core.normalize_search(btrim(coalesce(p_first, '')))) >= 2
     and length(core.normalize_search(btrim(coalesce(p_surname, '')))) >= 2
     and p.search_norm in (core.normalize_search(btrim(p_first) || ' ' || btrim(p_surname)),
                           core.normalize_search(btrim(p_surname) || ' ' || btrim(p_first)))
     and exists (select 1 from core.claim_requests q where q.player_id = p.id and q.via = 'new' and q.status = 'pending')
$$;
revoke all on function core.new_player_by_name(text, text) from public;

-- a person in «+ Ματς» (20261114000000_m2_log_match): a typed name that is a waiting new player links to them
create or replace function core.log_person(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'player_id', '')::uuid;
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
  v_id := core.new_player_by_name(p -> 'new' ->> 'first', p -> 'new' ->> 'surname');
  if v_id is not null then return v_id; end if;
  insert into core.players (first_name, surname, source, status)
  values (btrim(p -> 'new' ->> 'first'), btrim(p -> 'new' ->> 'surname'), 'user', 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function core.log_person(jsonb) from public;

-- the sheets' name matcher (20261209000000_m4_name_matching): after a remembered spelling, a full name that is a
-- waiting new player links to them (same shape as a match)
create or replace function core.ingest_person(p jsonb, p_tournament uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_alias uuid;
  v_s     text := core.normalize_search(coalesce(p ->> 'surname', ''));
  v_ids   uuid[];
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

  -- a surname alone: the one in this tournament, else the one in the roster; several are for staff
  if coalesce(btrim(p ->> 'first'), '') = '' and v_s <> '' then
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

-- «Αιτήματα παικτών» (20270210000000_claim_requests): roster claims and new players, with the account's email and
-- the roster players the new name looks like
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
             'player', jsonb_build_object(
                         'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'area_id', p.area_id,
                         'area', (select a.name_el from core.areas a where a.id = p.area_id),
                         'birth_year', p.birth_year, 'source', p.source,
                         'claimed', p.claimed_by_user_id is not null and p.claimed_by_user_id <> q.user_id,
                         'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id)),
             -- via new: the roster player with the same name, and others that look like it
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
             -- other people asking for the same player
             'others', (select count(*) from core.claim_requests o
                         where o.player_id = q.player_id and o.status = 'pending' and o.id <> q.id))
           order by q.created_at, q.id)
      from core.claim_requests q
      join core.profiles pr on pr.user_id = q.user_id
      join core.players p on p.id = q.player_id
     where q.status = 'pending'), '[]'::jsonb);
end;
$$;

-- the decision (20270225000000_claim_push), now also for a new player
create or replace function api.admin_review_claim(p_user uuid, p_approve boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_q        core.claim_requests;
  v_pr       core.profiles;
  v_pl       core.players;
  v_decision text := case when p_approve then 'approved' else 'rejected' end;
  v_name     text;
  v_txt      record;
  v_msg      jsonb;
  v_key      text;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_approve is null then raise exception 'bad_decision' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user::text, 0));
  select * into v_q from core.claim_requests where user_id = p_user and status = 'pending' for update;
  if not found then raise exception 'no_request' using errcode = 'P0002'; end if;

  if p_approve then
    -- the claim exactly as claim_player made it
    select * into v_pr from core.profiles where user_id = p_user and deleted_at is null;
    if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
    select * into v_pl from core.players where id = v_q.player_id for update;
    if v_pr.claimed_player_id is not null and v_pr.claimed_player_id <> v_pl.id then
      raise exception 'already_claimed_other' using errcode = '23505';
    end if;
    if v_pl.claimed_by_user_id is not null and v_pl.claimed_by_user_id <> p_user then
      raise exception 'player_already_claimed' using errcode = '23505';
    end if;
    if v_q.via = 'new' then
      -- a new player: it goes live and is theirs
      if v_pl.status <> 'pending' then raise exception 'player_not_claimable' using errcode = 'P0002'; end if;
      update core.players set status = 'active', hidden = false, claimed_by_user_id = p_user where id = v_pl.id;
    else
      if v_pl.status <> 'active' then raise exception 'player_not_claimable' using errcode = 'P0002'; end if;
      update core.players set claimed_by_user_id = p_user where id = v_pl.id;   -- trigger syncs the profile
      if v_q.link_id is not null then perform core.finish_link_claim(v_q.link_id, p_user); end if;
    end if;
  elsif v_q.via = 'new' then
    -- the new player stays pending and hidden; if they logged a match with it meanwhile it stays theirs
    select * into v_pl from core.players where id = v_q.player_id for update;
    update core.players set hidden = true where id = v_pl.id and status = 'pending' and claimed_by_user_id is null;
    update core.profiles set claim_status = 'none' where user_id = p_user and claim_status = 'creation_requested';
  else
    select * into v_pl from core.players where id = v_q.player_id;
    update core.profiles set claim_status = 'none' where user_id = p_user and claim_status = 'requested';
  end if;
  update core.claim_requests set status = v_decision, decided_at = now(), decided_by = auth.uid() where id = v_q.id;

  v_name := coalesce(nullif(concat_ws(' ', nullif(btrim(v_pl.first_name), ''), nullif(btrim(v_pl.surname), '')), ''), 'του ρόστερ');
  select * into v_txt from core.ntext(case when p_approve then 'claim_approved'
                                           when v_q.via = 'new' then 'new_player_rejected'
                                           else 'claim_rejected' end,
                                      jsonb_build_object('name', v_name));
  v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                              'data', jsonb_build_object('player_id', v_q.player_id, 'decision', v_decision));
  v_key := 'claim_review:' || v_q.id;

  -- player_id and decision stay on the row as before; a deleted account keeps the row but gets no push
  if exists (select 1 from core.profiles where user_id = p_user and deleted_at is null) then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (p_user, 'claim_review', v_msg || jsonb_build_object('player_id', v_q.player_id, 'decision', v_decision), 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', p_user, 'dedupe_key', v_key, 'type', 'claim', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
    end if;
  else
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (p_user, 'claim_review', jsonb_build_object('player_id', v_q.player_id, 'decision', v_decision), 'in_app', v_key)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('user_id', p_user, 'player_id', v_q.player_id, 'decision', v_decision, 'via', v_q.via);
end;
$$;

-- the moderation queue (20261202000000_m3_traits): a new player someone joined as waits under «Αιτήματα παικτών»,
-- never under «New players» (it would get a second set of buttons there)
create or replace function api.admin_moderation()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'disputes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
               'tournament', (select name from core.tournaments where id = m.tournament_id),
               'sides', core.match_sides_json(m.id),
               'winner_side', r.winner_side, 'score', r.score_summary,
               'reason', m.provenance -> 'disputed' ->> 'reason',
               'logged_by', (select jsonb_build_object('first_name', pr.first_name, 'surname', pr.surname)
                               from core.profiles pr where pr.user_id = m.logged_by),
               'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'player', p.first_name || ' ' || p.surname, 'side', mp.side,
                                    'state', c.state, 'via', c.via, 'fix', c.proposed_fix)), '[]'::jsonb)
                             from core.match_confirmations c
                             join core.players p on p.id = c.player_id
                             join core.match_participants mp on mp.match_id = c.match_id and mp.player_id = c.player_id
                            where c.match_id = m.id),
               'votes', (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id))
             order by m.starts_at desc)
        from core.matches m left join core.match_results r on r.match_id = m.id
       where m.status = 'disputed'), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player_id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'source', p.source,
               'created_at', p.created_at, 'claimed', p.claimed_by_user_id is not null,
               'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id),
               'similar', (select coalesce(jsonb_agg(jsonb_build_object('player_id', q.id, 'name', q.first_name || ' ' || q.surname,
                                                                        'claimed', q.claimed_by_user_id is not null)), '[]'::jsonb)
                             from (select o.* from core.players o
                                    where o.status = 'active' and o.id <> p.id
                                      and similarity(o.search_norm, p.search_norm) > 0.3
                                    order by similarity(o.search_norm, p.search_norm) desc limit 3) q))
             order by p.created_at)
        from core.players p
       where p.status = 'pending'
         and not exists (select 1 from core.claim_requests cr where cr.player_id = p.id and cr.via = 'new')), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object('text', x.text, 'matches', x.n, 'last', x.last) order by x.last desc)
        from (select m.provenance ->> 'tournament_suggestion' as text, count(*)::int as n, max(m.starts_at) as last
                from core.matches m
               where m.tournament_id is null and m.status <> 'void'
                 and m.provenance ? 'tournament_suggestion' and not m.provenance ? 'suggestion_done'
               group by 1) x), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'entity_type', r.entity_type, 'entity_id', r.entity_id, 'reason', r.reason, 'note', r.note,
               'created_at', r.created_at,
               'reporter', (select coalesce(pr.display_name, pr.first_name || ' ' || pr.surname) from core.profiles pr where pr.user_id = r.reporter_user_id),
               'what', case r.entity_type
                         when 'player' then (select jsonb_build_object('name', p.first_name || ' ' || p.surname, 'hidden', p.hidden)
                                               from core.players p where p.id = r.entity_id)
                         else (select jsonb_build_object('sides', core.match_sides_json(m.id), 'starts_at', m.starts_at,
                                                         'hidden', not m.approved, 'source', m.source)
                                 from core.matches m where m.id = r.entity_id) end,
               'reports', (select count(*) from core.reports o where o.entity_type = r.entity_type and o.entity_id = r.entity_id and o.status = 'open'))
             order by r.created_at)
        from core.reports r
       where r.status = 'open'), '[]'::jsonb),
    -- «Πώς παίζει»: what players added, waiting for a yes
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'label_el', t.label_el, 'label_en', t.label_en, 'created_at', t.created_at,
               'by', (select coalesce(pr.display_name, pr.first_name || ' ' || pr.surname) from core.profiles pr where pr.user_id = t.created_by),
               'player', (select p.first_name || ' ' || p.surname from core.trait_votes v join core.players p on p.id = v.player_id
                           where v.trait_id = t.id order by v.created_at limit 1),
               'votes', (select count(*) from core.trait_votes v where v.trait_id = t.id))
             order by t.created_at)
        from core.trait_defs t
       where t.status = 'pending'), '[]'::jsonb));
end;
$$;

-- accounts that already said «είμαι καινούριος» (v1 creation requests among them) get their player and request now
do $$
declare r record;
begin
  for r in select pr.user_id from core.profiles pr
            where pr.claim_status = 'creation_requested' and pr.claimed_player_id is null and pr.deleted_at is null
              and coalesce(btrim(pr.first_name), '') <> '' and coalesce(btrim(pr.surname), '') <> ''
              and not exists (select 1 from core.claim_requests q where q.user_id = pr.user_id and q.status = 'pending')
            order by pr.created_at
  loop
    perform core.new_player_request(r.user_id);
  end loop;
end;
$$;

revoke all on function core.new_player_profile_sync() from public;
revoke all on function api.set_claim_status(text) from public, anon;
revoke all on function api.admin_claim_queue() from public, anon;
revoke all on function api.admin_review_claim(uuid, boolean) from public, anon;
revoke all on function api.admin_moderation() from public, anon;
grant execute on function api.set_claim_status(text) to authenticated, service_role;
grant execute on function api.admin_claim_queue() to authenticated, service_role;
grant execute on function api.admin_review_claim(uuid, boolean) to authenticated, service_role;
grant execute on function api.admin_moderation() to authenticated, service_role;

