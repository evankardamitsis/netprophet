-- «Οι ερωτήσεις της ημέρας» get better (founder, 17 Oct 2026: "needs to be improved qualitatively"). What was wrong:
-- most cards asked opinions about players you may never have seen (anyone near your level filled the slots), «Ποιος
-- είναι;» gave hidden levels as clues, the card after a result told you who won before asking, and few cards had an
-- answer you could get right. Now:
--   * questions about people only use people you can know: those you follow, those you have played with or against,
--     and those in the same tournament categories as you; otherwise the slot goes to a card about real results or a
--     general opinion about the game;
--   * «Ποιος είναι;» gives facts from the matches: how the last match went, how many matches this month, the
--     tournament they play in, a left hand;
--   * after a result the card hides it and asks: who won, or did it go to a third set; the answer shows after the pick;
--   * a new card, «Ο μήνας»: who has the most wins this month, out of three;
--   * sharper opinions; the weakest lines retire.

-- ── who the questions can be about ──────────────────────────────────────────────────────────────────────────────
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
  ok as (
    select p.id, p.first_name, p.surname, p.gender, p.area_id, ps.level_tier, ps.level_direction, ps.hand, ps.form,
           case when exists (select 1 from core.follows f where f.user_id = p_user and f.player_id = p.id) then 0
                when p.id in (select player_id from played) then 1
                when p.id in (select player_id from same_event) then 2
                else 3 end as band
      from core.players p
      left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
     where p.status = 'active' and not p.hidden and not p.is_minor
       and p.id is distinct from (select id from me)
       and (p_gender is null or p.gender = p_gender)
       and (p.claimed_by_user_id is null or not core.is_blocked(p_user, p.claimed_by_user_id))
  )
  select id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form
    from ok where band < 3
   order by band, md5(p_seed || id::text)
$$;

-- ── facts about a player, for «Ποιος είναι;» ─────────────────────────────────────────────────────────────────────
create or replace function core.quiz_facts(p_player uuid, p_sport text, p_day date)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_from  timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  v_last  record;
  v_month int;
  v_wins  int;
  v_tour  text;
  v_hand  text;
  v_g     text;
  v_clues jsonb := '[]'::jsonb;
begin
  select gender into v_g from core.players where id = p_player;
  -- the last match with a result
  select r.winner_side = mp.side as won, r.sets, jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) as n
    into v_last
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id and not r.walkover
   where mp.player_id = p_player and mx.starts_at < v_from
   order by mx.starts_at desc limit 1;
  if v_last.won is not null then
    v_clues := v_clues || to_jsonb(
      case when v_last.won and v_last.n = 3 then 'Κέρδισε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς στο τρίτο σετ'
           when v_last.won then 'Κέρδισε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς ' || core.quiz_score(v_last.sets)
           when v_last.n = 3 then 'Έχασε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς στο τρίτο σετ'
           else 'Έχασε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς' end);
  end if;
  -- this month
  select count(*), count(*) filter (where r.winner_side = mp.side)
    into v_month, v_wins
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id
   where mp.player_id = p_player and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from;
  if v_month > 0 then
    v_clues := v_clues || to_jsonb(v_wins || case when v_wins = 1 then ' νίκη σε ' else ' νίκες σε ' end
                                   || v_month || case when v_month = 1 then ' ματς' else ' ματς' end || ' αυτόν τον μήνα');
  end if;
  -- the tournament they play in lately
  select t.name into v_tour
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.status <> 'void'
    join core.tournaments t on t.id = mx.tournament_id and not t.is_minor_event
   where mp.player_id = p_player and mx.starts_at > v_from - interval '60 days'
   order by mx.starts_at desc limit 1;
  if v_tour is not null then
    v_clues := v_clues || to_jsonb('Παίζει στο ' || v_tour);
  end if;
  select hand into v_hand from core.player_sports where player_id = p_player and sport_id = p_sport;
  if v_hand = 'L' then
    v_clues := v_clues || to_jsonb(case when v_g = 'f' then 'Αριστερόχειρη' else 'Αριστερόχειρας' end);
  end if;
  return v_clues;
end;
$$;
revoke all on function core.quiz_facts(uuid, text, date) from public;

-- «Ποιος είναι;»: one of the people you can know from two or more facts, and two others of the same gender whose
-- facts differ (never by level: levels are hidden)
create or replace function core.quiz_who(p_user uuid, p_sport text, p_gender text, p_seed text, p_used uuid[])
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_day   date := core.athens_day();
  v_right uuid;
  v_clues jsonb;
  v_opts  jsonb;
  v_ids   uuid[];
  x       record;
