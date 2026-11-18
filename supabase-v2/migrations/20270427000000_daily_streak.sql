-- The daily σερί (founder, 18 Nov 2026; board https://claude.ai/artifact/UMnb4DKqEJ1YVYCFFqxwCn). One number, the σερί,
-- now counts the days in a row played, Duolingo style. Everything here waits behind a switch,
-- core.game_settings.daily_streak, which stays false until the founder turns it on with app 1.0.1 (one admin action:
-- api.admin_daily_streak(true) from the admin's Game page, which also computes everyone's starting σερί). While it is
-- off nothing changes: the σερί counts correct calls in a row as before, every job returns at once, no push or email
-- goes out, and the new correct-calls columns only mirror the old numbers.
--
-- With the switch on (packages/core rules/dailyStreak.ts, vectors test-vectors/daily-streak.json, pgTAP 182 and 183):
--   * a day counts with one match vote or the day's quiz finished (every card of the set answered), on the Athens day
--     of that action. +1 at once (a trigger on core.votes), not at result time. A wrong vote never breaks it.
--   * only a fully missed day breaks it. An Ασφάλεια covers one missed day by itself (free first, then paid): the
--     hourly core.day_streak_nightly closes yesterday just after Athens midnight, and any read or action closes it
--     too if the job is late (api.get_me, the vote trigger), with the same rule and the same rows.
--   * max 2 freezes, the ones people own carry over, a free one at day 3 and on every 7th day (only into a free
--     slot), the paid one stays as it is.
--   * milestones 3, 7, 10, 30, 50, 100 days. Frame «Επτά» (7) and «Δέκα» (10) move here from the correct calls, and
--     the new Frames «Μήνας» (30) and «Εκατό» (100) join the catalogue (inactive until the switch, so build 39 never
--     lists them while off). Whoever already has «Επτά» or «Δέκα» keeps them.
--   * the correct calls in a row stay: core.user_game_state.chain feeds the +5 bonus exactly as before (points.ts),
--     and calls_streak / calls_best keep the old current/best. Badge «Στη σειρά» and the unlock steps that read
--     bestStreak keep counting correct calls, so nobody's badge or unlock progress moves.
--   * pushes (core.notification_texts, editable, the personal push cap of 3 a day and its quiet hours; switch
--     notification_prefs.streak_reminder, on by default, for all three): 20:00 «Το σερί σου κινδυνεύει» to whoever has
--     a σερί and has not played today, never after 22:00; 09:00 «Η Ασφάλεια έσωσε το σερί σου» or «Το σερί σου
--     έσπασε στις {n}» about yesterday.
--   * emails (group 'game', the email system's switch, allow-list, weekly cap and gate): streak_lost (only when the
--     lost σερί was 7+, 10:00 the day after the missed day), streak_milestone (30 and 100), streak_reminder_email (the
--     20:00 reminder to people without a device, same texts as the push), and a σερί line in the Monday email.
--
-- Build 39 with the switch on: the top bar, Εγώ and the result cards read `streak`, which is the days now. A correct
-- call's card says «+N · σερί {days}» and a wrong one says «κράτησες το σερί» (streak_event kind 'frozen' with
-- kept: true, no freeze spent), which is what happened: a wrong call keeps the σερί. New frame keys are never put
-- in reward.frame (build 39 would print the raw key); they go in reward.frame_key, which 1.0.1 reads.

-- ── 1. the switch ─────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists core.game_settings (
  id               boolean primary key default true check (id),
  daily_streak     boolean not null default false,
  daily_streak_at  timestamptz,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null
);
insert into core.game_settings (id) values (true) on conflict (id) do nothing;
alter table core.game_settings enable row level security;
revoke all on core.game_settings from public, anon, authenticated;
comment on table core.game_settings is 'Game switches. daily_streak: the σερί counts days in a row (20270427000000_daily_streak). Server only.';

create or replace function core.daily_streak_on()
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$ select coalesce((select daily_streak from core.game_settings where id), false) $$;
revoke all on function core.daily_streak_on() from public, anon, authenticated;

-- ── 2. the tables ─────────────────────────────────────────────────────────────────────────────────────────────────
-- the correct calls in a row (the old σερί): kept in both modes, equal to streak / streak_best while the switch is off
alter table core.user_game_state add column if not exists calls_streak int not null default 0 check (calls_streak >= 0);
alter table core.user_game_state add column if not exists calls_best int not null default 0 check (calls_best >= 0);
-- the daily σερί: the last day played and the last day kept (played or covered by a freeze), Athens days
alter table core.user_game_state add column if not exists day_last date;
alter table core.user_game_state add column if not exists day_through date;
update core.user_game_state set calls_streak = streak, calls_best = streak_best
 where calls_streak <> streak or calls_best <> streak_best;

-- a freeze is now also spent on a day, not only on a vote
alter table core.freezes add column if not exists used_on_day date;
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'core.freezes'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%used_on_vote_id%'
  loop
    execute format('alter table core.freezes drop constraint %I', c);
  end loop;
end;
$$;
alter table core.freezes add constraint freezes_used_check
  check ((used_at is null) = (used_on_vote_id is null and used_on_day is null));
alter table core.freezes drop constraint if exists freezes_source_check;
alter table core.freezes add constraint freezes_source_check
  check (source in ('streak3', 'streak10', 'every15', 'purchase', 'gift', 'day3', 'day7'));
create unique index if not exists freezes_one_per_day on core.freezes (user_id, used_on_day) where used_on_day is not null;

-- the σερί log: days played ('played'), the starting values ('backfill'), and the existing kinds now with the day
alter table core.streak_events add column if not exists day date;
alter table core.streak_events drop constraint if exists streak_events_kind_check;
alter table core.streak_events add constraint streak_events_kind_check
  check (kind in ('correct', 'broke', 'freeze_used', 'freeze_earned', 'played', 'backfill'));
create index if not exists streak_events_day_idx on core.streak_events (day, kind) where day is not null;

