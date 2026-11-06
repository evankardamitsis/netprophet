-- The daily quiz gets more variety and more fun (founder, 6 Nov 2026: "some are weird, we need more variety and fun
-- questions"; every card below was decided on the review board):
--   * questions about people only use people you follow or have played with (the same category no longer counts); a
--     card from a match needs someone you know in it. Who has few gets more rules and life on court;
--   * no fixed order: each day's set is shuffled, with at most one card of each kind from the real matches, so «Ποιος
--     κέρδισε;» comes once at most;
--   * Κανόνες, with a right answer (family 'd', which the app already marks right or wrong, so no new build);
--   * Η ζωή στο γήπεδο, no right answer;
--   * from the real matches: Βρες το σκορ, Το γύρισε;, Μεταξύ τους, Ο πιο πολυάσχολος;
--   * a template asked in the last 30 days waits while another is free;
--   * tournament names lose their year, categories their codes; «Θυμάσαι;» and some opinions retire.
-- The +30 is unchanged. Sets already built today stay as they are.

-- «Athens Tennis 2026–27» -> «Athens Tennis»
create or replace function core.quiz_short_name(p_name text)
returns text
language sql immutable set search_path = pg_temp
as $$
  select btrim(regexp_replace(coalesce(p_name, ''), '\s*\d{4}(\s*[–-]\s*\d{2,4})?\s*$', ''))
$$;
revoke all on function core.quiz_short_name(text) from public, anon, authenticated;

-- a category you can say out loud: «ROOKIES», «40+»; not «Regular Season 2026–27» or «AT 250 @ PRC ATRP 3.0»
create or replace function core.quiz_clean_category(p_name text)
returns boolean
language sql immutable set search_path = pg_temp
as $$
  select coalesce(p_name, '') <> '' and p_name !~* 'season|@' and p_name !~ '\d{4}' and p_name !~ '\d\.\d'
$$;
revoke all on function core.quiz_clean_category(text) from public, anon, authenticated;

-- ── the bank ──
update core.quiz_templates set active = false
 where (trigger = 'static' and slot_template ->> 'q' in (
          'Ένα ματς κερδίζεται στο μυαλό, όχι στο χέρι.', 'Το δεύτερο σερβίς δείχνει τον παίκτη.',
          'Στο tie-break κερδίζει όποιος κάνει λιγότερα λάθη.', 'Το μικτό είναι το πιο διασκεδαστικό ματς.',
          'Ποιο σερβίς σε φοβίζει πιο πολύ απέναντι;'))
    or (trigger = 'tour' and slot_template ->> 'kind' = 'recall');

update core.quiz_templates set slot_template = slot_template || jsonb_build_object('q', x.new)
  from (values
    ('Ο super tie-break στο 10 είναι πιο δίκαιος από ένα τρίτο σετ.', 'Το super tie-break στα 10 είναι πιο δίκαιο από τρίτο σετ.'),
    ('Κλειστό ματς, τρίτο σετ, 4-4. Ποιος θα το κλείσει;', 'Τρίτο σετ, 4-4, και φυσάει. Ποιος το κλείνει;'),
    ('Δύσκολο διπλό. Ποιον θες δίπλα σου;', 'Διπλό, 5-5 στο τρίτο. Ποιον θες δίπλα σου;'),
    ('Ποιος είναι ο βασιλιάς του χώματος;', 'Τρίωρο ματς με 38 βαθμούς. Ποιος αντέχει;')) x(old, new)
 where trigger = 'static' and slot_template ->> 'q' = x.old;

insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
('d', 'rule', '{"tag": "Κανόνες", "q": "Η ρακέτα σου άγγιξε το φιλέ μέσα στον πόντο.", "players": 0, "right": 1, "reveal": "Όποιος αγγίξει το φιλέ μέσα στον πόντο, τον χάνει."}', '["Συνεχίζεται", "Χάνεις τον πόντο"]', '{}'),
('d', 'rule', '{"tag": "Κανόνες", "q": "Στο διπλό, η μπάλα χτύπησε τον συμπαίκτη σου.", "players": 0, "right": 0, "reveal": "Αν η μπάλα βρει εσένα ή τον συμπαίκτη σου, ο πόντος χάνεται."}', '["Χάνετε τον πόντο", "Ξαναπαίζεται"]', '{}'),
('d', 'rule', '{"tag": "Κανόνες", "q": "Μπήκε μπαλάκι από το διπλανό γήπεδο μέσα στον πόντο.", "players": 0, "right": 1, "reveal": "Ο πόντος σταματά και ξαναπαίζεται."}', '["Συνεχίζεται", "Ξαναπαίζεται"]', '{}'),
('d', 'rule', '{"tag": "Κανόνες", "q": "Super tie-break, 10-9. Τελείωσε;", "players": 0, "right": 0, "reveal": "Το super tie-break θέλει διαφορά δύο πόντων."}', '["Όχι, θέλει διαφορά δύο", "Ναι"]', '{}'),
('d', 'rule', '{"tag": "Κανόνες", "q": "Στο tie-break, μετά τον πρώτο πόντο, πόσα σερβίς κάνει ο καθένας;", "players": 0, "right": 1, "reveal": "Δύο σερβίς ο καθένας, ως το τέλος του tie-break."}', '["Ένα", "Δύο"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Έχασες 6-0 6-1. Τι λες στην παρέα;", "players": 0}', '["«Με πονούσε το χέρι»", "«Ήταν καλύτερος»", "Δεν το λέω σε κανέναν"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Η αγαπημένη σου δικαιολογία;", "players": 0}', '["Ο ήλιος", "Ο αέρας", "Οι χορδές", "Η μέση"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Πόσες ρακέτες έχεις σπάσει;", "players": 0}', '["Καμία", "Μία, ατύχημα", "Μη ρωτάς"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Μιλάς στον εαυτό σου μέσα στο ματς;", "players": 0}', '["Μόνο από μέσα", "Με ακούει όλο το κλαμπ"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ο αντίπαλος είπε άουτ, αλλά ήταν μέσα. Τι κάνεις;", "players": 0}', '["Το λέω", "Το αφήνω, αλλά το θυμάμαι"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Μετά το ματς;", "players": 0}', '["Μπίρα", "Πρωτεΐνη", "Και τα δύο"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Καινούργια ρακέτα ή μαθήματα;", "players": 0}', '["Ρακέτα, φταίει αυτή", "Μαθήματα, ξέρω ότι φταίω εγώ"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ο συμπαίκτης σου έκανε τρίτο διπλό λάθος στο γκέιμ.", "players": 0}', '["«Δεν πειράζει»", "Τον κοιτάω", "Του λέω ένα αστείο"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ματς Κυριακή στις 8 το πρωί;", "players": 0}', '["Ναι, με χαρά", "Μόνο με καφέ", "Με τίποτα"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ποιος κρατάει το σκορ στο ματς σου;", "players": 0}', '["Εγώ", "Ο αντίπαλος", "Κανείς με σιγουριά"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ξέχασες το σκορ. Τι κάνεις;", "players": 0}', '["Ρωτάω", "Λέω αυτό που με βολεύει", "Ξαναρχίζουμε το γκέιμ"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Πόσο παλιές είναι οι χορδές σου;", "players": 0}', '["Φρέσκες", "Μην το ψάχνεις", "Έχει χορδές;"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Δεύτερο σερβίς στο 30-40. Τι κάνεις;", "players": 0}', '["Το χτυπάω", "Το βάζω όπως όπως", "Κάνω τον σταυρό μου"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Τι σου χαλάει πιο πολύ το ματς;", "players": 0}', '["Ο αέρας", "Ο ήλιος στο σερβίς", "Ο αντίπαλος που δεν μιλάει"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Ο αντίπαλος παίζει μόνο λόμπες. Πώς το παίρνεις;", "players": 0}', '["Τον σέβομαι", "Τον βαριέμαι", "Θέλω να φύγω"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Τρίτο σετ, μετά από δυόμισι ώρες. Τι σκέφτεσαι;", "players": 0}', '["«Θα το πάρω»", "Όχι άλλο κάρβουνο", "Το σουβλάκι μετά"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Το λάθος στο διπλό ήταν…", "players": 0}', '["Δικό μου, το λέω", "Και των δύο", "Του συμπαίκτη, το σκέφτομαι"]', '{}'),
('o', 'static', '{"tag": "Η ζωή στο γήπεδο", "q": "Το ζέσταμά σου πριν το ματς;", "players": 0}', '["Κανονικό", "Δύο τρία μπαλάκια", "Το πρώτο σετ"]', '{}'),
('d', 'real', '{"tag": "Βρες το σκορ", "q": null, "players": 0, "kind": "score"}', '[]', '{}'),
('d', 'real', '{"tag": "Το γύρισε;", "q": null, "players": 0, "kind": "comeback"}', '[]', '{}'),
('d', 'real', '{"tag": "Μεταξύ τους", "q": null, "players": 0, "kind": "h2h"}', '[]', '{}'),
('d', 'real', '{"tag": "Ο πιο πολυάσχολος", "q": null, "players": 0, "kind": "busy"}', '[]', '{}');

-- ── who the questions can be about ──
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
      join core.matches mx on mx.id = mine.match_id and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
     where mine.player_id = (select id from me)
  ),
  recent as (select player_id from core.quiz_recent_players(p_user)),
  ok as (
    select p.id, p.first_name, p.surname, p.gender, p.area_id, ps.level_tier, ps.level_direction, ps.hand, ps.form,
           case when exists (select 1 from core.follows f where f.user_id = p_user and f.player_id = p.id) then 0
                when p.id in (select player_id from played) then 1
                else 2 end as band,
           p.id in (select player_id from recent) as asked
      from core.players p
      left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
     where p.status = 'active' and not p.hidden and not p.is_minor
       and p.id is distinct from (select id from me)
       and (p_gender is null or p.gender = p_gender)
       and (p.claimed_by_user_id is null or not core.is_blocked(p_user, p.claimed_by_user_id))
  )
  select id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form
    from ok where band < 2
   order by asked, band, md5(p_seed || id::text)
