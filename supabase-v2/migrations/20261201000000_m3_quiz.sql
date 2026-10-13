-- M3 part 7: «Οι 6 της ημέρας». Every player gets their own six cards a day (twelve with Pro), built on first open
-- after 09:00 Athens from templates with player slots, filled with the players they follow first, then players of
-- their area near their level, then any active player with a level. Never their own player, a minor, a hidden or a
-- merged one, and nobody twice in a set. Families this slice: Σενάριο (s), Διάλεξε έναν (c), Ποιος είναι; (q, built
-- from real facts: area, level, form or hand) and Άποψη (o). The dynamic families (Πριν το ματς, Μετά το
-- αποτέλεσμα, Εβδομαδιαίο), «Ματς που έρχεται» and «Η ώρα της αλήθειας» come later, with the admin review of the
-- 57-card bank. Names reach the client as tokens ({p1.o} «ο Νίκος Ροδίτης», {p1.ton} «τον Νίκο Ροδίτη»,
-- {p1.ston} «στον Νίκο Ροδίτη», {p1} the plain name, {p1.first}, {p1.o_first}) so packages/copy does the grammar.
--
-- An answer is a vote (subject_type 'card', option = index + 1): it counts for quests, badges, the active day, the
-- ladder and leagues like any vote, and never for σερί or freezes. The sixth answer of the day pays +30 once
-- (core quizCompletionPoints with 6 required, Pro too: Pro adds cards, not points). Splits show only where they mean
-- something: at least 5 answers on the same template with the same players.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table core.quiz_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  quiz_day    date not null,
  sport_id    text not null references core.sports (id),
  pro         boolean not null default false,
  awarded_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, quiz_day)
);

create table core.quiz_set_cards (
  id           uuid primary key default gen_random_uuid(),
  set_id       uuid not null references core.quiz_sets (id) on delete cascade,
  position     int not null check (position >= 1),
  template_id  uuid references core.quiz_templates (id),
  family       text not null check (family in ('s', 'c', 'q', 'o')),
  content      jsonb not null,             -- tag, q, options [{label}], clues, right, players [{id, first_name, surname, gender}]
  player_ids   uuid[] not null default '{}',
  unique (set_id, position)
);
create index quiz_set_cards_template_idx on core.quiz_set_cards (template_id);

