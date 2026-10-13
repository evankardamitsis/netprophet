-- M3 part 3: Αποστολές. Three daily quests and two weekly ones (prototype gmQdefs), counted from what the player
-- does: votes, kudos, matches they log. The math is core.quest_apply, a copy of applyQuestEvent in
-- packages/core/src/rules/quests.ts, checked against the same vectors. A finished quest gives the first frame or
-- background the player does not own yet, else a badge bonus (never points), and queues a celebration.
-- The friend quest stays inactive until invites exist.

-- ---------------------------------------------------------------------------
-- The rewards
-- ---------------------------------------------------------------------------
insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('background', 'bg_night',      'Βραδινό ματς',     'Night match',  'earned', null, 'Το κερδίζεις με μια αποστολή'),
('background', 'bg_clay',       'Χωμάτινο γήπεδο',  'Clay court',   'earned', null, 'Το κερδίζεις με μια αποστολή'),
('background', 'bg_grass',      'Γρασίδι',          'Grass',        'earned', null, 'Το κερδίζεις με μια αποστολή'),
('frame',      'frame_week',    'Της εβδομάδας',    'Of the week',  'earned', null, 'Το κερδίζεις με μια αποστολή'),
('frame',      'frame_friends', 'Φίλοι',            'Friends',      'earned', null, 'Το κερδίζεις με έναν φίλο που έφερες')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- The quests, the same as packages/core (ids, targets, triggers, rewards)
-- ---------------------------------------------------------------------------
alter table core.quest_defs add column triggers jsonb not null default '[]'::jsonb;
alter table core.user_quest_progress
  add column days   text[] not null default '{}',   -- Athens days already counted (distinct_day quests)
  add column reward jsonb;                           -- what it gave: {kind: cosmetic, key, category} or {kind: badge, key, amount}

delete from core.user_quest_progress;   -- nothing was ever counted against the placeholder quests
delete from core.quest_defs;
insert into core.quest_defs (key, period, target, counter, triggers, reward, title_el, title_en, active, sort) values
('daily_vote_3_cards',   'daily',  3, 'vote_card',
   '[{"event": "vote_card", "mode": "inc"}]',
   '{"cosmeticIds": [], "badgeId": "many_votes", "badgeAmount": 5}',
   'Ψήφισε 3 κάρτες', 'Vote on 3 cards', true, 1),
('daily_kudos_1',        'daily',  1, 'kudos_given',
   '[{"event": "kudos_given", "mode": "inc"}]',
   '{"cosmeticIds": [], "badgeId": "gentleman", "badgeAmount": 1}',
   'Δώσε ένα μπράβο', 'Give a kudos', true, 2),
('daily_vote_2_matches', 'daily',  2, 'vote_match',
   '[{"event": "vote_match", "mode": "inc"}]',
   '{"cosmeticIds": ["bg_night", "bg_clay"], "badgeId": "many_votes", "badgeAmount": 3}',
   'Ψήφισε σε 2 ματς', 'Vote on 2 matches', true, 3),
('weekly_log_2_matches', 'weekly', 2, 'match_logged',
   '[{"event": "match_logged", "mode": "inc"}]',
   '{"cosmeticIds": ["frame_week"], "badgeId": "first_serve", "badgeAmount": 1}',
   'Πέρνα 2 αγώνες σου', 'Log 2 of your matches', true, 4),
('weekly_vote_5_days',   'weekly', 5, 'active_day',
   '[{"event": "active_day", "mode": "distinct_day"}]',
   '{"cosmeticIds": ["bg_grass"], "badgeId": "many_votes", "badgeAmount": 5}',
   'Ψήφισε 5 μέρες την εβδομάδα', 'Vote on 5 days this week', true, 5),
('invite_friend',        'once',   2, 'friend',
   '[{"event": "friend_invited", "mode": "at_least", "value": 1}, {"event": "friend_activated", "mode": "at_least", "value": 2}]',
   '{"cosmeticIds": ["frame_friends"], "badgeId": "influencer", "badgeAmount": 1}',
   'Φέρε έναν φίλο', 'Bring a friend', false, 6);

-- ---------------------------------------------------------------------------
-- The rule (parity with packages/core: windowKeyFor, applyQuestEvent)
-- ---------------------------------------------------------------------------

-- daily: the Athens date; weekly: the Monday of the Athens week; lifetime: 'all'
create or replace function core.quest_window_key(p_window text, p_at timestamptz)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select case p_window
           when 'daily'  then core.athens_day(p_at)::text
           when 'weekly' then (core.athens_day(p_at) - (extract(isodow from core.athens_day(p_at))::int - 1))::text
           else 'all'
         end
$$;

