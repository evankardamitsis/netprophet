-- M4: Pro schedule alerts («Τα τουρνουά σου»: draw alerts and your schedule, monetization plan). When an organiser's
-- sheet first gives a Pro player's claimed profile a tournament match, changes its day or time, or puts it off (rain),
-- the player gets a push with the day, time, tournament and opponent. Free players see the same on the Tournaments
-- page. Typed pushes travel through the same outbox as result pushes but go one by one with their own text; result
-- pushes stay grouped. Only for matches still to play in the next two weeks.

-- «Σάβ 17/10, 10:00» in Athens time
create or replace function core.greek_when(p timestamptz)
returns text
language sql stable set search_path = core, pg_temp
as $$
  select (array['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'])[extract(dow from p at time zone 'Europe/Athens')::int + 1]
         || ' ' || to_char(p at time zone 'Europe/Athens', 'FMDD/FMMM') || ', ' || to_char(p at time zone 'Europe/Athens', 'HH24:MI')
$$;

-- queue a schedule push for every Pro player with a claimed profile in this match (p_what: new, moved, postponed)
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
    v_msg := jsonb_build_object(
      'title', case p_what when 'new' then 'Το πρόγραμμά σου' when 'moved' then 'Άλλαξε η ώρα σου' else 'Αναβλήθηκε το ματς σου' end,
      'body', case p_what
                when 'postponed' then t.name || ': το ματς με ' || coalesce(v_opp, '') || ' αναβλήθηκε. Θα σου πούμε τη νέα μέρα.'
                else core.greek_when(m.starts_at) || ' · ' || t.name || ' · με ' || coalesce(v_opp, '') end,
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
revoke all on function core.schedule_alert(uuid, text) from public;

-- a sheet match gets its people: the new-match alert (participants arrive after the match row, one by one)
create or replace function core.schedule_alert_on_participant()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if exists (select 1 from core.matches m where m.id = new.match_id and m.source = 'import' and m.tournament_id is not null)
     and exists (select 1 from core.players p where p.id = new.player_id and p.claimed_by_user_id is not null) then
    perform core.schedule_alert(new.match_id, 'new');
  end if;
  return null;
end;
$$;
-- deferred to the end of the transaction, so both sides are in when the text names the opponent
create constraint trigger schedule_alert_on_participant after insert on core.match_participants
  deferrable initially deferred
  for each row execute function core.schedule_alert_on_participant();

-- a new day or time, or put off
create or replace function core.schedule_alert_on_change()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.tournament_id is null then return null; end if;
  if new.postponed_at is not null and old.postponed_at is null then
    perform core.schedule_alert(new.id, 'postponed');
  elsif new.starts_at is distinct from old.starts_at and new.postponed_at is null then
    perform core.schedule_alert(new.id, 'moved');
  end if;
  return null;
end;
$$;
create trigger schedule_alert_on_change after update of starts_at, postponed_at on core.matches
  for each row execute function core.schedule_alert_on_change();

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
             'title', case when u.n = 1 then 'Βγήκε αποτέλεσμα' else 'Βγήκαν ' || u.n || ' αποτελέσματα' end,
             'body', case when u.n = 1 then 'Το ’πες; Μπες να δεις.' else 'Πόσα το ’πες; Μπες να δεις.' end,
             'data', jsonb_build_object('type', 'results', 'count', u.n)) as m
      from per_user u
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