begin
  for x in select q.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed) q where q.player_id <> all (p_used) limit 12 loop
    v_clues := core.quiz_facts(x.player_id, p_sport, v_day);
    if jsonb_array_length(v_clues) >= 2 then
      v_right := x.player_id;
      exit;
    end if;
  end loop;
  if v_right is null then return null; end if;

  v_ids := array(select q.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed || 'd') q
                  where q.player_id <> all (p_used) and q.player_id <> v_right
                    and core.quiz_facts(q.player_id, p_sport, v_day) is distinct from v_clues
                  limit 2);
  if coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;

  v_ids := array(select u from unnest(v_ids || v_right) u order by md5(p_seed || 'o' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_opts from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'q', (case jsonb_array_length(v_clues) when 2 then 'Δύο στοιχεία, ' when 3 then 'Τρία στοιχεία, ' else 'Τέσσερα στοιχεία, ' end)
         || case when p_gender = 'f' then 'μία παίκτρια. Ποια είναι;' else 'ένας παίκτης. Ποιος είναι;' end,
    'clues', v_clues,
    'players', v_opts,
    'options', (select jsonb_agg(jsonb_build_object('label', '{p' || i || '}')) from generate_series(1, 3) i),
    'right', array_position(v_ids, v_right) - 1,
    'ids', to_jsonb(v_ids));
end;
$$;

-- ── after a result: guess it, then see it ────────────────────────────────────────────────────────────────────────
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
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) > 0
                     and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     order by (qa.player_id is not null and qb.player_id is not null) desc, least(qa.rk, qb.rk) nulls last, md5(p_seed || mx.id::text)
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

-- ── «Ο μήνας»: who has the most wins this month ──────────────────────────────────────────────────────────────────
insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
('d', 'month', '{"tag": "Ο μήνας", "kind": "month", "players": 3}', '[]', '{}');

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
  others as (select player_id from scope where w < (select w from leader) order by md5(p_seed || player_id::text) limit 2)
  select (select player_id from leader), (select w from leader), array(select player_id from others)
    into v_top, v_wins, v_ids;
  if v_top is null or v_wins < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;

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
revoke all on function core.quiz_month(uuid, text, date, text, uuid[], uuid[]) from public;

-- ── the set: two more cards with an answer to get right ──────────────────────────────────────────────────────────
create or replace function core.quiz_build_set(p_user uuid, p_day date, p_pro boolean default null)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := coalesce(p_pro, core.is_pro(p_user));
  v_pattern text[] := array['s', 'c', 'q', 'o', 's', 'c'];
  v_used_t  uuid[] := '{}';
  v_used_p  uuid[] := '{}';
  v_seed    text;
  v_pos     int := 0;
  v_fam     text;
  t         record;
  v_n       int;
  v_players jsonb;
  v_ids     uuid[];
  v_content jsonb;
  v_who     jsonb;
  v_done    boolean;
  v_dyn     jsonb;
  v_dyn_pos int[] := '{}';
  v_kind    text;
  v_monday  boolean := extract(isodow from p_day) = 1;