-- defs: [{id, window, target, triggers}], stored: [QuestProgress], event: {type, at} → {progress, steps, completed}
create or replace function core.quest_apply(p_defs jsonb, p_stored jsonb, p_event jsonb)
returns jsonb
language plpgsql immutable set search_path = core, pg_temp
as $$
declare
  v_at        timestamptz := (p_event ->> 'at')::timestamptz;
  v_type      text := p_event ->> 'type';
  v_def       jsonb;
  v_old       jsonb;
  v_prog      jsonb;
  v_trig      jsonb;
  v_key       text;
  v_cur       int;
  v_days      jsonb;
  v_day       text;
  v_target    int;
  v_done      boolean;
  v_progress  jsonb := '[]'::jsonb;
  v_steps     jsonb := '[]'::jsonb;
  v_completed jsonb := '[]'::jsonb;
begin
  for v_def in select value from jsonb_array_elements(p_defs) loop
    select value into v_old from jsonb_array_elements(p_stored) where value ->> 'questId' = v_def ->> 'id' limit 1;
    v_key := core.quest_window_key(v_def ->> 'window', v_at);
    if v_old is not null and (v_old ->> 'windowKey') collate "C" > v_key collate "C" then
      v_progress := v_progress || jsonb_build_array(v_old);   -- a late event from an older window: ignore
      continue;
    end if;
    v_prog := case when v_old is not null and v_old ->> 'windowKey' = v_key then v_old
                   else jsonb_build_object('questId', v_def ->> 'id', 'windowKey', v_key, 'current', 0, 'days', '[]'::jsonb,
                                           'doneAt', null, 'rewardGranted', false) end;
    select value into v_trig from jsonb_array_elements(v_def -> 'triggers') where value ->> 'event' = v_type limit 1;
    if v_trig is null or v_prog ->> 'doneAt' is not null then
      v_progress := v_progress || jsonb_build_array(v_prog);
      continue;
    end if;
    v_cur := (v_prog ->> 'current')::int;
    v_days := v_prog -> 'days';
    if v_trig ->> 'mode' = 'inc' then
      v_cur := v_cur + 1;
    elsif v_trig ->> 'mode' = 'distinct_day' then
      v_day := core.athens_day(v_at)::text;
      if not v_days ? v_day then
        v_days := v_days || to_jsonb(v_day);
        v_cur := v_cur + 1;
      end if;
    else
      v_cur := greatest(v_cur, coalesce((v_trig ->> 'value')::int, 0));
    end if;
    v_target := (v_def ->> 'target')::int;
    v_cur := least(v_cur, v_target);
    if v_cur = (v_prog ->> 'current')::int then
      v_progress := v_progress || jsonb_build_array(v_prog);
      continue;
    end if;
    v_done := v_cur >= v_target;
    v_progress := v_progress || jsonb_build_array(v_prog || jsonb_build_object(
      'current', v_cur, 'days', v_days, 'doneAt', case when v_done then p_event -> 'at' else 'null'::jsonb end));
    v_steps := v_steps || jsonb_build_array(jsonb_build_object(
      'questId', v_def ->> 'id', 'from', (v_prog ->> 'current')::int, 'to', v_cur, 'target', v_target));
    if v_done then v_completed := v_completed || to_jsonb(v_def ->> 'id'); end if;
  end loop;
  return jsonb_build_object('progress', v_progress, 'steps', v_steps, 'completed', v_completed);
end;
$$;

-- the quest table in the packages/core shape (active ones only, unless p_all)
create or replace function core.quest_defs_json(p_all boolean default false)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', key, 'window', case period when 'once' then 'lifetime' else period end,
                                               'target', target, 'triggers', triggers, 'reward', reward) order by sort), '[]'::jsonb)
    from core.quest_defs where active or p_all
$$;

-- what a quest would give this player now: the first cosmetic they do not own, else the badge bonus (resolveQuestReward)
create or replace function core.quest_next_reward(p_user uuid, p_reward jsonb)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(
    (select jsonb_build_object('kind', 'cosmetic', 'key', c.key, 'category', c.category)
       from jsonb_array_elements_text(p_reward -> 'cosmeticIds') with ordinality k(key, n)
       join core.cosmetic_items c on c.key = k.key
      where not exists (select 1 from core.user_cosmetics u where u.user_id = p_user and u.item_id = c.id)
      order by k.n limit 1),
    jsonb_build_object('kind', 'badge', 'key', p_reward ->> 'badgeId', 'amount', (p_reward ->> 'badgeAmount')::int))
$$;

