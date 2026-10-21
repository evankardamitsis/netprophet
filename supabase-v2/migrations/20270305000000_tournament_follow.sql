-- Follow a tournament, free for everyone (founder, 21 Oct 2026). A follow is a row in core.tournament_follows; the
-- tournament detail screen has «Ακολούθησε» / «✓ Ακολουθείς», and the Τουρνουά tab puts followed tournaments at the
-- top with «Τα δικά σου». Followers get three pushes, all built here, all reading core.notification_texts (staff edit
-- them in the admin), all once per event, never to a deleted account or to someone who switched off
-- notification_prefs.followed («Τουρνουά που ακολουθείς» in Εγώ › Ρυθμίσεις, on unless false):
--
--   * follow_draw      a draw is published (the draw trigger, after core.draw_alert): «{tournament}: βγήκε η κλήρωση».
--                      Once per tournament per Athens day (six categories in one import are one push), and only while
--                      no match of that draw has been played, so a late re-import or a new follower hears nothing.
--                      data.url /tournament/{id}?draw={tab}.
--   * follow_schedule  tomorrow's matches of a tournament have their times: «{tournament}: το αυριανό πρόγραμμα».
--                      A cron every 10 minutes from 18:00 to 23:00 Athens, once per tournament per day. Times that come
--                      in after 23:00 get no push (in the feed that day is already today). data.url
--                      /tournament/{id}?day=YYYY-MM-DD.
--   * follow_final     a knockout final gets its winner (the draw trigger, on the change from no winner to one):
--                      «{tournament}: ο τελικός τελείωσε». Not when a winner is hidden or a minor (this goes to many
--                      people; the app masks those names). Not to the two finalists. data.url /tournament/{id}?draw={tab}.
--
-- Quiet hours as for Pro (core.push_at): a draw or a final between 23:00 and 08:00 Athens waits for 08:00.
-- Someone who gets the personal Pro push for the same event (their own draw, their own schedule) does not also get the
-- follower one. Round robin draws have no final: no push for them.

create table core.tournament_follows (
  user_id        uuid not null references auth.users (id) on delete cascade,
  tournament_id  uuid not null references core.tournaments (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, tournament_id)
);
create index tournament_follows_tournament_idx on core.tournament_follows (tournament_id);
alter table core.tournament_follows enable row level security;
revoke all on core.tournament_follows from public, anon, authenticated;
grant select on core.tournament_follows to authenticated;
-- reads of your own rows only; writes go through api.follow_tournament
create policy tournament_follows_own_read on core.tournament_follows for select to authenticated
  using (user_id = (select auth.uid()));

-- follow (p_on true) or stop (false); at most 100 at a time. Returns {followed, followers}.
create or replace function api.follow_tournament(p_id uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_on  boolean := coalesce(p_on, true);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.tournaments where id = p_id and not is_minor_event) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_on then
    if not exists (select 1 from core.tournament_follows where user_id = v_uid and tournament_id = p_id)
       and (select count(*) from core.tournament_follows where user_id = v_uid) >= 100 then
      raise exception 'too_many' using errcode = '54000';
    end if;
    insert into core.tournament_follows (user_id, tournament_id) values (v_uid, p_id) on conflict do nothing;
  else
    delete from core.tournament_follows where user_id = v_uid and tournament_id = p_id;
  end if;
  return jsonb_build_object('followed', v_on,
                            'followers', (select count(*)::int from core.tournament_follows where tournament_id = p_id));
end;
$$;
revoke all on function api.follow_tournament(uuid, boolean) from public, anon;
grant execute on function api.follow_tournament(uuid, boolean) to authenticated, service_role;

-- ── the texts (core.notification_texts, editable in the admin) ──

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('follow_draw', 'Βγήκε η κλήρωση σε τουρνουά που ακολουθείς. Μία φορά τη μέρα ανά τουρνουά, όχι 23:00 με 08:00',
   '{tournament}: βγήκε η κλήρωση', 'Δες το ταμπλό.', '{tournament}', false, 120),
  ('follow_schedule', 'Βγήκε το αυριανό πρόγραμμα τουρνουά που ακολουθείς, το βράδυ από τις 18:00 ως τις 23:00 ({n}: πόσα ματς)',
   '{tournament}: το αυριανό πρόγραμμα', '{n} ματς αύριο. Δες ποιος παίζει και πότε.', '{tournament,n}', false, 130),
  ('follow_final', 'Τελείωσε ο τελικός μιας κατηγορίας σε τουρνουά που ακολουθείς, απλό ({winner}: ο νικητής)',
   '{tournament}: ο τελικός τελείωσε', '{winner} πήρε τον τίτλο στο {category}.', '{tournament,winner,category}', false, 140),
  ('follow_final_pair', 'Τελείωσε ο τελικός μιας κατηγορίας σε τουρνουά που ακολουθείς, διπλό ({winner}: το ζευγάρι)',
   '{tournament}: ο τελικός τελείωσε', '{winner} πήραν τον τίτλο στο {category}.', '{tournament,winner,category}', false, 150)