-- one row per person and Athens day kept: played, or covered by a freeze. The Monday line and the backfill read it.
create table if not exists core.streak_days (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  kind       text not null check (kind in ('played', 'frozen')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table core.streak_days enable row level security;
revoke all on core.streak_days from public, anon, authenticated;
comment on table core.streak_days is 'The days each person kept the daily σερί: played or covered by an Ασφάλεια. Server only.';

-- ── 3. the rule, pure (core rules/dailyStreak.ts, same jsonb shape; parity in pgTAP 182) ──────────────────────────
-- state {current, best, lastPlayed, through, freezes: ['free'|'paid'], recordRun}; events as DayStreakEvent

-- rolloverDays: close every day before p_today that was neither played nor covered
create or replace function core.day_streak_rollover(p_state jsonb, p_today date)
returns jsonb
language plpgsql immutable set search_path = pg_temp
as $$
declare
  s      jsonb := p_state;
  ev     jsonb := '[]'::jsonb;
  v_cur  int := coalesce((p_state ->> 'current')::int, 0);
  v_next date;
  v_fr   jsonb;
  v_idx  int;
begin
  if v_cur = 0 then return jsonb_build_object('state', s, 'events', ev); end if;
  v_next := coalesce((s ->> 'through')::date, (s ->> 'lastPlayed')::date, p_today - 1) + 1;
  while v_next < p_today loop
    v_fr := coalesce(s -> 'freezes', '[]'::jsonb);
    if jsonb_array_length(v_fr) > 0 then
      select coalesce(min(o - 1), 0)::int into v_idx from jsonb_array_elements_text(v_fr) with ordinality t(x, o) where x = 'free';
      ev := ev || jsonb_build_array(jsonb_build_object('kind', 'frozen', 'day', v_next, 'freezeUsed', v_fr ->> v_idx,
                                                       'current', v_cur, 'left', jsonb_array_length(v_fr) - 1));
      s := s || jsonb_build_object('freezes', v_fr - v_idx, 'through', v_next);
    else
      ev := ev || jsonb_build_array(jsonb_build_object('kind', 'broken', 'day', v_next, 'lostStreak', v_cur,
                                                       'best', (s ->> 'best')::int));
      s := s || jsonb_build_object('current', 0, 'through', null, 'recordRun', false);
      exit;
    end if;
    v_next := v_next + 1;
  end loop;
  return jsonb_build_object('state', s, 'events', ev);
end;
$$;

-- recordDayPlayed: a qualifying action on p_day; rolls over the days before it first
create or replace function core.day_streak_play(p_state jsonb, p_day date, p_max int default 2)
returns jsonb
language plpgsql immutable set search_path = pg_temp
as $$
declare
  r       jsonb;
  s       jsonb;
  ev      jsonb;
  v_cur   int;
  v_best0 int;
  v_best  int;
  v_fr    jsonb;
  v_grant boolean := false;
begin
  if p_state ->> 'lastPlayed' is not null and p_day <= (p_state ->> 'lastPlayed')::date then
    return jsonb_build_object('state', p_state, 'events', jsonb_build_array(jsonb_build_object('kind', 'same_day', 'day', p_day)));
  end if;
  r := core.day_streak_rollover(p_state, p_day);
  s := r -> 'state';
  ev := r -> 'events';
  v_cur := coalesce((s ->> 'current')::int, 0) + 1;
  v_best0 := coalesce((s ->> 'best')::int, 0);
  v_best := greatest(v_best0, v_cur);
  v_fr := coalesce(s -> 'freezes', '[]'::jsonb);
  if (v_cur = 3 or v_cur % 7 = 0) and jsonb_array_length(v_fr) < p_max then
    v_fr := v_fr || '["free"]'::jsonb;
    v_grant := true;
  end if;
  ev := ev || jsonb_build_array(jsonb_build_object(
    'kind', 'played', 'day', p_day, 'current', v_cur,
    'milestone', case when v_cur in (3, 7, 10, 30, 50, 100) then v_cur end,
    'newBest', v_best > v_best0, 'freezeGranted', v_grant,
    'record', case when v_best > v_best0 and not coalesce((s ->> 'recordRun')::boolean, false) and v_best0 > 0 then v_cur end));
  s := jsonb_build_object('current', v_cur, 'best', v_best, 'lastPlayed', p_day, 'through', p_day, 'freezes', v_fr,
                          'recordRun', coalesce((s ->> 'recordRun')::boolean, false) or v_best > v_best0);
  return jsonb_build_object('state', s, 'events', ev);
end;
$$;

-- dayStreakMoment: the streakMoment rule on a played day
create or replace function core.day_streak_moment(p_event jsonb)
returns jsonb
language sql immutable set search_path = pg_temp
as $$
  select case
    when p_event ->> 'kind' is distinct from 'played' then null
    when p_event ->> 'milestone' is not null
         and (coalesce((p_event ->> 'newBest')::boolean, false) or coalesce((p_event ->> 'freezeGranted')::boolean, false))
      then jsonb_build_object('type', 'milestone', 'streak', (p_event ->> 'milestone')::int)
    when p_event ->> 'record' is not null
      then jsonb_build_object('type', 'record', 'streak', (p_event ->> 'record')::int)
  end
$$;

-- backfillDailyStreak: the run ending today or yesterday (else 0) and the longest run as the ΠΡ
create or replace function core.day_streak_backfill(p_days date[], p_today date)
returns jsonb
language sql immutable set search_path = pg_temp
as $$
  with d as (select distinct x as day from unnest(coalesce(p_days, '{}'::date[])) x where x <= p_today),
  g as (select day, day - (row_number() over (order by day))::int as grp from d),
  runs as (select grp, count(*)::int as n, max(day) as last from g group by grp),
  agg as (select max(n) as best, max(last) as last from runs),
  cur as (select case when a.last >= p_today - 1 then (select n from runs where runs.last = a.last) else 0 end as n from agg a)
  select case when (select last from agg) is null
    then jsonb_build_object('current', 0, 'best', 0, 'lastPlayed', null, 'recordRun', false)
    else jsonb_build_object('current', (select n from cur), 'best', (select best from agg), 'lastPlayed', (select last from agg),
                            'recordRun', (select n from cur) > 0 and (select n from cur) = (select best from agg))
  end
$$;

-- days to the next free freeze from this σερί (day 3, then every 7th): what build 39 words «σε {n} ψήφους»
create or replace function core.day_streak_days_to_freeze(p_streak int)
returns int
language sql immutable set search_path = pg_temp
as $$
  select case when coalesce(p_streak, 0) < 3 then 3 - coalesce(p_streak, 0) else 7 - (p_streak % 7) end
$$;

revoke all on function core.day_streak_rollover(jsonb, date), core.day_streak_play(jsonb, date, int),
  core.day_streak_moment(jsonb), core.day_streak_backfill(date[], date), core.day_streak_days_to_freeze(int)
  from public, anon, authenticated;

-- ── 4. the rule against the tables ────────────────────────────────────────────────────────────────────────────────
-- the person's daily σερί state in the core shape
create or replace function core.day_streak_state(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'current', g.streak, 'best', g.streak_best, 'lastPlayed', g.day_last, 'through', g.day_through,
           'freezes', coalesce((select jsonb_agg(f.kind order by f.acquired_at, f.id) from core.freezes f
                                 where f.user_id = p_user and f.used_at is null), '[]'::jsonb),
           'recordRun', g.record_run)
    from core.user_game_state g where g.user_id = p_user
$$;

-- write a {state, events} result: freezes spent and earned, the log, the days, the moments, the state
create or replace function core.day_streak_save(p_user uuid, p_res jsonb, p_at timestamptz)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  e       jsonb;
  s       jsonb := p_res -> 'state';
  v_day   date;
  v_fid   uuid;
  v_mom   jsonb;
  v_fmax  int := (core.sport_rules('tennis') ->> 'freeze_max')::int;
  v_broke boolean := false;
begin
  for e in select * from jsonb_array_elements(coalesce(p_res -> 'events', '[]'::jsonb)) loop
    v_day := (e ->> 'day')::date;
    if e ->> 'kind' = 'frozen' then
      select f.id into v_fid from core.freezes f
       where f.user_id = p_user and f.used_at is null and f.kind = e ->> 'freezeUsed'
       order by f.acquired_at, f.id limit 1 for update;
      update core.freezes set used_at = clock_timestamp(), used_on_day = v_day where id = v_fid;
      insert into core.streak_events (user_id, streak_before, streak_after, freeze_id, kind, day)
      values (p_user, (e ->> 'current')::int, (e ->> 'current')::int, v_fid, 'freeze_used', v_day);
      insert into core.streak_days (user_id, day, kind) values (p_user, v_day, 'frozen') on conflict do nothing;
    elsif e ->> 'kind' = 'broken' then
      insert into core.streak_events (user_id, streak_before, streak_after, kind, day)
      values (p_user, (e ->> 'lostStreak')::int, 0, 'broke', v_day);
      v_broke := true;
    elsif e ->> 'kind' = 'played' then
      insert into core.streak_events (user_id, streak_before, streak_after, kind, day)
      values (p_user, (e ->> 'current')::int - 1, (e ->> 'current')::int, 'played', v_day);
      insert into core.streak_days (user_id, day, kind) values (p_user, v_day, 'played')
      on conflict (user_id, day) do update set kind = 'played';
      v_fid := null;
      if (e ->> 'freezeGranted')::boolean then
        v_fid := core.grant_freeze(p_user, 'free', case when (e ->> 'current')::int = 3 then 'day3' else 'day7' end, v_fmax);
        if v_fid is not null then
          insert into core.streak_events (user_id, streak_before, streak_after, freeze_id, kind, day)
          values (p_user, (e ->> 'current')::int, (e ->> 'current')::int, v_fid, 'freeze_earned', v_day);
        end if;
      end if;
      v_mom := core.day_streak_moment(e);
      if v_mom is not null then
        -- the same celebration types build 39 plays; core.reward_milestone adds the freeze and the Frame
        insert into core.feed_inbox (user_id, kind, ref, payload)
        values (p_user, 'celebration', 'streakday:' || v_day,
                jsonb_build_object('type', case v_mom ->> 'type' when 'milestone' then 'streak_milestone' else 'streak_record' end,
                                   'streak', (v_mom ->> 'streak')::int, 'day', v_day, 'unit', 'days',
                                   'freeze', v_fid is not null))
        on conflict do nothing;
      end if;
    end if;
  end loop;

  update core.user_game_state
     set streak = (s ->> 'current')::int, streak_best = (s ->> 'best')::int,
         day_last = (s ->> 'lastPlayed')::date, day_through = (s ->> 'through')::date,
         record_run = coalesce((s ->> 'recordRun')::boolean, false),
         broke_at = case when v_broke then p_at else broke_at end,
         version = version + 1, updated_at = now()
   where user_id = p_user
     and (streak, streak_best, day_last, day_through, record_run) is distinct from
         ((s ->> 'current')::int, (s ->> 'best')::int, (s ->> 'lastPlayed')::date, (s ->> 'through')::date,
          coalesce((s ->> 'recordRun')::boolean, false));
  return coalesce(p_res -> 'events', '[]'::jsonb);
end;
$$;

-- a qualifying action at p_at (a match vote, the day's quiz finished): +1 the first time that Athens day
create or replace function core.day_streak_touch(p_user uuid, p_at timestamptz default now())
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.daily_streak_on() then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user::text, 0));
  perform core.ensure_game_state(p_user);
  return core.day_streak_save(p_user,
    core.day_streak_play(core.day_streak_state(p_user), core.athens_day(p_at), (core.sport_rules('tennis') ->> 'freeze_max')::int),
    p_at);
end;
$$;

-- close the days before p_today for one person (freeze or break); nothing when they are already closed
create or replace function core.day_streak_close(p_user uuid, p_today date default core.athens_day(), p_at timestamptz default now())
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  g core.user_game_state;
begin
  if not core.daily_streak_on() then return null; end if;
  select * into g from core.user_game_state where user_id = p_user;
  if g.user_id is null or g.streak = 0 or coalesce(g.day_through, g.day_last) >= p_today - 1 then return '[]'::jsonb; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user::text, 0));
  return core.day_streak_save(p_user, core.day_streak_rollover(core.day_streak_state(p_user), p_today), p_at);
end;
$$;

