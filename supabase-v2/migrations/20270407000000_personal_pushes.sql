-- Personal pushes (founder, 4 Nov 2026: results of the players you follow, semifinals and finals, games to vote for,
-- "whatever else will increase engagement"). One job, core.personal_push_sweep, every 10 minutes: it reads what
-- happened since the last run and groups it per person, so a read that brings ten results is one push, not ten.
--
--   * stage_open      a semifinal or final to vote on: tournament followers, followers of its players, people who voted
--                     in that category. One per tournament, round and day. Switch: followed
--   * player_tomorrow from 18:00, tomorrow's matches of the players you follow, once a day. Switch: players
--   * player_result   a result of a player you follow. Switch: players
--   * stage_result    a semifinal or final result, to tournament followers. A final with a draw is left to follow_final
--                     (20270305000000), which already says it. Switch: followed
--   * follower        someone followed your claimed player. Switch: players
--   * mission         from 18:00, one vote from a voting mission, with matches open. Switch: players
--
-- Rules for all of them: only accounts with a device; never about your own match or one you voted on (the results push
-- says that one); never a minor or a hidden player, never a minor event; at most 3 a day per person (core.personal_cap),
-- most urgent first. An item is marked once it was considered, sent or not, so nothing old arrives tomorrow when the
-- cap resets. Quiet hours as for the others (core.push_at). The texts are core.notification_texts, editable in the admin.
--
-- The results push also names an upset you called, when it is your one result (take_push_batch).
-- Registering a device clears that account's dead ones: another token on the same platform not seen for 14 days.

create table core.push_marks (
  user_id    uuid not null references core.profiles (user_id) on delete cascade,
  kind       text not null,
  ref        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);
alter table core.push_marks enable row level security;
comment on table core.push_marks is 'What core.personal_push_sweep already considered per person, sent or not. Server only.';

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('stage_open', 'Ημιτελικός ή τελικός ανοιχτός για ψήφο ({stage}: Τελικός/Ημιτελικός, {a}: η μία πλευρά, {b}: «τον Π. Βλάχο»)',
   '{stage} στο {tournament}', '{category} · {a} με {b}. Ποιος το παίρνει;', '{stage,tournament,category,a,b}', false, 170),
  ('stage_open_many', 'Πολλοί ημιτελικοί ή τελικοί την ίδια μέρα σε ένα τουρνουά ({stage}: Τελικοί/Ημιτελικοί, {n}: πόσοι)',
   '{stage} στο {tournament}', '{n} ματς. Ψήφισε πριν ξεκινήσουν.', '{stage,tournament,n}', false, 171),
  ('player_tomorrow', 'Ένας παίκτης που ακολουθείς παίζει αύριο, από τις 18:00. Αν λείπει η ώρα ή το τουρνουά, φεύγει το κομμάτι με το « · »',
   '{player} παίζει αύριο · {time}', '{tournament} · με {opponent}. Ποιος το παίρνει;', '{player,time,tournament,opponent}', false, 172),
  ('player_tomorrow_many', 'Πολλοί παίκτες που ακολουθείς παίζουν αύριο ({n}: πόσοι)',
   'Αύριο παίζουν {n} από τους παίκτες σου', 'Ψήφισε πριν ξεκινήσουν.', '{n}', false, 173),
  ('player_result', 'Αποτέλεσμα παίκτη που ακολουθείς, απλό ({winner}: ο νικητής, {loser}: «τον Π. Βλάχο», {score}: το σκορ)',
   '{tournament}', '{winner} νίκησε {loser} · {score}', '{tournament,winner,loser,score}', false, 174),
  ('player_result_pair', 'Αποτέλεσμα παίκτη που ακολουθείς, διπλό ({winner}: το ζευγάρι)',
   '{tournament}', '{winner} νίκησαν {loser} · {score}', '{tournament,winner,loser,score}', false, 175),
  ('player_results_many', 'Πολλά αποτελέσματα παικτών που ακολουθείς μαζί ({n}: πόσα)',
   'Βγήκαν {n} ματς των παικτών σου', 'Μπες να δεις πώς πήγαν.', '{n}', false, 176),
  ('stage_semi_result', 'Τελείωσε ημιτελικός σε τουρνουά που ακολουθείς, απλό ({winner}: ο νικητής)',
   '{tournament}: ημιτελικός', '{winner} πέρασε στον τελικό · {category}', '{tournament,winner,category}', false, 177),
  ('stage_semi_result_pair', 'Τελείωσε ημιτελικός σε τουρνουά που ακολουθείς, διπλό ({winner}: το ζευγάρι)',
   '{tournament}: ημιτελικός', '{winner} πέρασαν στον τελικό · {category}', '{tournament,winner,category}', false, 178),
  ('stage_result_many', 'Τελείωσαν πολλοί ημιτελικοί ή τελικοί μαζί ({stage}: τελικοί/ημιτελικοί, {n}: πόσοι)',
   '{tournament}: {n} {stage} τελείωσαν', 'Μπες να δεις ποιος πέρασε.', '{tournament,n,stage}', false, 179),
  ('follower_one', 'Κάποιος ακολούθησε τον παίκτη σου ({name}: το μικρό του όνομα)',
   '{name} σε ακολουθεί', 'Μπες να δεις το προφίλ.', '{name}', false, 180),
  ('follower_many', 'Πολλοί ακολούθησαν τον παίκτη σου ({n}: πόσοι)',
   '{n} νέοι σε ακολουθούν', 'Η παρέα σου μεγαλώνει.', '{n}', false, 181),
  ('mission_near', 'Μία ψήφο πριν από μια αποστολή ψήφων, από τις 18:00, με ανοιχτά ματς ({quest}: η αποστολή)',
   'Μία ψήφος ακόμα', 'Για την αποστολή «{quest}». Έχεις ανοιχτά ματς.', '{quest}', false, 182),
  ('results_upset', 'Το ένα αποτέλεσμά σου ήταν ανατροπή και το είπες ({pct}: πόσοι το είχαν πει)',
   'Το είπες!', 'Μόνο το {pct}% το είδε να έρχεται. Μπες να δεις.', '{pct}', false, 25)