on conflict (key) do nothing;

-- ── the tournament list and one tournament: `followed` (and on one tournament, `followers`) ──

-- from 20270212000000_logos.sql (followed; a followed tournament is listed even before its first match or draw)
create or replace function api.get_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
  v_pro boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_pro := core.is_pro(v_uid);
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'pro', v_pro,
    'items', coalesce((
      select jsonb_agg(x.j order by x.ord, x.starts_on nulls last, x.name)
        from (
          select t.name, t.starts_on,
                 case core.tournament_state(t) when 'ongoing' then 1 when 'upcoming' then 2 else 3 end as ord,
                 jsonb_build_object(
                   'id', t.id, 'name', t.name, 'logo', t.logo_path, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
                   'starts_on', t.starts_on, 'ends_on', t.ends_on, 'entry_deadline', t.entry_deadline,
                   'level_min', t.level_min, 'level_max', t.level_max, 'state', core.tournament_state(t),
                   'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
                   'matches', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'),
                   'today', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'
                              and core.athens_day(m.starts_at) = core.athens_day(now())),
                   'in_it', v_me is not null and (
                     exists (select 1 from core.matches m join core.match_participants mp on mp.match_id = m.id
                              where m.tournament_id = t.id and m.approved and mp.player_id = v_me)
                     or exists (select 1 from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en,
                                         jsonb_array_elements(en -> 'players') pl
                                 where d.tournament_id = t.id and pl ->> 'player_id' = v_me::text)),
                   'followed', exists (select 1 from core.tournament_follows f where f.user_id = v_uid and f.tournament_id = t.id)) as j
            from core.tournaments t
           where not t.is_minor_event
             and (exists (select 1 from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void')
                  or exists (select 1 from core.tournament_draws d where d.tournament_id = t.id)
                  or exists (select 1 from core.tournament_follows f where f.user_id = v_uid and f.tournament_id = t.id))
             and (core.tournament_state(t) <> 'done'
                  or coalesce(t.ends_on, (select max(core.athens_day(m.starts_at)) from core.matches m where m.tournament_id = t.id and m.approved)) >= core.athens_day(now()) - 14)
        ) x), '[]'::jsonb),
    -- «Το πρόγραμμά σου»: my next tournament matches (Pro)
    'mine', case when v_pro and v_me is not null then coalesce((
      select jsonb_agg(jsonb_build_object('tournament_id', t.id, 'tournament', t.name, 'tournament_logo', t.logo_path) || core.tournament_match_json(m)
                       order by m.starts_at)
        from core.matches m
        join core.tournaments t on t.id = m.tournament_id
        join core.match_participants mp on mp.match_id = m.id and mp.player_id = v_me
       where m.approved and m.status in ('announced', 'scheduled') and m.starts_at >= now() - interval '2 hours'
         and m.starts_at < now() + interval '14 days'), '[]'::jsonb) end);
end;
$$;