-- hourly (it acts once a day, just after Athens midnight): every σερί with a day not closed yet
create or replace function core.day_streak_nightly(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_today date := core.athens_day(p_now);
  v_user  uuid;
  v_n     int := 0;
begin
  if not core.daily_streak_on() then return 0; end if;
  for v_user in
    select g.user_id from core.user_game_state g
     where g.streak > 0 and coalesce(g.day_through, g.day_last) < v_today - 1
  loop
    perform core.day_streak_close(v_user, v_today, p_now);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.day_streak_state(uuid), core.day_streak_save(uuid, jsonb, timestamptz),
  core.day_streak_touch(uuid, timestamptz), core.day_streak_close(uuid, date, timestamptz),
  core.day_streak_nightly(timestamptz) from public, anon, authenticated;

-- a match vote counts at once; a quiz answer counts when it is the last unanswered card of its set
create or replace function core.day_streak_on_vote()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set uuid;
begin
  if not core.daily_streak_on() then return null; end if;
  if new.subject_type = 'match' then
    perform core.day_streak_touch(new.user_id, new.created_at);
  else
    select c.set_id into v_set from core.quiz_set_cards c where c.id = new.subject_id;
    if v_set is not null
       and (select count(*) from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
             where v.user_id = new.user_id and v.subject_type = 'card' and c.set_id = v_set)
           >= (select count(*) from core.quiz_set_cards c where c.set_id = v_set) then
      perform core.day_streak_touch(new.user_id, new.created_at);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function core.day_streak_on_vote() from public, anon, authenticated;
drop trigger if exists votes_day_streak on core.votes;
create trigger votes_day_streak after insert on core.votes
  for each row execute function core.day_streak_on_vote();

-- ── 5. the correct calls (core applyOutcome) in both modes ────────────────────────────────────────────────────────
-- Off: exactly as in 20270317000000_cosmetics_decisions.sql, and calls_streak / calls_best follow streak / streak_best.
-- On: only the correct calls move (calls_streak, calls_best, chain, votes_correct); a wrong call restarts the chain
-- (no freeze absorbs it any more: freezes cover days) and never touches the σερί. The event keeps build 39's shape:
-- idle for a correct call, and for a wrong one with a σερί to show {kind: 'frozen', kept: true, freezeUsed: null},
-- which build 39 words «κράτησες το σερί». `calls` carries the correct calls in a row for 1.0.1. The lime headband
-- (5 in a row) stays with the correct calls: given quietly at 5 (no σερί moment for calls any more).
create or replace function core.apply_outcome(p_user uuid, p_vote uuid, p_correct boolean, p_at timestamptz,
                                              p_sport text default 'tennis')
returns jsonb language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_rules    jsonb := core.sport_rules(p_sport);
  v_fmax     int := (v_rules ->> 'freeze_max')::int;
  v_first_at int := (v_rules ->> 'first_free_freeze_at_streak')::int;
  v_ten_at   int := (v_rules ->> 'milestone_freeze_at_streak')::int;
  gs         core.user_game_state;
  v_chain_before int;
  v_best_before  int;
  v_fid      uuid;
  v_free     record;
  v_granted  boolean := false;
  v_milestone int;
  v_event    jsonb;
  v_record   int;
begin
  perform core.ensure_game_state(p_user);
  select * into gs from core.user_game_state where user_id = p_user for update;
  v_chain_before := gs.chain;

  if core.daily_streak_on() then
    if p_correct then
      gs.calls_streak := gs.calls_streak + 1;
      gs.calls_best := greatest(gs.calls_best, gs.calls_streak);
      gs.chain := gs.chain + 1;
      gs.votes_correct := gs.votes_correct + 1;
      if gs.calls_streak = 5 then
        insert into core.user_cosmetics (user_id, item_id, source)
        select p_user, id, 'earned' from core.cosmetic_items where key = 'gear_headband'
        on conflict do nothing;
      end if;
      v_event := jsonb_build_object('kind', 'idle', 'calls', gs.calls_streak);
    else
      gs.calls_streak := 0;
      gs.chain := 0;
      v_event := case when gs.streak > 0
                      then jsonb_build_object('kind', 'frozen', 'freezeUsed', null, 'kept', true, 'calls', 0)
                      else jsonb_build_object('kind', 'idle', 'calls', 0) end;
    end if;
    update core.user_game_state
       set calls_streak = gs.calls_streak, calls_best = gs.calls_best, chain = gs.chain, votes_correct = gs.votes_correct,
           version = version + 1, updated_at = now()
     where user_id = p_user;
    return jsonb_build_object('event', v_event, 'chain_before', v_chain_before);
  end if;

  v_best_before := gs.streak_best;

  if p_correct then
    insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
    values (p_user, p_vote, gs.streak, gs.streak + 1, 'correct');
    gs.streak := gs.streak + 1;
    gs.chain := gs.chain + 1;
    gs.votes_correct := gs.votes_correct + 1;
    gs.streak_best := greatest(gs.streak_best, gs.streak);
    -- «Νέο ρεκόρ»: the first card of this run past the ΠΡ it started from (nothing to beat when that was 0)
    if gs.streak_best > v_best_before and not gs.record_run and v_best_before > 0 then
      v_record := gs.streak;
    end if;
    gs.record_run := gs.record_run or gs.streak_best > v_best_before;

    -- the first free freeze: when sigma reaches exactly 3, once, only if a slot is free
    if gs.streak = v_first_at and not gs.first_free_at3_done then
      v_fid := core.grant_freeze(p_user, 'free', 'streak3', v_fmax);
      if v_fid is not null then
        gs.first_free_at3_done := true;
        v_granted := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      end if;
    end if;

    -- σερί 10 (founder, 22 Oct 2026): one more free freeze, only the first time ever (ΠΡ below 10 before), only into
    -- a free slot; with both slots full nothing extra and no retry later
    if gs.streak = v_ten_at and v_best_before < v_ten_at then
      v_fid := core.grant_freeze(p_user, 'free', 'streak10', v_fmax);
      if v_fid is not null then
        v_granted := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      end if;
    end if;

    if gs.streak = any (select jsonb_array_elements_text(v_rules -> 'streak_milestones')::int) then
      v_milestone := gs.streak;
    end if;
    v_event := jsonb_build_object('kind', 'advanced', 'milestone', v_milestone,
                                  'newBest', gs.streak_best > v_best_before, 'freezeGranted', v_granted,
                                  'record', v_record);

  elsif gs.streak = 0 then
    -- a wrong vote with no sigma to protect: nothing is spent, nothing is logged
    gs.chain := 0;
    v_event := jsonb_build_object('kind', 'idle');

  else
    -- a freeze absorbs the wrong vote: the free one first (keeps number and chain), then the oldest paid one
    -- (keeps the number only, the chain restarts)
    select f.id, f.kind into v_free
      from core.freezes f where f.user_id = p_user and f.used_at is null
     order by (f.kind = 'free') desc, f.acquired_at, f.id limit 1 for update;
    if found then
      update core.freezes set used_at = clock_timestamp(), used_on_vote_id = p_vote where id = v_free.id;
      if v_free.kind = 'paid' then gs.chain := 0; end if;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
      values (p_user, p_vote, gs.streak, gs.streak, v_free.id, 'freeze_used');
      v_event := jsonb_build_object('kind', 'frozen', 'freezeUsed', v_free.kind);
    else
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
      values (p_user, p_vote, gs.streak, 0, 'broke');
      v_event := jsonb_build_object('kind', 'broken', 'lostStreak', gs.streak);
      gs.streak := 0;
      gs.chain := 0;
      gs.broke_at := p_at;
      gs.record_run := false;
    end if;
  end if;

  update core.user_game_state
     set streak = gs.streak, streak_best = gs.streak_best, chain = gs.chain, votes_correct = gs.votes_correct,
         first_free_at3_done = gs.first_free_at3_done, broke_at = gs.broke_at, record_run = gs.record_run,
         calls_streak = gs.streak, calls_best = gs.streak_best,
         version = version + 1, updated_at = now()
   where user_id = p_user;

  return jsonb_build_object('event', v_event, 'chain_before', v_chain_before);
end;
$$;

-- core recordVoteCast: with the daily σερί on, freezes come from days (3, every 7th), not from every 15th vote; the
-- counter stays where it is. Off: as in 20261101000800_core_rules_parity.sql.
create or replace function core.record_vote_cast(p_user uuid, p_sport text default 'tennis', p_vote uuid default null)
returns boolean language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_rules jsonb := core.sport_rules(p_sport);
  v_every int := (v_rules ->> 'free_freeze_every_votes')::int;
  gs      core.user_game_state;
  v_n     int;
  v_fid   uuid;
begin
  if core.daily_streak_on() then return false; end if;
  perform core.ensure_game_state(p_user);
  select * into gs from core.user_game_state where user_id = p_user for update;
  v_n := least(gs.votes_since_free_freeze + 1, v_every);
  if v_n >= v_every then
    v_fid := core.grant_freeze(p_user, 'free', 'every15', (v_rules ->> 'freeze_max')::int);
    if v_fid is not null then
      update core.user_game_state set votes_since_free_freeze = 0, version = version + 1, updated_at = now()
       where user_id = p_user;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
      values (p_user, p_vote, gs.streak, gs.streak, v_fid, 'freeze_earned');
      return true;
    end if;
  end if;
  update core.user_game_state set votes_since_free_freeze = v_n, version = version + 1, updated_at = now()
   where user_id = p_user;
  return false;
end;
$$;

-- ── 6. milestones, Frames and the new catalogue entries ───────────────────────────────────────────────────────────
insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text, active) values
  ('frame', 'frame_month',   'Μήνας', 'Month',   'earned', null, 'Το κερδίζεις με 30 μέρες στη σειρά', false),
  ('frame', 'frame_hundred', 'Εκατό', 'Hundred', 'earned', null, 'Το κερδίζεις με 100 μέρες στη σειρά', false)
