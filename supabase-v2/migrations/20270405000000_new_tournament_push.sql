-- «Νέο τουρνουά» (founder, 2 Nov 2026: "when a new tournament starts we should send a notification to our users").
-- One push to everyone, the first time a tournament's matches land in the app (the first read that brings its
-- schedule), so the tap opens a page with matches to vote on. Once per tournament (core.tournaments.announced_at),
-- only to accounts with a device, never to a deleted account or to someone who switched off notification_prefs.
-- new_tournaments («Νέα τουρνουά» in Εγώ › Ρυθμίσεις, on unless false). Quiet hours as for the others
-- (core.push_at: found after 23:00, it waits for 08:00). Not for a minor event, a finished one or a user's own match.
-- The text is core.notification_texts 'new_tournament' (staff edit it in the admin).
-- Every tournament already in the app counts as announced, except MT200 Queens (the founder: it gets the push now).

alter table core.tournaments add column announced_at timestamptz;
update core.tournaments set announced_at = created_at where announced_at is null;

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('new_tournament', 'Νέο τουρνουά στην εφαρμογή, σε όλους, μία φορά, όταν μπαίνουν τα πρώτα του ματς. Όχι 23:00 με 08:00',
   'Νέο τουρνουά: {tournament}', 'Το πρόγραμμα βγήκε. Μπες και ψήφισε στα πρώτα ματς.', '{tournament}', false, 160)
on conflict (key) do nothing;

-- the push to everyone, once per tournament; returns how many were queued (0 when it already went)
create or replace function core.new_tournament_alert(p_tournament uuid, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t     core.tournaments;
  r     record;
  v_n   int := 0;
  v_at  timestamptz := core.push_at(p_now);
  v_msg jsonb;
  v_txt record;
  v_key text;
begin
  update core.tournaments set announced_at = p_now
   where id = p_tournament and announced_at is null and active and not is_minor_event and not finished
  returning * into t;
  if t.id is null then return 0; end if;
  select * into v_txt from core.ntext('new_tournament', jsonb_build_object('tournament', t.name));
  v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                              'data', jsonb_build_object('tournament_id', t.id, 'url', '/tournament/' || t.id));
  for r in
    select distinct pt.user_id from core.push_tokens pt
     where core.push_wants(pt.user_id, 'new_tournaments')
  loop
    v_key := 'new_tournament:' || r.user_id || ':' || t.id;
    insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
    values (r.user_id, 'new_tournament', v_msg, 'push', v_key, v_at)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'new_tournament', 'message', v_msg),
              'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.new_tournament_alert(uuid, timestamptz) from public, anon, authenticated;

-- the first organiser match of a tournament (a read, an import) announces it; a user's own logged match never does
create or replace function core.new_tournament_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.tournament_id is not null and coalesce(new.source, '') <> 'user'
     and exists (select 1 from core.tournaments where id = new.tournament_id and announced_at is null) then
    perform core.new_tournament_alert(new.tournament_id);
  end if;
  return null;
end;
$$;
create trigger new_tournament_on_match after insert on core.matches for each row execute function core.new_tournament_on_match();

-- MT200 Queens is in with its first day: its push goes now (or at 08:00 when this runs in quiet hours)
update core.tournaments set announced_at = null where id = '82f6285c-f858-459a-b091-82e4679d97d8';
select core.new_tournament_alert('82f6285c-f858-459a-b091-82e4679d97d8') where exists (select 1 from core.tournaments where id = '82f6285c-f858-459a-b091-82e4679d97d8');
