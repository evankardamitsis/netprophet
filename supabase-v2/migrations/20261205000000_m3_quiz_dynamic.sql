-- M3 part 11: dynamic cards in «Οι 6 της ημέρας», asked about real matches of players you know (prototype PRE,
-- POST and WK families). «Πριν το ματς»: an open singles match in the next week (a rematch, a first meeting, or a
-- possible upset when the levels are a level or more apart). «Μετά το αποτέλεσμα»: a result from the last week (a
-- surprise winner, a three-set match, or who takes the rematch). «Εβδομαδιαίο» on Mondays: the player of the week in
-- your circle. Everyone who knows the same players gets the same card, so the split means something. A dynamic card is
-- a vote with no right or wrong; it never decides anything about the match itself (the match card does that).
-- Gendered words (του / της, τον / την) are chosen here only for players whose gender is known; the names themselves
-- still go through packages/copy.

alter table core.quiz_set_cards drop constraint quiz_set_cards_family_check;
alter table core.quiz_set_cards add constraint quiz_set_cards_family_check check (family in ('s', 'c', 'q', 'o', 'd'));

-- the dynamic templates (family 'd'; trigger pre / post / weekly; slot_template.kind picks the builder)
insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
('d', 'pre',    '{"tag": "Πριν το ματς", "kind": "rematch", "players": 2}', '[]', '{}'),
('d', 'pre',    '{"tag": "Πριν το ματς", "kind": "first", "players": 2}', '[]', '{}'),
('d', 'pre',    '{"tag": "Πριν το ματς", "kind": "upset", "players": 2}', '[]', '{}'),
('d', 'post',   '{"tag": "Μετά το αποτέλεσμα", "kind": "upset", "players": 2}', '[]', '{}'),
('d', 'post',   '{"tag": "Μετά το αποτέλεσμα", "kind": "close", "players": 2}', '[]', '{}'),
('d', 'post',   '{"tag": "Μετά το αποτέλεσμα", "kind": "rematch", "players": 2}', '[]', '{}'),
('d', 'weekly', '{"tag": "Εβδομαδιαίο", "kind": "player_of_week", "players": 3}', '[]', '{}');

-- «σήμερα», «αύριο», «το Σάββατο», «την Κυριακή» (Athens)
create or replace function core.quiz_when(p_at timestamptz, p_from date)
returns text
language sql immutable set search_path = core, pg_temp
as $$
  select case
           when core.athens_day(p_at) = p_from then 'σήμερα'
           when core.athens_day(p_at) = p_from + 1 then 'αύριο'
           else case extract(isodow from core.athens_day(p_at))::int
                  when 1 then 'τη Δευτέρα' when 2 then 'την Τρίτη' when 3 then 'την Τετάρτη' when 4 then 'την Πέμπτη'
                  when 5 then 'την Παρασκευή' when 6 then 'το Σάββατο' else 'την Κυριακή' end
         end
$$;

-- «6-4, 3-6, 7-5» from a result's sets (winner first)
create or replace function core.quiz_score(p_sets jsonb)
returns text
language sql immutable set search_path = pg_temp
as $$
  select string_agg((s ->> 'w') || '-' || (s ->> 'l'), ', ' order by i)
    from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality x(s, i)
$$;

create or replace function core.quiz_level_text(p_level numeric)
returns text
language sql immutable set search_path = pg_temp
as $$
  select case when p_level = trunc(p_level) then trunc(p_level)::int::text else replace(p_level::text, '.', ',') end
$$;