on conflict (key) do nothing;

-- core.reward_milestone as in 20270317000000_cosmetics_decisions.sql for the correct calls (switch off), plus the
-- daily σερί's moments (payload.unit 'days'): the freeze the day gave (payload.freeze), Frame «Επτά» at 7, «Δέκα» at
-- 10, «Μήνας» at 30, «Εκατό» at 100, once each, never the headband (it stays with 5 correct calls). reward.frame
-- names only the keys build 39 knows; reward.frame_key always names the Frame given (1.0.1 reads it).
create or replace function core.reward_milestone()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_n      int := (new.payload ->> 'streak')::int;
  v_days   boolean := coalesce(new.payload ->> 'unit' = 'days', false);
  v_freeze boolean := false;
  v_frame  text;
  v_key    text;
  v_n_ins  int;
  v_gear   text;
begin
  if new.kind <> 'celebration' or new.payload ->> 'type' <> 'streak_milestone' then return new; end if;
  if v_days then
    v_key := case v_n when 7 then 'frame_seven' when 10 then 'frame_ten' when 30 then 'frame_month' when 100 then 'frame_hundred' end;
    v_freeze := coalesce((new.payload ->> 'freeze')::boolean, false);
  else
    v_key := case v_n when 7 then 'frame_seven' when 10 then 'frame_ten' end;
    if v_n in (3, 10) then
      -- the resolver grants it on the same vote, just before (σερί 3: the first free freeze; σερί 10: one more)
      v_freeze := exists (select 1 from core.streak_events e join core.freezes f on f.id = e.freeze_id
                           where e.user_id = new.user_id and e.kind = 'freeze_earned' and f.source in ('streak3', 'streak10')
                             and e.vote_id = (select id from core.votes where user_id = new.user_id and subject_type = 'match'
                                                 and subject_id = (new.payload ->> 'match_id')::uuid));
    end if;
  end if;
  if v_key is not null then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = v_key
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_frame := v_key; end if;
  end if;
  -- 5 in a row: the lime headband (lime is earned, never bought)
  if v_n = 5 and not v_days then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = 'gear_headband'
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_gear := 'gear_headband'; end if;
  end if;
  if v_days then
    new.payload := new.payload || jsonb_build_object('reward', jsonb_build_object(
      'freeze', v_freeze,
      'frame', case when v_frame in ('frame_seven', 'frame_ten') then v_frame end,
      'frame_key', v_frame,
      'gear', null));
  else
    new.payload := new.payload || jsonb_build_object('reward', jsonb_build_object('freeze', v_freeze, 'frame', v_frame, 'gear', v_gear));
  end if;
  return new;
end;
$$;

-- ── 7. badges and unlocks keep counting correct calls ─────────────────────────────────────────────────────────────
-- «Στη σειρά» (in_a_row) and the unlock counter bestStreak read calls_best, which equals streak_best while the switch
-- is off: nothing moves now, and with it on they keep meaning correct calls in a row.
drop trigger if exists badges_on_streak on core.user_game_state;
create trigger badges_on_streak after update of streak_best, calls_best on core.user_game_state
  for each row when (new.streak_best is distinct from old.streak_best or new.calls_best is distinct from old.calls_best)
  execute function core.badges_on_user();

-- ── 8. pushes ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- the founder's texts (board, 18 Nov 2026); singular and none are their own rows so each stays editable
insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('streak_risk', 'Σερί: 20:00, δεν έπαιξε σήμερα ({n}: οι μέρες στη σειρά, 2 και πάνω)',
   'Το σερί σου κινδυνεύει', '{n} μέρες στη σειρά. Μία ψήφος ή το quiz και το κρατάς.', '{n}', false, 190),
  ('streak_risk_one', 'Σερί: 20:00, δεν έπαιξε σήμερα, σερί 1 (ξεκίνησε χθες)',
   'Το σερί σου κινδυνεύει', 'Ξεκίνησες σερί χθες. Παίξε και σήμερα να γίνει 2.', '{}', false, 191),
  ('streak_saved', 'Σερί: 09:00, η Ασφάλεια κάλυψε το χθες ({n}: το σερί, {left}: οι Ασφάλειες που μένουν, 2)',
   'Η Ασφάλεια έσωσε το σερί σου', 'Χθες δεν έπαιξες, το σερί σου μένει {n}. Σου μένουν {left} Ασφάλειες.', '{n,left}', false, 192),
  ('streak_saved_one', 'Σερί: 09:00, η Ασφάλεια κάλυψε το χθες και μένει 1 ({n}: το σερί)',
   'Η Ασφάλεια έσωσε το σερί σου', 'Χθες δεν έπαιξες, το σερί σου μένει {n}. Σου μένει 1 Ασφάλεια.', '{n}', false, 193),
  ('streak_saved_none', 'Σερί: 09:00, η Ασφάλεια κάλυψε το χθες και δεν μένει άλλη ({n}: το σερί)',
   'Η Ασφάλεια έσωσε το σερί σου', 'Χθες δεν έπαιξες, το σερί σου μένει {n}. Δεν σου έμεινε Ασφάλεια.', '{n}', false, 194),
  ('streak_lost', 'Σερί: 09:00, έσπασε χθες ({n}: το σερί που χάθηκε, 2 και πάνω, {best}: το ρεκόρ)',
   'Το σερί σου έσπασε στις {n}', 'Ξεκίνα νέο σήμερα. Το ρεκόρ σου είναι {best}.', '{n,best}', false, 195),
  ('streak_lost_one', 'Σερί: 09:00, έσπασε χθες σερί 1 ({best}: το ρεκόρ)',
   'Το σερί σου έσπασε', 'Ξεκίνα νέο σήμερα. Το ρεκόρ σου είναι {best}.', '{best}', false, 196)
on conflict (key) do nothing;

-- Every 10 minutes, does something twice a day (Athens):
--   20:00 to 21:59  the reminder, to whoever has a σερί, has not played today and has a device (the email takes the
--                   others, core.streak_email_sweep); once a day, never after 22:00
--   09:00 to 12:59  about yesterday: a freeze covered it, or the σερί broke (not when a new one already started today)
-- Personal pushes (the cap of 3 a day, core.personal_push). Switch: notification_prefs.streak_reminder (on unless false).
-- Marked once considered, sent or not (core.push_marks), so nothing old arrives later.
create or replace function core.streak_push_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r       record;
  v_txt   record;
  v_n     int := 0;
  v_today date := core.athens_day(p_now);
  v_hour  int := extract(hour from p_now at time zone 'Europe/Athens');
  v_left  int;
begin
  if not core.daily_streak_on() then return 0; end if;

  if v_hour between 20 and 21 then
    for r in
      select g.user_id, g.streak from core.user_game_state g
       where g.streak >= 1 and g.day_last < v_today and coalesce(g.day_through, g.day_last) >= v_today - 1
         and exists (select 1 from core.push_tokens pt where pt.user_id = g.user_id)
         and core.push_wants(g.user_id, 'streak_reminder')
         and not exists (select 1 from core.push_marks k where k.user_id = g.user_id and k.kind = 'streak_risk' and k.ref = v_today::text)
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'streak_risk', v_today::text);
      select * into v_txt from core.ntext(case when r.streak = 1 then 'streak_risk_one' else 'streak_risk' end,
                                          jsonb_build_object('n', r.streak));
      if core.personal_push(r.user_id, 'personal:streak_risk:' || r.user_id || ':' || v_today, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;

  if v_hour between 9 and 12 then
    for r in
      select distinct on (e.user_id) e.user_id, e.kind, e.streak_before, g.streak_best, g.day_last
        from core.streak_events e join core.user_game_state g on g.user_id = e.user_id
       where e.day = v_today - 1 and e.kind in ('freeze_used', 'broke')
         and exists (select 1 from core.push_tokens pt where pt.user_id = e.user_id)
         and core.push_wants(e.user_id, 'streak_reminder')
         and not exists (select 1 from core.push_marks k where k.user_id = e.user_id and k.kind = 'streak_morning' and k.ref = v_today::text)
       order by e.user_id, (e.kind = 'broke') desc, e.id desc
    loop
      insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'streak_morning', v_today::text);
      if r.kind = 'broke' then
        continue when r.day_last >= v_today;   -- a new σερί already started today
        select * into v_txt from core.ntext(case when r.streak_before = 1 then 'streak_lost_one' else 'streak_lost' end,
                                            jsonb_build_object('n', r.streak_before, 'best', r.streak_best));
      else
        select count(*)::int into v_left from core.freezes f where f.user_id = r.user_id and f.used_at is null;
        select * into v_txt from core.ntext(case v_left when 0 then 'streak_saved_none' when 1 then 'streak_saved_one' else 'streak_saved' end,
                                            jsonb_build_object('n', r.streak_before, 'left', v_left));
      end if;
      if core.personal_push(r.user_id, 'personal:streak_morning:' || r.user_id || ':' || v_today, v_txt.title, v_txt.body, '/', p_now) then
        v_n := v_n + 1;
      end if;
    end loop;
  end if;
  return v_n;
end;
$$;
revoke all on function core.streak_push_sweep(timestamptz) from public, anon, authenticated;

-- ── 9. emails ─────────────────────────────────────────────────────────────────────────────────────────────────────
insert into core.email_kinds (kind, grp, label) values
  ('streak_lost',           'game', 'Σερί: έσπασε (7 μέρες και πάνω)'),
  ('streak_milestone',      'game', 'Σερί: 30 ή 100 μέρες'),
  ('streak_reminder_email', 'game', 'Σερί: κινδυνεύει (20:00, χωρίς συσκευή)')
