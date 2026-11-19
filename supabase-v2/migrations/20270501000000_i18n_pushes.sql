-- Pushes in English (app 1.0.1, part 2 of the English version). The app stores the language in core.profiles.locale
-- ('el' or 'en', PR #359). Every push the server sends now goes out in English to a profile with locale 'en', and in
-- Greek otherwise, exactly as before.
--
--   * core.notification_texts gets title_en and body_en (nullable), filled below for every key. Staff edit them in the
--     admin next to the Greek ones.
--   * core.ntext_in(key, vars, locale) and core.ntext_for(user, key, vars) pick the text. English only when the
--     recipient's locale is 'en' and both title_en and body_en exist; otherwise the Greek text, filled as before, so a
--     push is never half and half. core.ntext(key, vars) is not touched: Greek stays byte for byte the same.
--   * Some values are Greek before they reach the text (day names, «τον Π. Βλάχο», Τελικός, «Κάποιος»). A builder
--     passes an English value next to the Greek one as {name}_en (when_en, opponent_en, stage_en ...); in English
--     {when} is filled with when_en when the builder gave one, else with when. Greek texts never read the _en values.
--   * Every push builder now asks for its recipient's text (marked «i18n» below; otherwise each is a copy of its latest
--     definition). The broadcast ones fill both languages once and pick per person.
--   * Names of players stay as written. The text is fixed when the push is built (core.notifications.payload), so a
--     person who switches language later keeps the older rows in the language they had.

alter table core.notification_texts
  add column title_en text check (title_en is null or char_length(title_en) between 1 and 60),
  add column body_en  text check (body_en is null or char_length(body_en) between 1 and 180);

update core.notification_texts n set title_en = v.title_en, body_en = v.body_en
  from (values
    ('results_one', 'A result is in', 'Did you call it? Come and see.'),
    ('results_many', '{n} results are in', 'How many did you call? Come and see.'),
    ('results_upset', 'You called it!', 'Only {pct}% saw it coming. Come and see.'),
    ('schedule_new', 'Your schedule', '{when} · {tournament} · vs {opponent}'),
    ('schedule_moved', 'Your time changed', '{when} · {tournament} · vs {opponent}'),
    ('schedule_postponed', 'Your match is postponed', '{tournament}: your match vs {opponent} is postponed. We''ll tell you the new day.'),
    ('draw_opponent', 'The draw is out', '{tournament} · {category}: first round vs {opponent}'),
    ('draw_bye', 'The draw is out', '{tournament} · {category}: you go straight to round 2'),
    ('draw_group', 'The draw is out', '{tournament} · {category}: you play in a group'),
    ('reminder_eve', 'You play tomorrow', '{when} · {tournament} · vs {opponent}'),
    ('reminder_soon', 'You play soon', '{time} · {tournament} · vs {opponent}'),
    ('entry_deadline', 'Entries are closing', '{tournament}: entries close {day} {date}. Are you in?'),
    ('reaction_one', '{name}: "{reaction}"', 'On your match vs {opponent} · {tournament}'),
    ('reaction_many', '{n} people reacted', 'On your match vs {opponent} · {tournament}'),
    ('claim_approved', 'It''s you!', 'Your account is now linked to the profile {name}. Your matches are yours now, see them in Me.'),
    ('claim_rejected', 'We couldn''t link you', 'We couldn''t confirm that the profile {name} is yours. Write to us if this is a mistake.'),
    ('claim_report_rejected', 'The profile stays as it is', 'We checked {name} and found nothing wrong. If you have something to show us, write to us.'),
    ('claim_released', 'Profile unlinked', 'We unlinked {name} from your account. If you think this is a mistake, write to us from Settings.'),
    ('new_player_rejected', 'We didn''t create the profile', 'We didn''t create the profile {name}. If you''re already on the roster, write to us and we''ll find you.'),
    ('new_tournament', 'New tournament: {tournament}', 'The schedule is out. Jump in and vote on the first matches.'),
    ('follow_draw', '{tournament}: the draw is out', 'See the bracket.'),
    ('follow_schedule', '{tournament}: tomorrow''s schedule', 'Matches tomorrow: {n}. See who plays and when.'),
    ('follow_final', '{tournament}: the final is over', '{winner} took the title in {category}.'),
    ('follow_final_pair', '{tournament}: the final is over', '{winner} took the title in {category}.'),
    ('stage_open', '{stage} at {tournament}', '{category} · {a} vs {b}. Who takes it?'),
    ('stage_open_many', '{stage} at {tournament}', '{n} matches. Vote before they start.'),
    ('player_tomorrow', '{player} plays tomorrow · {time}', '{tournament} · vs {opponent}. Who takes it?'),
    ('player_tomorrow_many', '{n} of your players play tomorrow', 'Vote before they start.'),
    ('player_result', '{tournament}', '{winner} beat {loser} · {score}'),
    ('player_result_pair', '{tournament}', '{winner} beat {loser} · {score}'),
    ('player_results_many', '{n} matches of your players are in', 'Come and see how they did.'),
    ('stage_semi_result', '{tournament}: semifinal', '{winner} made the final · {category}'),
    ('stage_semi_result_pair', '{tournament}: semifinal', '{winner} made the final · {category}'),
    ('stage_result_many', '{tournament}: {n} {stage} are over', 'Come and see who went through.'),
    ('follower_one', '{name} follows you', 'Take a look at the profile.'),
    ('follower_many', '{n} new followers', 'Your crew is growing.'),
    ('mission_near', 'One more vote', 'For the mission "{quest}". You have open matches.'),
    ('quiz_nudge', 'Quiz of the day', '{n} quick questions and +30 points. There''s still time.'),
    ('quiz_nudge_started', 'You''ve done {done} of {total}', 'Finish the quiz of the day and get +30.'),
    ('quiz_nudge_rest', 'You''ve done {done} of {total}', 'You got the +30. Finish the rest too.'),
    ('streak_risk', 'Your streak is at risk', '{n} days in a row. One vote or the quiz keeps it alive.'),
    ('streak_risk_one', 'Your streak is at risk', 'You started a streak yesterday. Play today to make it 2.'),
    ('streak_saved', 'Insurance saved your streak', 'You didn''t play yesterday, your streak stays at {n}. You have {left} Insurance left.'),
    ('streak_saved_one', 'Insurance saved your streak', 'You didn''t play yesterday, your streak stays at {n}. You have 1 Insurance left.'),
    ('streak_saved_none', 'Insurance saved your streak', 'You didn''t play yesterday, your streak stays at {n}. No Insurance left.'),
    ('streak_lost', 'Your streak broke at {n}', 'Start a new one today. Your best is {best}.'),
    ('streak_lost_one', 'Your streak broke', 'Start a new one today. Your best is {best}.')
  ) v(key, title_en, body_en)
 where n.key = v.key;

