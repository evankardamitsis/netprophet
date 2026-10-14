-- Pro match reminders (founder, 14 Oct 2026, UX audit: "my tournaments and matches notifications reminders"; times
-- approved: the evening before at 20:00 and two hours before). Every Pro player with a claimed profile in a match
-- still to play gets a push «Αύριο παίζεις» from 20:00 Athens the day before, and «Σε λίγο παίζεις» in the two hours
-- before it starts (not in its last 10 minutes), with the time, the tournament and the opponent. Once each; a match
-- that moves to a new time reminds again. pg_cron runs it every 10 minutes. A tap opens Σήμερα («Το ματς σου»).

create or replace function core.match_reminders(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r      record;
  v_kind text;
  v_opp  text;
  v_key  text;
  v_msg  jsonb;
  v_n    int := 0;
begin
  for r in
    select m.id, m.starts_at, m.tournament_id, t.name as tournament, mp.side, p.claimed_by_user_id as user_id
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id
      join core.players p on p.id = mp.player_id
      left join core.tournaments t on t.id = m.tournament_id
     where m.status in ('announced', 'scheduled') and m.postponed_at is null and m.starts_at is not null
       and m.starts_at > p_now + interval '10 minutes' and m.starts_at <= p_now + interval '30 hours'
       and p.claimed_by_user_id is not null and core.is_pro(p.claimed_by_user_id)
  loop
    v_kind := case
      when r.starts_at - p_now <= interval '2 hours' then 'soon'
      when core.athens_day(r.starts_at) = core.athens_day(p_now) + 1
           and extract(hour from p_now at time zone 'Europe/Athens') >= 20 then 'eve'
    end;
    continue when v_kind is null;
    v_key := 'reminder:' || v_kind || ':' || r.user_id || ':' || r.id || ':' || extract(epoch from r.starts_at)::bigint;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    select string_agg(btrim(p.surname), ' / ' order by mp.position) into v_opp
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = r.id and mp.side <> r.side;
    v_msg := jsonb_build_object(
      'title', case v_kind when 'eve' then 'Αύριο παίζεις' else 'Σε λίγο παίζεις' end,
      'body', case v_kind when 'eve' then core.greek_when(r.starts_at) else to_char(r.starts_at at time zone 'Europe/Athens', 'HH24:MI') end
              || coalesce(' · ' || r.tournament, '') || coalesce(' · με ' || v_opp, ''),
      'data', jsonb_build_object('match_id', r.id, 'tournament_id', r.tournament_id));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'reminder', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'reminder', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.match_reminders(timestamptz) from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-match-reminders', '*/10 * * * *', $c$select core.match_reminders()$c$);
  end if;
end;
$$;