on conflict (kind) do update set grp = excluded.grp, label = excluded.label;

-- Hourly, a few minutes past. With the daily σερί on and the emails not off (the rules of email_game_ok: the switch,
-- the allow-list, each person's game_email switch, 2 game emails in 7 days and one a day):
--   streak_lost            10:00 to 13:59, the day after the missed day, when the lost σερί was 7 or more and no new
--                          one started today
--   streak_milestone       10:00 to 21:59, a σερί of 30 or 100 reached in the last 3 days, once per milestone ever
--   streak_reminder_email  20:00 to 20:59, has a σερί, has not played today, no device; the gate drops it after 22:00
--                          or once they play. streak_reminder off means no reminder at all.
create or replace function core.streak_email_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s       core.email_settings;
  r       record;
  v_n     int := 0;
  v_today date := core.athens_day(p_now);
  v_ten   timestamptz := core.email_slot(core.athens_day(p_now), 10);
  v_eight timestamptz := core.email_slot(core.athens_day(p_now), 20);
  v_hour  int := extract(hour from p_now at time zone 'Europe/Athens');
begin
  select * into s from core.email_settings;
  if s.mode = 'off' or not core.daily_streak_on() then return 0; end if;

  if p_now >= v_ten and p_now < v_ten + interval '4 hours' then
    for r in
      select distinct on (e.user_id) e.user_id, e.streak_before as n, g.streak_best as best
        from core.streak_events e join core.user_game_state g on g.user_id = e.user_id
       where e.kind = 'broke' and e.day = v_today - 1 and e.streak_before >= 7
         and coalesce(g.day_last, date '-infinity') < v_today
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_lost:' || e.user_id || ':' || v_today)
       order by e.user_id, e.id desc
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_lost', 'streak_lost:' || r.user_id || ':' || v_today,
                               jsonb_build_object('n', r.n, 'best', r.best, 'day', v_today), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  if v_hour between 10 and 21 then
    for r in
      select distinct e.user_id, e.streak_after as n
        from core.streak_events e
       where e.kind = 'played' and e.streak_after in (30, 100) and e.day >= v_today - 2
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_milestone:' || e.user_id || ':' || e.streak_after)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_milestone', 'streak_milestone:' || r.user_id || ':' || r.n,
                               jsonb_build_object('n', r.n, 'frame', case r.n when 30 then 'frame_month' else 'frame_hundred' end), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  if p_now >= v_eight and p_now < v_eight + interval '1 hour' then
    for r in
      select g.user_id, g.streak from core.user_game_state g
       where g.streak >= 1 and g.day_last < v_today and coalesce(g.day_through, g.day_last) >= v_today - 1
         and not exists (select 1 from core.push_tokens pt where pt.user_id = g.user_id)
         and core.push_wants(g.user_id, 'streak_reminder')
         and not exists (select 1 from core.emails x where x.dedupe_key = 'streak_reminder:' || g.user_id || ':' || v_today)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'streak_reminder_email', 'streak_reminder:' || r.user_id || ':' || v_today,
                               jsonb_build_object('n', r.streak, 'day', v_today), p_now);
      v_n := v_n + 1;
    end loop;
  end if;
  return v_n;
end;
$$;
revoke all on function core.streak_email_sweep(timestamptz) from public, anon, authenticated;

-- core.badge_counters as in 20270209000000_moderate_player_matches.sql, in_a_row from calls_best
-- when the daily σερί is on (streak_best while off, so nothing moves)
create or replace function core.badge_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  since as (select coalesce((select badges_since from core.profiles where user_id = p_user), '-infinity'::timestamptz) as t),
  played as (   -- matches with a result the player was in, and their side
    select m.id, m.format, m.starts_at, mp.side
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id and mp.player_id in (select id from me)
     where m.status <> 'void' and exists (select 1 from core.match_results r where r.match_id = m.id)
       and m.created_at >= (select t from since)
  ),
  weeks as (    -- the Mondays of the weeks with a played match
    select distinct (d - (extract(isodow from d)::int - 1)) as wk
      from (select core.athens_day(starts_at) as d from played where starts_at is not null) x
  ),
  runs as (     -- consecutive weeks share wk - 7·rank
    select count(*) as n from (select wk, wk - (7 * row_number() over (order by wk))::int as grp from weeks) w group by grp
  ),
  vote_weeks as (
    select (day_key - (extract(isodow from day_key)::int - 1)) as wk, count(distinct day_key) as days
      from core.votes where user_id = p_user and created_at >= (select t from since) group by 1
  ),
  facts as (
    select 'first_serve' as k, (select count(*) from core.matches
                                 where logged_by = p_user and source = 'user' and approved and status <> 'void'
                                   and created_at >= (select t from since))::int as n
    union all
    select 'nice_player', (select count(*) from core.match_confirmations c join core.matches m on m.id = c.match_id
                            where m.logged_by = p_user and m.status <> 'void' and c.state = 'confirmed'
                              and m.created_at >= (select t from since)
                              and c.player_id not in (select id from me))::int
    union all
    select 'gentleman', (select count(*) from core.kudos where from_user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'beloved', (select count(distinct from_user_id) from core.kudos where to_player_id in (select id from me)
                         and created_at >= (select t from since))::int
    union all
    select 'club_oracle', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and created_at >= (select t from since))::int
    union all
    select 'upset', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and is_upset_call
                    and created_at >= (select t from since))::int
    union all
    select 'in_a_row', coalesce((select case when core.daily_streak_on() then calls_best else streak_best end from core.user_game_state where user_id = p_user), 0)
    union all
    select 'whole_week', (select count(*) from vote_weeks where days = 7)::int
    union all
    select 'doubles_player', (select count(*) from played p where p.format <> 'singles'
                               and exists (select 1 from core.match_confirmations c join core.match_participants mp
                                             on mp.match_id = c.match_id and mp.player_id = c.player_id
                                            where c.match_id = p.id and c.state = 'confirmed' and mp.side = p.side
                                              and c.player_id not in (select id from me)))::int
    union all
    select 'variety', (select count(distinct mp.player_id) from played p
                         join core.match_participants mp on mp.match_id = p.id and mp.side <> p.side)::int
    union all
    select 'steady', coalesce((select max(n) from runs), 0)::int
    union all
    select 'many_votes', (select count(*) from core.votes where user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'month_top', (select count(*) from core.league_members lm
                          where lm.user_id = p_user and lm.final_rank <= 3 and lm.final_points > 0)::int
  ),
  bonus as (    -- what quests gave: «+5 στο badge …»
    select reward ->> 'key' as k, sum((reward ->> 'amount')::int)::int as n
      from core.user_quest_progress where user_id = p_user and reward ->> 'kind' = 'badge'
       and coalesce(reward_granted_at, done_at) >= (select t from since) group by 1
  )
  select jsonb_object_agg(d.key, coalesce(f.n, 0) + coalesce(b.n, 0))
    from core.badge_defs d
    left join facts f on f.k = d.key
    left join bonus b on b.k = d.key
$$;

-- core.unlock_counters as in 20270209000000_moderate_player_matches.sql, bestStreak from calls_best
-- when the daily σερί is on (streak_best while off)
create or replace function core.unlock_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  days as (
    select day_key as d from core.votes where user_id = p_user group by day_key having count(*) >= 3
    union
    select core.athens_day(created_at) from core.matches where logged_by = p_user and source = 'user' and approved and status <> 'void'
  ),
  quest_days as (
    select period_key from core.user_quest_progress
     where user_id = p_user and done_at is not null
       and quest_key in (select key from core.quest_defs where period = 'daily' and active)
     group by period_key
    having count(*) = (select count(*) from core.quest_defs where period = 'daily' and active)
  )
  select jsonb_build_object(
    'votesCast',        (select count(*) from core.votes where user_id = p_user),
    'votesResolved',    (select count(*) from core.votes where user_id = p_user and resolved_at is not null),
    'correctVotes',     (select count(*) from core.votes where user_id = p_user and outcome = 'correct'),
    'activeDays',       (select count(*) from days),
    'kudosGiven',       (select count(*) from core.kudos where from_user_id = p_user),
    'matchesLogged',    (select count(*) from core.matches where logged_by = p_user and source = 'user' and approved and status <> 'void'),
    'matchesConfirmed', (select count(distinct m.id) from core.matches m
                          where m.status = 'confirmed'
                            and (m.logged_by = p_user
                                 or exists (select 1 from core.match_participants mp
                                             where mp.match_id = m.id and mp.player_id in (select id from me)))),
    'bestStreak',       coalesce((select case when core.daily_streak_on() then calls_best else streak_best end from core.user_game_state where user_id = p_user), 0),
    'fullQuestDays',    (select count(*) from quest_days))
$$;

