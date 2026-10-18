-- Notification texts the founder can edit and approve (founder, 18 Oct 2026: "i need to be able to edit or approve the
-- notification texts, create an easy panel"). Every push text lives in core.notification_texts, one row per text, with
-- named {placeholders}; the push builders read it through core.ntext, so an edit in the admin applies to the next push
-- without a deploy. Approval is a review mark («Εγκρίθηκε» / «Προς έλεγχο»), not a send gate: the current text always
-- goes out. Any edit clears the approval.
--
-- The rule for a missing value: the text is cut into pieces at « · ». A piece whose {placeholder} has no value (null) is
-- left out together with its « · ». An empty value ('') keeps the piece. The match reminders use this for the
-- tournament and the opponent, which are not always known.
--
-- The seeded rows are today's exact wording, so pushes stay byte for byte the same, except the entry deadline's day
-- names, which now carry their accents like core.greek_when (Τρί, Πέμ, Σάβ).

create table core.notification_texts (
  key          text primary key,
  channel      text not null default 'push' check (channel in ('push')),
  label_el     text not null,
  title        text not null check (char_length(title) between 1 and 60),
  body         text not null check (char_length(body) between 1 and 180),
  placeholders text[] not null default '{}',
  pro          boolean not null default false,
  sort         int not null default 0,
  approved_at  timestamptz,
  approved_by  uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);
alter table core.notification_texts enable row level security;
revoke all on core.notification_texts from public, anon, authenticated;

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('results_one', 'Βγήκε ένα αποτέλεσμα από τις προβλέψεις σου', 'Βγήκε αποτέλεσμα', 'Το ’πες; Μπες να δεις.', '{}', false, 10),
  ('results_many', 'Βγήκαν μαζί πολλά αποτελέσματα από τις προβλέψεις σου ({n}: πόσα)', 'Βγήκαν {n} αποτελέσματα',
   'Πόσα το ’πες; Μπες να δεις.', '{n}', false, 20),
  ('schedule_new', 'Το ματς σου μπήκε στο πρόγραμμα του τουρνουά', 'Το πρόγραμμά σου', '{when} · {tournament} · με {opponent}',
   '{when,tournament,opponent}', true, 30),
  ('schedule_moved', 'Άλλαξε η μέρα ή η ώρα του ματς σου', 'Άλλαξε η ώρα σου', '{when} · {tournament} · με {opponent}',
   '{when,tournament,opponent}', true, 40),
  ('schedule_postponed', 'Αναβλήθηκε το ματς σου (π.χ. βροχή)', 'Αναβλήθηκε το ματς σου',
   '{tournament}: το ματς με {opponent} αναβλήθηκε. Θα σου πούμε τη νέα μέρα.', '{tournament,opponent}', true, 50),
  ('draw_opponent', 'Βγήκε η κλήρωση και ξέρεις τον πρώτο σου αντίπαλο', 'Βγήκε η κλήρωση',
   '{tournament} · {category}: πρώτος γύρος με {opponent}', '{tournament,category,opponent}', true, 60),
  ('draw_bye', 'Βγήκε η κλήρωση και περνάς χωρίς ματς στον 2ο γύρο', 'Βγήκε η κλήρωση',
   '{tournament} · {category}: περνάς κατευθείαν στον 2ο γύρο', '{tournament,category}', true, 70),
  ('draw_group', 'Βγήκε η κλήρωση και παίζεις σε όμιλο', 'Βγήκε η κλήρωση', '{tournament} · {category}: παίζεις σε όμιλο',
   '{tournament,category}', true, 80),
  ('reminder_eve', 'Το βράδυ πριν από το ματς σου, από τις 20:00. Αν λείπει το τουρνουά ή ο αντίπαλος, φεύγει το κομμάτι του με το « · »',
   'Αύριο παίζεις', '{when} · {tournament} · με {opponent}', '{when,tournament,opponent}', true, 90),
  ('reminder_soon', 'Δύο ώρες πριν από το ματς σου. Αν λείπει το τουρνουά ή ο αντίπαλος, φεύγει το κομμάτι του με το « · »',
   'Σε λίγο παίζεις', '{time} · {tournament} · με {opponent}', '{time,tournament,opponent}', true, 100),
  ('entry_deadline', 'Δύο μέρες πριν κλείσουν οι δηλώσεις ενός τουρνουά κοντά σου', 'Κλείνουν οι δηλώσεις',
   '{tournament}: δηλώσεις έως {day} {date}. Μπαίνεις;', '{tournament,day,date}', true, 110)
on conflict (key) do nothing;

-- the {placeholders} in a text, in order
create or replace function core.ntext_names(p_text text)
returns text[]
language sql immutable set search_path = pg_temp
as $$
  select coalesce(array_agg(m[1] order by o), '{}') from regexp_matches(coalesce(p_text, ''), '\{([a-z_]+)\}', 'g') with ordinality x(m, o)
$$;

-- fill one text: {name} gets p_vars ->> name; a « · » piece with a null value is left out (see the top of this file)
create or replace function core.ntext_fill(p_text text, p_vars jsonb)
returns text
language plpgsql immutable set search_path = pg_temp
as $$
declare
  v_piece text;
  v_parts text[];
  v_names text[];
  v_out   text[] := '{}';
  v_res   text;
  i       int;
begin
  if p_text is null then return null; end if;
  foreach v_piece in array string_to_array(p_text, ' · ') loop
    v_names := core.ntext_names(v_piece);
    continue when exists (select 1 from unnest(v_names) n where p_vars ->> n is null);
    -- one pass (a value that itself looks like {x} is never filled again)
    v_parts := regexp_split_to_array(v_piece, '\{[a-z_]+\}');
    v_res := v_parts[1];
    for i in 1 .. coalesce(array_length(v_names, 1), 0) loop
      v_res := v_res || (p_vars ->> v_names[i]) || v_parts[i + 1];
    end loop;
    v_out := v_out || v_res;
  end loop;
  return array_to_string(v_out, ' · ');
end;
$$;

-- the title and the body of one text, filled
create or replace function core.ntext(p_key text, p_vars jsonb default '{}', out title text, out body text)
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  t core.notification_texts;
begin
  select * into t from core.notification_texts where key = p_key;
  if t.key is null then raise exception 'notification_text_missing: %', p_key using errcode = 'P0002'; end if;
  title := core.ntext_fill(t.title, coalesce(p_vars, '{}'));
  body := core.ntext_fill(t.body, coalesce(p_vars, '{}'));
end;
$$;
revoke all on function core.ntext_names(text) from public, anon;
revoke all on function core.ntext_fill(text, jsonb) from public, anon;
revoke all on function core.ntext(text, jsonb) from public, anon, authenticated;

-- ── the push builders, now reading their texts (otherwise the same as their latest versions) ──

-- schedule alerts (20261218000000_m4_pro_alerts)
create or replace function core.schedule_alert(p_match uuid, p_what text)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  m     core.matches;
  t     core.tournaments;
  r     record;
  v_n   int := 0;
  v_key text;
  v_opp text;
  v_msg jsonb;
  v_txt record;
begin
  select * into m from core.matches where id = p_match;
  if m.id is null or m.tournament_id is null or m.status not in ('announced', 'scheduled') or m.starts_at is null then return 0; end if;
  if p_what <> 'postponed' and (m.starts_at < now() or m.starts_at > now() + interval '14 days') then return 0; end if;
  select * into t from core.tournaments where id = m.tournament_id;
  for r in
    select mp.side, p.claimed_by_user_id as user_id
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and p.claimed_by_user_id is not null and core.is_pro(p.claimed_by_user_id)
  loop
    select string_agg(btrim(p.surname), ' / ' order by mp.position) into v_opp
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and mp.side <> r.side;
    select * into v_txt from core.ntext(
      case p_what when 'new' then 'schedule_new' when 'moved' then 'schedule_moved' else 'schedule_postponed' end,
      jsonb_build_object('when', core.greek_when(m.starts_at), 'tournament', t.name, 'opponent', coalesce(v_opp, '')));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', p_match, 'tournament_id', t.id));
    v_key := 'schedule:' || r.user_id || ':' || p_match || ':' || p_what || ':' || extract(epoch from m.starts_at)::bigint;
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'schedule', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'schedule', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.schedule_alert(uuid, text) from public, anon;

-- the push batch: result pushes grouped per person (20261218000000_m4_pro_alerts)
create or replace function core.take_push_batch(p_limit int default 200)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_jobs jsonb;
begin
  with claimed as (
    select id, (payload ->> 'user_id')::uuid as user_id, payload ->> 'dedupe_key' as dedupe_key,
           payload ->> 'type' as type, payload -> 'message' as message
      from core.outbox
     where kind = 'push' and done_at is null and run_after <= now()
     order by id
     limit greatest(coalesce(p_limit, 200), 1)
     for update skip locked
  ),
  done as (
    update core.outbox o set done_at = now(), attempts = o.attempts + 1
      from claimed c where o.id = c.id
    returning c.user_id, c.dedupe_key, c.type, c.message
  ),
  sent as (
    update core.notifications n set sent_at = now()
      from done d where n.dedupe_key = d.dedupe_key and n.sent_at is null
    returning n.user_id
  ),
  per_user as (   -- results group per person («Βγήκαν 3 αποτελέσματα»)
    select d.user_id, count(*)::int as n from done d where d.type is null group by d.user_id
  ),
  own as (        -- typed pushes (Pro schedule alerts) go one by one with their own text
    select d.user_id, d.type, d.message from done d where d.type is not null
  )
  select coalesce((select jsonb_agg(m order by m ->> 'to') from (
    select jsonb_build_object(
             'to', t.token,
             'sound', 'default',
             'title', nt.title,
             'body', nt.body,
             'data', jsonb_build_object('type', 'results', 'count', u.n)) as m
      from per_user u
      cross join lateral core.ntext(case when u.n = 1 then 'results_one' else 'results_many' end, jsonb_build_object('n', u.n)) nt
      join core.push_tokens t on t.user_id = u.user_id
    union all
    select jsonb_build_object('to', t.token, 'sound', 'default', 'title', o.message ->> 'title', 'body', o.message ->> 'body',
                              'data', coalesce(o.message -> 'data', '{}'::jsonb) || jsonb_build_object('type', o.type))
      from own o
      join core.push_tokens t on t.user_id = o.user_id) x), '[]'::jsonb)
    into v_jobs;
  -- (data-modifying CTEs run whether or not the select reads them: jobs are done and notifications sent even
  -- for people with no device, so nothing piles up)
  return v_jobs;
end;
$$;

-- draw alerts (20261221000000_m4_draw_alerts)
create or replace function core.draw_alert(p_tournament uuid, p_tab text)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  d     core.tournament_draws;
  t     core.tournaments;
  r     record;
  v_n   int := 0;
  v_key text;
  v_opp jsonb;
  v_who text;
  v_kind text;
  v_msg jsonb;
  v_txt record;
begin
  select * into d from core.tournament_draws where tournament_id = p_tournament and tab = p_tab;
  select * into t from core.tournaments where id = p_tournament;
  if d.tournament_id is null or t.id is null or core.tournament_state(t) = 'done' then return 0; end if;
  for r in
    select distinct on (p.claimed_by_user_id) p.claimed_by_user_id as user_id, (en ->> 'pos')::int as pos
      from jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
      join core.players p on p.id = (pl ->> 'player_id')::uuid
     where p.claimed_by_user_id is not null and core.is_pro(p.claimed_by_user_id)
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
                                'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'draw', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'draw', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.draw_alert(uuid, text) from public, anon;

-- match reminders (20270104000000_match_reminders): the tournament and the opponent drop out when unknown
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
  for r in
    select m.id, m.starts_at, m.tournament_id, t.name as tournament, mp.side, p.claimed_by_user_id as user_id
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id
      join core.players p on p.id = mp.player_id
      left join core.tournaments t on t.id = m.tournament_id
     where m.status in ('announced', 'scheduled') and m.postponed_at is null and m.starts_at is not null
       and m.starts_at > p_now + interval '10 minutes' and m.starts_at <= p_now + interval '30 hours'
       and p.claimed_by_user_id is not null and core.is_pro(p.claimed_by_user_id)
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
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', r.id, 'tournament_id', r.tournament_id));
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
revoke all on function core.match_reminders(timestamptz) from public, anon;

-- entry deadline reminders (20270201000000_next_tournament): day names now with their accents
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
  -- from 10:00 Athens, so nobody is woken up; a run missed on the day still sends the next day
  if extract(hour from p_now at time zone 'Europe/Athens') < 10 then return 0; end if;
  for r in
    select t.id, t.name, t.entry_deadline, pr.user_id
      from core.tournaments t
      join core.profiles pr on pr.primary_sport = t.sport_id and pr.deleted_at is null
     where not t.is_minor_event
       and t.entry_deadline between v_day + 1 and v_day + 2
       and (t.starts_on is null or t.starts_on > v_day)
       and core.is_pro(pr.user_id)
       and ((t.area_id is not null and (t.area_id = pr.area_id or t.area_id = any(pr.area_ids)))
            or core.played_edition(pr.claimed_player_id, t.id))
  loop
    v_key := 'entry:' || r.user_id || ':' || r.id;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    select * into v_txt from core.ntext('entry_deadline', jsonb_build_object(
      'tournament', r.name,
      'day', (array['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'])[extract(dow from r.entry_deadline)::int + 1],
      'date', to_char(r.entry_deadline, 'FMDD/FMMM')));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body, 'data', jsonb_build_object('tournament_id', r.id));
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
revoke all on function core.entry_reminders(timestamptz) from public, anon;

