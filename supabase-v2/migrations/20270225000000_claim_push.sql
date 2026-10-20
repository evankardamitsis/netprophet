-- A push when staff decide a roster claim (founder, 20 Oct 2026). Onboarding tells a player who claims their roster
-- profile «Μέχρι να το εγκρίνουμε παίζεις κανονικά, θα σου πούμε μόλις γίνει»; until now api.admin_review_claim
-- (20270210000000_claim_requests) only wrote an in_app row nothing reads. Now the decision goes out as a push.
--
-- The texts live in core.notification_texts (claim_approved, claim_rejected) so the founder edits and approves them in
-- admin /v2/notifications. {name} is the roster player's full name, written so that no article or case is needed.
-- It is transactional: it goes even with «Αντιδράσεις» off (there is no general switch), never to a deleted account.
-- One push per decision: the notification and the outbox job are keyed on the claim request id, and a decided request
-- cannot be decided again. The push data carries type 'claim' and the player id; the app opens Εγώ.

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('claim_approved', 'Εγκρίναμε ότι ο παίκτης του ρόστερ είναι ο χρήστης ({name}: όνομα και επώνυμο του παίκτη)',
   'Είσαι εσύ!', 'Ο λογαριασμός σου συνδέθηκε με το προφίλ {name}. Τα ματς σου είναι πια δικά σου, δες τα στο Εγώ.',
   '{name}', false, 140),
  ('claim_rejected', 'Δεν εγκρίναμε ότι ο παίκτης του ρόστερ είναι ο χρήστης ({name}: όνομα και επώνυμο του παίκτη)',
   'Δεν βρήκαμε σύνδεση', 'Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ {name} είναι δικό σου. Γράψε μας αν έγινε λάθος.',
   '{name}', false, 150)
on conflict (key) do nothing;

-- api.admin_review_claim (20270210000000_claim_requests), now with a push to the claimer
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
    if v_pl.status <> 'active' then raise exception 'player_not_claimable' using errcode = 'P0002'; end if;
    update core.players set claimed_by_user_id = p_user where id = v_pl.id;   -- trigger syncs the profile
    if v_q.link_id is not null then perform core.finish_link_claim(v_q.link_id, p_user); end if;
  else
    select * into v_pl from core.players where id = v_q.player_id;
    update core.profiles set claim_status = 'none' where user_id = p_user and claim_status = 'requested';
  end if;
  update core.claim_requests set status = v_decision, decided_at = now(), decided_by = auth.uid() where id = v_q.id;

  v_name := coalesce(nullif(concat_ws(' ', nullif(btrim(v_pl.first_name), ''), nullif(btrim(v_pl.surname), '')), ''), 'του ρόστερ');
  select * into v_txt from core.ntext(case when p_approve then 'claim_approved' else 'claim_rejected' end,
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
  return jsonb_build_object('user_id', p_user, 'player_id', v_q.player_id, 'decision', v_decision);
end;
$$;

revoke all on function api.admin_review_claim(uuid, boolean) from public, anon;
grant execute on function api.admin_review_claim(uuid, boolean) to authenticated, service_role;