-- from 20270220000000_perf_set_based.sql (followed, followers)
create or replace function api.get_tournament(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_t     core.tournaments;
  v_me    uuid;
  v_masks jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_t from core.tournaments where id = p_id and not is_minor_event;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  -- names in the draws that belong to hidden players or minors, each with its placeholder
  select coalesce(jsonb_object_agg(y.k, '#' || y.n), '{}'::jsonb) into v_masks
    from (select x.k, row_number() over (order by x.k) as n
            from (select distinct core.draw_name_key(pl ->> 'raw') as k
                    from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
                    join core.players p on p.id = (pl ->> 'player_id')::uuid
                   where d.tournament_id = v_t.id and (p.hidden or p.is_minor)) x
           where x.k <> '') y;
  return jsonb_build_object(
    'id', v_t.id, 'name', v_t.name, 'logo', v_t.logo_path, 'venue', v_t.venue, 'area_id', v_t.area_id, 'surface', v_t.surface,
    'starts_on', v_t.starts_on, 'ends_on', v_t.ends_on, 'entry_deadline', v_t.entry_deadline,
    'state', core.tournament_state(v_t), 'me', v_me,
    'followed', exists (select 1 from core.tournament_follows f where f.user_id = v_uid and f.tournament_id = v_t.id),
    'followers', (select count(*)::int from core.tournament_follows f where f.tournament_id = v_t.id),
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object('tab', d.tab, 'title', d.title, 'discipline', d.discipline, 'level', d.level,
                                          'format', d.format, 'size', d.size, 'updated_at', d.updated_at,
                                          'entrants', d.md -> 'entrants', 'rounds', d.md -> 'rounds',
                                          'groups', coalesce(d.md -> 'groups', '[]'::jsonb))
                       order by array_position(array['MS', 'WS', 'MD', 'WD', 'XD'], d.discipline), d.level, d.tab)
        from (select d0.*, core.draw_mask(d0.draw, v_masks) as md
                from core.tournament_draws d0 where d0.tournament_id = v_t.id) d), '[]'::jsonb),
    -- the placeholders standing for hidden players and minors: the app shows «masked» there
    'masked', coalesce((select jsonb_agg(m.value order by substr(m.value, 2)::int) from jsonb_each_text(v_masks) m), '[]'::jsonb),
    'days', coalesce((
      with ms as (
        select m.*
          from core.matches m
         where m.tournament_id = v_t.id and m.status <> 'void' and m.starts_at is not null
           -- core.tournament_match_visible, inline
           and m.approved
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.is_minor or p.hidden))),
      sd as (select * from core.match_sides_for(array(select id from ms)))
      select jsonb_agg(jsonb_build_object('date', x.day, 'matches', x.ms) order by x.day)
        from (
          select core.athens_day(m.starts_at) as day,
                 -- core.tournament_match_json, inline
                 jsonb_agg(jsonb_build_object(
                   'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format, 'status', m.status,
                   'level', e.name, 'discipline', m.provenance ->> 'discipline', 'round', m.round,
                   'sides', coalesce(sd.sides, '[]'::jsonb),
                   'winner_side', r.winner_side, 'sets', r.sets, 'retired', r.retired, 'walkover', r.walkover,
                   'postponed', m.postponed_at is not null,
                   'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '7 days' then m.provenance -> 'moved_from_at' end,
                   'club', c.name, 'club_logo', c.logo_path, 'court', m.court, 'surface', coalesce(c.surface, v_t.surface))
                   order by m.starts_at, m.id) as ms
            from ms m
            left join sd on sd.match_id = m.id
            left join core.tournament_events e on e.id = m.event_id
            left join core.match_results r on r.match_id = m.id
            left join core.clubs c on c.id = m.club_id
           group by 1
        ) x), '[]'::jsonb));
end;
$$;

-- ── the follower pushes ──

-- one follower push: the notification and its outbox row, once per key; true when it was queued now
create or replace function core.follow_push(p_user uuid, p_key text, p_msg jsonb, p_at timestamptz)
returns boolean
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  insert into core.notifications (user_id, type, payload, channel, dedupe_key, scheduled_at)
  values (p_user, 'follow', p_msg, 'push', p_key, p_at)
  on conflict (dedupe_key) do nothing;
  if not found then return false; end if;
  insert into core.outbox (kind, payload, idempotency_key, run_after)
  values ('push', jsonb_build_object('user_id', p_user, 'dedupe_key', p_key, 'type', 'follow', 'message', p_msg), 'push:' || p_key, p_at)
  on conflict (idempotency_key) do nothing;
  return true;
end;
$$;
revoke all on function core.follow_push(uuid, text, jsonb, timestamptz) from public, anon, authenticated;

-- a draw has a played match (a winner that is not a bye), in its rounds or its groups
create or replace function core.draw_started(p_draw jsonb)
returns boolean
language sql immutable set search_path = pg_temp
as $$
  select exists (select 1
                   from jsonb_array_elements(case when jsonb_typeof(p_draw -> 'rounds') = 'array' then p_draw -> 'rounds' else '[]' end) rd,
                        jsonb_array_elements(case when jsonb_typeof(rd) = 'array' then rd else '[]' end) m
                  where m ->> 'winner' is not null and not coalesce((m ->> 'bye')::boolean, false))
      or exists (select 1
                   from jsonb_array_elements(case when jsonb_typeof(p_draw -> 'groups') = 'array' then p_draw -> 'groups' else '[]' end) g,
                        jsonb_array_elements(case when jsonb_typeof(g -> 'matches') = 'array' then g -> 'matches' else '[]' end) m
                  where m ->> 'winner' is not null)
