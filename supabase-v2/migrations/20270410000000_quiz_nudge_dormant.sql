-- The quiz push stops after 30 days without opening the app (founder, 4 Nov 2026), and starts again by itself when they
-- come back. Opening the app leaves two marks and neither is enough alone: a cold launch refreshes the device token
-- (core.push_tokens.last_seen_at), and returning to a suspended app refreshes the sign-in once it has expired
-- (auth.sessions.updated_at), which is not a launch.

create or replace function core.opened_app_since(p_user uuid, p_since timestamptz)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.push_tokens pt where pt.user_id = p_user and pt.last_seen_at >= p_since)
      or exists (select 1 from auth.sessions se where se.user_id = p_user and se.updated_at >= p_since)
$$;
revoke all on function core.opened_app_since(uuid, timestamptz) from public, anon, authenticated;

-- (latest: 20270409000000_quiz_nudge) the same, for whoever opened the app in the last 30 days
create or replace function core.quiz_nudge_sweep(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r       record;
  v_txt   record;
  v_n     int := 0;
  v_local timestamp := p_now at time zone 'Europe/Athens';
  v_day   date := core.quiz_day_key(p_now);
begin
  if extract(isodow from v_local) not in (2, 5) or extract(hour from v_local) <> 17 then return 0; end if;
  for r in
    select x.user_id, x.paid, x.done, coalesce(nullif(x.cards, 0), case when core.is_pro(x.user_id) then 12 else 6 end) as total
      from (
        select u.user_id, s.awarded_at is not null as paid,
               (select count(*)::int from core.quiz_set_cards c where c.set_id = s.id) as cards,
               (select count(*)::int from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                 where v.user_id = u.user_id and v.subject_type = 'card' and c.set_id = s.id) as done
          from (select distinct pt.user_id from core.push_tokens pt) u
          left join core.quiz_sets s on s.user_id = u.user_id and s.quiz_day = v_day
         where core.push_wants(u.user_id, 'quiz')
           and core.opened_app_since(u.user_id, p_now - interval '30 days')
           and not exists (select 1 from core.push_marks k where k.user_id = u.user_id and k.kind = 'quiz' and k.ref = v_day::text)
      ) x
     where x.done < coalesce(nullif(x.cards, 0), case when core.is_pro(x.user_id) then 12 else 6 end)
  loop
    insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'quiz', v_day::text);
    select * into v_txt from core.ntext(case when r.done = 0 then 'quiz_nudge' when r.paid then 'quiz_nudge_rest' else 'quiz_nudge_started' end,
                                        jsonb_build_object('n', r.total, 'done', r.done, 'total', r.total));
    if core.personal_push(r.user_id, 'personal:quiz:' || r.user_id || ':' || v_day, v_txt.title, v_txt.body, '/quiz', p_now) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.quiz_nudge_sweep(timestamptz) from public, anon, authenticated;