-- ── 10. what the app reads ──
-- api.get_me as in 20270105000000_avatar_choice.sql, plus the daily σερί fields (the existing ones keep their names;
-- `streak` and `streak_best` are the days when the switch is on)
create or replace function api.get_me()
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_pro  boolean;
  v_rules jsonb;
  v_sport text;
  v_daily boolean := core.daily_streak_on();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  perform core.ensure_game_state(v_uid);
  -- the daily σερί: close yesterday now if the nightly job has not yet (a freeze, or the break)
  if v_daily then perform core.day_streak_close(v_uid, core.athens_day(), now()); end if;
  v_rules := core.sport_rules(v_sport);
  v_pro := exists (select 1 from core.entitlements
                    where user_id = v_uid and key = 'pro' and status = 'active'
                      and starts_at <= now() and (ends_at is null or ends_at > now()));

  return jsonb_build_object(
    'user_id', v_uid,
    'profile', (select jsonb_build_object(
                  'first_name', pr.first_name, 'surname', pr.surname, 'display_name', pr.display_name,
                  'gender', pr.gender, 'area_id', pr.area_id, 'area_ids', pr.area_ids,
                  'primary_sport', pr.primary_sport, 'hand', pr.hand, 'locale', pr.locale, 'tz', pr.tz,
                  'hidden', pr.hidden, 'role', pr.role, 'onboarding_state', pr.onboarding_state,
                  'claim_status', pr.claim_status, 'avatar', pr.avatar)
                from core.profiles pr where pr.user_id = v_uid),
    'player', (select jsonb_build_object(
                  'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
                  'level_tier', ps.level_tier, 'level_direction', ps.level_direction, 'level_status', ps.level_status,
                  'level_value', case when v_pro then ps.level_value end,    -- numbers are Pro-only
                  'record', ps.record, 'form', ps.form)
                from core.profiles pr
                join core.players p on p.id = pr.claimed_player_id
                left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = pr.primary_sport
               where pr.user_id = v_uid),
    'game', (select jsonb_build_object(
                'total_points', gs.total_points,
                'month_points', coalesce((select sum(delta) from core.points_ledger l
                                           where l.user_id = v_uid and l.month_key = core.month_key()), 0),
                'streak', gs.streak, 'streak_best', gs.streak_best, 'chain', gs.chain,
                'votes_cast', gs.votes_cast, 'votes_correct', gs.votes_correct,
                -- build 39 words it «Δωρεάν Ασφάλεια σε {n} ψήφους»; with the daily σερί a day needs one vote, so it
                -- is the days to the next free freeze
                'votes_to_next_free_freeze', case when v_daily then core.day_streak_days_to_freeze(gs.streak)
                  else greatest((v_rules ->> 'free_freeze_every_votes')::int - gs.votes_since_free_freeze, 0) end,
                'daily_streak', v_daily,
                'days_to_next_free_freeze', case when v_daily then core.day_streak_days_to_freeze(gs.streak) end,
                'played_today', v_daily and gs.day_last is not distinct from core.athens_day(),
                'calls_streak', gs.calls_streak, 'calls_best', gs.calls_best,
                'freezes', jsonb_build_object(
                  'free', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'free'),
                  'paid', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'paid'),
                  'max', (v_rules ->> 'freeze_max')::int),
                'level', core.game_level(gs.total_points, coalesce((v_rules ->> 'game_level_step')::int, 100)))
              from core.user_game_state gs where gs.user_id = v_uid),
    'pro', v_pro,
    'unlocks', coalesce((select jsonb_agg(unlock_key order by unlocked_at) from core.unlock_progress where user_id = v_uid), '[]'::jsonb),
    'inbox_unseen', (select count(*) from core.feed_inbox where user_id = v_uid and seen_at is null),
    'circle_count', (select count(*) from core.follows where user_id = v_uid),
    'results_at', (select max(m.resolved_at) from core.matches m
                    where m.sport_id = v_sport and m.resolved_at is not null and m.approved and m.status <> 'void'
                      and m.resolved_at > now() - interval '14 days' and m.resolved_at <= now())
  );
end;
$$;

-- core.email_gate as in 20270426000000_email_series.sql, plus the σερί kinds
create or replace function core.email_gate(p_kind text, p_user uuid, p_payload jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_last  core.purchases;
  v_trial core.entitlements;
  v_prod  text;
begin
  if coalesce(p_payload ->> 'test', 'false') = 'true' then return null; end if;

  -- the weekly cap (20270426000000_email_series): a game email waits out the week when the person already had 2
  -- game emails sent in the last 7 days (account emails never count; «Send me a test» rows neither count nor wait).
  -- The σερί-lost and milestone emails skip it (founder, 18 Nov): rare and timely; they still count for the others.
  if (select grp from core.email_kinds where kind = p_kind) = 'game'
     and p_kind not in ('streak_lost', 'streak_milestone')
     and (select count(*) from core.emails e join core.email_kinds k on k.kind = e.kind
           where e.user_id = p_user and k.grp = 'game' and e.status in ('sent', 'sending')
             and e.dedupe_key not like 'test:%'
             and coalesce(e.sent_at, e.created_at) > now() - interval '7 days') >= 2 then
    return jsonb_build_object('skip', 'cap');
  end if;

  -- the daily σερί emails (20270427000000_daily_streak): only while it is on; the reminder only on its own evening
  -- before 22:00 and while they still have not played; the lost one only while no new σερί started that day
  if p_kind in ('streak_lost', 'streak_milestone', 'streak_reminder_email') and not core.daily_streak_on() then
    return jsonb_build_object('skip', 'daily_streak_off');
  end if;
  if p_kind = 'streak_reminder_email' then
    if core.athens_day(now()) is distinct from (p_payload ->> 'day')::date
       or extract(hour from now() at time zone 'Europe/Athens') >= 22 then
      return jsonb_build_object('skip', 'late');
    end if;
    if (select g.day_last from core.user_game_state g where g.user_id = p_user) >= (p_payload ->> 'day')::date then
      return jsonb_build_object('skip', 'played');
    end if;
  elsif p_kind = 'streak_lost' then
    if (select g.day_last from core.user_game_state g where g.user_id = p_user) >= (p_payload ->> 'day')::date then
      return jsonb_build_object('skip', 'started_again');
    end if;
  end if;

  if p_kind = 'pro_welcome' then
    -- refunded or ended before it went out
    if not core.is_pro(p_user) then return jsonb_build_object('skip', 'not_pro'); end if;

  elsif p_kind = 'pro_trial_day5' then
    select * into v_trial from core.entitlements
     where user_id = p_user and key = 'pro' and source = 'trial' and status = 'active' and ends_at > now()
     order by ends_at desc limit 1;
    if v_trial.user_id is null then return jsonb_build_object('skip', 'not_on_trial'); end if;
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type = 'CANCELLATION' then return jsonb_build_object('skip', 'cancelled'); end if;
    -- the plan as it is now: a change inside the week names the new one
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'PRODUCT_CHANGE']);
    v_prod := coalesce(core.store_product_id(nullif(coalesce(v_last.raw -> 'event', v_last.raw) ->> 'new_product_id', '')),
                       v_last.product_id);
    return jsonb_build_object('payload',
      coalesce(core.email_plan(v_prod), '{}'::jsonb) || jsonb_build_object('ends_at', v_trial.ends_at));

  elsif p_kind = 'pro_cancel' then
    v_last := core.pro_last_event(p_user, array['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'CANCELLATION',
                                                 'UNCANCELLATION', 'EXPIRATION']);
    if v_last.event_type in ('UNCANCELLATION', 'RENEWAL', 'INITIAL_PURCHASE') then
      return jsonb_build_object('skip', 'uncancelled');
    end if;
    -- ended already (a refund after the cancellation, or the date passed): the date in the email would be wrong
    if not core.is_pro(p_user) or (p_payload ->> 'ends_at')::timestamptz <= now() then
      return jsonb_build_object('skip', 'ended');
    end if;

  elsif p_kind = 'pro_winback' then
    if core.is_pro(p_user) then return jsonb_build_object('skip', 'pro_again'); end if;
  end if;
  return null;
end;
$$;
revoke all on function core.email_gate(text, uuid, jsonb) from public, anon, authenticated;

-- core.email_series_sweep as in 20270426000000_email_series.sql, plus the σερί line in the Monday payload
create or replace function core.email_series_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  s        core.email_settings;
  v_today  date := core.athens_day(p_now);
  v_month  text := core.month_key(p_now);
  v_ten    timestamptz := core.email_slot(core.athens_day(p_now), 10);
  v_nine   timestamptz := core.email_slot(core.athens_day(p_now), 9);
  v_at10   boolean;
  r        record;
  v_n      int := 0;
  v_open   int;
  v_pay    jsonb;
  v_areas  text[];
  v_a      jsonb;
  v_b      jsonb;
  v_prev   text;