alter table core.quiz_sets enable row level security;
alter table core.quiz_set_cards enable row level security;
create policy quiz_sets_own on core.quiz_sets for select to authenticated using (user_id = auth.uid());
create policy quiz_set_cards_own on core.quiz_set_cards for select to authenticated
  using (exists (select 1 from core.quiz_sets s where s.id = set_id and s.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Templates: the prototype's cards with their names replaced by slots
-- slot_template: {tag, q, players}; option_templates: [label, ...]; guardrails: {gender: m|f}
-- ---------------------------------------------------------------------------
insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails) values
-- Σενάριο
('s', 'static', '{"tag": "Σενάριο", "q": "Κλειστό ματς, τρίτο σετ, 4-4. Ποιος θα το κλείσει;", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "{p1.o} προηγείται 5-2 στο τρίτο σετ. Μπορεί {p2.o} να το γυρίσει;", "players": 2}', '["Ναι, το γυρίζει", "Όχι, τελείωσε"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "{p1.o} σερβίρει για το ματς στο 5-4 απέναντι {p2.ston}. Το κλείνει;", "players": 2}', '["Το κλείνει", "Της το παίρνει {p2.o_first}"]', '{"gender": "f"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Tie-break στο 6-6. Ποιος θα μείνει ψύχραιμος, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Δεύτερο σετ, 3-0 μπροστά {p1.o}. Μπορεί {p2.o} να γυρίσει το ματς;", "players": 2}', '["Ναι, γίνεται", "Όχι, το έχει {p1.o_first}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Χώμα. Ποιος κερδίζει, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Σκληρό γήπεδο. Ποιος είναι πιο επικίνδυνος, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Τρίτο σετ στο τέλος. Ποια κρατάει την ψυχραιμία της, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "f"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Ματς στις 8 το πρωί. Ποιος είναι πιο ξύπνιος, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο", "q": "Χώμα. Ποια είναι πιο δύσκολη, {p1.o} ή {p2.o};", "players": 2}', '["{p1}", "{p2}"]', '{"gender": "f"}'),
('s', 'static', '{"tag": "Σενάριο · διπλό", "q": "Διπλό. Ποιο ζευγάρι δένει καλύτερα, {p1} και {p2} ή {p3} και {p4};", "players": 4}', '["{p1.first} & {p2.first}", "{p3.first} & {p4.first}"]', '{"gender": "m"}'),
('s', 'static', '{"tag": "Σενάριο · διπλό", "q": "Διπλό γυναικών. Ποιο ζευγάρι δένει καλύτερα, {p1} και {p2} ή {p3} και {p4};", "players": 4}', '["{p1.first} & {p2.first}", "{p3.first} & {p4.first}"]', '{"gender": "f"}'),
-- Διάλεξε έναν
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Σερβίρεις για το ματς. Ποιον δεν θες απέναντι;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Δύσκολο διπλό. Ποιον θες δίπλα σου;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποιος έχει το πιο δυνατό σερβίς;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποιος δεν τα παρατάει ποτέ;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποια δεν χάνει ποτέ την ψυχραιμία της;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "f"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποια θες συμπαίκτρια στο μικτό;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "f"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποιος παίζει καλύτερα στο φιλέ;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποιος είναι ο βασιλιάς του χώματος;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Ποια τρέχει σε όλες τις μπάλες;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "f"}'),
('c', 'static', '{"tag": "Διάλεξε έναν", "q": "Tie-break στο 6-6. Ποιον δεν θες απέναντι;", "players": 4}', '["{p1}", "{p2}", "{p3}", "{p4}"]', '{"gender": "m"}'),
-- Ποιος είναι; (clues and the answer come from the facts, see core.quiz_who)
('q', 'static', '{"tag": "Ποιος είναι;", "players": 3}', '[]', '{"gender": "m"}'),
('q', 'static', '{"tag": "Ποια είναι;", "players": 3}', '[]', '{"gender": "f"}'),
-- Άποψη (no right or wrong, the same card for everyone)
('o', 'static', '{"tag": "Άποψη", "q": "Μια καλή λόμπα κερδίζει ένα καλό smash.", "players": 0}', '["Συμφωνώ", "Με τίποτα"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Στο διπλό, η καλή συνεννόηση κερδίζει το καλό βολέ.", "players": 0}', '["Συμφωνώ", "Με τίποτα"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Στο tie-break κερδίζει όποιος κάνει λιγότερα λάθη.", "players": 0}', '["Συμφωνώ", "Με τίποτα, κερδίζει όποιος τολμάει"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Το μικτό είναι το πιο διασκεδαστικό ματς.", "players": 0}', '["Συμφωνώ", "Προτιμώ το μονό"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Το πρωινό ματς είναι πάντα καλύτερο από το βραδινό.", "players": 0}', '["Συμφωνώ", "Με τίποτα"]', '{}'),
('o', 'static', '{"tag": "Άποψη", "q": "Το δεύτερο σερβίς δείχνει τον παίκτη.", "players": 0}', '["Συμφωνώ", "Με τίποτα"]', '{}');