-- the recipient's language: 'en' only when the profile says so
create or replace function core.user_locale(p_user uuid)
returns text
language sql stable security definer set search_path = core, pg_temp
as $$
  select case when (select pr.locale from core.profiles pr where pr.user_id = p_user) = 'en' then 'en' else 'el' end
$$;

-- one text in a language: English when asked and written (title and body), else core.ntext as before. In English an
-- {x}_en value stands in for {x} (see the top of this file).
create or replace function core.ntext_in(p_key text, p_vars jsonb, p_locale text, out title text, out body text)
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  t      core.notification_texts;
  v_vars jsonb := coalesce(p_vars, '{}');
begin
  if p_locale = 'en' then
    select * into t from core.notification_texts where key = p_key;
    if t.key is not null and t.title_en is not null and t.body_en is not null then
      select v_vars || coalesce(jsonb_object_agg(left(j.k, -3), j.v), '{}') into v_vars
        from jsonb_each(v_vars) j(k, v) where j.k like '%\_en';
      title := core.ntext_fill(t.title_en, v_vars);
      body := core.ntext_fill(t.body_en, v_vars);
      return;
    end if;
  end if;
  select n.title, n.body into title, body from core.ntext(p_key, p_vars) n;
end;
$$;

-- one text for one person, in their language
create or replace function core.ntext_for(p_user uuid, p_key text, p_vars jsonb default '{}', out title text, out body text)
language sql stable security definer set search_path = core, pg_temp
as $$
  select n.title, n.body from core.ntext_in(p_key, p_vars, core.user_locale(p_user)) n
$$;

-- a time in English, as core.greek_when: «Sat 24 Oct, 10:00» (to_char without TM is always English)
create or replace function core.english_when(p timestamptz)
returns text
language sql stable set search_path = core, pg_temp
as $$
  select to_char(p at time zone 'Europe/Athens', 'Dy FMDD Mon, HH24:MI')
$$;

-- the other side of a match as plain names, for English: «Π. Βλάχος & Ν. Παππάς» (core.opponents_acc gives
-- «τον Π. Βλάχο» for Greek). Never a minor or a hidden player; null when nobody is left.
create or replace function core.opponents_plain(p_match uuid, p_side smallint)
returns text
language sql stable security definer set search_path = core, pg_temp
as $$
  select string_agg(concat_ws(' ', nullif(upper(left(btrim(p.first_name), 1)), '') || '.', btrim(p.surname)), ' & ' order by mp.position)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and mp.side <> p_side and not p.hidden and not p.is_minor
$$;