-- give a finished quest its reward once, and queue its celebration
create or replace function core.quest_grant(p_user uuid, p_key text, p_period text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_reward jsonb;
  v_n      int;
begin
  update core.user_quest_progress set reward_granted_at = now()
   where user_id = p_user and quest_key = p_key and period_key = p_period
     and done_at is not null and reward_granted_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;

  v_reward := core.quest_next_reward(p_user, (select reward from core.quest_defs where key = p_key));
  if v_reward ->> 'kind' = 'cosmetic' then
    insert into core.user_cosmetics (user_id, item_id, source)
    select p_user, id, 'earned' from core.cosmetic_items where key = v_reward ->> 'key'
    on conflict do nothing;
  end if;
  -- a badge bonus is kept here; badges add it to their counter
  update core.user_quest_progress set reward = v_reward
   where user_id = p_user and quest_key = p_key and period_key = p_period;
  insert into core.feed_inbox (user_id, kind, ref, payload)
  values (p_user, 'celebration', 'quest:' || p_key || ':' || p_period,
          jsonb_build_object('type', 'quest', 'quest', p_key, 'period', p_period, 'reward', v_reward))
  on conflict (user_id, kind, ref) do nothing;
  return v_reward;
end;
$$;

-- one thing the player did: count it on every quest it touches, store the steps, reward what finished
create or replace function core.quest_event(p_user uuid, p_type text, p_at timestamptz default now())
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_stored jsonb;
  v_res    jsonb;
  v_step   jsonb;
  v_p      jsonb;
  v_key    text;
begin
  perform pg_advisory_xact_lock(hashtext('quests:' || p_user::text));
  -- the newest stored window of each quest
  select coalesce(jsonb_agg(jsonb_build_object('questId', quest_key, 'windowKey', period_key, 'current', progress,
                                               'days', to_jsonb(days), 'doneAt', done_at,
                                               'rewardGranted', reward_granted_at is not null)), '[]'::jsonb)
    into v_stored
    from (select distinct on (quest_key) * from core.user_quest_progress
           where user_id = p_user order by quest_key, period_key collate "C" desc) x;
  v_res := core.quest_apply(core.quest_defs_json(), v_stored, jsonb_build_object('type', p_type, 'at', p_at));

  for v_step in select value from jsonb_array_elements(v_res -> 'steps') loop
    select value into v_p from jsonb_array_elements(v_res -> 'progress') where value ->> 'questId' = v_step ->> 'questId';
    insert into core.user_quest_progress (user_id, quest_key, period_key, progress, days, done_at)
    values (p_user, v_p ->> 'questId', v_p ->> 'windowKey', (v_p ->> 'current')::int,
            array(select jsonb_array_elements_text(v_p -> 'days')), (v_p ->> 'doneAt')::timestamptz)
    on conflict (user_id, quest_key, period_key)
      do update set progress = excluded.progress, days = excluded.days, done_at = excluded.done_at;
  end loop;

  for v_key in select jsonb_array_elements_text(v_res -> 'completed') loop
    perform core.quest_grant(p_user, v_key,
      (select value ->> 'windowKey' from jsonb_array_elements(v_res -> 'progress') where value ->> 'questId' = v_key));
  end loop;
  return v_res;
end;
$$;
revoke all on function core.quest_event(uuid, text, timestamptz) from public;
revoke all on function core.quest_grant(uuid, text, text) from public;

-- ---------------------------------------------------------------------------
-- What counts: a vote (a card, a match, a day), a kudos given, a match the player logs
-- ---------------------------------------------------------------------------
create or replace function core.quest_on_vote()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.quest_event(new.user_id, 'vote_card', new.created_at);
  if new.subject_type = 'match' then perform core.quest_event(new.user_id, 'vote_match', new.created_at); end if;
  perform core.quest_event(new.user_id, 'active_day', new.created_at);
  return null;
end;
$$;
create trigger quest_on_vote after insert on core.votes for each row execute function core.quest_on_vote();

create or replace function core.quest_on_kudo()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.quest_event(new.from_user_id, 'kudos_given', new.created_at);
  return null;
end;
$$;
create trigger quest_on_kudo after insert on core.kudos for each row execute function core.quest_on_kudo();

create or replace function core.quest_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.source = 'user' and new.logged_by is not null then
    perform core.quest_event(new.logged_by, 'match_logged', new.created_at);
  end if;
  return null;
end;
$$;
create trigger quest_on_match after insert on core.matches for each row execute function core.quest_on_match();

-- ---------------------------------------------------------------------------
-- The sheet: today's three and this week's two, with progress and the reward they would give now
-- ---------------------------------------------------------------------------
create or replace function api.get_quests()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return (
    select jsonb_build_object(
             'daily',  coalesce(jsonb_agg(q.row order by q.sort) filter (where q.period = 'daily'), '[]'::jsonb),
             'weekly', coalesce(jsonb_agg(q.row order by q.sort) filter (where q.period = 'weekly'), '[]'::jsonb))
      from (select d.period, d.sort,
                   jsonb_build_object('key', d.key, 'target', d.target, 'progress', coalesce(p.progress, 0),
                                      'done', p.done_at is not null,
                                      'reward', coalesce(p.reward, core.quest_next_reward(v_uid, d.reward))) as row
              from core.quest_defs d
              left join core.user_quest_progress p
                on p.user_id = v_uid and p.quest_key = d.key and p.period_key = core.quest_window_key(d.period, now())
             where d.active and d.period in ('daily', 'weekly')) q);
end;
$$;
revoke all on function api.get_quests() from public, anon;
grant execute on function api.get_quests() to authenticated, service_role;