-- ---------------------------------------------------------------------------
-- Building a set
-- ---------------------------------------------------------------------------
-- who can be on my cards, best first: players I follow, then my area near my level, then any active levelled player
create or replace function core.quiz_pool(p_user uuid, p_sport text, p_gender text, p_seed text)
returns table (player_id uuid, first_name text, surname text, gender text, area_id text, level_tier numeric,
               level_direction text, hand text, form jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select p.id, p.area_id, ps.level_tier
      from core.players p left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
     where p.claimed_by_user_id = p_user
  ),
  ok as (
    select p.id, p.first_name, p.surname, p.gender, p.area_id, ps.level_tier, ps.level_direction, ps.hand, ps.form,
           case when exists (select 1 from core.follows f where f.user_id = p_user and f.player_id = p.id) then 0
                when p.area_id = (select area_id from me) and abs(coalesce(ps.level_tier, 0) - coalesce((select level_tier from me), 0)) <= 0.5 then 1
                when ps.level_tier is not null then 2
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

-- «Ποιος είναι;»: the answer and two others of the same gender, with up to three clues from the facts
create or replace function core.quiz_who(p_user uuid, p_sport text, p_gender text, p_seed text, p_used uuid[])
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_right record;
  v_lvl   text;
  v_clues jsonb := '[]'::jsonb;
  v_wins  int;
  v_n     int;
  v_opts  jsonb;
  v_ids   uuid[];
begin
  select * into v_right from core.quiz_pool(p_user, p_sport, p_gender, p_seed) x
   where x.player_id <> all (p_used) and x.area_id is not null and x.level_tier is not null limit 1;
  if v_right.player_id is null then return null; end if;

  v_ids := array(select x.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed || 'd') x
                  where x.player_id <> all (p_used) and x.player_id <> v_right.player_id
                    and (x.area_id is distinct from v_right.area_id or x.level_tier is distinct from v_right.level_tier)
                  limit 2);
  if coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;

  v_clues := v_clues || to_jsonb((select name_el from core.areas where id = v_right.area_id));
  v_lvl := 'level ' || case when v_right.level_tier = trunc(v_right.level_tier) then trunc(v_right.level_tier)::int::text
                            else replace(v_right.level_tier::text, '.', ',') end;
  v_clues := v_clues || to_jsonb(v_lvl || case v_right.level_direction
               when 'up' then ' και ανεβαίνει'
               when 'down' then ''
               else case when v_right.gender = 'f' then ' και σταθερή' else ' και σταθερός' end end);
  v_n := jsonb_array_length(coalesce(v_right.form, '[]'::jsonb));
  if v_n >= 3 then
    select count(*) into v_wins from jsonb_array_elements_text(v_right.form) r where r = 'W';
    v_clues := v_clues || to_jsonb(v_wins || case when v_wins = 1 then ' νίκη στα ' else ' νίκες στα ' end || v_n || ' τελευταία');
  elsif v_right.hand = 'L' then
    v_clues := v_clues || to_jsonb(case when v_right.gender = 'f' then 'Αριστερόχειρη' else 'Αριστερόχειρας' end);
  end if;

  v_ids := array(select u from unnest(v_ids || v_right.player_id) u order by md5(p_seed || 'o' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_opts from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'q', (case jsonb_array_length(v_clues) when 3 then 'Τρία' else 'Δύο' end) || ' στοιχεία, '
         || case when p_gender = 'f' then 'μία παίκτρια.' else 'ένας παίκτης.' end,
    'clues', v_clues,
    'players', v_opts,
    'options', (select jsonb_agg(jsonb_build_object('label', '{p' || i || '}')) from generate_series(1, 3) i),
    'right', array_position(v_ids, v_right.player_id) - 1,
    'ids', to_jsonb(v_ids));
end;
$$;

-- today's set for a player, built once (six; twelve with Pro), in the order Σενάριο, Διάλεξε έναν, Ποιος είναι;,
-- Άποψη, Σενάριο, Διάλεξε έναν; a family that cannot be filled falls back to Άποψη
create or replace function core.quiz_build_set(p_user uuid, p_day date)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := core.is_pro(p_user);
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

  foreach v_fam in array v_pattern loop
    v_pos := v_pos + 1;
    v_done := false;
    v_seed := p_user::text || p_day::text || v_pos;
    for t in
      select * from core.quiz_templates
       where active and family in (v_fam, 'o') and id <> all (v_used_t)
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
revoke all on function core.quiz_build_set(uuid, date) from public;

-- the split for a card: only from at least 5 answers on the same template with the same players
create or replace function core.quiz_split(p_card uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select template_id, player_ids, jsonb_array_length(content -> 'options') as n from core.quiz_set_cards where id = p_card),
  same as (
    select c.id from core.quiz_set_cards c, me
     where c.template_id = me.template_id
       and (select array_agg(x order by x) from unnest(c.player_ids) x) is not distinct from (select array_agg(x order by x) from unnest(me.player_ids) x)
  ),
  v as (select v.option from core.votes v where v.subject_type = 'card' and v.subject_id in (select id from same))
  select case when (select count(*) from v) < 5 then null
              else (select jsonb_agg(round(100.0 * (select count(*) from v where option = i) / (select count(*) from v))::int order by i)
                      from generate_series(1, (select n from me)) i) end
$$;

-- ---------------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------------
create or replace function api.get_quiz()
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := core.quiz_day_key(now());
  v_set  uuid;
  s      core.quiz_sets;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_set := core.quiz_build_set(v_uid, v_day);
  select * into s from core.quiz_sets where id = v_set;
  return jsonb_build_object(
    'quiz_day', v_day,
    'required', 6,
    'pro', s.pro,
    'awarded', s.awarded_at is not null,
    'next_at', ((v_day + 1)::timestamp + interval '9 hours') at time zone 'Europe/Athens',
    'answered', (select count(*) from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                  where v.user_id = v_uid and v.subject_type = 'card' and c.set_id = v_set),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'position', c.position, 'family', c.family, 'content', c.content,
               'my_option', v.option,
               'split', case when v.option is not null then core.quiz_split(c.id) end) order by c.position)
        from core.quiz_set_cards c
        left join core.votes v on v.user_id = v_uid and v.subject_type = 'card' and v.subject_id = c.id
       where c.set_id = v_set), '[]'::jsonb));