revoke all on function core.user_locale(uuid) from public, anon, authenticated;
revoke all on function core.ntext_in(text, jsonb, text) from public, anon, authenticated;
revoke all on function core.ntext_for(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function core.english_when(timestamptz) from public, anon, authenticated;
revoke all on function core.opponents_plain(uuid, smallint) from public, anon, authenticated;

-- ── the push builders: each a copy of its latest definition, the recipient's language marked «i18n» ──

-- core.take_push_batch (latest: 20270407000000_personal_pushes)
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
    select d.user_id, count(*)::int as n, (array_agg(d.dedupe_key))[1] as dedupe_key from done d where d.type is null group by d.user_id
  ),
  upset as (      -- your one result was an upset you called: how few saw it coming
    select u.user_id, round(100.0 * count(*) filter (where o.outcome = 'correct') / nullif(count(*), 0))::int as pct
      from per_user u
      join core.votes v on v.user_id = u.user_id and v.subject_type = 'match' and v.subject_id = split_part(u.dedupe_key, ':', 3)::uuid
                       and v.is_upset_call and v.outcome = 'correct'
      join core.votes o on o.subject_type = 'match' and o.subject_id = v.subject_id
     where u.n = 1
     group by u.user_id
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
      left join upset up on up.user_id = u.user_id
      -- i18n: in the person's language
      cross join lateral core.ntext_for(u.user_id, case when up.pct is not null then 'results_upset' when u.n = 1 then 'results_one' else 'results_many' end,
                                        jsonb_build_object('n', u.n, 'pct', up.pct)) nt
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

-- core.schedule_alert (latest: 20270320000000_push_landing)
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
    -- i18n: in the person's language, the time in English too
    select * into v_txt from core.ntext_for(r.user_id,
      case v_what when 'new' then 'schedule_new' when 'moved' then 'schedule_moved' else 'schedule_postponed' end,
      jsonb_build_object('when', core.greek_when(m.starts_at), 'when_en', core.english_when(m.starts_at),
                         'tournament', t.name, 'opponent', coalesce(v_opp, '')));
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

-- core.draw_alert (latest: 20270304000000_pro_notifications)
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
    -- i18n: in the person's language
    select * into v_txt from core.ntext_for(r.user_id, v_kind, jsonb_build_object('tournament', t.name, 'category', d.tab, 'opponent', v_who));
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

-- core.match_reminders (latest: 20270304000000_pro_notifications)
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
    -- i18n: in the person's language, the time in English too
    select * into v_txt from core.ntext_for(r.user_id, 'reminder_' || v_kind, jsonb_build_object(
      'when', core.greek_when(r.starts_at), 'when_en', core.english_when(r.starts_at), 'time', to_char(r.starts_at at time zone 'Europe/Athens', 'HH24:MI'),
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

-- core.entry_reminders (latest: 20270304000000_pro_notifications)
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
    -- i18n: in the person's language, the day and date in English too («Fri», «21 Nov»)
    select * into v_txt from core.ntext_for(r.user_id, 'entry_deadline', jsonb_build_object(
      'tournament', r.name,
      'day', (array['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'])[extract(dow from r.entry_deadline)::int + 1],
      'date', to_char(r.entry_deadline, 'FMDD/FMMM'),
      'day_en', to_char(r.entry_deadline, 'Dy'), 'date_en', to_char(r.entry_deadline, 'FMDD Mon')));
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

-- core.reaction_notify (latest: 20270223000000_reaction_push)
create or replace function core.reaction_notify(p_match uuid, p_reactor uuid, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  m          core.matches;
  v_tour     text;
  r          record;
  n          core.notifications;
  o          core.outbox;
  v_at       timestamptz;
  v_key      text;
  v_reactors jsonb;
  v_count    int;
  v_name     text;
  v_label    text;
  v_label_en text;   -- i18n
  v_txt      record;
  v_msg      jsonb;
  v_n        int := 0;
begin
  select * into m from core.matches where id = p_match;
  if m.id is null or p_reactor is null then return 0; end if;
  select name into v_tour from core.tournaments where id = m.tournament_id;

  for r in
    select distinct on (p.claimed_by_user_id) p.claimed_by_user_id as user_id, mp.side
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
      join core.profiles pr on pr.user_id = p.claimed_by_user_id
     where mp.match_id = p_match
       and p.claimed_by_user_id is not null and p.claimed_by_user_id <> p_reactor
       and not p.hidden and not p.is_minor
       and pr.deleted_at is null
       and coalesce(pr.notification_prefs ->> 'reactions', 'true') <> 'false'
       and not core.is_blocked(p.claimed_by_user_id, p_reactor)
       and not core.is_blocked(p_reactor, p.claimed_by_user_id)
  loop
    -- the same person counts once per match, whatever they do later
    -- (through the person's notifications, which are indexed by user, then the job by its unique key)
    continue when exists (select 1 from core.notifications x
                            join core.outbox ob on ob.idempotency_key = 'push:' || x.dedupe_key
                           where x.user_id = r.user_id and x.type = 'reaction'
                             and x.dedupe_key like 'reaction:' || r.user_id || ':' || p_match || ':%'
                             and ob.payload -> 'reactors' ? p_reactor::text);

    select * into n from core.notifications
     where user_id = r.user_id and type = 'reaction' and dedupe_key like 'reaction:' || r.user_id || ':' || p_match || ':%'
     order by scheduled_at desc limit 1;
    o := null;
    if n.id is not null and n.sent_at is null then
      select * into o from core.outbox where idempotency_key = 'push:' || n.dedupe_key and done_at is null for update;
    end if;

    if o.id is not null then
      -- a push still waits: it now speaks for one more person
      v_reactors := coalesce(o.payload -> 'reactors', '[]'::jsonb) || to_jsonb(p_reactor::text);
      v_key := n.dedupe_key;
    else
      v_at := case when n.id is null or n.scheduled_at <= p_now - interval '3 hours' then p_now
                   else greatest(p_now, n.scheduled_at + interval '3 hours') end;
      v_reactors := jsonb_build_array(p_reactor::text);
      v_key := 'reaction:' || r.user_id || ':' || p_match || ':' || floor(extract(epoch from v_at))::bigint;
    end if;

    v_count := jsonb_array_length(v_reactors);
    if v_count = 1 then
      -- i18n: no name falls back in each language (the outer coalesce, so Greek reads as before)
      select coalesce(nullif(btrim(pr.first_name), ''), nullif(btrim(pl.first_name), ''),
                      nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''))
        into v_name
        from core.profiles pr left join core.players pl on pl.id = pr.claimed_player_id
       where pr.user_id = (v_reactors ->> 0)::uuid;
      select rp.label_el, rp.label_en into v_label, v_label_en
        from core.reactions x join core.reaction_pool rp on rp.key = x.reaction_key
       where x.user_id = (v_reactors ->> 0)::uuid and x.match_id = p_match;
      -- i18n: in the person's language, with the English reaction and plain names
      select * into v_txt from core.ntext_for(r.user_id, 'reaction_one', jsonb_build_object(
        'name', coalesce(v_name, 'Κάποιος'), 'reaction', coalesce(v_label, ''),
        'opponent', core.opponents_acc(p_match, r.side), 'tournament', v_tour,
        'name_en', coalesce(v_name, 'Someone'), 'reaction_en', coalesce(v_label_en, v_label, ''),
        'opponent_en', core.opponents_plain(p_match, r.side)));
    else
      select * into v_txt from core.ntext_for(r.user_id, 'reaction_many', jsonb_build_object(
        'n', v_count, 'opponent', core.opponents_acc(p_match, r.side), 'tournament', v_tour,
        'opponent_en', core.opponents_plain(p_match, r.side)));
    end if;
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('match_id', p_match, 'tournament_id', m.tournament_id));

    if o.id is not null then
      update core.outbox
         set payload = payload || jsonb_build_object('message', v_msg, 'reactors', v_reactors)
       where id = o.id;
      update core.notifications set payload = v_msg where id = n.id;
    else
      insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
      values (r.user_id, 'reaction', v_msg, 'push', v_key, v_at)
      on conflict (dedupe_key) do nothing;
      continue when not found;
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'reaction',
                                         'message', v_msg, 'reactors', v_reactors), 'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- api.admin_review_claim (latest: 20270302000000_claim_followups)
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
  -- i18n: in the person's language
  select * into v_txt from core.ntext_for(p_user, case when p_approve then 'claim_approved'
                                           when v_q.via = 'new' then 'new_player_rejected'
                                           else 'claim_rejected' end,
                                      jsonb_build_object('name', v_name, 'name_en',
                                        coalesce(nullif(concat_ws(' ', nullif(btrim(v_pl.first_name), ''), nullif(btrim(v_pl.surname), '')), ''),
                                                 'from the roster')));
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

-- api.admin_unclaim (latest: 20270302000000_claim_followups)
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
    -- i18n: in the person's language
    select * into v_txt from core.ntext_for(v_pl.claimed_by_user_id, 'claim_released',
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

-- api.admin_decide_identity (latest: 20270302000000_claim_followups)
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
      -- i18n: in the person's language
      select * into v_txt from core.ntext_for(v_f.reporter_user_id, 'claim_report_rejected', jsonb_build_object('name', v_name));
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

-- core.follow_draw_alert (latest: 20270305000000_tournament_follow)
create or replace function core.follow_draw_alert(p_tournament uuid, p_tab text, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  d     core.tournament_draws;
  t     core.tournaments;
  r     record;
  v_n   int := 0;
  v_at  timestamptz := core.push_at(p_now);
  v_key text;
  v_msg jsonb;
  v_msg_en jsonb;   -- i18n
  v_txt record;
begin
  select * into d from core.tournament_draws where tournament_id = p_tournament and tab = p_tab;
  select * into t from core.tournaments where id = p_tournament;
  if d.tournament_id is null or t.id is null or t.is_minor_event or core.tournament_state(t) = 'done' then return 0; end if;
  if core.draw_started(d.draw) then return 0; end if;
  select * into v_txt from core.ntext('follow_draw', jsonb_build_object('tournament', t.name, 'category', d.tab));
  v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                              'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab,
                                                         'url', '/tournament/' || t.id || '?draw=' || core.url_part(d.tab)));
  -- i18n: the same in English, picked per person below
  select * into v_txt from core.ntext_in('follow_draw', jsonb_build_object('tournament', t.name, 'category', d.tab), 'en');
  v_msg_en := v_msg || jsonb_build_object('title', v_txt.title, 'body', v_txt.body);
  for r in
    select f.user_id from core.tournament_follows f
     where f.tournament_id = p_tournament and core.push_wants(f.user_id, 'followed')
  loop
    v_key := 'follow_draw:' || r.user_id || ':' || p_tournament || ':' || core.athens_day(v_at);
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    -- their own draw already came as the Pro push
    continue when exists (select 1 from core.notifications where dedupe_key = 'draw:' || r.user_id || ':' || p_tournament || ':' || p_tab);
    -- i18n: in the person's language
    if core.follow_push(r.user_id, v_key, case core.user_locale(r.user_id) when 'en' then v_msg_en else v_msg end, v_at) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- core.follow_final_alert (latest: 20270305000000_tournament_follow)
create or replace function core.follow_final_alert(p_tournament uuid, p_tab text, p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  d      core.tournament_draws;
  t      core.tournaments;
  r      record;
  v_n    int := 0;
  v_at   timestamptz := core.push_at(p_now);
  v_side int;
  v_fin  jsonb;
  v_ent  jsonb;
  v_who  text;
  v_who_en text;    -- i18n
  v_cnt  int;
  v_key  text;
  v_msg  jsonb;
  v_msg_en jsonb;   -- i18n
  v_txt  record;
begin
  select * into d from core.tournament_draws where tournament_id = p_tournament and tab = p_tab;
  select * into t from core.tournaments where id = p_tournament;
  if d.tournament_id is null or t.id is null or t.is_minor_event or d.format <> 'knockout' then return 0; end if;
  -- an old tournament imported again is not news
  if coalesce(t.ends_on, t.starts_on, core.athens_day(p_now)) < core.athens_day(p_now) - 7 then return 0; end if;
  v_side := core.draw_final_winner(d.draw);
  if v_side is null then return 0; end if;
  v_fin := d.draw -> 'rounds' -> -1 -> 0;
  select en into v_ent from jsonb_array_elements(d.draw -> 'entrants') en
   where en ->> 'raw' = v_fin ->> ('side' || v_side) and not coalesce((en ->> 'bye')::boolean, false)
   limit 1;
  if v_ent is null or jsonb_array_length(coalesce(v_ent -> 'players', '[]')) = 0 then return 0; end if;
  if exists (select 1 from jsonb_array_elements(v_ent -> 'players') pl join core.players p on p.id = (pl ->> 'player_id')::uuid
              where p.hidden or p.is_minor) then return 0; end if;
  -- i18n: the pair joined with «&» for English
  select string_agg(coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''), pl ->> 'raw'), ' και ' order by o), count(*),
         string_agg(coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''), pl ->> 'raw'), ' & ' order by o)
    into v_who, v_cnt, v_who_en
    from jsonb_array_elements(v_ent -> 'players') with ordinality x(pl, o)
    left join core.players p on p.id = (pl ->> 'player_id')::uuid;
  select * into v_txt from core.ntext(case when v_cnt > 1 then 'follow_final_pair' else 'follow_final' end,
                                      jsonb_build_object('tournament', t.name, 'winner', v_who, 'category', d.tab));
  v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                              'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab,
                                                         'url', '/tournament/' || t.id || '?draw=' || core.url_part(d.tab)));
  -- i18n: the same in English, picked per person below
  select * into v_txt from core.ntext_in(case when v_cnt > 1 then 'follow_final_pair' else 'follow_final' end,
                                         jsonb_build_object('tournament', t.name, 'winner', v_who, 'category', d.tab, 'winner_en', v_who_en), 'en');
  v_msg_en := v_msg || jsonb_build_object('title', v_txt.title, 'body', v_txt.body);
  for r in
    select f.user_id from core.tournament_follows f
     where f.tournament_id = p_tournament and core.push_wants(f.user_id, 'followed')
       -- the two finalists know
       and not exists (select 1 from jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
                         join core.players p on p.id = (pl ->> 'player_id')::uuid
                        where en ->> 'raw' in (v_fin ->> 'side1', v_fin ->> 'side2') and p.claimed_by_user_id = f.user_id)
  loop
    v_key := 'follow_final:' || r.user_id || ':' || p_tournament || ':' || p_tab;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    -- i18n: in the person's language
    if core.follow_push(r.user_id, v_key, case core.user_locale(r.user_id) when 'en' then v_msg_en else v_msg end, v_at) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- core.follow_schedule_alerts (latest: 20270305000000_tournament_follow)