on conflict (key) do nothing;

-- a side of a match as the subject: «Π. Βλάχος», «Π. Βλάχος & Ν. Παππάς». The caller keeps minors and hidden players out.
create or replace function core.side_names(p_match uuid, p_side smallint)
returns text
language sql stable security definer set search_path = core, pg_temp
as $$
  select string_agg(concat_ws(' ', nullif(upper(left(btrim(p.first_name), 1)), '') || '.', btrim(p.surname)), ' & ' order by mp.position)
    from core.match_participants mp join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and mp.side = p_side
$$;
revoke all on function core.side_names(uuid, smallint) from public, anon, authenticated;

-- a match we may talk about: approved, from an organiser, nobody minor or hidden, not a minor event
create or replace function core.personal_push_ok(p_match uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.matches m join core.tournaments t on t.id = m.tournament_id
                  where m.id = p_match and m.approved and m.source = 'import' and m.status <> 'void' and not t.is_minor_event)
     and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                      where mp.match_id = p_match and (p.is_minor or p.hidden))
$$;
revoke all on function core.personal_push_ok(uuid) from public, anon, authenticated;

-- nothing to tell this person about this match: they play in it, or they voted on it
create or replace function core.personal_push_knows(p_user uuid, p_match uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.votes v where v.user_id = p_user and v.subject_type = 'match' and v.subject_id = p_match)
      or exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                  where mp.match_id = p_match and p.claimed_by_user_id = p_user)
$$;
revoke all on function core.personal_push_knows(uuid, uuid) from public, anon, authenticated;

-- at most this many personal pushes a day; true when one was queued
create or replace function core.personal_push(p_user uuid, p_key text, p_title text, p_body text, p_url text, p_now timestamptz)
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  c_cap constant int := 3;
  v_at  timestamptz := core.push_at(p_now);
  v_msg jsonb := jsonb_build_object('title', p_title, 'body', p_body, 'data', jsonb_build_object('url', p_url));
begin
  if (select count(*) from core.notifications n
       where n.user_id = p_user and n.type = 'personal' and core.feed_day(n.scheduled_at) = core.feed_day(v_at)) >= c_cap then
    return false;
  end if;
  insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
  values (p_user, 'personal', v_msg, 'push', p_key, v_at)
  on conflict (dedupe_key) do nothing;
  if not found then return false; end if;
  insert into core.outbox (kind, payload, idempotency_key, run_after)
  values ('push', jsonb_build_object('user_id', p_user, 'dedupe_key', p_key, 'type', 'personal', 'message', v_msg), 'push:' || p_key, v_at)
  on conflict (idempotency_key) do nothing;
  return true;