-- ── admin ──

create or replace function core.notification_text_doc(t core.notification_texts)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'key', t.key, 'channel', t.channel, 'label', t.label_el, 'title', t.title, 'body', t.body,
    'placeholders', to_jsonb(t.placeholders), 'pro', t.pro,
    'approved_at', t.approved_at, 'approved_by', (select display_name from core.profiles where user_id = t.approved_by),
    'updated_at', t.updated_at, 'updated_by', (select display_name from core.profiles where user_id = t.updated_by))
$$;
revoke all on function core.notification_text_doc(core.notification_texts) from public, anon, authenticated;

-- staff: every text, in the order they matter
create or replace function api.admin_notification_texts()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(core.notification_text_doc(t) order by t.sort, t.key) from core.notification_texts t), '[]'::jsonb);
end;
$$;

-- staff (admin or editor): a new title and body. Checked: not empty, title up to 60 and body up to 180 characters,
-- no em dash, only this text's {placeholders}. A real change clears the approval.
create or replace function api.admin_update_notification_text(p_key text, p_title text, p_body text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t       core.notification_texts;
  v_title text := btrim(coalesce(p_title, ''));
  v_body  text := btrim(coalesce(p_body, ''));
  v_bad   text;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from core.notification_texts where key = p_key for update;
  if t.key is null then raise exception 'text_not_found' using errcode = 'P0002'; end if;
  if v_title = '' then raise exception 'title_required' using errcode = '22023'; end if;
  if v_body = '' then raise exception 'body_required' using errcode = '22023'; end if;
  if char_length(v_title) > 60 then raise exception 'title_too_long' using errcode = '22023'; end if;
  if char_length(v_body) > 180 then raise exception 'body_too_long' using errcode = '22023'; end if;
  if strpos(v_title || v_body, chr(8212)) > 0 then raise exception 'em_dash' using errcode = '22023'; end if;
  select n into v_bad from unnest(core.ntext_names(v_title) || core.ntext_names(v_body)) n
   where n <> all (t.placeholders) limit 1;
  if v_bad is not null then raise exception 'unknown_placeholder: %', v_bad using errcode = '22023'; end if;
  -- a brace that is not part of a {placeholder} is a typo
  if regexp_replace(v_title || v_body, '\{[a-z_]+\}', '', 'g') ~ '[{}]' then raise exception 'stray_brace' using errcode = '22023'; end if;
  if v_title = t.title and v_body = t.body then return core.notification_text_doc(t); end if;
  update core.notification_texts
     set title = v_title, body = v_body, approved_at = null, approved_by = null, updated_at = now(), updated_by = auth.uid()
   where key = p_key
  returning * into t;
  return core.notification_text_doc(t);
end;
$$;

-- admin: approve the text as it reads now
create or replace function api.admin_approve_notification_text(p_key text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t core.notification_texts;
begin
  if not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.notification_texts set approved_at = now(), approved_by = auth.uid() where key = p_key returning * into t;
  if t.key is null then raise exception 'text_not_found' using errcode = 'P0002'; end if;
  return core.notification_text_doc(t);
end;
$$;

revoke all on function api.admin_notification_texts() from public, anon;
revoke all on function api.admin_update_notification_text(text, text, text) from public, anon;
revoke all on function api.admin_approve_notification_text(text) from public, anon;
grant execute on function api.admin_notification_texts() to authenticated, service_role;
grant execute on function api.admin_update_notification_text(text, text, text) to authenticated, service_role;
grant execute on function api.admin_approve_notification_text(text) to authenticated, service_role;