$$;

-- ── the cards from a match ──
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
         where mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
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
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
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
       where active and trigger = 'post' and id <> all (p_used_templates)
         and case p_kind when 'post_third' then slot_template ->> 'kind' = 'close'
                         when 'post_who' then slot_template ->> 'kind' is distinct from 'close'
                         else true end
       order by md5(p_seed || id::text) limit 1;
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
      v_q := (select core.quiz_short_name(name) from core.tournaments where id = m.t_id) || ': ' || v_q;
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
         and exists (select 1 from core.matches mx
                       join core.match_participants mk on mk.match_id = mx.id
                       join core.quiz_pool(p_user, p_sport, null, p_seed) qk on qk.player_id = mk.player_id
                      where mx.event_id = ev.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void')
       order by md5(p_seed || ev.id::text)
       limit 20
    loop
      v_ids := array(
        select w.player_id from (
          select mp.player_id, bool_and(mp.side = r.winner_side) as unbeaten, count(*) as played
            from core.matches mx
            join core.match_results r on r.match_id = mx.id
            join core.match_participants mp on mp.match_id = mx.id
           where mx.event_id = e.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
           group by mp.player_id) w
          join core.players p on p.id = w.player_id
          left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
         where w.unbeaten and p.status = 'active' and not p.hidden and not p.is_minor and p.id <> all (p_used_players)
         order by p.id in (select player_id from core.quiz_recent_players(p_user)), w.played desc, md5(p_seed || p.id::text)
         limit 3);
      if coalesce(array_length(v_ids, 1), 0) = 3 then
        v_q := case when core.quiz_clean_category(e.ev)
                    then 'Ποιος θα σηκώσει το ' || e.ev || ' στο ' || core.quiz_short_name(e.tn) || ';'
                    else 'Ποιος θα το σηκώσει στο ' || core.quiz_short_name(e.tn) || ';' end;
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
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
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
  -- people I can know; the leader and two with fewer wins
  with wins as (
    select mp.player_id, count(*) filter (where mp.side = r.winner_side) as w,
           min(case when q.player_id is not null then 0 else 1 end) as far
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants mp on mp.match_id = mx.id
      join core.players p on p.id = mp.player_id and p.status = 'active' and not p.hidden and not p.is_minor
      left join core.quiz_pool(p_user, p_sport, null, p_seed) q on q.player_id = mp.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
       and q.player_id is not null
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

-- Βρες το σκορ, Το γύρισε;, Μεταξύ τους, Ο πιο πολυάσχολος: someone you know in it, a right answer from the results
create or replace function core.quiz_real(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                          p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_from   timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  t        core.quiz_templates;
  m        record;
  v_ids    uuid[];
  v_q      text;
  v_opts   jsonb;
  v_right  int;
  v_reveal text;
  v_match  uuid;
  v_score  text;
  v_wrong  text[];
  v_top    uuid;
  v_n      int;
  v_pl     jsonb;
begin
  select * into t from core.quiz_templates
   where active and trigger = 'real' and slot_template ->> 'kind' = p_kind and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;

  create temp table if not exists qr_pool (player_id uuid primary key) on commit drop;
  truncate qr_pool;
  insert into qr_pool select x.player_id from core.quiz_pool(p_user, p_sport, null, p_seed) x;

  if p_kind in ('score', 'comeback') then
    -- a finished singles match of the last two weeks; the sets are stored winner first
    select mx.id, r.sets, r.winner_side, a.player_id as a_id, b.player_id as b_id,
           jsonb_array_length(r.sets) as n, (r.sets -> 0 ->> 'w')::int < (r.sets -> 0 ->> 'l')::int as turned
      into m
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover and not r.retired
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id and pa.status = 'active' and not pa.hidden and not pa.is_minor
      join core.players pb on pb.id = b.player_id and pb.status = 'active' and not pb.hidden and not pb.is_minor
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and mx.starts_at >= v_from - interval '14 days' and mx.starts_at < v_from
       and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) >= 2
       and (a.player_id in (select player_id from qr_pool) or b.player_id in (select player_id from qr_pool))
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
       -- the two answers of «Το γύρισε;» have to cover what happened: turned round, or over in two
       and (p_kind = 'score' or jsonb_array_length(r.sets) = 2 or (r.sets -> 0 ->> 'w')::int < (r.sets -> 0 ->> 'l')::int)
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;
    v_score := core.quiz_score(m.sets);
    if p_kind = 'score' then
      -- p1 won; the true score among two that could have been
      v_ids := case when m.winner_side = 1 then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_wrong := array(select s from unnest(array['6-3, 6-4', '6-4, 6-2', '7-5, 6-3', '6-2, 6-1', '7-6, 6-4', '6-4, 3-6, 10-7', '4-6, 6-3, 6-4']) s
                        where s <> v_score order by md5(p_seed || s) limit 2);
      v_right := abs(('x' || substr(md5(p_seed || 'r'), 1, 6))::bit(24)::int) % 3;
      v_opts := (select jsonb_agg(jsonb_build_object('label', l) order by o)
                   from (select v_score as l, v_right as o
                         union all select v_wrong[1], case when v_right = 0 then 1 else 0 end
                         union all select v_wrong[2], case when v_right = 2 then 1 else 2 end) x);
      v_q := '{p1.o} κέρδισε {p2.ton}. Με τι σκορ;';
      v_reveal := '{p1.o} κέρδισε ' || v_score || '.';
    else
      -- p1 lost the first set: the winner when it turned round, else the loser
      v_ids := case when m.turned = (m.winner_side = 1) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_q := '{p1.o} έχασε το πρώτο σετ από {p2.ton}. Τι έγινε μετά;';
      v_opts := '[{"label": "Το γύρισε"}, {"label": "Τέλειωσε σε δύο"}]';
      v_right := case when m.turned then 0 else 1 end;
      v_reveal := '{p' || case when m.turned then 1 else 2 end || '.o} κέρδισε ' || v_score || '.';
    end if;

  elsif p_kind = 'h2h' then
    -- two people with two or more results between them
    select least(a.player_id, b.player_id) as lo, greatest(a.player_id, b.player_id) as hi,
           count(*) filter (where (r.winner_side = a.side) = (a.player_id < b.player_id))::int as lo_wins,
           count(*)::int as played
      into m
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id and pa.status = 'active' and not pa.hidden and not pa.is_minor
      join core.players pb on pb.id = b.player_id and pb.status = 'active' and not pb.hidden and not pb.is_minor
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and (a.player_id in (select player_id from qr_pool) or b.player_id in (select player_id from qr_pool))
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
     group by 1, 2
    having count(*) >= 2
     order by md5(p_seed || least(a.player_id, b.player_id)::text || greatest(a.player_id, b.player_id)::text)
     limit 1;
    if m.lo is null then return null; end if;
    v_ids := case when md5(p_seed || m.lo::text) < md5(p_seed || m.hi::text) then array[m.lo, m.hi] else array[m.hi, m.lo] end;
    v_q := '{p1.o} και {p2.o} έχουν ξαναπαίξει. Ποιος προηγείται;';
    v_opts := jsonb_build_array(jsonb_build_object('label', '{p1}'), jsonb_build_object('label', '{p2}'),
      jsonb_build_object('label', case when (select bool_and(p.gender = 'f') from core.players p where p.id = any (v_ids))
                                       then 'Είναι ισόπαλες' else 'Είναι ισόπαλοι' end));
    if m.lo_wins * 2 = m.played then
      v_right := 2;
      v_reveal := 'Είναι ' || m.lo_wins || '-' || m.lo_wins || '.';
    else
      v_right := case when (m.lo_wins * 2 > m.played) = (v_ids[1] = m.lo) then 0 else 1 end;
      v_reveal := '{p' || (v_right + 1) || '.o} προηγείται ' || greatest(m.lo_wins, m.played - m.lo_wins) || '-' || least(m.lo_wins, m.played - m.lo_wins) || '.';
    end if;

  else -- busy: the most matches this month, a clear first and two with fewer
    with played as (
      select mp.player_id, count(*)::int as n
        from core.matches mx
        join core.match_results r on r.match_id = mx.id and not r.walkover
        join core.match_participants mp on mp.match_id = mx.id
        join qr_pool q on q.player_id = mp.player_id
       where mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
         and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
         and mp.player_id <> all (p_used_players)
       group by 1
    ), leader as (select player_id, n from played order by n desc, md5(p_seed || player_id::text) limit 1),
    others as (select player_id from played where n < (select n from leader) order by md5(p_seed || player_id::text) limit 2)
    select (select player_id from leader), (select n from leader), array(select player_id from others) into v_top, v_n, v_ids;
    if v_top is null or v_n < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;
    v_ids := array(select u from unnest(v_ids || v_top) u order by md5(p_seed || 'b' || u::text));
    v_q := 'Ποιος έπαιξε τα περισσότερα ματς αυτόν τον μήνα;';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
    v_right := array_position(v_ids, v_top) - 1;
    v_reveal := '{p' || (v_right + 1) || '.o}, με ' || v_n || ' ματς.';
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'match_id', v_match, 'right', v_right, 'reveal', v_reveal));
end;
$$;
revoke all on function core.quiz_real(uuid, text, text, date, text, uuid[], uuid[]) from public, anon, authenticated;

