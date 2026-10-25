-- Every push lands on its place in the new app (founder, 25 Oct 2026: "notifications are not landing to the correct
-- place"). Since 20270304000000_pro_notifications the Pro and follower pushes carry data.url, but the result pushes,
-- the reactions and the five claim pushes carried none, and the schedule push opened the tournament on whatever
-- segment came first instead of the match. What this changes:
--
--   * core.push_url(type, data, user): the one table of where a push of each kind opens, as an expo-router path.
--     core.take_push_batch puts it on every push as data.url, unless the push was queued with its own url (the Pro and
--     follower pushes keep theirs). So a kind with no url of its own (results, reaction, claim) gets one, and so does
--     a push already waiting on the outbox. data.type stays on every push (the app's «clear seen pushes» reads it).
--   * core.schedule_alert: the schedule push (new, moved, postponed) opens the tournament on that match,
--     /tournament/{id}?match={match}: Σήμερα when it is today (where «Ο αγώνας σου» leads), else Πρόγραμμα on its
--     day, scrolled to it.
--
-- The table (the app's pushRoute in apps/app/src/lib/push.ts mirrors it, for pushes that come without a url):
--   results    /?results=1                                   the home, results card opened
--   schedule   /tournament/{t}?match={m}                     (no tournament: /)
--   draw       /tournament/{t}?draw={tab}                    (queued with it)
--   follow     /tournament/{t}?draw={tab} or ?day={date}     (queued with it)
--   entry      /tournament/{t}                               (queued with it)
--   reminder   /scout/{m}                                    «Ο αντίπαλος πριν το ματς» (queued with it)
--   reaction   /results?tournament={t}                       (a friendly: /results)
--   claim      /me when the account now holds a player (approved, a dismissed report on your own player),
--              else /players?focus=1 to find yourself (rejected, new player rejected, released, a dismissed «Είμαι εγώ»)
--   anything else /
-- Tests: supabase-v2/tests/153_push_landing.test.sql.

create or replace function core.push_url(p_type text, p_data jsonb, p_user uuid)
returns text
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_t   text := nullif(p_data ->> 'tournament_id', '');
  v_m   text := nullif(p_data ->> 'match_id', '');
  v_tab text := nullif(p_data ->> 'tab', '');
  v_day text := nullif(p_data ->> 'day', '');
begin
  case p_type
    when 'results' then
      return '/?results=1';
    when 'schedule' then
      if v_t is null then return '/'; end if;
      return '/tournament/' || v_t || coalesce('?match=' || v_m, '');
    when 'draw', 'follow', 'entry' then
      if v_t is null then return '/'; end if;
      if v_day is not null then return '/tournament/' || v_t || '?day=' || core.url_part(v_day); end if;
      if v_tab is not null then return '/tournament/' || v_t || '?draw=' || core.url_part(v_tab); end if;
      return '/tournament/' || v_t;
    when 'reminder' then
      return case when v_m is not null then '/scout/' || v_m when v_t is not null then '/tournament/' || v_t else '/' end;
    when 'reaction' then
      return '/results' || coalesce('?tournament=' || v_t, '');
    when 'claim' then
      return case when exists (select 1 from core.players where claimed_by_user_id = p_user) then '/me' else '/players?focus=1' end;
    else
      return '/';
  end case;
end;
$$;
revoke all on function core.push_url(text, jsonb, uuid) from public, anon, authenticated;

-- the push batch (latest: 20270208000000_notification_texts): the same, with data.url on every push
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
  own as (        -- typed pushes go one by one with their own text
    select d.user_id, d.type, coalesce(d.message -> 'data', '{}'::jsonb) as data, d.message from done d where d.type is not null
  )
  select coalesce((select jsonb_agg(m order by m ->> 'to') from (
    select jsonb_build_object(
             'to', t.token,
             'sound', 'default',
             'title', nt.title,
             'body', nt.body,
             'data', jsonb_build_object('type', 'results', 'count', u.n, 'url', core.push_url('results', '{}'::jsonb, u.user_id))) as m
      from per_user u
      cross join lateral core.ntext(case when u.n = 1 then 'results_one' else 'results_many' end, jsonb_build_object('n', u.n)) nt
      join core.push_tokens t on t.user_id = u.user_id
    union all
    select jsonb_build_object('to', t.token, 'sound', 'default', 'title', o.message ->> 'title', 'body', o.message ->> 'body',
                              'data', o.data || jsonb_build_object('type', o.type,
                                                                   'url', coalesce(nullif(o.data ->> 'url', ''), core.push_url(o.type, o.data, o.user_id))))
      from own o
      join core.push_tokens t on t.user_id = o.user_id) x), '[]'::jsonb)
    into v_jobs;
  -- (data-modifying CTEs run whether or not the select reads them: jobs are done and notifications sent even
  -- for people with no device, so nothing piles up)
  return v_jobs;
end;
$$;
revoke all on function core.take_push_batch(int) from public, anon, authenticated;

-- schedule alerts (latest: 20270304000000_pro_notifications): the same, data.url opens the tournament on the match
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
                                                           'url', '/tournament/' || t.id || '?match=' || p_match));
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