create or replace function core.follow_schedule_alerts(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r     record;
  v_n   int := 0;
  v_day date := core.feed_day(p_now) + 1;
  v_key text;
  v_msg jsonb;
  v_txt record;
begin
  if extract(hour from p_now at time zone 'Europe/Athens') < 18 or core.push_at(p_now) <> p_now then return 0; end if;
  for r in
    with ms as (
      -- what the tournament's Πρόγραμμα shows for that day (api.get_tournament), still to be played
      select m.id, m.tournament_id
        from core.matches m
       where m.tournament_id in (select tournament_id from core.tournament_follows)
         and m.approved and m.status in ('announced', 'scheduled') and m.postponed_at is null
         and m.starts_at is not null and core.athens_day(m.starts_at) = v_day
         and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                          where mp.match_id = m.id and (p.is_minor or p.hidden))),
    per as (select tournament_id, count(*)::int as n, array_agg(id::text) as ids from ms group by tournament_id)
    select per.tournament_id, per.n, per.ids, t.name, f.user_id
      from per
      join core.tournaments t on t.id = per.tournament_id and not t.is_minor_event
      join core.tournament_follows f on f.tournament_id = per.tournament_id
     where core.push_wants(f.user_id, 'followed')
  loop
    v_key := 'follow_schedule:' || r.user_id || ':' || r.tournament_id || ':' || v_day;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    -- their own match that day already came as the Pro push
    continue when exists (select 1 from core.notifications n
                           where n.user_id = r.user_id and n.type = 'schedule' and n.payload -> 'data' ->> 'match_id' = any(r.ids));
    -- i18n: in the person's language
    select * into v_txt from core.ntext_for(r.user_id, 'follow_schedule', jsonb_build_object('tournament', r.name, 'n', r.n));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('tournament_id', r.tournament_id, 'day', v_day,
                                                           'url', '/tournament/' || r.tournament_id || '?day=' || to_char(v_day, 'YYYY-MM-DD')));
    if core.follow_push(r.user_id, v_key, v_msg, p_now) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;

