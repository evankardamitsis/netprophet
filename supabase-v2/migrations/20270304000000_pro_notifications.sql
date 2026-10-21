-- Pro notifications, checked end to end (founder, 21 Oct 2026: "do we really have the notifications when the Pro user
-- is on a ταμπλό or scheduled to play?"). The four Pro pushes already existed and go out for real: the draw
-- (20261221000000_m4_draw_alerts), the schedule new / moved / postponed (20261218000000_m4_pro_alerts), the reminders the
-- evening before and two hours before (20270104000000_match_reminders) and the entry deadline (20270201000000_next_tournament),
-- all reading core.notification_texts (20270208000000). What this adds:
--
--   * data.url on every one of them, the expo-router path of the screen it is about: the draw opens the tournament on
--     that category (/tournament/{id}?draw={tab}), the schedule and the entry deadline the tournament, a reminder
--     «Ο αντίπαλος πριν το ματς» (/scout/{match}). data.type stays as it was.
--   * Quiet hours, 23:00 to 08:00 Athens. A draw or schedule push that happens then (a staff run at night) waits on the
--     outbox until 08:00 (core.push_at). A reminder is not sent then: the evening one goes from 20:00 to 23:00, the one
--     two hours before waits for the 08:00 run if the match is still more than 10 minutes away. Entry deadlines stop at
--     23:00 too (they already started at 10:00).
--   * Two switches in Εγώ › Ρυθμίσεις, saved in profiles.notification_prefs like «Αντιδράσεις» (on unless false):
--     'tournaments' (the draw, your schedule and its changes, entry deadlines) and 'reminders' (before your match).
--     Deleted accounts never get one.
--   * A schedule push still waiting for 08:00 gives way to a newer one for the same match (moved twice in the night:
--     one push, with the latest time). In the day each change goes out as it comes, as before. When the one that gave way was «Το πρόγραμμά σου», the new one keeps that text.
--   * A match that gets its first day and time (it had none) says «Το πρόγραμμά σου», not «Άλλαξε η ώρα σου».
--
-- The draw and schedule builders take p_now (default now()) so tests can place an event inside the quiet hours. Free
-- players still get none of these: Pro is checked per person at queue time (core.is_pro), as before.

-- ── helpers ──

-- when a push made at p_now may go: at once from 08:00 to 23:00 Athens, else at the next 08:00 Athens
create or replace function core.push_at(p_now timestamptz default now())
returns timestamptz
language sql stable set search_path = core, pg_temp
as $$
  select case
    when extract(hour from p_now at time zone 'Europe/Athens') >= 23
      then ((core.athens_day(p_now) + 1) + time '08:00') at time zone 'Europe/Athens'
    when extract(hour from p_now at time zone 'Europe/Athens') < 8
      then (core.athens_day(p_now) + time '08:00') at time zone 'Europe/Athens'
    else p_now end
$$;

-- this person wants this kind of push: an account that is not deleted and has not switched p_key off
create or replace function core.push_wants(p_user uuid, p_key text)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.profiles pr
                  where pr.user_id = p_user and pr.deleted_at is null
                    and coalesce(pr.notification_prefs ->> p_key, 'true') <> 'false')
$$;

-- a path segment or query value, percent-encoded as encodeURIComponent does (UTF-8 bytes)
create or replace function core.url_part(p text)
returns text
language sql immutable set search_path = pg_temp
as $$
  select coalesce(string_agg(case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45, 46, 95, 126)
                                  then chr(b) else '%' || upper(lpad(to_hex(b), 2, '0')) end, '' order by i), '')
    from (select get_byte(convert_to(p, 'UTF8'), i) as b, i
            from generate_series(0, octet_length(convert_to(coalesce(p, ''), 'UTF8')) - 1) i) x
$$;

revoke all on function core.push_at(timestamptz) from public, anon;
revoke all on function core.push_wants(uuid, text) from public, anon, authenticated;
revoke all on function core.url_part(text) from public, anon;

-- ── schedule alerts (latest: 20270208000000_notification_texts) ──