end;
$$;
revoke all on function api.get_quiz() from public, anon;
grant execute on function api.get_quiz() to authenticated, service_role;

-- one answer per card; the sixth answer of the day pays +30 once
create or replace function api.answer_card(p_card uuid, p_option int, p_client_event_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_today    date := core.athens_day();
  c          core.quiz_set_cards;
  s          core.quiz_sets;
  v_today_n  int;
  v_answered int;
  v_parts    jsonb;
  v_awarded  int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from core.quiz_set_cards where id = p_card;
  select * into s from core.quiz_sets where id = c.set_id;
  if c.id is null or s.user_id <> v_uid then raise exception 'not_found' using errcode = 'P0002'; end if;
  if s.quiz_day <> core.quiz_day_key(now()) then raise exception 'card_expired' using errcode = '55000'; end if;
  if p_option is null or p_option < 1 or p_option > jsonb_array_length(c.content -> 'options') then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  if exists (select 1 from core.votes where user_id = v_uid and subject_type = 'card' and subject_id = p_card) then
    raise exception 'already_answered' using errcode = '23505';
  end if;

  insert into core.votes (user_id, subject_type, subject_id, option, client_event_id, day_key)
  values (v_uid, 'card', p_card, p_option::smallint, p_client_event_id, v_today);

  -- a card counts like a vote for the counters (never for σερί or freezes: no record_vote_cast)
  perform core.ensure_game_state(v_uid);
  select count(*) into v_today_n from core.votes where user_id = v_uid and day_key = v_today;
  update core.user_game_state
     set votes_cast = votes_cast + 1,
         active_days = active_days + case when v_today_n = 3 then 1 else 0 end,
         last_active_day = case when v_today_n >= 3 then v_today else last_active_day end,
         version = version + 1, updated_at = now()
   where user_id = v_uid;

  select count(*) into v_answered from core.votes v join core.quiz_set_cards x on x.id = v.subject_id
   where v.user_id = v_uid and v.subject_type = 'card' and x.set_id = s.id;
  v_parts := core.quiz_completion_points(v_answered, 6, s.awarded_at is not null, core.sport_rules(s.sport_id));
  if jsonb_array_length(v_parts) > 0 then
    v_awarded := core.award_points(v_uid, (v_parts -> 0 ->> 'delta')::int, 'daily_quiz', 'quiz_day', s.id,
                                   'quiz:' || v_uid || ':' || s.quiz_day);
    update core.quiz_sets set awarded_at = now() where id = s.id;
  end if;

  return jsonb_build_object('option', p_option, 'right', c.content -> 'right', 'split', core.quiz_split(p_card),
                            'answered', v_answered, 'awarded', v_awarded);
end;
$$;
revoke all on function api.answer_card(uuid, int, uuid) from public, anon;
grant execute on function api.answer_card(uuid, int, uuid) to authenticated, service_role;