begin
  select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
  if v_set is not null then return v_set; end if;
  select primary_sport into v_sport from core.profiles where user_id = p_user;
  v_sport := coalesce(v_sport, 'tennis');
  if v_pro then v_pattern := v_pattern || v_pattern; end if;

  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro) values (p_user, p_day, v_sport, v_pro)
  on conflict (user_id, quiz_day) do nothing returning id into v_set;
  if v_set is null then
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  -- cards from real matches first: 2 before a match, 4 a tournament card, 5 «Ο μήνας», 6 a result to guess (the
  -- weekly on a Monday); Pro adds more of the same
  for v_pos in select x from unnest(case when v_pro then array[2, 4, 5, 6, 7, 9, 10, 11, 12] else array[2, 4, 5, 6] end) x loop
    v_seed := p_user::text || p_day::text || v_pos;
    v_kind := case when v_pos in (2, 7, 10) then 'pre'
                   when v_pos in (4, 9) then 'tour'
                   when v_pos in (5, 11) then 'month'
                   when v_pos in (6, 12) and v_monday then 'weekly'
                   else 'post' end;
    if v_kind = 'tour' then
      v_dyn := core.quiz_tournament(p_user, v_sport, case when v_pos = 4 then 'cup' else 'recall' end, p_day, v_seed, v_used_p, v_used_t);
      if v_dyn is null then
        v_dyn := core.quiz_tournament(p_user, v_sport, case when v_pos = 4 then 'recall' else 'cup' end, p_day, v_seed, v_used_p, v_used_t);
      end if;
    elsif v_kind = 'month' then
      v_dyn := core.quiz_month(p_user, v_sport, p_day, v_seed, v_used_p, v_used_t);
      if v_dyn is null then
        v_dyn := core.quiz_dynamic(p_user, v_sport, 'post', p_day, v_seed, v_used_p, v_used_t, true);
      end if;
    else
      v_dyn := core.quiz_dynamic(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t);
      if v_dyn is null and v_kind = 'weekly' then
        v_dyn := core.quiz_dynamic(p_user, v_sport, 'post', p_day, v_seed, v_used_p, v_used_t);
      end if;
      if v_dyn is null then
        v_dyn := core.quiz_dynamic(p_user, v_sport, case when v_kind = 'pre' then 'pre' else 'post' end, p_day, v_seed, v_used_p, v_used_t, true);
      end if;
    end if;
    if v_dyn is not null then
      v_ids := array(select jsonb_array_elements_text(v_dyn -> 'ids')::uuid);
      insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids)
      values (v_set, v_pos, (v_dyn ->> 'template_id')::uuid, 'd', v_dyn -> 'content', v_ids);
      v_used_t := v_used_t || (v_dyn ->> 'template_id')::uuid;
      v_used_p := v_used_p || v_ids;
      v_dyn_pos := v_dyn_pos || v_pos;
    end if;
  end loop;
  v_pos := 0;

  foreach v_fam in array v_pattern loop
    v_pos := v_pos + 1;
    v_done := false;
    v_seed := p_user::text || p_day::text || v_pos;
    if v_pos = any (v_dyn_pos) then continue; end if;
    for t in
      select * from core.quiz_templates
       where active and trigger = 'static' and family in (v_fam, 'o') and id <> all (v_used_t)
       order by (family = 'o') <> (v_fam = 'o'), md5(v_seed || id::text)
    loop
      v_n := coalesce((t.slot_template ->> 'players')::int, 0);
      if t.family = 'q' then
        v_who := core.quiz_who(p_user, v_sport, t.guardrails ->> 'gender', v_seed, v_used_p);
        if v_who is null then continue; end if;
        v_ids := array(select jsonb_array_elements_text(v_who -> 'ids')::uuid);
        v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_who ->> 'q', 'clues', v_who -> 'clues',
                                        'options', v_who -> 'options', 'right', (v_who ->> 'right')::int, 'players', v_who -> 'players');
      else
        v_ids := array(select x.player_id from core.quiz_pool(p_user, v_sport, t.guardrails ->> 'gender', v_seed) x
                        where x.player_id <> all (v_used_p) limit v_n);
        if coalesce(array_length(v_ids, 1), 0) < v_n then continue; end if;
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                                  order by array_position(v_ids, p.id)), '[]'::jsonb)
          into v_players from core.players p where p.id = any (v_ids);
        v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
                                        'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.option_templates) o),
                                        'players', v_players);
      end if;
      insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids)
      values (v_set, v_pos, t.id, t.family, v_content, coalesce(v_ids, '{}'));
      v_used_t := v_used_t || t.id;
      v_used_p := v_used_p || coalesce(v_ids, '{}');
      v_done := true;
      exit;
    end loop;
    if not v_done then v_pos := v_pos - 1; end if;
  end loop;
  return v_set;
end;
$$;
revoke all on function core.quiz_build_set(uuid, date, boolean) from public;

-- ── the opinions: sharper, and the weakest lines retire ──────────────────────────────────────────────────────────
update core.quiz_templates set active = false
 where trigger = 'static'
   and slot_template ->> 'q' in ('Το πρωινό ματς είναι πάντα καλύτερο από το βραδινό.',
                                 'Ματς στις 8 το πρωί. Ποιος είναι πιο ξύπνιος, {p1.o} ή {p2.o};');

insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
('o', 'static', '{"tag": "Άποψη", "q": "Ο super tie-break στο 10 είναι πιο δίκαιος από ένα τρίτο σετ.", "players": 0}', '["Ναι, γρήγορο και δίκαιο", "Όχι, θέλω τρίτο σετ"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Στο διπλό, το ματς το κρίνει ο πιο αδύναμος της τετράδας.", "players": 0}', '["Ισχύει", "Όχι, το κρίνει ο καλύτερος"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Ένα ματς κερδίζεται στο μυαλό, όχι στο χέρι.", "players": 0}', '["Στο μυαλό", "Στο χέρι"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Παίζεις το ματς της χρονιάς σου. Σε ποια επιφάνεια;", "players": 0}', '["Χώμα", "Σκληρό"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Χάνεις το πρώτο σετ. Τι κάνεις;", "players": 0}', '["Αλλάζω τακτική", "Συνεχίζω, θα γυρίσει"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Ποιο σερβίς σε φοβίζει πιο πολύ απέναντι;", "players": 0}', '["Το δυνατό στο κέντρο", "Το κομμένο στη γωνία"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Στο μονό κερδίζει ο πιο σταθερός, όχι ο πιο ταλαντούχος.", "players": 0}', '["Συμφωνώ", "Το ταλέντο κερδίζει"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Πας στο φιλέ με την πρώτη ευκαιρία ή μένεις πίσω;", "players": 0}', '["Στο φιλέ", "Μένω πίσω"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Το let στο σερβίς πρέπει να παίζεται.", "players": 0}', '["Ναι, να παίζεται", "Όχι, ξανά σερβίς"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Πέντε λεπτά ζέσταμα φτάνουν πριν από ένα ματς.", "players": 0}', '["Φτάνουν", "Με τίποτα"]', '{}');
