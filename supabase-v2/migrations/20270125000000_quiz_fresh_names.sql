-- The daily questions use different names every day (founder, 17 Oct 2026: "the questions should be dynamic in
-- regards to the names used, not always the same"). The same people came back daily because the people you follow
-- always came first and the same matches were picked. Now anyone asked about in the last four days goes to the back
-- of the line, a match asked about in the last four days is not asked again, and «Ο μήνας» waits when its leader was
-- asked about lately. The quiz_* functions are those of 20270124000000_quiz_quality.sql and 20261228000000 with
-- only these changes.

/** the people in your questions over the last four days (not today) */
create or replace function core.quiz_recent_players(p_user uuid)
returns table (player_id uuid)
language sql stable security definer set search_path = core, pg_temp
as $$
  select distinct unnest(c.player_ids)
    from core.quiz_sets s join core.quiz_set_cards c on c.set_id = s.id
   where s.user_id = p_user and s.quiz_day >= core.athens_day() - 4 and s.quiz_day < core.athens_day()
$$;

/** the matches your questions were about over the last four days (not today) */
create or replace function core.quiz_recent_matches(p_user uuid)
returns table (match_id uuid)
language sql stable security definer set search_path = core, pg_temp
as $$
  select distinct (c.content ->> 'match_id')::uuid
    from core.quiz_sets s join core.quiz_set_cards c on c.set_id = s.id
   where s.user_id = p_user and s.quiz_day >= core.athens_day() - 4 and s.quiz_day < core.athens_day()
     and c.content ->> 'match_id' is not null
$$;
revoke all on function core.quiz_recent_players(uuid), core.quiz_recent_matches(uuid) from public;

create or replace function core.quiz_pool(p_user uuid, p_sport text, p_gender text, p_seed text)
returns table (player_id uuid, first_name text, surname text, gender text, area_id text, level_tier numeric,
               level_direction text, hand text, form jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select p.id from core.players p where p.claimed_by_user_id = p_user
  ),
  played as (
    -- people on court with me: opponents and partners
    select distinct o.player_id
      from core.match_participants mine
      join core.match_participants o on o.match_id = mine.match_id and o.player_id <> mine.player_id
      join core.matches mx on mx.id = mine.match_id and mx.status <> 'void'
     where mine.player_id = (select id from me)
  ),
  same_event as (
    -- people in the tournament categories I play in, this season
    select distinct o.player_id
      from core.match_participants mine
      join core.matches mm on mm.id = mine.match_id and mm.event_id is not null and mm.starts_at > now() - interval '180 days'
      join core.matches mo on mo.event_id = mm.event_id and mo.status <> 'void'
      join core.match_participants o on o.match_id = mo.id
     where mine.player_id = (select id from me)
  ),
  recent as (select player_id from core.quiz_recent_players(p_user)),
  ok as (
    select p.id, p.first_name, p.surname, p.gender, p.area_id, ps.level_tier, ps.level_direction, ps.hand, ps.form,
           case when exists (select 1 from core.follows f where f.user_id = p_user and f.player_id = p.id) then 0
                when p.id in (select player_id from played) then 1
                when p.id in (select player_id from same_event) then 2
                else 3 end as band,
           p.id in (select player_id from recent) as asked
      from core.players p
      left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
     where p.status = 'active' and not p.hidden and not p.is_minor
       and p.id is distinct from (select id from me)
       and (p_gender is null or p.gender = p_gender)
       and (p.claimed_by_user_id is null or not core.is_blocked(p_user, p.claimed_by_user_id))
  )
  select id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form
    from ok where band < 3
   order by asked, band, md5(p_seed || id::text)
$$;

create or replace function core.quiz_dynamic(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                             p_used_players uuid[], p_used_templates uuid[], p_wide boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_match  uuid;
  v_from   timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  m        record;
  t        core.quiz_templates;
  v_kind   text;
  v_q      text;
  v_opts   jsonb;
  v_ids    uuid[];
  v_pl     jsonb;
  v_prev   int;
  v_tag    text;
  v_right  int;
  v_reveal text;
  v_upset  boolean;
begin
  create temp table if not exists qd_pool (player_id uuid primary key, rk int) on commit drop;
  truncate qd_pool;
  insert into qd_pool
  select x.player_id, x.n from core.quiz_pool(p_user, p_sport, null, p_seed)
         with ordinality as x(player_id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form, n);

  if p_kind = 'weekly' then
    select * into t from core.quiz_templates where active and trigger = 'weekly' and id <> all (p_used_templates) limit 1;
    if t.id is null then return null; end if;
    v_ids := array(
      select w.player_id from (
        select mp.player_id, count(*) as wins, min(qp.rk) as rk
          from core.matches mx
          join core.match_results r on r.match_id = mx.id
          join core.match_participants mp on mp.match_id = mx.id and mp.side = r.winner_side
          join qd_pool qp on qp.player_id = mp.player_id
         where mx.sport_id = p_sport and mx.status <> 'void' and not r.walkover
           and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
           and mp.player_id <> all (p_used_players)
         group by mp.player_id) w
       order by w.wins desc, w.rk limit 3);
    if coalesce(array_length(v_ids, 1), 0) < 3 then return null; end if;
    v_q := 'Ποιος ήταν ο παίκτης της βδομάδας στην παρέα σου;';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
    v_tag := t.slot_template ->> 'tag';
  else
    select mx.id, mx.starts_at, r.sets, r.winner_side, mx.tournament_id as t_id,
           a.player_id as a_id, b.player_id as b_id,
           pa.gender as a_g, pb.gender as b_g, la.level_tier as a_lvl, lb.level_tier as b_lvl
      into m
      from core.matches mx
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      left join qd_pool qa on qa.player_id = a.player_id
      left join qd_pool qb on qb.player_id = b.player_id
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
      left join core.player_sports la on la.player_id = a.player_id and la.sport_id = p_sport
      left join core.player_sports lb on lb.player_id = b.player_id and lb.sport_id = p_sport
      left join core.match_results r on r.match_id = mx.id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.status <> 'void'
       and case when p_wide then mx.tournament_id is not null and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
                      and not exists (select 1 from core.tournaments tx where tx.id = mx.tournament_id and tx.is_minor_event)
                -- one of the two is someone I can know, the other one too or at least on the same court
                else qa.player_id is not null or qb.player_id is not null end
       and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and (select count(*) from core.match_participants c where c.match_id = mx.id) = 2
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) > 0
                     and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     -- fresh faces first: fewer people asked about lately, then people I know, then by chance
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int,
              (qa.player_id is not null and qb.player_id is not null) desc, least(qa.rk, qb.rk) nulls last, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;

    if p_kind = 'pre' then
      select count(*) into v_prev
        from core.match_participants x join core.match_participants y on y.match_id = x.match_id and y.side <> x.side
        join core.match_results rr on rr.match_id = x.match_id
       where x.player_id = m.a_id and y.player_id = m.b_id;
      v_kind := case when v_prev > 0 then 'rematch'
                     when m.a_lvl is not null and m.b_lvl is not null and abs(m.a_lvl - m.b_lvl) >= 1 then 'upset'
                     else 'first' end;
      select * into t from core.quiz_templates
       where active and trigger = 'pre' and slot_template ->> 'kind' = v_kind and id <> all (p_used_templates) limit 1;
      if t.id is null then return null; end if;
      v_tag := t.slot_template ->> 'tag';
      v_ids := case when v_kind = 'upset' and m.b_lvl < m.a_lvl then array[m.b_id, m.a_id] else array[m.a_id, m.b_id] end;
      if v_kind = 'rematch' then
        v_q := '{p1.o} και {p2.o} ξαναβρίσκονται ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει τώρα;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      elsif v_kind = 'first' then
        v_q := '{p1.o} με {p2.ton}, πρώτη φορά απέναντι ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      else
        v_q := '{p1.o} παίζει ' || core.quiz_when(m.starts_at, p_day) || ' με {p2.ton}, που ξεκινά φαβορί. Γίνεται ανατροπή;';
        v_opts := '[{"label": "Ναι, γίνεται"}, {"label": "Όχι, δεν γίνεται"}]';
      end if;
    else
      -- the result stays hidden in the question; who won, or whether it went the distance, then the answer
      select * into t from core.quiz_templates
       where active and trigger = 'post' and id <> all (p_used_templates) order by md5(p_seed || id::text) limit 1;
      if t.id is null then return null; end if;
      v_upset := m.a_lvl is not null and m.b_lvl is not null
                 and (case m.winner_side when 1 then m.a_lvl - m.b_lvl else m.b_lvl - m.a_lvl end) <= -0.5;
      v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_q := '{p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day);
      -- one of the three result templates asks about the third set, so it comes at most once a day
      if t.slot_template ->> 'kind' = 'close' then
        v_tag := 'Τρίτο σετ;';
        v_q := v_q || '. Πήγε σε τρίτο σετ;';
        v_opts := '[{"label": "Ναι, τρία σετ"}, {"label": "Όχι, σε δύο"}]';
        v_right := case when jsonb_array_length(m.sets) >= 3 then 0 else 1 end;
      else
        v_tag := 'Ποιος κέρδισε;';
        v_q := v_q || '. Ποιος κέρδισε;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
        v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
      end if;
      v_reveal := case when v_upset then 'Ανατροπή! ' else '' end
                  || '{p' || (case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 1 else 2 end) || '.o} κέρδισε '
                  || core.quiz_score(m.sets) || '.';
    end if;
  end if;

  -- a tournament match names its tournament first: «ΑΟΚ Tennis Open: …»
  if p_kind <> 'weekly' then
    if m.t_id is not null then
      v_q := (select name from core.tournaments where id = m.t_id) || ': ' || v_q;
    end if;
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', v_tag, 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'week', p_kind = 'weekly', 'match_id', v_match)
               || case when v_right is not null then jsonb_build_object('right', v_right, 'reveal', v_reveal) else '{}'::jsonb end);