-- core.new_tournament_alert (latest: 20270405000000_new_tournament_push)
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
  v_msg_en jsonb;   -- i18n
  v_one jsonb;      -- i18n
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
  -- i18n: the same in English, picked per person below
  select * into v_txt from core.ntext_in('new_tournament', jsonb_build_object('tournament', t.name), 'en');
  v_msg_en := v_msg || jsonb_build_object('title', v_txt.title, 'body', v_txt.body);
  for r in
    select distinct pt.user_id from core.push_tokens pt
     where core.push_wants(pt.user_id, 'new_tournaments')
  loop
    v_key := 'new_tournament:' || r.user_id || ':' || t.id;
    -- i18n: in the person's language
    v_one := case core.user_locale(r.user_id) when 'en' then v_msg_en else v_msg end;
    insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
    values (r.user_id, 'new_tournament', v_one, 'push', v_key, v_at)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key, run_after)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'new_tournament', 'message', v_one),
              'push:' || v_key, v_at)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- core.personal_push_sweep (latest: 20270407000000_personal_pushes)
create or replace function core.personal_push_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r        record;
  v_txt    record;
  v_n      int := 0;
  v_since  timestamptz := p_now - interval '6 hours';
  v_hour   int := extract(hour from p_now at time zone 'Europe/Athens');
  v_day    date := core.feed_day(p_now);
  v_evening boolean := v_hour >= 18 and core.push_at(p_now) = p_now;
  v_url    text;
  v_id     uuid;
  v_side   smallint;
  v_win    smallint;
  v_time   text;
  v_name   text;   -- i18n
