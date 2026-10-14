-- The daily quiz from the week's matches and the tournaments (founder, 14 Oct: "the quiz questions should be dynamic
-- based on the week's matches and overall tournaments"). Three of the six cards now come from real matches when
-- there are any; when none of the players you know plays this week, the cards come from the week's tournament
-- matches instead (never hidden players, minors or minor events). Two tournament cards join:
--   «Τουρνουά»: a category of a tournament that is on; who lifts the cup, out of the three best players still unbeaten
--   in it (a vote, no right answer, the split is what counts).
--   «Θυμάσαι;»: a tournament match from the last week; who won it (a right answer, shown after the pick).

insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
('d', 'tour', '{"tag": "Τουρνουά", "kind": "cup", "players": 3}', '[]', '{}'),
('d', 'tour', '{"tag": "Θυμάσαι;", "kind": "recall", "players": 2}', '[]', '{}');

drop function core.quiz_dynamic(uuid, text, text, date, text, uuid[], uuid[]);

create or replace function core.quiz_dynamic(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                             p_used_players uuid[], p_used_templates uuid[], p_wide boolean default false)
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
       -- players I know; or, wide, any tournament match this week (never hidden players or minors)
       and case when p_wide then mx.tournament_id is not null and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
                      and not exists (select 1 from core.tournaments tx where tx.id = mx.tournament_id and tx.is_minor_event)
                else qa.player_id is not null and qb.player_id is not null end
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and (select count(*) from core.match_participants c where c.match_id = mx.id) = 2
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     order by least(qa.rk, qb.rk) nulls last, md5(p_seed || mx.id::text)
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
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'week', p_kind = 'weekly', 'match_id', v_match));
end;
$$;
revoke all on function core.quiz_dynamic(uuid, text, text, date, text, uuid[], uuid[], boolean) from public;

-- «Τουρνουά» (cup) and «Θυμάσαι;» (recall) cards from the tournaments
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
         order by w.played desc, ps.level_tier desc nulls last, md5(p_seed || p.id::text)
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
     order by md5(p_seed || mx.id::text)
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
revoke all on function core.quiz_tournament(uuid, text, text, date, text, uuid[], uuid[]) from public;

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

  -- dynamic cards first, so they get the players you know before the static cards use them. Three of six come from
  -- real matches when there are any (founder, 14 Oct: "dynamic based on the week's matches and overall tournaments"):
  -- 2 before a match, 4 a tournament card (who lifts the cup, or who won this week), 6 after a result (the weekly on
  -- a Monday). Players you know first; when none of them plays, the week's tournament matches.
  for v_pos in select x from unnest(case when v_pro then array[2, 4, 6, 7, 9, 10, 11, 12] else array[2, 4, 6] end) x loop
    v_seed := p_user::text || p_day::text || v_pos;
    v_kind := case when v_pos in (2, 7, 10) then 'pre'
                   when v_pos in (4, 9) then 'tour'
                   when v_pos in (6, 12) and v_monday then 'weekly'
                   else 'post' end;
    if v_kind = 'tour' then
      v_dyn := core.quiz_tournament(p_user, v_sport, case when v_pos = 4 then 'cup' else 'recall' end, p_day, v_seed, v_used_p, v_used_t);
      if v_dyn is null then
        v_dyn := core.quiz_tournament(p_user, v_sport, case when v_pos = 4 then 'recall' else 'cup' end, p_day, v_seed, v_used_p, v_used_t);
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
