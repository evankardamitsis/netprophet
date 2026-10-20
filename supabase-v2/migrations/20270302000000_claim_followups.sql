-- Claim follow-ups from the registration audit (docs/v2/registration-audit.md, founder approved 20 Oct 2026).
-- Tests in supabase-v2/tests/138_claim_followups.test.sql.
--
-- 1. The wrong player was approved: «Δεν είμαι εγώ» on your OWN player (Εγώ, your profile) files a report of a new
--    kind, 'not_me_own' (api.report_claim, same one-open rule and 5 a day). Staff see it in «Ταυτότητα» with
--    «Αποσύνδεση» (the player is let go, the profile goes back to claim_status 'none' so the account can claim the
--    right one) or «Απόρριψη» (the claim_report_rejected push). Never «Δώσ' το στον αναφέροντα»: they are the holder.
-- 2. Claim after onboarding: the app offers «Αυτός είμαι εγώ» on an unclaimed player's profile to an account with no
--    player and no open request. It is the usual api.claim_player (staff approve, 5 a day, one player per account),
--    which never looked at onboarding_state; nothing changes on the server for it. The tests prove it for skipped,
--    rejected and done-onboarding accounts.
-- 3. The account that loses a player when staff unlink it (api.admin_unclaim, which «Αποσύνδεση» and «Δώσ' το στον
--    αναφέροντα» call too) gets one push, claim_released, editable in admin /v2/notifications; tapping it opens Εγώ.
--    Deleting your own account never goes through admin_unclaim, so it sends nothing.
-- 4. Ages 15 to 17: a minor is never listed, so they press «είμαι καινούριος» and a second, public profile could be
--    approved. core.same_name_player already looks at every active player (minors and hidden ones too); it now puts a
--    minor first, «Αιτήματα παικτών» says the likely duplicate is a minor, and approving such a new player is refused
--    ('duplicate_minor'). Staff reject it (the usual new_player_rejected push, which never mentions a minor). The new
--    player stays pending and hidden as before.

-- ── 1. the new report kind ──
alter table core.identity_flags drop constraint identity_flags_kind_check;
alter table core.identity_flags add constraint identity_flags_kind_check
  check (kind in ('not_them', 'is_me', 'first_official', 'not_me_own'));
comment on table core.identity_flags is
  'Is the account that holds a player that person? not_them: «Δεν είμαι εγώ;» on the profile; is_me: «Είμαι εγώ» on a '
  'claimed candidate in onboarding; not_me_own: the holder says the player is not them; first_official: the first '
  'official result on a player a user made. Staff only, through api.report_claim and api.admin_*.';