begin
  -- 1. a semifinal or final to vote on
  for r in
    with ms as (
      select m.id, m.tournament_id, m.round, m.event_id, core.athens_day(m.starts_at) as day, t.name as tournament, e.name as category
        from core.matches m
        join core.tournaments t on t.id = m.tournament_id
        left join core.tournament_events e on e.id = m.event_id
       where m.round in ('semi', 'final') and m.status in ('announced', 'scheduled') and m.postponed_at is null
         and m.starts_at > p_now and m.starts_at < p_now + interval '36 hours' and core.personal_push_ok(m.id)
    ), who as (
      select ms.id, f.user_id from ms join core.tournament_follows f on f.tournament_id = ms.tournament_id
      union
      select ms.id, f.user_id from ms join core.match_participants mp on mp.match_id = ms.id join core.follows f on f.player_id = mp.player_id
      union
      select ms.id, v.user_id from ms
        join core.matches o on o.event_id = ms.event_id and o.id <> ms.id
        join core.votes v on v.subject_type = 'match' and v.subject_id = o.id
    )
    select w.user_id, ms.tournament_id, ms.round, ms.day, min(ms.tournament) as tournament, min(ms.category) as category,
           count(*)::int as n, (array_agg(ms.id))[1] as one
      from who w join ms on ms.id = w.id
     where exists (select 1 from core.push_tokens pt where pt.user_id = w.user_id)
       and core.push_wants(w.user_id, 'followed') and not core.personal_push_knows(w.user_id, ms.id)
       and not exists (select 1 from core.push_marks k where k.user_id = w.user_id and k.kind = 'stage_open'
                          and k.ref = ms.tournament_id || ':' || ms.round || ':' || ms.day)
     group by w.user_id, ms.tournament_id, ms.round, ms.day
  loop
    insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'stage_open', r.tournament_id || ':' || r.round || ':' || r.day);
    -- i18n: in the person's language, the round and the names in English too
    if r.n = 1 then
      select * into v_txt from core.ntext_for(r.user_id, 'stage_open', jsonb_build_object(
        'stage', case r.round when 'final' then 'Τελικός' else 'Ημιτελικός' end, 'tournament', r.tournament, 'category', r.category,
        'a', core.side_names(r.one, 1::smallint), 'b', core.opponents_acc(r.one, 1::smallint),
        'stage_en', case r.round when 'final' then 'Final' else 'Semifinal' end, 'b_en', core.opponents_plain(r.one, 1::smallint)));
    else
      select * into v_txt from core.ntext_for(r.user_id, 'stage_open_many', jsonb_build_object(
        'stage', case r.round when 'final' then 'Τελικοί' else 'Ημιτελικοί' end, 'tournament', r.tournament, 'n', r.n,
        'stage_en', case r.round when 'final' then 'Finals' else 'Semifinals' end));
    end if;
    if core.personal_push(r.user_id, 'personal:stage_open:' || r.user_id || ':' || r.tournament_id || ':' || r.round || ':' || r.day,
                          v_txt.title, v_txt.body, '/tournament/' || r.tournament_id || '?day=' || to_char(r.day, 'YYYY-MM-DD'), p_now) then
      v_n := v_n + 1;
    end if;
  end loop;

  -- 2. tomorrow's matches of the players you follow, once an evening
  if v_evening then
    for r in
      select f.user_id, count(distinct f.player_id)::int as n, (array_agg(m.id))[1] as one, (array_agg(f.player_id))[1] as player
        from core.follows f
        join core.match_participants mp on mp.player_id = f.player_id
        join core.matches m on m.id = mp.match_id
       where m.status in ('announced', 'scheduled') and m.postponed_at is null and m.starts_at is not null
         and core.athens_day(m.starts_at) = v_day + 1 and core.personal_push_ok(m.id)
         and exists (select 1 from core.push_tokens pt where pt.user_id = f.user_id)
         and core.push_wants(f.user_id, 'players') and not core.personal_push_knows(f.user_id, m.id)
         and not exists (select 1 from core.push_marks k where k.user_id = f.user_id and k.kind = 'tomorrow' and k.ref = (v_day + 1)::text)
       group by f.user_id
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'tomorrow', (v_day + 1)::text);
      if r.n = 1 then
        select mp.side into v_side from core.match_participants mp where mp.match_id = r.one and mp.player_id = r.player;
        -- 00:00 is the import's «no time»
        select nullif(to_char(m.starts_at at time zone 'Europe/Athens', 'HH24:MI'), '00:00') into v_time from core.matches m where m.id = r.one;
        -- i18n: in the person's language, plain names in English
        select * into v_txt from core.ntext_for(r.user_id, 'player_tomorrow', jsonb_build_object(
          'player', (select concat_ws(' ', nullif(upper(left(btrim(p.first_name), 1)), '') || '.', btrim(p.surname)) from core.players p where p.id = r.player),
          'time', v_time, 'opponent', core.opponents_acc(r.one, v_side), 'opponent_en', core.opponents_plain(r.one, v_side),
          'tournament', (select t.name from core.matches m join core.tournaments t on t.id = m.tournament_id where m.id = r.one)));
        v_url := '/tournament/' || (select m.tournament_id from core.matches m where m.id = r.one) || '?match=' || r.one;
      else
        select * into v_txt from core.ntext_for(r.user_id, 'player_tomorrow_many', jsonb_build_object('n', r.n));  -- i18n
        v_url := '/';
      end if;
      if core.personal_push(r.user_id, 'personal:tomorrow:' || r.user_id || ':' || (v_day + 1), v_txt.title, v_txt.body, v_url, p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  -- 3. results of the players you follow
  for r in
    select f.user_id, array_agg(distinct m.id) as ids
      from core.match_results mr
      join core.matches m on m.id = mr.match_id
      join core.match_participants mp on mp.match_id = m.id
      join core.follows f on f.player_id = mp.player_id
     where mr.entered_at > v_since and mr.entered_at <= p_now and not mr.walkover and core.personal_push_ok(m.id)
       and exists (select 1 from core.push_tokens pt where pt.user_id = f.user_id)
       and core.push_wants(f.user_id, 'players') and not core.personal_push_knows(f.user_id, m.id)
       and not exists (select 1 from core.push_marks k where k.user_id = f.user_id and k.kind = 'result' and k.ref = m.id::text)
     group by f.user_id
  loop
    insert into core.push_marks (user_id, kind, ref) select r.user_id, 'result', x::text from unnest(r.ids) x;
    if array_length(r.ids, 1) = 1 then
      v_id := r.ids[1];
      select mr.winner_side into v_win from core.match_results mr where mr.match_id = v_id;
      -- i18n: in the person's language, plain names in English
      select * into v_txt from core.ntext_for(r.user_id,
        case when (select m.format from core.matches m where m.id = v_id) = 'singles' then 'player_result' else 'player_result_pair' end,
        jsonb_build_object('tournament', (select t.name from core.matches m join core.tournaments t on t.id = m.tournament_id where m.id = v_id),
                           'winner', core.side_names(v_id, v_win), 'loser', core.opponents_acc(v_id, v_win),
                           'loser_en', core.opponents_plain(v_id, v_win),
                           'score', (select coalesce((select string_agg((x ->> 'w') || '-' || (x ->> 'l'), ' ' order by o)
                                                       from jsonb_array_elements(mr.sets) with ordinality y(x, o)),
                                                     nullif(mr.score_summary, ''))
                                       from core.match_results mr where mr.match_id = v_id)));
      v_url := '/tournament/' || (select m.tournament_id from core.matches m where m.id = v_id) || '?match=' || v_id;
    else
      select * into v_txt from core.ntext_for(r.user_id, 'player_results_many', jsonb_build_object('n', array_length(r.ids, 1)));  -- i18n
      v_url := '/results';
    end if;
    if core.personal_push(r.user_id, 'personal:result:' || r.user_id || ':' || r.ids[1], v_txt.title, v_txt.body, v_url, p_now) then
      v_n := v_n + 1;
    end if;
  end loop;

  -- 4. semifinal and final results, to the tournament's followers (not what step 3 just told them)
  for r in
    select f.user_id, m.tournament_id, m.round, core.athens_day(m.starts_at) as day, min(t.name) as tournament, array_agg(m.id) as ids
      from core.match_results mr
      join core.matches m on m.id = mr.match_id
      join core.tournaments t on t.id = m.tournament_id
      left join core.tournament_events e on e.id = m.event_id
      join core.tournament_follows f on f.tournament_id = m.tournament_id
     where m.round in ('semi', 'final') and mr.entered_at > v_since and mr.entered_at <= p_now and not mr.walkover
       and core.personal_push_ok(m.id)
       and not (m.round = 'final' and exists (select 1 from core.tournament_draws d
                                               where d.tournament_id = m.tournament_id and d.format = 'knockout' and upper(d.level) = upper(e.name)))
       and exists (select 1 from core.push_tokens pt where pt.user_id = f.user_id)
       and core.push_wants(f.user_id, 'followed') and not core.personal_push_knows(f.user_id, m.id)
       and not exists (select 1 from core.push_marks k where k.user_id = f.user_id and k.kind in ('result', 'stage_result') and k.ref = m.id::text)
     group by f.user_id, m.tournament_id, m.round, core.athens_day(m.starts_at)
  loop
    insert into core.push_marks (user_id, kind, ref) select r.user_id, 'stage_result', x::text from unnest(r.ids) x;
    if array_length(r.ids, 1) = 1 then
      v_id := r.ids[1];
      select mr.winner_side into v_win from core.match_results mr where mr.match_id = v_id;
      -- i18n: in the person's language
      select * into v_txt from core.ntext_for(r.user_id,
        (case r.round when 'final' then 'follow_final' else 'stage_semi_result' end)
          || case when (select m.format from core.matches m where m.id = v_id) = 'singles' then '' else '_pair' end,
        jsonb_build_object('tournament', r.tournament, 'winner', core.side_names(v_id, v_win),
                           'category', (select e.name from core.matches m join core.tournament_events e on e.id = m.event_id where m.id = v_id)));
    else
      -- i18n: in the person's language, the round in English too
      select * into v_txt from core.ntext_for(r.user_id, 'stage_result_many', jsonb_build_object(
        'tournament', r.tournament, 'n', array_length(r.ids, 1), 'stage', case r.round when 'final' then 'τελικοί' else 'ημιτελικοί' end,
        'stage_en', case r.round when 'final' then 'finals' else 'semifinals' end));
    end if;
    if core.personal_push(r.user_id, 'personal:stage_result:' || r.user_id || ':' || r.tournament_id || ':' || r.round || ':' || r.day,
                          v_txt.title, v_txt.body, '/tournament/' || r.tournament_id || '?day=' || to_char(r.day, 'YYYY-MM-DD'), p_now) then
      v_n := v_n + 1;
    end if;
  end loop;

  -- 5. someone followed your claimed player
  for r in
    select p.claimed_by_user_id as user_id, array_agg(f.user_id) as who
      from core.follows f
      join core.players p on p.id = f.player_id and p.claimed_by_user_id is not null and p.claimed_by_user_id <> f.user_id
     where f.created_at > v_since and f.created_at <= p_now and not p.hidden and not p.is_minor
       and exists (select 1 from core.push_tokens pt where pt.user_id = p.claimed_by_user_id)
       and core.push_wants(p.claimed_by_user_id, 'players')
       and not core.is_blocked(p.claimed_by_user_id, f.user_id) and not core.is_blocked(f.user_id, p.claimed_by_user_id)
       and not exists (select 1 from core.push_marks k where k.user_id = p.claimed_by_user_id and k.kind = 'follower' and k.ref = f.user_id::text)
     group by p.claimed_by_user_id
  loop
    insert into core.push_marks (user_id, kind, ref) select r.user_id, 'follower', x::text from unnest(r.who) x;
    if array_length(r.who, 1) = 1 then
      -- i18n: in the person's language; no name falls back in each language
      v_name := (select coalesce(nullif(btrim(pr.first_name), ''), nullif(btrim(pl.first_name), ''),
                                 nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''))
                   from core.profiles pr left join core.players pl on pl.id = pr.claimed_player_id where pr.user_id = r.who[1]);
      select * into v_txt from core.ntext_for(r.user_id, 'follower_one', jsonb_build_object(
        'name', coalesce(v_name, 'Κάποιος'), 'name_en', coalesce(v_name, 'Someone')));
      v_url := coalesce('/player/' || (select pr.claimed_player_id from core.profiles pr where pr.user_id = r.who[1]), '/me');
    else
      select * into v_txt from core.ntext_for(r.user_id, 'follower_many', jsonb_build_object('n', array_length(r.who, 1)));  -- i18n
      v_url := '/me';
    end if;
    if core.personal_push(r.user_id, 'personal:follower:' || r.user_id || ':' || r.who[1], v_txt.title, v_txt.body, v_url, p_now) then
      v_n := v_n + 1;
    end if;
  end loop;

  -- 6. one vote from a voting mission, with matches still open today
  if v_evening then
    for r in
      select distinct on (q.user_id) q.user_id, d.title_el, d.title_en   -- i18n: title_en
        from core.user_quest_progress q
        join core.quest_defs d on d.key = q.quest_key
       where q.quest_key in ('daily_vote_3_cards', 'daily_vote_2_matches', 'weekly_vote_5_days')
         and q.period_key = core.quest_window_key(d.period, p_now) and q.done_at is null and q.progress = d.target - 1
         and (q.quest_key <> 'weekly_vote_5_days' or not (v_day::text = any (q.days)))
         and exists (select 1 from core.push_tokens pt where pt.user_id = q.user_id)
         and core.push_wants(q.user_id, 'players')
         and not exists (select 1 from core.push_marks k where k.user_id = q.user_id and k.kind = 'mission' and k.ref = v_day::text)
         and exists (select 1 from core.matches m
                      where m.status in ('announced', 'scheduled') and m.postponed_at is null and m.starts_at > p_now
                        and core.feed_day(m.starts_at) = v_day and core.personal_push_ok(m.id) and not core.personal_push_knows(q.user_id, m.id))
       order by q.user_id, d.sort
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'mission', v_day::text);
      -- i18n: in the person's language, the mission's English title
      select * into v_txt from core.ntext_for(r.user_id, 'mission_near', jsonb_build_object('quest', r.title_el,
                                                                                        'quest_en', coalesce(r.title_en, r.title_el)));
      if core.personal_push(r.user_id, 'personal:mission:' || r.user_id || ':' || v_day, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  return v_n;
end;
$$;

-- core.quiz_nudge_sweep (latest: 20270410000000_quiz_nudge_dormant)
create or replace function core.quiz_nudge_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r       record;
  v_txt   record;
  v_n     int := 0;
  v_local timestamp := p_now at time zone 'Europe/Athens';
  v_day   date := core.quiz_day_key(p_now);
begin
  if extract(isodow from v_local) not in (2, 5) or extract(hour from v_local) <> 17 then return 0; end if;
  for r in
    select x.user_id, x.paid, x.done, coalesce(nullif(x.cards, 0), case when core.is_pro(x.user_id) then 12 else 6 end) as total
      from (
        select u.user_id, s.awarded_at is not null as paid,
               (select count(*)::int from core.quiz_set_cards c where c.set_id = s.id) as cards,
               (select count(*)::int from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                 where v.user_id = u.user_id and v.subject_type = 'card' and c.set_id = s.id) as done
          from (select distinct pt.user_id from core.push_tokens pt) u
          left join core.quiz_sets s on s.user_id = u.user_id and s.quiz_day = v_day
         where core.push_wants(u.user_id, 'quiz')
           and core.opened_app_since(u.user_id, p_now - interval '30 days')
           and not exists (select 1 from core.push_marks k where k.user_id = u.user_id and k.kind = 'quiz' and k.ref = v_day::text)
      ) x
     where x.done < coalesce(nullif(x.cards, 0), case when core.is_pro(x.user_id) then 12 else 6 end)
  loop
    insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'quiz', v_day::text);
    -- i18n: in the person's language
    select * into v_txt from core.ntext_for(r.user_id, case when r.done = 0 then 'quiz_nudge' when r.paid then 'quiz_nudge_rest' else 'quiz_nudge_started' end,
                                        jsonb_build_object('n', r.total, 'done', r.done, 'total', r.total));
    if core.personal_push(r.user_id, 'personal:quiz:' || r.user_id || ':' || v_day, v_txt.title, v_txt.body, '/quiz', p_now) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- core.streak_push_sweep (latest: 20270427000000_daily_streak)