end;
$$;

create or replace function core.quiz_tournament(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                                p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t      core.quiz_templates;
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  e      record;
  m      record;
  v_ids  uuid[];
  v_q    text;
  v_opts jsonb;
  v_pl   jsonb;
  v_right int;
  v_match uuid;
begin
  select * into t from core.quiz_templates
   where active and trigger = 'tour' and slot_template ->> 'kind' = p_kind and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;

  if p_kind = 'cup' then
    -- a singles category of a tournament that is on, with three players still unbeaten in it
    for e in
      select ev.id, ev.name as ev, tt.name as tn
        from core.tournament_events ev
        join core.tournaments tt on tt.id = ev.tournament_id
       where tt.sport_id = p_sport and not tt.is_minor_event and core.tournament_state(tt) = 'ongoing'
         and exists (select 1 from core.matches mx where mx.event_id = ev.id and mx.format = 'singles' and mx.status <> 'void')
       order by md5(p_seed || ev.id::text)
       limit 20
    loop
      v_ids := array(
        select w.player_id from (
          select mp.player_id, bool_and(mp.side = r.winner_side) as unbeaten, count(*) as played
            from core.matches mx
            join core.match_results r on r.match_id = mx.id
            join core.match_participants mp on mp.match_id = mx.id
           where mx.event_id = e.id and mx.format = 'singles' and mx.status <> 'void'
           group by mp.player_id) w
          join core.players p on p.id = w.player_id
          left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
         where w.unbeaten and p.status = 'active' and not p.hidden and not p.is_minor and p.id <> all (p_used_players)
         order by p.id in (select player_id from core.quiz_recent_players(p_user)), w.played desc, md5(p_seed || p.id::text)
         limit 3);
      if coalesce(array_length(v_ids, 1), 0) = 3 then
        v_q := e.tn || ', ' || e.ev || ': ποιος το σηκώνει;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
        exit;
      end if;
      v_ids := null;
    end loop;
    if v_ids is null then return null; end if;
  else
    -- a tournament singles match from the last week; the options in a fixed but shuffled order, the right one marked
    select mx.id, mx.starts_at, r.winner_side, tt.name as tn, ev.name as ev, a.player_id as a_id, b.player_id as b_id
      into m
      from core.matches mx
      join core.tournaments tt on tt.id = mx.tournament_id
      left join core.tournament_events ev on ev.id = mx.event_id
      join core.match_results r on r.match_id = mx.id
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.status <> 'void' and not r.walkover
       and not tt.is_minor_event and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and pa.status = 'active' and pb.status = 'active'
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;
    v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
    v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
    v_q := m.tn || coalesce(', ' || m.ev, '') || ': {p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day)
           || '. Ποιος κέρδισε;';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'match_id', v_match)
               || case when p_kind = 'recall' then jsonb_build_object('right', v_right) else '{}'::jsonb end);