-- «Δεν είμαι εγώ;» (someone else's player), «Είμαι εγώ» (a claimed candidate), «Δεν είμαι εγώ» (your own player)
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
  if p_reason is null or p_reason not in ('not_them', 'is_me', 'not_me_own') then
    raise exception 'invalid_argument: reason' using errcode = '22023';
  end if;
  if char_length(v_note) > 200 then raise exception 'note_too_long' using errcode = '22023'; end if;
  if p_reason = 'not_me_own' then
    -- the account's own player, whatever its state (a minor or a pending one is still theirs to give back)
    select * into v_pl from core.players where id = p_player_id and claimed_by_user_id = v_uid and status <> 'merged';
    if not found then raise exception 'not_own_player' using errcode = '22023'; end if;
  else
    select * into v_pl from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor;
    if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
    if v_pl.claimed_by_user_id is null then raise exception 'not_claimed' using errcode = 'P0002'; end if;
    if v_pl.claimed_by_user_id = v_uid then raise exception 'own_player' using errcode = '22023'; end if;
  end if;
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

-- ── 3. the push to the account that lost the player ──
insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('claim_released', 'Αποσυνδέσαμε τον παίκτη από τον λογαριασμό που τον είχε ({name}: όνομα και επώνυμο του παίκτη)',
   'Το προφίλ αποσυνδέθηκε', 'Αποσυνδέσαμε το {name} από τον λογαριασμό σου. Αν νομίζεις ότι έγινε λάθος, γράψε μας από τις Ρυθμίσεις.',
   '{name}', false, 153)
on conflict (key) do nothing;

-- api.admin_unclaim (20261120000000_m2_roster_minors): the account and the player part (the account keeps its votes
-- and points); the profile goes back to 'none' so it can claim again, and the account hears it once
create or replace function api.admin_unclaim(p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pl   core.players;
  v_txt  record;
  v_msg  jsonb;
  v_key  text;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_pl from core.players where id = p_player_id and claimed_by_user_id is not null for update;
  if not found then raise exception 'not_claimed' using errcode = 'P0002'; end if;
  update core.players set claimed_by_user_id = null where id = v_pl.id;
  -- the claim sync trigger wrote 'skipped'; they never skipped anything
  update core.profiles set claim_status = 'none'
   where user_id = v_pl.claimed_by_user_id and claimed_player_id is null and claim_status = 'skipped';

  if exists (select 1 from core.profiles where user_id = v_pl.claimed_by_user_id and deleted_at is null) then
    select * into v_txt from core.ntext('claim_released',
                                        jsonb_build_object('name', btrim(concat_ws(' ', v_pl.first_name, v_pl.surname))));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('player_id', v_pl.id, 'decision', 'released'));
    -- one per unlink: the same player can be unlinked from the same account again after a later claim
    v_key := 'claim_released:' || v_pl.id || ':' || v_pl.claimed_by_user_id || ':' || extract(epoch from clock_timestamp());
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_pl.claimed_by_user_id, 'claim_review', v_msg || jsonb_build_object('player_id', v_pl.id, 'decision', 'released'), 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', v_pl.claimed_by_user_id, 'dedupe_key', v_key, 'type', 'claim', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
    end if;
  end if;
  return jsonb_build_object('player_id', p_player_id, 'claimed', false);
end;
$$;
revoke all on function api.admin_unclaim(uuid) from public, anon;
grant execute on function api.admin_unclaim(uuid) to authenticated, service_role;

-- api.admin_decide_identity (20270228000000_identity_followups): 'not_me_own' unlinks the reporter's own player,
-- is answered on dismiss like «Είμαι εγώ», and is never given to the reporter
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
    -- «Είμαι εγώ» and «Δεν είμαι εγώ» on your own player: they were told «Θα το ελέγξουμε»
    if v_f.kind in ('is_me', 'not_me_own')
       and exists (select 1 from core.profiles where user_id = v_f.reporter_user_id and deleted_at is null) then
      v_name := btrim(concat_ws(' ', v_pl.first_name, v_pl.surname));
      select * into v_txt from core.ntext('claim_report_rejected', jsonb_build_object('name', v_name));
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
    if v_f.reporter_user_id is null or v_f.kind = 'not_me_own' then raise exception 'no_reporter' using errcode = '22023'; end if;
    if exists (select 1 from core.players where claimed_by_user_id = v_f.reporter_user_id and id <> v_pl.id) then
      raise exception 'already_claimed_other' using errcode = '23505';
    end if;
  end if;

  -- the account and the player part (admin_unclaim tells the account); on «Δεν είμαι εγώ» the holder is the reporter
  if v_pl.claimed_by_user_id is not null
     and (v_f.kind = 'not_me_own' or v_pl.claimed_by_user_id is distinct from v_f.reporter_user_id) then
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
revoke all on function api.admin_decide_identity(uuid, text) from public, anon;
grant execute on function api.admin_decide_identity(uuid, text) to authenticated, service_role;

-- ── 4. a new player who is likely a minor on the roster ──
-- core.same_name_player (20270226000000_new_player_profile): every active player, a minor first
create or replace function core.same_name_player(p_first text, p_surname text, p_except uuid)
returns uuid
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select p.id from core.players p
   where p.status = 'active' and p.id is distinct from p_except
     and p.search_norm in (core.normalize_search(btrim(p_first) || ' ' || btrim(p_surname)),
                           core.normalize_search(btrim(p_surname) || ' ' || btrim(p_first)))
   order by p.is_minor desc, p.hidden, (p.claimed_by_user_id is not null), p.created_at
   limit 1
$$;
revoke all on function core.same_name_player(text, text, uuid) from public;

-- an active minor with this pending player's name, in either order
create or replace function core.minor_same_name(p_player uuid)
returns boolean
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  select exists (
    select 1 from core.players n
      join core.players m on m.id <> n.id and m.status = 'active' and m.is_minor
                         and m.search_norm in (n.search_norm, core.normalize_search(btrim(n.surname) || ' ' || btrim(n.first_name)))
     where n.id = p_player)
$$;
revoke all on function core.minor_same_name(uuid) from public;

-- the open «είμαι καινούριος» requests get the hint again (a minor first now)
update core.claim_requests q
   set duplicate_of = core.same_name_player(p.first_name, p.surname, p.id)
  from core.players p
 where p.id = q.player_id and q.status = 'pending' and q.via = 'new';

-- api.admin_claim_queue (20270227000000_identity_checks): the duplicate says when it is a minor
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
                                                     'area_id', d.area_id, 'claimed', d.claimed_by_user_id is not null,
                                                     'is_minor', d.is_minor)
                             from core.players d where d.id = q.duplicate_of and q.via = 'new'),
             -- approving is refused while this is true (admin_review_claim 'duplicate_minor')
             'duplicate_minor', q.via = 'new' and core.minor_same_name(p.id),
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
revoke all on function api.admin_claim_queue() from public, anon;
grant execute on function api.admin_claim_queue() to authenticated, service_role;

-- api.admin_review_claim (20270226000000_new_player_profile): a new player whose name is a minor's is not approved
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
      -- a new player: it goes live and is theirs, unless the roster has a minor by that name (15 to 17)
      if v_pl.status <> 'pending' then raise exception 'player_not_claimable' using errcode = 'P0002'; end if;
      if core.minor_same_name(v_pl.id) then raise exception 'duplicate_minor' using errcode = '22023'; end if;
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
revoke all on function api.admin_review_claim(uuid, boolean) from public, anon;
grant execute on function api.admin_review_claim(uuid, boolean) to authenticated, service_role;