$$;

-- the side (1 or 2) that won a knockout draw's final: the last round, when it is one match; else null
create or replace function core.draw_final_winner(p_draw jsonb)
returns int
language sql immutable set search_path = pg_temp
as $$
  select case when jsonb_typeof(p_draw -> 'rounds') = 'array' and jsonb_array_length(p_draw -> 'rounds') > 0
                   and jsonb_typeof(p_draw -> 'rounds' -> -1) = 'array' and jsonb_array_length(p_draw -> 'rounds' -> -1) = 1
                   and not coalesce((p_draw -> 'rounds' -> -1 -> 0 ->> 'bye')::boolean, false)
                   and p_draw -> 'rounds' -> -1 -> 0 ->> 'winner' in ('1', '2')
              then (p_draw -> 'rounds' -> -1 -> 0 ->> 'winner')::int end
$$;
revoke all on function core.draw_started(jsonb) from public, anon;
revoke all on function core.draw_final_winner(jsonb) from public, anon;

-- 1. the draw is out: to the followers, once per tournament per day, before its first match is played
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
  for r in
    select f.user_id from core.tournament_follows f
     where f.tournament_id = p_tournament and core.push_wants(f.user_id, 'followed')
  loop
    v_key := 'follow_draw:' || r.user_id || ':' || p_tournament || ':' || core.athens_day(v_at);
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    -- their own draw already came as the Pro push
    continue when exists (select 1 from core.notifications where dedupe_key = 'draw:' || r.user_id || ':' || p_tournament || ':' || p_tab);
    if core.follow_push(r.user_id, v_key, v_msg, v_at) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.follow_draw_alert(uuid, text, timestamptz) from public, anon, authenticated;

-- 3. a final is over: to the followers, not to the finalists; never naming a hidden player or a minor
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
  v_cnt  int;
  v_key  text;
  v_msg  jsonb;
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
  select string_agg(coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''), pl ->> 'raw'), ' και ' order by o), count(*)
    into v_who, v_cnt
    from jsonb_array_elements(v_ent -> 'players') with ordinality x(pl, o)
    left join core.players p on p.id = (pl ->> 'player_id')::uuid;
  select * into v_txt from core.ntext(case when v_cnt > 1 then 'follow_final_pair' else 'follow_final' end,
                                      jsonb_build_object('tournament', t.name, 'winner', v_who, 'category', d.tab));
  v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                              'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab,
                                                         'url', '/tournament/' || t.id || '?draw=' || core.url_part(d.tab)));
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
    if core.follow_push(r.user_id, v_key, v_msg, v_at) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.follow_final_alert(uuid, text, timestamptz) from public, anon, authenticated;

-- the draw trigger (20261221000000_m4_draw_alerts): the Pro push first, so the follower one can see it
create or replace function core.draw_alert_on_change()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.draw_alert(new.tournament_id, new.tab);
  perform core.follow_draw_alert(new.tournament_id, new.tab);
  if tg_op = 'UPDATE' and new.format = 'knockout'
     and core.draw_final_winner(old.draw) is null and core.draw_final_winner(new.draw) is not null then
    perform core.follow_final_alert(new.tournament_id, new.tab);
  end if;
  return null;
end;
$$;

-- 2. tomorrow's schedule: from 18:00 to 23:00 Athens, once per tournament per day, to the followers
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
    select * into v_txt from core.ntext('follow_schedule', jsonb_build_object('tournament', r.name, 'n', r.n));
    v_msg := jsonb_build_object('title', v_txt.title, 'body', v_txt.body,
                                'data', jsonb_build_object('tournament_id', r.tournament_id, 'day', v_day,
                                                           'url', '/tournament/' || r.tournament_id || '?day=' || to_char(v_day, 'YYYY-MM-DD')));
    if core.follow_push(r.user_id, v_key, v_msg, p_now) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.follow_schedule_alerts(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-follow-schedule', '*/10 * * * *', $c$select core.follow_schedule_alerts()$c$);
  end if;
end;
$$;