drop function if exists core.schedule_alert(uuid, text);
create or replace function core.schedule_alert(p_match uuid, p_what text, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  m      core.matches;
  t      core.tournaments;
  r      record;
  v_n    int := 0;
  v_key  text;
  v_opp  text;
  v_msg  jsonb;
  v_txt  record;
  v_what text;
  v_at   timestamptz := core.push_at(p_now);
  v_new  boolean;
begin
  select * into m from core.matches where id = p_match;
  if m.id is null or m.tournament_id is null or m.status not in ('announced', 'scheduled') or m.starts_at is null then return 0; end if;
  if p_what <> 'postponed' and (m.starts_at < p_now or m.starts_at > p_now + interval '14 days') then return 0; end if;
  select * into t from core.tournaments where id = m.tournament_id;
  for r in
    select mp.side, p.claimed_by_user_id as user_id
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and p.claimed_by_user_id is not null
       and core.is_pro(p.claimed_by_user_id) and core.push_wants(p.claimed_by_user_id, 'tournaments')
  loop
    v_key := 'schedule:' || r.user_id || ':' || p_match || ':' || p_what || ':' || extract(epoch from m.starts_at)::bigint;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    -- an older push for this match still waiting for 08:00 (quiet hours) gives way to this one
    with gone as (
      update core.outbox o set done_at = now()
       where o.kind = 'push' and o.done_at is null and o.run_after > now()
         and o.idempotency_key like 'push:schedule:' || r.user_id || ':' || p_match || ':%'
      returning o.payload ->> 'dedupe_key' as k
    )
    select coalesce(bool_or(k like 'schedule:%:' || p_match || ':new:%'), false) into v_new from gone;
    v_what := case when p_what = 'moved' and v_new then 'new' else p_what end;
    select string_agg(btrim(p.surname), ' / ' order by mp.position) into v_opp
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and mp.side <> r.side;
    select * into v_txt from core.ntext(
      case v_what when 'new' then 'schedule_new' when 'moved' then 'schedule_moved' else 'schedule_postponed' end,
      jsonb_build_object('when', core.greek_when(m.starts_at), 'tournament', t.name, 'opponent', coalesce(v_opp, '')));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', p_match, 'tournament_id', t.id,
                                                           'url', '/tournament/' || t.id));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
    values (r.user_id, 'schedule', v_msg, 'push', v_key, v_at)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'schedule', 'message', v_msg),
              'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.schedule_alert(uuid, text, timestamptz) from public, anon, authenticated;

-- a first day and time is news, not a change (20261218000000_m4_pro_alerts)
create or replace function core.schedule_alert_on_change()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.tournament_id is null then return null; end if;
  if new.postponed_at is not null and old.postponed_at is null then
    perform core.schedule_alert(new.id, 'postponed');
  elsif new.starts_at is distinct from old.starts_at and new.postponed_at is null then
    perform core.schedule_alert(new.id, case when old.starts_at is null then 'new' else 'moved' end);
  end if;
  return null;
end;
$$;

-- ── draw alerts (latest: 20270208000000_notification_texts) ──

drop function if exists core.draw_alert(uuid, text);
create or replace function core.draw_alert(p_tournament uuid, p_tab text, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  d      core.tournament_draws;
  t      core.tournaments;
  r      record;
  v_n    int := 0;
  v_key  text;
  v_opp  jsonb;
  v_who  text;
  v_kind text;
  v_msg  jsonb;
  v_txt  record;
  v_at   timestamptz := core.push_at(p_now);
begin
  select * into d from core.tournament_draws where tournament_id = p_tournament and tab = p_tab;
  select * into t from core.tournaments where id = p_tournament;
  if d.tournament_id is null or t.id is null or core.tournament_state(t) = 'done' then return 0; end if;
  for r in
    select distinct on (p.claimed_by_user_id) p.claimed_by_user_id as user_id, (en ->> 'pos')::int as pos
      from jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
      join core.players p on p.id = (pl ->> 'player_id')::uuid
     where p.claimed_by_user_id is not null
       and core.is_pro(p.claimed_by_user_id) and core.push_wants(p.claimed_by_user_id, 'tournaments')
  loop
    v_key := 'draw:' || r.user_id || ':' || p_tournament || ':' || p_tab;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    v_who := null;
    if d.format = 'knockout' then
      -- the first round pairs 1-2, 3-4, ...: skip when that match already has a winner
      continue when exists (select 1 from jsonb_array_elements(d.draw -> 'rounds' -> 0) m
                             where (m ->> 'slot')::int = (r.pos + 1) / 2 and m ->> 'winner' is not null);
      select en into v_opp from jsonb_array_elements(d.draw -> 'entrants') en
       where (en ->> 'pos')::int = case when r.pos % 2 = 1 then r.pos + 1 else r.pos - 1 end;
      if v_opp is null or coalesce((v_opp ->> 'bye')::boolean, false) then
        v_kind := 'draw_bye';
      else
        select string_agg(coalesce(nullif(btrim(p.surname), ''), pl ->> 'raw'), ' / ' order by o) into v_who
          from jsonb_array_elements(v_opp -> 'players') with ordinality x(pl, o)
          left join core.players p on p.id = (pl ->> 'player_id')::uuid;
        v_who := coalesce(v_who, v_opp ->> 'raw', '');
        v_kind := 'draw_opponent';
      end if;
    else
      v_kind := 'draw_group';
    end if;
    select * into v_txt from core.ntext(v_kind, jsonb_build_object('tournament', t.name, 'category', d.tab, 'opponent', v_who));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab,
                                                           'url', '/tournament/' || t.id || '?draw=' || core.url_part(d.tab)));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
    values (r.user_id, 'draw', v_msg, 'push', v_key, v_at)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'draw', 'message', v_msg),
              'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.draw_alert(uuid, text, timestamptz) from public, anon, authenticated;

