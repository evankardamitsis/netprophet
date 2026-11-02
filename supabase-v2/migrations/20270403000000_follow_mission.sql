-- «Ακολούθησε 10 παίκτες» (founder, 2 Nov 2026: get people to follow the players they know, so the app becomes their
-- circle). A one-off quest, shown on every player card until it is done. Progress is how many players you follow now
-- (the new trigger mode `count`), so an unfollow and a follow again never count twice. The reward is the frame Παρέα
-- (frame_friends, renamed from Φίλοι and switched back on: nothing could give it while invites wait), else +1 on
-- Ινφλουένσερ. Never points. Everyone who follows players today gets their count now; 10 or more finish it at once.

-- the frame comes back as Παρέα, with its new way in
update core.cosmetic_items
   set active = true, name_el = 'Παρέα', name_en = 'Crew',
       earn_rule_text = 'Το κερδίζεις όταν ακολουθήσεις 10 παίκτες'
 where key = 'frame_friends';

insert into core.quest_defs (key, period, target, counter, triggers, reward, title_el, title_en, active, sort) values
('follow_10_players', 'once', 10, 'follows',
   '[{"event": "players_followed", "mode": "count"}]',
   '{"cosmeticIds": ["frame_friends"], "badgeId": "influencer", "badgeAmount": 1}',
   'Ακολούθησε 10 παίκτες', 'Follow 10 players', true, 7)
on conflict (key) do nothing;

-- quest_apply as before, plus `count`: progress becomes max(progress, the event's value) (packages/core applyQuestEvent)
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
    elsif v_trig ->> 'mode' = 'count' then
      v_cur := greatest(v_cur, coalesce((p_event ->> 'value')::int, 0));
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

-- quest_event takes the value a `count` trigger needs; the three-argument calls stay as they are
drop function core.quest_event(uuid, text, timestamptz);
create function core.quest_event(p_user uuid, p_type text, p_at timestamptz default now(), p_value int default null)
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
  v_res := core.quest_apply(core.quest_defs_json(), v_stored,
                            jsonb_strip_nulls(jsonb_build_object('type', p_type, 'at', p_at, 'value', p_value)));

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
revoke all on function core.quest_event(uuid, text, timestamptz, int) from public;

-- a follow (from a card, onboarding or the quiz): count how many players you follow now
create or replace function core.quest_on_follow()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.quest_event(new.user_id, 'players_followed', now(),
                           (select count(*)::int from core.follows f where f.user_id = new.user_id));
  return null;
end;
$$;
create trigger quest_on_follow after insert on core.follows for each row execute function core.quest_on_follow();

-- the quests sheet as before, plus `once`: the one-off quests that are on (the player card reads it)
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
             'weekly', coalesce(jsonb_agg(q.row order by q.sort) filter (where q.period = 'weekly'), '[]'::jsonb),
             'once',   coalesce(jsonb_agg(q.row order by q.sort) filter (where q.period = 'once'), '[]'::jsonb))
      from (select d.period, d.sort,
                   jsonb_build_object('key', d.key, 'target', d.target, 'progress', coalesce(p.progress, 0),
                                      'done', p.done_at is not null,
                                      'reward', coalesce(p.reward, core.quest_next_reward(v_uid, d.reward))) as row
              from core.quest_defs d
              left join core.user_quest_progress p
                on p.user_id = v_uid and p.quest_key = d.key and p.period_key = core.quest_window_key(d.period, now())
             where d.active and d.period in ('daily', 'weekly', 'once')) q);
end;
$$;
revoke all on function api.get_quests() from public, anon;
grant execute on function api.get_quests() to authenticated, service_role;

-- everyone who follows players already: their count now (10 or more finish it, with the frame and the celebration)
do $$
declare
  r record;
begin
  for r in select user_id, count(*)::int as n from core.follows group by user_id loop
    perform core.quest_event(r.user_id, 'players_followed', now(), r.n);
  end loop;
end;
$$;
