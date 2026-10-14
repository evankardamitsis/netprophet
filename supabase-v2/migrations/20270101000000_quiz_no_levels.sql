-- Players' levels are hidden (founder, 14 Oct 2026), so the daily questions stop naming them. The upset question before
-- a match says who starts as the favourite instead of «(level 4)»; the one after asks whether you saw it coming instead
-- of whether the winner's level goes up. The hidden tiers still pick which matches are upsets. Only core.quiz_dynamic
-- changes; the rest is as in 20261228000000_quiz_tournaments.sql.

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
      v_q := '{p1.o} παίζει ' || core.quiz_when(m.starts_at, p_day) || ' με {p2.ton}, που ξεκινά φαβορί. Γίνεται Ανατροπή;';
      v_opts := '[{"label": "Ναι, γίνεται"}, {"label": "Όχι, δεν γίνεται"}]';
    elsif v_kind = 'upset' then
      v_q := 'Ανατροπή! {p1.o} κέρδισε {p2.ton} ' || core.quiz_score(m.sets) || '. Το περίμενες;';
      v_opts := '[{"label": "Ναι, το είδα να έρχεται"}, {"label": "Όχι, καθόλου"}]';
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