end;
$$;

create or replace function core.quiz_month(p_user uuid, p_sport text, p_day date, p_seed text,
                                           p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  t      core.quiz_templates;
  v_ids  uuid[];
  v_top  uuid;
  v_wins int;
  v_pl   jsonb;
begin
  select * into t from core.quiz_templates where active and trigger = 'month' and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;
  -- people I can know first, else anyone in a tournament this month; the leader and two with fewer wins
  with wins as (
    select mp.player_id, count(*) filter (where mp.side = r.winner_side) as w,
           min(case when q.player_id is not null then 0 else 1 end) as far
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants mp on mp.match_id = mx.id
      join core.players p on p.id = mp.player_id and p.status = 'active' and not p.hidden and not p.is_minor
      left join core.quiz_pool(p_user, p_sport, null, p_seed) q on q.player_id = mp.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.status <> 'void'
       and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
       and (q.player_id is not null or mx.tournament_id is not null)
       and mp.player_id <> all (p_used_players)
     group by mp.player_id
  ),
  scope as (select * from wins where far = (select min(far) from wins) and w > 0),
  leader as (select player_id, w from scope order by w desc, md5(p_seed || player_id::text) limit 1),
  others as (select player_id from scope where w < (select w from leader)
              order by player_id in (select player_id from core.quiz_recent_players(p_user)), md5(p_seed || player_id::text) limit 2)
  select (select player_id from leader), (select w from leader), array(select player_id from others)
    into v_top, v_wins, v_ids;
  if v_top is null or v_wins < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;
  -- the same leader every day is no question: skip it while they were asked about lately
  if v_top in (select player_id from core.quiz_recent_players(p_user)) then return null; end if;

  v_ids := array(select u from unnest(v_ids || v_top) u order by md5(p_seed || 'm' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object(
      'tag', t.slot_template ->> 'tag',
      'q', 'Ποιος έχει τις περισσότερες νίκες αυτόν τον μήνα;',
      'options', '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]'::jsonb,
      'players', v_pl,
      'right', array_position(v_ids, v_top) - 1,
      'reveal', '{p' || array_position(v_ids, v_top) || '.o}, με ' || v_wins || ' νίκες.'));
end;
$$;