create or replace function core.streak_push_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r       record;
  v_txt   record;
  v_n     int := 0;
  v_today date := core.athens_day(p_now);
  v_hour  int := extract(hour from p_now at time zone 'Europe/Athens');
  v_left  int;
begin
  if not core.daily_streak_on() then return 0; end if;

  if v_hour between 20 and 21 then
    for r in
      select g.user_id, g.streak from core.user_game_state g
       where g.streak >= 1 and g.day_last < v_today and coalesce(g.day_through, g.day_last) >= v_today - 1
         and exists (select 1 from core.push_tokens pt where pt.user_id = g.user_id)
         and core.push_wants(g.user_id, 'streak_reminder')
         and not exists (select 1 from core.push_marks k where k.user_id = g.user_id and k.kind = 'streak_risk' and k.ref = v_today::text)
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'streak_risk', v_today::text);
      -- i18n: in the person's language
      select * into v_txt from core.ntext_for(r.user_id, case when r.streak = 1 then 'streak_risk_one' else 'streak_risk' end,
                                          jsonb_build_object('n', r.streak));
      if core.personal_push(r.user_id, 'personal:streak_risk:' || r.user_id || ':' || v_today, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  if v_hour between 9 and 12 then
    for r in
      select distinct on (e.user_id) e.user_id, e.kind, e.streak_before, g.streak_best, g.day_last
        from core.streak_events e join core.user_game_state g on g.user_id = e.user_id
       where e.day = v_today - 1 and e.kind in ('freeze_used', 'broke')
         and exists (select 1 from core.push_tokens pt where pt.user_id = e.user_id)
         and core.push_wants(e.user_id, 'streak_reminder')
         and not exists (select 1 from core.push_marks k where k.user_id = e.user_id and k.kind = 'streak_morning' and k.ref = v_today::text)
       order by e.user_id, (e.kind = 'broke') desc, e.id desc
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'streak_morning', v_today::text);
      if r.kind = 'broke' then
        continue when r.day_last >= v_today;   -- a new σερί already started today
        -- i18n: in the person's language (and below)
        select * into v_txt from core.ntext_for(r.user_id, case when r.streak_before = 1 then 'streak_lost_one' else 'streak_lost' end,
                                            jsonb_build_object('n', r.streak_before, 'best', r.streak_best));
      else
        select count(*)::int into v_left from core.freezes f where f.user_id = r.user_id and f.used_at is null;
        select * into v_txt from core.ntext_for(r.user_id, case v_left when 0 then 'streak_saved_none' when 1 then 'streak_saved_one' else 'streak_saved' end,
                                            jsonb_build_object('n', r.streak_before, 'left', v_left));
      end if;
      if core.personal_push(r.user_id, 'personal:streak_morning:' || r.user_id || ':' || v_today, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;
  return v_n;
end;
$$;

-- ── admin: the English text next to the Greek one ──

-- (latest: 20270208000000_notification_texts) i18n: title_en and body_en
create or replace function core.notification_text_doc(t core.notification_texts)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'key', t.key, 'channel', t.channel, 'label', t.label_el, 'title', t.title, 'body', t.body,
    'title_en', t.title_en, 'body_en', t.body_en,
    'placeholders', to_jsonb(t.placeholders), 'pro', t.pro,
    'approved_at', t.approved_at, 'approved_by', (select display_name from core.profiles where user_id = t.approved_by),
    'updated_at', t.updated_at, 'updated_by', (select display_name from core.profiles where user_id = t.updated_by))
