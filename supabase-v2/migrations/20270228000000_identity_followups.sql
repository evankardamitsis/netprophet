-- Two follow-ups to the identity checks (20270227000000_identity_checks, founder 20 Oct 2026).
--
-- 1. When staff dismiss an «Είμαι εγώ» report (api.admin_decide_identity 'dismiss' on an is_me flag), the reporter got
--    the claim_rejected push («Δεν βρήκαμε σύνδεση»), which reads as if they had asked for the profile. Now it has its
--    own text, claim_report_rejected, editable in admin /v2/notifications like the others. The push is otherwise the
--    same: type 'claim', decision 'rejected', the app opens Εγώ; one per report.
-- 2. «+ Ματς»: a newly typed partner or opponent (core.log_person) and the logger's own player when the profile name
--    makes it (core.own_player) get the same name rule as onboarding: tidied (ALL CAPS or all lower case to proper
--    case) and refused with 'name_shape' unless the name is letters with at least 2 of them. Roster picks are not
--    touched.

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('claim_report_rejected', 'Ελέγξαμε την αναφορά «Είμαι εγώ» του χρήστη και το προφίλ μένει όπως είναι ({name}: όνομα και επώνυμο του παίκτη)',
   'Το προφίλ μένει ως έχει', 'Ελέγξαμε το {name} και δεν βρήκαμε κάτι λάθος. Αν έχεις κάτι να μας δείξεις, γράψε μας.',
   '{name}', false, 152)
on conflict (key) do nothing;

-- api.admin_decide_identity (20270227000000_identity_checks), the dismissed «Είμαι εγώ» with its own text
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
revoke all on function api.admin_decide_identity(uuid, text) from public, anon;
grant execute on function api.admin_decide_identity(uuid, text) to authenticated, service_role;

-- the logger's own player (20270226000000_new_player_profile): made from the profile name only when it has the shape
create or replace function core.own_player(p_uid uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pr core.profiles;
  v_id uuid;
  v_f  text;
  v_s  text;
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
  v_f := core.name_tidy(v_pr.first_name);
  v_s := core.name_tidy(v_pr.surname);
  if not core.name_shape_ok(v_f) or not core.name_shape_ok(v_s) then
    raise exception 'name_shape' using errcode = '22023';
  end if;
  insert into core.players (first_name, surname, gender, area_id, source, status, claimed_by_user_id)
  values (v_f, v_s, v_pr.gender, v_pr.area_id, 'user', 'pending', p_uid)
  returning id into v_id;
  update core.profiles set claimed_player_id = v_id, claim_status = 'claimed' where user_id = p_uid;
  return v_id;
end;
$$;
revoke all on function core.own_player(uuid) from public;

-- a person in «+ Ματς» (20270226000000_new_player_profile): a typed name is tidied and needs the shape
create or replace function core.log_person(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'player_id', '')::uuid;
  v_f  text;
  v_s  text;
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
  insert into core.players (first_name, surname, source, status)
  values (v_f, v_s, 'user', 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function core.log_person(jsonb) from public;