-- ── match reminders (latest: 20270208000000_notification_texts) ──

create or replace function core.match_reminders(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r      record;
  v_kind text;
  v_opp  text;
  v_key  text;
  v_msg  jsonb;
  v_txt  record;
  v_n    int := 0;
begin
  -- quiet hours: nothing; the evening one has gone by 23:00, the one two hours before goes at the 08:00 run
  if core.push_at(p_now) <> p_now then return 0; end if;
  for r in
    select m.id, m.starts_at, m.tournament_id, t.name as tournament, mp.side, p.claimed_by_user_id as user_id
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id
      join core.players p on p.id = mp.player_id
      left join core.tournaments t on t.id = m.tournament_id
     where m.status in ('announced', 'scheduled') and m.postponed_at is null and m.starts_at is not null
       and m.starts_at > p_now + interval '10 minutes' and m.starts_at <= p_now + interval '30 hours'
       and p.claimed_by_user_id is not null
       and core.is_pro(p.claimed_by_user_id) and core.push_wants(p.claimed_by_user_id, 'reminders')
  loop
    v_kind := case
      when r.starts_at - p_now <= interval '2 hours' then 'soon'
      when core.athens_day(r.starts_at) = core.athens_day(p_now) + 1
           and extract(hour from p_now at time zone 'Europe/Athens') >= 20 then 'eve'
    end;
    continue when v_kind is null;
    v_key := 'reminder:' || v_kind || ':' || r.user_id || ':' || r.id || ':' || extract(epoch from r.starts_at)::bigint;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    select string_agg(btrim(p.surname), ' / ' order by mp.position) into v_opp
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = r.id and mp.side <> r.side;
    select * into v_txt from core.ntext('reminder_' || v_kind, jsonb_build_object(
      'when', core.greek_when(r.starts_at), 'time', to_char(r.starts_at at time zone 'Europe/Athens', 'HH24:MI'),
      'tournament', r.tournament, 'opponent', v_opp));
    -- the tap opens «Ο αντίπαλος πριν το ματς»
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', r.id, 'tournament_id', r.tournament_id,
                                                           'url', '/scout/' || r.id));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'reminder', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'reminder', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.match_reminders(timestamptz) from public, anon, authenticated;

-- ── entry deadline reminders (latest: 20270208000000_notification_texts) ──

create or replace function core.entry_reminders(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r     record;
  v_key text;
  v_msg jsonb;
  v_txt record;
  v_n   int := 0;
  v_day date := core.athens_day(p_now);
begin
  -- from 10:00 to 23:00 Athens, so nobody is woken up; a run missed on the day still sends the next day
  if extract(hour from p_now at time zone 'Europe/Athens') < 10 or core.push_at(p_now) <> p_now then return 0; end if;
  for r in
    select t.id, t.name, t.entry_deadline, pr.user_id
      from core.tournaments t
      join core.profiles pr on pr.primary_sport = t.sport_id and pr.deleted_at is null
     where not t.is_minor_event
       and t.entry_deadline between v_day + 1 and v_day + 2
       and (t.starts_on is null or t.starts_on > v_day)
       and core.is_pro(pr.user_id)
       and coalesce(pr.notification_prefs ->> 'tournaments', 'true') <> 'false'
       and ((t.area_id is not null and (t.area_id = pr.area_id or t.area_id = any(pr.area_ids)))
            or core.played_edition(pr.claimed_player_id, t.id))
  loop
    v_key := 'entry:' || r.user_id || ':' || r.id;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    select * into v_txt from core.ntext('entry_deadline', jsonb_build_object(
      'tournament', r.name,
      'day', (array['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'])[extract(dow from r.entry_deadline)::int + 1],
      'date', to_char(r.entry_deadline, 'FMDD/FMMM')));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('tournament_id', r.id, 'url', '/tournament/' || r.id));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'entry', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'entry', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.entry_reminders(timestamptz) from public, anon, authenticated;

-- the texts' admin labels say when they go now
update core.notification_texts
   set label_el = 'Το βράδυ πριν από το ματς σου, από τις 20:00 ως τις 23:00. Αν λείπει το τουρνουά ή ο αντίπαλος, φεύγει το κομμάτι του με το « · »'
 where key = 'reminder_eve';
update core.notification_texts
   set label_el = 'Δύο ώρες πριν από το ματς σου (όχι 23:00 με 08:00). Αν λείπει το τουρνουά ή ο αντίπαλος, φεύγει το κομμάτι του με το « · »'
 where key = 'reminder_soon';