begin
  select * into s from core.email_settings;
  if s.mode = 'off' then return 0; end if;
  v_at10 := p_now >= v_ten and p_now < v_ten + interval '4 hours';

  -- ── day1_vote: the first 10:00 at least 24 hours after signing up, no match vote, matches open today ──
  if v_at10 then
    select count(*) into v_open from core.email_open_matches(v_today, p_now);
    if v_open > 0 then
      for r in
        select pr.user_id from core.profiles pr
         where pr.deleted_at is null and pr.created_at >= s.start_at
           and pr.created_at > p_now - interval '3 days' and pr.created_at <= p_now - interval '24 hours'
           and (case when ((pr.created_at + interval '24 hours') at time zone 'Europe/Athens')::time <= time '10:00'
                     then core.athens_day(pr.created_at + interval '24 hours')
                     else core.athens_day(pr.created_at + interval '24 hours') + 1 end) = v_today
           and not exists (select 1 from core.votes v where v.user_id = pr.user_id and v.subject_type = 'match')
           and not exists (select 1 from core.emails e where e.dedupe_key = 'day1:' || pr.user_id)
      loop
        continue when not core.email_game_ok(r.user_id, p_now);
        v_areas := core.email_areas(r.user_id);
        perform core.email_queue(r.user_id, 'day1_vote', 'day1:' || r.user_id,
          jsonb_build_object('open', v_open,
            'matches', (select coalesce(jsonb_agg(core.email_match_json(x.match_id) order by x.in_area desc, x.starts_at, x.match_id), '[]'::jsonb)
                          from (select * from core.email_open_matches(v_today, p_now, v_areas) o
                                 order by o.in_area desc, o.starts_at, o.match_id limit 2) x)),
          p_now);
        v_n := v_n + 1;
      end loop;
    end if;
  end if;

  -- ── day3_follow: day 3, 10:00, follows nobody; up to 3 popular players of their area ──
  if v_at10 then
    for r in
      select pr.user_id, pr.claimed_player_id from core.profiles pr
       where pr.deleted_at is null and pr.created_at >= s.start_at
         and core.athens_day(pr.created_at) = v_today - 3
         and not exists (select 1 from core.follows f where f.user_id = pr.user_id)
         and not exists (select 1 from core.emails e where e.dedupe_key = 'day3:' || pr.user_id)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      v_areas := core.email_areas(r.user_id);
      -- the order of api.suggest_players: their area, then their region, then followers and matches
      select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'matches', x.season) order by x.rank), '[]'::jsonb)
        into v_a
        from (
          select btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))) as name,
                 (select count(*)::int from core.match_participants mp join core.matches m on m.id = mp.match_id
                   where mp.player_id = p.id and m.approved and m.status <> 'void' and m.starts_at is not null
                     and extract(year from core.athens_day(m.starts_at)) = extract(year from v_today)) as season,
                 row_number() over (
                   order by (p.area_id = any (v_areas)) desc,
                            (p.area_id in (select a.id from core.areas a
                                            where a.region in (select region from core.areas where id = any (v_areas)))) desc,
                            (select count(*) from core.follows x where x.player_id = p.id) desc,
                            (select count(*) from core.match_participants mp where mp.player_id = p.id) desc,
                            p.surname, p.first_name) as rank
            from core.players p
           where p.status = 'active' and not p.hidden and not p.is_minor and p.id is distinct from r.claimed_player_id
           order by rank
           limit 3) x;
      continue when jsonb_array_length(v_a) = 0;
      perform core.email_queue(r.user_id, 'day3_follow', 'day3:' || r.user_id, jsonb_build_object('players', v_a), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── day7_week: day 7, 10:00, at least one match vote in the first 7 days ──
  if v_at10 then
    for r in
      select pr.user_id from core.profiles pr
       where pr.deleted_at is null and pr.created_at >= s.start_at
         and core.athens_day(pr.created_at) = v_today - 7
         and exists (select 1 from core.votes v where v.user_id = pr.user_id and v.subject_type = 'match'
                       and v.created_at < pr.created_at + interval '7 days')
         and not exists (select 1 from core.emails e where e.dedupe_key = 'day7:' || pr.user_id)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      select jsonb_build_object(
               'votes', count(*)::int,
               'resolved', count(*) filter (where v.outcome in ('correct', 'wrong'))::int,
               'correct', count(*) filter (where v.outcome = 'correct')::int)
        into v_pay
        from core.votes v where v.user_id = r.user_id and v.subject_type = 'match';
      v_pay := v_pay || jsonb_build_object(
        'streak', coalesce((select g.streak from core.user_game_state g where g.user_id = r.user_id), 0),
        'points', coalesce((select g.total_points from core.user_game_state g where g.user_id = r.user_id), 0),
        'ladder', core.email_ladder(r.user_id, v_month));
      perform core.email_queue(r.user_id, 'day7_week', 'day7:' || r.user_id, v_pay, p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── day14_missed: day 14, 10:00 (days 15 and 16 when a results push or the cap held it), away for the last 7
  --    days, and something happened while away; once ──
  if v_at10 then
    for r in
      select x.user_id, x.since from (
        select pr.user_id, core.email_last_opened(pr.user_id) as since from core.profiles pr
         where pr.deleted_at is null and pr.created_at >= s.start_at
           and core.athens_day(pr.created_at) between v_today - 16 and v_today - 14
           and not exists (select 1 from core.emails e where e.dedupe_key = 'day14:' || pr.user_id)) x
       where x.since <= p_now - interval '7 days'
    loop
      continue when not core.email_game_ok(r.user_id, p_now) or core.email_results_push_today(r.user_id, p_now);
      -- the upsets while away: the winner had under the sport's share of the votes
      select count(*)::int,
             coalesce(jsonb_agg(core.email_result_json(u.id) || jsonb_build_object('share', u.share)
                                order by u.rn) filter (where u.rn <= 2), '[]'::jsonb)
        into v_open, v_a
        from (
          select m.id, round(100.0 * sp.for_winner / sp.total)::int as share,
                 row_number() over (order by sp.for_winner::numeric / sp.total, m.starts_at desc, m.id) as rn
            from core.matches m join core.match_results res on res.match_id = m.id
            cross join lateral (
              select count(*)::int as total, count(*) filter (where vv.option = res.winner_side)::int as for_winner
                from core.votes vv where vv.subject_type = 'match' and vv.subject_id = m.id) sp
           where m.starts_at between r.since and p_now and sp.total > 0
             and core.is_upset(sp.for_winner, sp.total, core.sport_rules(m.sport_id))
             and core.email_match_shown(m.id)) u;
      -- the players they follow: their results while away, the 3 newest
      select coalesce(jsonb_agg(core.email_result_json(f.id) || jsonb_build_object('player', f.player, 'won', f.won)
                                order by f.starts_at desc, f.id), '[]'::jsonb)
        into v_b
        from (
          select d.* from (
            select distinct on (m.id) m.id, m.starts_at, mp.side = res.winner_side as won,
                   btrim(concat_ws(' ', nullif(btrim(p.first_name), ''), nullif(btrim(p.surname), ''))) as player
              from core.follows fo
              join core.match_participants mp on mp.player_id = fo.player_id
              join core.players p on p.id = fo.player_id
              join core.matches m on m.id = mp.match_id
              join core.match_results res on res.match_id = m.id
             where fo.user_id = r.user_id and m.starts_at between r.since and p_now and core.email_match_shown(m.id)
             order by m.id, p.surname, p.first_name) d
          order by d.starts_at desc, d.id
          limit 3) f;
      continue when v_open = 0 and jsonb_array_length(v_b) = 0;
      perform core.email_queue(r.user_id, 'day14_missed', 'day14:' || r.user_id,
        jsonb_build_object('upsets', v_open, 'upset_list', v_a, 'followed', v_b), p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── monday: 09:00, everyone with a match vote last week (Monday to Sunday), and while the daily σερί is on
  --    everyone with a σερί too, so quiz-only players see their line (founder, 18 Nov) ──
  if extract(isodow from v_today) = 1 and p_now >= v_nine and p_now < v_nine + interval '4 hours' and v_nine >= s.start_at then
    for r in
      select w.user_id from (
        select v.user_id from core.votes v
         where v.subject_type = 'match' and v.day_key between v_today - 7 and v_today - 1
        union
        select g.user_id from core.user_game_state g
         where core.daily_streak_on() and g.streak > 0) w
        join core.profiles pr on pr.user_id = w.user_id and pr.deleted_at is null
       where not exists (select 1 from core.emails e
                          where e.dedupe_key = 'monday:' || w.user_id || ':' || to_char(v_today, 'IYYY-IW'))
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      select jsonb_build_object(
               'date', v_today,
               'votes', count(*)::int,
               'resolved', count(*) filter (where v.outcome in ('correct', 'wrong'))::int,
               'correct', count(*) filter (where v.outcome = 'correct')::int)
        into v_pay
        from core.votes v
       where v.user_id = r.user_id and v.subject_type = 'match' and v.day_key between v_today - 7 and v_today - 1;
      -- the players they follow who play this week, as scheduled now
      select coalesce(jsonb_agg(core.email_match_json(w.id) order by w.starts_at, w.id), '[]'::jsonb)
        into v_a
        from (select m.id, m.starts_at from core.matches m
               where m.approved and m.status in ('announced', 'scheduled') and m.postponed_at is null
                 and m.starts_at is not null and m.starts_at > p_now
                 and core.athens_day(m.starts_at) between v_today and v_today + 6
                 and exists (select 1 from core.match_participants mp join core.follows fo on fo.player_id = mp.player_id
                              where mp.match_id = m.id and fo.user_id = r.user_id)
                 and core.email_match_shown(m.id)
               order by m.starts_at, m.id limit 3) w;
      v_pay := v_pay || jsonb_build_object(
        'streak', coalesce((select g.streak from core.user_game_state g where g.user_id = r.user_id), 0),
        'ladder', core.email_ladder(r.user_id, v_month),
        'followed', v_a);
      -- the daily σερί line (20270427000000_daily_streak): the σερί, the days played last week, the days a freeze covered
      if core.daily_streak_on() then
        v_pay := v_pay || jsonb_build_object('days', jsonb_build_object(
          'n', coalesce((select g.streak from core.user_game_state g where g.user_id = r.user_id), 0),
          'played', (select count(*)::int from core.streak_days d where d.user_id = r.user_id and d.kind = 'played'
                       and d.day between v_today - 7 and v_today - 1),
          'frozen', (select coalesce(jsonb_agg(d.day order by d.day), '[]'::jsonb) from core.streak_days d
                      where d.user_id = r.user_id and d.kind = 'frozen' and d.day between v_today - 7 and v_today - 1)));
      end if;
      perform core.email_queue(r.user_id, 'monday', 'monday:' || r.user_id || ':' || to_char(v_today, 'IYYY-IW'), v_pay, p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── month_close: the 1st, 10:00, everyone with points in the closed month without a medal ──
  if extract(day from v_today) = 1 and v_at10 and v_ten >= s.start_at then
    v_prev := to_char(v_today - 1, 'YYYY-MM');
    for r in
      select lm.user_id, l.tier, lm.final_rank, lm.final_points, lm.outcome,
             (select count(*)::int from core.league_members x where x.league_id = l.id) as size
        from core.league_members lm
        join core.leagues l on l.id = lm.league_id
        join core.profiles pr on pr.user_id = lm.user_id and pr.deleted_at is null
       where l.month_key = v_prev and l.closed_at is not null
         and lm.final_rank is not null and coalesce(lm.final_points, 0) > 0
         and not exists (select 1 from core.month_medals mm where mm.user_id = lm.user_id and mm.month_key = v_prev)
         and not exists (select 1 from core.emails e where e.dedupe_key = 'month_close:' || lm.user_id || ':' || v_prev)
    loop
      continue when not core.email_game_ok(r.user_id, p_now);
      perform core.email_queue(r.user_id, 'month_close', 'month_close:' || r.user_id || ':' || v_prev,
        jsonb_build_object('month', v_prev, 'tier', r.tier, 'place', r.final_rank, 'size', r.size,
                           'points', r.final_points, 'outcome', r.outcome,
                           'next_tier', case r.outcome
                                          when 'promoted' then case r.tier when 'bronze' then 'silver' else 'gold' end
                                          when 'relegated' then case r.tier when 'gold' then 'silver' else 'bronze' end
                                          else r.tier end,
                           'next_month', to_char(v_today, 'YYYY-MM')),
        p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  -- ── away30: 10:00, 30 days without opening the app, reached after the start; once ever ──
  if v_at10 then
    for r in
      select x.user_id, x.since from (
        select pr.user_id, core.email_last_opened(pr.user_id) as since from core.profiles pr
         where pr.deleted_at is null
           and not exists (select 1 from core.emails e where e.user_id = pr.user_id and e.kind = 'away30')) x
       where x.since <= p_now - interval '30 days' and x.since + interval '30 days' >= s.start_at
    loop
      continue when not core.email_game_ok(r.user_id, p_now) or core.email_results_push_today(r.user_id, p_now);
      v_areas := core.email_areas(r.user_id);
      perform core.email_queue(r.user_id, 'away30', 'away30:' || r.user_id,
        jsonb_build_object(
          'days', floor(extract(epoch from p_now - r.since) / 86400)::int,
          'near', cardinality(v_areas) > 0,
          'tournaments', (select count(*)::int from core.tournaments t
                           where t.active and not t.is_minor_event
                             and t.starts_on between core.athens_day(r.since) and v_today
                             and (cardinality(v_areas) = 0
                                  or t.area_id in (select a.id from core.areas a
                                                    where a.region in (select region from core.areas where id = any (v_areas))))),
          'matches', (select count(*)::int from core.matches m join core.match_results res on res.match_id = m.id
                       where m.approved and m.status <> 'void' and m.starts_at between r.since and p_now)),
        p_now);
      v_n := v_n + 1;
    end loop;
  end if;

  return v_n;
end;
$$;
revoke all on function core.email_series_sweep(timestamptz) from public, anon, authenticated;

-- ── 11. the switch-on: starting values from real history ──────────────────────────────────────────────────────────
-- Every account's σερί from their real consecutive Athens days with a qualifying action (match votes by day_key,
-- quiz sets with every card answered on the day of the last answer, and days already kept), ending today or
-- yesterday; the ΠΡ is the longest run ever. Freezes they own stay; none is spent on the past. Frames for runs
-- already made (7, 10, 30, 100 days) are given quietly, never taken. Returns how many accounts got a σερί.
create or replace function core.day_streak_backfill_all(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_today date := core.athens_day(p_now);
  g       record;
  v_days  date[];
  v_res   jsonb;
  v_n     int := 0;
begin
  for g in select * from core.user_game_state order by user_id loop
    select coalesce(array_agg(distinct d order by d), '{}') into v_days from (
      select v.day_key as d from core.votes v where v.user_id = g.user_id and v.subject_type = 'match'
      union
      select core.athens_day(max(v.created_at)) from core.quiz_sets s
        join core.quiz_set_cards c on c.set_id = s.id
        left join core.votes v on v.subject_type = 'card' and v.subject_id = c.id and v.user_id = s.user_id
       where s.user_id = g.user_id
       group by s.id having count(v.id) = count(c.id)
      union
      select sd.day from core.streak_days sd where sd.user_id = g.user_id and sd.kind = 'played'
    ) x where d is not null;
    v_res := core.day_streak_backfill(v_days, v_today);
    insert into core.streak_days (user_id, day, kind)
    select g.user_id, d, 'played' from unnest(v_days) d where d <= v_today
    on conflict (user_id, day) do update set kind = 'played';
    if (v_res ->> 'current')::int > 0 or g.streak > 0 then
      insert into core.streak_events (user_id, streak_before, streak_after, kind, day)
      values (g.user_id, g.streak, (v_res ->> 'current')::int, 'backfill', v_today);
    end if;
    update core.user_game_state
       set streak = (v_res ->> 'current')::int, streak_best = (v_res ->> 'best')::int,
           day_last = (v_res ->> 'lastPlayed')::date, day_through = (v_res ->> 'lastPlayed')::date,
           record_run = (v_res ->> 'recordRun')::boolean, version = version + 1, updated_at = now()
     where user_id = g.user_id;
    insert into core.user_cosmetics (user_id, item_id, source)
    select g.user_id, c.id, 'earned' from core.cosmetic_items c
     where (c.key = 'frame_seven' and (v_res ->> 'best')::int >= 7) or (c.key = 'frame_ten' and (v_res ->> 'best')::int >= 10)
        or (c.key = 'frame_month' and (v_res ->> 'best')::int >= 30) or (c.key = 'frame_hundred' and (v_res ->> 'best')::int >= 100)
    on conflict do nothing;
    if (v_res ->> 'current')::int > 0 then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.day_streak_backfill_all(timestamptz) from public, anon, authenticated;

-- The admin's switch (Game page). No argument: where it stands. true (admins only): the daily σερί starts now, with
-- everyone's starting values (core.day_streak_backfill_all), the two new Frames in the catalogue and the earn lines
-- in days. false: back to correct calls (streak and streak_best take the correct-calls numbers again; the days stay
-- recorded, and switching on again recomputes from them).
create or replace function api.admin_daily_streak(p_on boolean default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_on   boolean := core.daily_streak_on();
  v_done int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_on is not null and not core.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_on is true and not v_on then
    perform pg_advisory_xact_lock(hashtextextended('daily_streak_switch', 0));
    update core.game_settings set daily_streak = true, daily_streak_at = now(), updated_at = now(), updated_by = auth.uid() where id;
    -- while off, streak and streak_best are the correct calls: they become calls_streak and calls_best
    update core.user_game_state set calls_streak = streak, calls_best = streak_best
     where calls_streak <> streak or calls_best <> streak_best;
    v_done := core.day_streak_backfill_all(now());
    update core.cosmetic_items set active = true where key in ('frame_month', 'frame_hundred');
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 7 μέρες στη σειρά' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 10 μέρες στη σειρά' where key = 'frame_ten';
  elsif p_on is false and v_on then
    update core.game_settings set daily_streak = false, updated_at = now(), updated_by = auth.uid() where id;
    update core.user_game_state set streak = calls_streak, streak_best = calls_best, record_run = false,
           version = version + 1, updated_at = now()
     where streak <> calls_streak or streak_best <> calls_best or record_run;
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 7 σωστές στη σειρά' where key = 'frame_seven';
    update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 10 σωστές στη σειρά' where key = 'frame_ten';
  end if;

  return (select jsonb_build_object(
            'on', gs.daily_streak, 'since', gs.daily_streak_at, 'backfilled', v_done,
            'players', (select count(*)::int from core.user_game_state where streak > 0 and gs.daily_streak),
            'best', (select coalesce(max(streak), 0) from core.user_game_state where gs.daily_streak),
            'played_today', (select count(*)::int from core.user_game_state where gs.daily_streak and day_last = core.athens_day()))
            from core.game_settings gs where gs.id);
end;
$$;
revoke all on function api.admin_daily_streak(boolean) from public, anon;
grant execute on function api.admin_daily_streak(boolean) to authenticated, service_role;

-- ── 12. the jobs ──────────────────────────────────────────────────────────────────────────────────────────────────
-- always scheduled; each returns at once while the switch is off. UTC schedules, the functions keep to Athens time.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-day-streak', '7 * * * *', $c$select core.day_streak_nightly()$c$);
    perform cron.schedule('np-streak-push', '*/10 * * * *', $c$select core.streak_push_sweep()$c$);
    perform cron.schedule('np-streak-email', '5 * * * *', $c$select core.streak_email_sweep()$c$);
  end if;
end;
$$;