$$;

-- staff (admin or editor): a new title and body, Greek and English. The same checks for both: not empty, title up to
-- 60 and body up to 180 characters, no em dash, only this text's {placeholders}. English is both or neither: '' for
-- both clears it (the push then goes out in Greek), null leaves it as it is (a call with the Greek only). A real
-- change in either language clears the approval.
drop function if exists api.admin_update_notification_text(text, text, text);
create or replace function api.admin_update_notification_text(p_key text, p_title text, p_body text,
                                                              p_title_en text default null, p_body_en text default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t          core.notification_texts;
  v_title    text := btrim(coalesce(p_title, ''));
  v_body     text := btrim(coalesce(p_body, ''));
  v_title_en text;
  v_body_en  text;
  v_bad      text;
  v_all      text;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from core.notification_texts where key = p_key for update;
  if t.key is null then raise exception 'text_not_found' using errcode = 'P0002'; end if;
  v_title_en := case when p_title_en is null then t.title_en else nullif(btrim(p_title_en), '') end;
  v_body_en := case when p_body_en is null then t.body_en else nullif(btrim(p_body_en), '') end;
  if v_title = '' then raise exception 'title_required' using errcode = '22023'; end if;
  if v_body = '' then raise exception 'body_required' using errcode = '22023'; end if;
  if char_length(v_title) > 60 then raise exception 'title_too_long' using errcode = '22023'; end if;
  if char_length(v_body) > 180 then raise exception 'body_too_long' using errcode = '22023'; end if;
  if (v_title_en is null) <> (v_body_en is null) then raise exception 'en_incomplete' using errcode = '22023'; end if;
  if char_length(v_title_en) > 60 then raise exception 'title_en_too_long' using errcode = '22023'; end if;
  if char_length(v_body_en) > 180 then raise exception 'body_en_too_long' using errcode = '22023'; end if;
  v_all := v_title || v_body || coalesce(v_title_en, '') || coalesce(v_body_en, '');
  if strpos(v_all, chr(8212)) > 0 then raise exception 'em_dash' using errcode = '22023'; end if;
  select n into v_bad from unnest(core.ntext_names(v_title) || core.ntext_names(v_body)
                                  || core.ntext_names(v_title_en) || core.ntext_names(v_body_en)) n
   where n <> all (t.placeholders) limit 1;
  if v_bad is not null then raise exception 'unknown_placeholder: %', v_bad using errcode = '22023'; end if;
  -- a brace that is not part of a {placeholder} is a typo
  if regexp_replace(v_all, '\{[a-z_]+\}', '', 'g') ~ '[{}]' then raise exception 'stray_brace' using errcode = '22023'; end if;
  if v_title = t.title and v_body = t.body
     and v_title_en is not distinct from t.title_en and v_body_en is not distinct from t.body_en then
    return core.notification_text_doc(t);
  end if;
  update core.notification_texts
     set title = v_title, body = v_body, title_en = v_title_en, body_en = v_body_en,
         approved_at = null, approved_by = null, updated_at = now(), updated_by = auth.uid()
   where key = p_key
  returning * into t;
  return core.notification_text_doc(t);
end;
$$;
revoke all on function api.admin_update_notification_text(text, text, text, text, text) from public, anon;
grant execute on function api.admin_update_notification_text(text, text, text, text, text) to authenticated, service_role;