-- one dynamic card for a player, or null when there is nothing to ask about
create or replace function core.quiz_dynamic(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                             p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_match uuid;
  v_from  timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  m       record;
  t       core.quiz_templates;
  v_kind  text;
  v_q     text;
  v_opts  jsonb;
  v_ids   uuid[];
  v_pl    jsonb;
  v_prev  int;
  v_w     record;
begin
  -- who I know, best first (the same order as the static cards)
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
  else
    -- the singles match about players I know best, before or after
    select mx.id, mx.starts_at, r.sets, r.winner_side,
           a.player_id as a_id, b.player_id as b_id,
           pa.gender as a_g, pb.gender as b_g, la.level_tier as a_lvl, lb.level_tier as b_lvl
      into m
      from core.matches mx
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join qd_pool qa on qa.player_id = a.player_id
      join qd_pool qb on qb.player_id = b.player_id
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
      left join core.player_sports la on la.player_id = a.player_id and la.sport_id = p_sport
      left join core.player_sports lb on lb.player_id = b.player_id and lb.sport_id = p_sport
      left join core.match_results r on r.match_id = mx.id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.status <> 'void'
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and (select count(*) from core.match_participants c where c.match_id = mx.id) = 2
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     order by least(qa.rk, qb.rk), md5(p_seed || mx.id::text)
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
    else
      v_kind := case when m.a_lvl is not null and m.b_lvl is not null
                       and (case m.winner_side when 1 then m.a_lvl - m.b_lvl else m.b_lvl - m.a_lvl end) <= -0.5
                       and (case m.winner_side when 1 then m.a_g else m.b_g end) is not null then 'upset'
                     when jsonb_array_length(coalesce(m.sets, '[]'::jsonb)) = 3
                       and (case m.winner_side when 1 then m.a_g else m.b_g end) is not null then 'close'
                     else 'rematch' end;
    end if;
    select * into t from core.quiz_templates
     where active and trigger = p_kind and slot_template ->> 'kind' = v_kind and id <> all (p_used_templates) limit 1;
    if t.id is null then return null; end if;

    -- p1 is the one the question is about: the winner after, the lower level for an upset before
    if p_kind = 'post' then
      v_ids := case when m.winner_side = 1 then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
    elsif v_kind = 'upset' then
      v_ids := case when m.a_lvl < m.b_lvl then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
    else
      v_ids := array[m.a_id, m.b_id];
    end if;

    select * into v_w from (
      select (select gender from core.players where id = v_ids[1]) as g1,
             (select level_tier from core.player_sports where player_id = v_ids[1] and sport_id = p_sport) as l1,
             (select level_tier from core.player_sports where player_id = v_ids[2] and sport_id = p_sport) as l2) z;

    if p_kind = 'pre' and v_kind = 'rematch' then
      v_q := '{p1.o} και {p2.o} ξαναβρίσκονται ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει τώρα;';
      v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
    elsif p_kind = 'pre' and v_kind = 'first' then
      v_q := '{p1.o} με {p2.ton}, πρώτη φορά απέναντι ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει;';
      v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
    elsif p_kind = 'pre' then
      v_q := '{p1.o} (level ' || core.quiz_level_text(v_w.l1) || ') παίζει ' || core.quiz_when(m.starts_at, p_day)
             || ' με {p2.ton} (level ' || core.quiz_level_text(v_w.l2) || '). Γίνεται Ανατροπή;';
      v_opts := '[{"label": "Ναι, γίνεται"}, {"label": "Όχι, δεν γίνεται"}]';
    elsif v_kind = 'upset' then
      v_q := 'Ανατροπή! {p1.o} (level ' || core.quiz_level_text(v_w.l1) || ') κέρδισε {p2.ton} (level '
             || core.quiz_level_text(v_w.l2) || ') ' || core.quiz_score(m.sets) || '. Πού '
             || case when v_w.g1 = 'f' then 'την' else 'τον' end || ' βλέπεις τώρα;';
      v_opts := jsonb_build_array(jsonb_build_object('label', 'Ανεβαίνει'),
                                  jsonb_build_object('label', case when v_w.g1 = 'f' then 'Ίδια μένει' else 'Ίδιος μένει' end));
    elsif v_kind = 'close' then
      v_q := 'Κλειστό ματς: {p1.o} κέρδισε {p2.ton} ' || core.quiz_score(m.sets) || '. Ποιος κράτησε την ψυχραιμία '
             || case when v_w.g1 = 'f' then 'της' else 'του' end || ';';
      v_opts := '[{"label": "{p1}"}, {"label": "{p2}, ήταν κοντά"}]';
    else
      v_q := '{p1.o} κέρδισε {p2.ton} ' || core.quiz_score(m.sets) || '. Αν ξαναπαίξουν, ποιος το παίρνει;';
      v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
    end if;
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'week', p_kind = 'weekly', 'match_id', v_match));
end;
$$;
revoke all on function core.quiz_dynamic(uuid, text, text, date, text, uuid[], uuid[]) from public;

-- today's set for a player, built once (six; twelve with Pro), in the order Σενάριο, Διάλεξε έναν, Ποιος είναι;,
-- Άποψη, Σενάριο, Διάλεξε έναν; a family that cannot be filled falls back to Άποψη. Positions 2 and 6 (and 7, 10,
-- 11, 12 with Pro, as in the prototype) take a dynamic card first when there is a match to ask about: «Πριν το
-- ματς» at 2, 7 and 10, «Μετά το αποτέλεσμα» at 6 and 11, «Εβδομαδιαίο» instead at 6 and 12 on a Monday
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
  if v_set is null then   -- someone else built it a moment ago
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  -- dynamic cards first, so they get the players you know before the static cards use them
  for v_pos in select x from unnest(case when v_pro then array[2, 6, 7, 10, 11, 12] else array[2, 6] end) x loop
    v_seed := p_user::text || p_day::text || v_pos;
    v_kind := case when v_pos in (2, 7, 10) then 'pre'
                   when v_pos in (6, 12) and v_monday then 'weekly'
                   else 'post' end;
    v_dyn := core.quiz_dynamic(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t);
    if v_dyn is null and v_kind = 'weekly' then
      v_dyn := core.quiz_dynamic(p_user, v_sport, 'post', p_day, v_seed, v_used_p, v_used_t);
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
    if v_pos = any (v_dyn_pos) then continue; end if;   -- a dynamic card already sits here
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
    if not v_done then v_pos := v_pos - 1; end if;   -- nothing left at all: a shorter set
  end loop;
  return v_set;
end;
$$;
revoke all on function core.quiz_build_set(uuid, date, boolean) from public;