-- ── the set ──
create or replace function core.quiz_build_set(p_user uuid, p_day date, p_pro boolean default null)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := coalesce(p_pro, core.is_pro(p_user));
  v_want    int;
  v_real    int;
  v_people  int;
  v_rules   int;
  v_base    text := p_user::text || p_day::text;
  v_cards   jsonb := '[]'::jsonb;
  v_used_t  uuid[] := '{}';
  v_used_p  uuid[] := '{}';
  v_got     int := 0;
  v_kind    text;
  v_kinds   text[] := array['pre', 'post_who', 'post_third', 'score', 'comeback', 'h2h', 'busy', 'month', 'cup', 'who'];
  v_seed    text;
  v_dyn     jsonb;
  v_who     jsonb;
  v_ids     uuid[];
  v_n       int;
  v_players jsonb;
  v_content jsonb;
  v_step    text;
  t         record;
begin
  select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
  if v_set is not null then return v_set; end if;
  select primary_sport into v_sport from core.profiles where user_id = p_user;
  v_sport := coalesce(v_sport, 'tennis');
  v_want := case when v_pro then 12 else 6 end;
  v_real := case when v_pro then 6 else 3 end;
  v_people := case when v_pro then 2 else 1 end;
  v_rules := case when v_pro then 2 else 1 end;

  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro) values (p_user, p_day, v_sport, v_pro)
  on conflict (user_id, quiz_day) do nothing returning id into v_set;
  if v_set is null then
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  if extract(isodow from p_day) = 1 then v_kinds := v_kinds || 'weekly'; end if;

  -- from the real matches: one of a kind, in a different order each day
  foreach v_kind in array array(select k from unnest(v_kinds) k order by md5(v_base || k)) loop
    exit when jsonb_array_length(v_cards) >= v_real;
    v_seed := v_base || v_kind;
    v_dyn := case
      when v_kind in ('score', 'comeback', 'h2h', 'busy') then core.quiz_real(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'month' then core.quiz_month(p_user, v_sport, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'cup' then core.quiz_tournament(p_user, v_sport, 'cup', p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'who' then null
      else core.quiz_dynamic(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t) end;
    if v_kind = 'who' then
      for t in select * from core.quiz_templates where active and trigger = 'static' and family = 'q' order by md5(v_seed || id::text) loop
        v_who := core.quiz_who(p_user, v_sport, t.guardrails ->> 'gender', v_seed, v_used_p);
        continue when v_who is null;
        v_dyn := jsonb_build_object('template_id', t.id, 'family', 'q', 'ids', v_who -> 'ids',
          'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_who ->> 'q', 'clues', v_who -> 'clues',
                                        'options', v_who -> 'options', 'right', (v_who ->> 'right')::int, 'players', v_who -> 'players'));
        exit;
      end loop;
    end if;
    continue when v_dyn is null;
    v_cards := v_cards || jsonb_build_object('t', v_dyn -> 'template_id', 'f', coalesce(v_dyn ->> 'family', 'd'), 'c', v_dyn -> 'content', 'i', v_dyn -> 'ids');
    v_used_t := v_used_t || (v_dyn ->> 'template_id')::uuid;
    v_used_p := v_used_p || array(select jsonb_array_elements_text(v_dyn -> 'ids')::uuid);
  end loop;

  -- then the people you know, the rules, and life on court up to the full set; what you were asked lately waits
  foreach v_step in array array['people', 'rule', 'fill'] loop
    v_got := 0;
    for t in
      select q.* from core.quiz_templates q
       where q.active and q.id <> all (v_used_t)
         and case v_step when 'people' then q.trigger = 'static' and q.family in ('s', 'c')
                         when 'rule' then q.trigger = 'rule'
                         else q.trigger = 'static' and q.family = 'o' end
       order by exists (select 1 from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
                         where s.user_id = p_user and s.quiz_day > p_day - 30 and c.template_id = q.id),
                md5(v_base || v_step || q.id::text)
    loop
      exit when jsonb_array_length(v_cards) >= v_want;
      exit when v_step = 'people' and v_got >= v_people;
      exit when v_step = 'rule' and v_got >= v_rules;
      v_n := coalesce((t.slot_template ->> 'players')::int, 0);
      v_ids := '{}';
      v_players := '[]'::jsonb;
      if v_n > 0 then
        v_ids := array(select x.player_id from core.quiz_pool(p_user, v_sport, t.guardrails ->> 'gender', v_base || t.id::text) x
                        where x.player_id <> all (v_used_p) limit v_n);
        continue when coalesce(array_length(v_ids, 1), 0) < v_n;
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                                  order by array_position(v_ids, p.id)), '[]'::jsonb)
          into v_players from core.players p where p.id = any (v_ids);
      end if;
      v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
                                      'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.option_templates) o),
                                      'players', v_players);
      if t.trigger = 'rule' then
        v_content := v_content || jsonb_build_object('right', (t.slot_template ->> 'right')::int, 'reveal', t.slot_template ->> 'reveal');
      end if;
      v_cards := v_cards || jsonb_build_object('t', t.id, 'f', t.family, 'c', v_content, 'i', to_jsonb(v_ids));
      v_used_t := v_used_t || t.id;
      v_used_p := v_used_p || v_ids;
      v_got := v_got + 1;
    end loop;
  end loop;

  -- no fixed order
  insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids)
  select v_set, row_number() over (order by md5(v_base || 'o' || (c ->> 't'))), (c ->> 't')::uuid, c ->> 'f', c -> 'c',
         array(select jsonb_array_elements_text(c -> 'i')::uuid)
    from jsonb_array_elements(v_cards) c;
  return v_set;
end;
$$;
revoke all on function core.quiz_build_set(uuid, date, boolean) from public;