end;
$$;
revoke all on function core.personal_push(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;

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
    if r.n = 1 then
      select * into v_txt from core.ntext('stage_open', jsonb_build_object(
        'stage', case r.round when 'final' then 'Τελικός' else 'Ημιτελικός' end, 'tournament', r.tournament, 'category', r.category,
        'a', core.side_names(r.one, 1::smallint), 'b', core.opponents_acc(r.one, 1::smallint)));
    else
      select * into v_txt from core.ntext('stage_open_many', jsonb_build_object(
        'stage', case r.round when 'final' then 'Τελικοί' else 'Ημιτελικοί' end, 'tournament', r.tournament, 'n', r.n));
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
        select * into v_txt from core.ntext('player_tomorrow', jsonb_build_object(
          'player', (select concat_ws(' ', nullif(upper(left(btrim(p.first_name), 1)), '') || '.', btrim(p.surname)) from core.players p where p.id = r.player),
          'time', v_time, 'opponent', core.opponents_acc(r.one, v_side),
          'tournament', (select t.name from core.matches m join core.tournaments t on t.id = m.tournament_id where m.id = r.one)));
        v_url := '/tournament/' || (select m.tournament_id from core.matches m where m.id = r.one) || '?match=' || r.one;
      else
        select * into v_txt from core.ntext('player_tomorrow_many', jsonb_build_object('n', r.n));
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
      select * into v_txt from core.ntext(
        case when (select m.format from core.matches m where m.id = v_id) = 'singles' then 'player_result' else 'player_result_pair' end,
        jsonb_build_object('tournament', (select t.name from core.matches m join core.tournaments t on t.id = m.tournament_id where m.id = v_id),
                           'winner', core.side_names(v_id, v_win), 'loser', core.opponents_acc(v_id, v_win),
                           'score', (select coalesce((select string_agg((x ->> 'w') || '-' || (x ->> 'l'), ' ' order by o)
                                                       from jsonb_array_elements(mr.sets) with ordinality y(x, o)),
                                                     nullif(mr.score_summary, ''))
                                       from core.match_results mr where mr.match_id = v_id)));
      v_url := '/tournament/' || (select m.tournament_id from core.matches m where m.id = v_id) || '?match=' || v_id;
    else
      select * into v_txt from core.ntext('player_results_many', jsonb_build_object('n', array_length(r.ids, 1)));
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
      select * into v_txt from core.ntext(
        (case r.round when 'final' then 'follow_final' else 'stage_semi_result' end)
          || case when (select m.format from core.matches m where m.id = v_id) = 'singles' then '' else '_pair' end,
        jsonb_build_object('tournament', r.tournament, 'winner', core.side_names(v_id, v_win),
                           'category', (select e.name from core.matches m join core.tournament_events e on e.id = m.event_id where m.id = v_id)));
    else
      select * into v_txt from core.ntext('stage_result_many', jsonb_build_object(
        'tournament', r.tournament, 'n', array_length(r.ids, 1), 'stage', case r.round when 'final' then 'τελικοί' else 'ημιτελικοί' end));
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
      select * into v_txt from core.ntext('follower_one', jsonb_build_object('name',
        (select coalesce(nullif(btrim(pr.first_name), ''), nullif(btrim(pl.first_name), ''),
                         nullif(split_part(btrim(coalesce(pr.display_name, '')), ' ', 1), ''), 'Κάποιος')
           from core.profiles pr left join core.players pl on pl.id = pr.claimed_player_id where pr.user_id = r.who[1])));
      v_url := coalesce('/player/' || (select pr.claimed_player_id from core.profiles pr where pr.user_id = r.who[1]), '/me');
    else
      select * into v_txt from core.ntext('follower_many', jsonb_build_object('n', array_length(r.who, 1)));
      v_url := '/me';
    end if;
    if core.personal_push(r.user_id, 'personal:follower:' || r.user_id || ':' || r.who[1], v_txt.title, v_txt.body, v_url, p_now) then
      v_n := v_n + 1;
    end if;
  end loop;

  -- 6. one vote from a voting mission, with matches still open today
  if v_evening then
    for r in
      select distinct on (q.user_id) q.user_id, d.title_el
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
      select * into v_txt from core.ntext('mission_near', jsonb_build_object('quest', r.title_el));
      if core.personal_push(r.user_id, 'personal:mission:' || r.user_id || ':' || v_day, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  return v_n;
end;
$$;
revoke all on function core.personal_push_sweep(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-personal-push', '*/10 * * * *', $c$select core.personal_push_sweep()$c$);
  end if;
end;
$$;

-- a device registering clears that account's dead ones on the same platform (a reinstall gets a new token, the old
-- one stays until now; each live token gets every push)
create or replace function api.register_push_token(p_token text, p_platform text)
returns boolean
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then raise exception 'bad_token' using errcode = '22023'; end if;
  if p_platform not in ('ios', 'android') then raise exception 'bad_platform' using errcode = '22023'; end if;
  insert into core.push_tokens (token, user_id, platform) values (p_token, v_uid, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
  delete from core.push_tokens
   where user_id = v_uid and platform = p_platform and token <> p_token and last_seen_at < now() - interval '14 days';
  return true;
end;
$$;

-- the push batch (latest: 20270320000000_push_landing): the same, with «Το είπες!» for an upset you called
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
      cross join lateral core.ntext(case when up.pct is not null then 'results_upset' when u.n = 1 then 'results_one' else 'results_many' end,
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

revoke all on function core.take_push_batch(int) from public, anon, authenticated;
