-- «Quiz της ημέρας» push (founder, 4 Nov 2026: "players that have not completed it get a couple every week not every
-- day"). Tuesday and Friday at 17:00 Athens, to accounts with a device that have not finished today's quiz: the sixth
-- answer is what finishes it (quiz_sets.awarded_at, Pro too). Started and left halfway gets its own line. It is a
-- personal push, so it counts for the 3 a day (core.personal_push) and a day already full skips it. Marked once
-- considered, sent or not. Switch: quiz. The texts are core.notification_texts, editable in the admin.

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('quiz_nudge', 'Το quiz της ημέρας δεν έχει ξεκινήσει, Τρίτη και Παρασκευή στις 17:00',
   'Quiz της ημέρας', 'Έξι γρήγορες ερωτήσεις και +30 πόντοι. Ακόμα προλαβαίνεις.', '{}', false, 183),
  ('quiz_nudge_started', 'Το quiz της ημέρας έμεινε στη μέση, Τρίτη και Παρασκευή στις 17:00 ({done}: πόσες απάντησε)',
   'Έχεις κάνει {done} από τα 6', 'Τελείωσε το quiz της ημέρας και πάρε +30.', '{done}', false, 184)
on conflict (key) do nothing;

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
    select u.user_id,
           (select count(*)::int from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
             where v.user_id = u.user_id and v.subject_type = 'card' and c.set_id = s.id) as done
      from (select distinct pt.user_id from core.push_tokens pt) u
      left join core.quiz_sets s on s.user_id = u.user_id and s.quiz_day = v_day
     where s.awarded_at is null
       and core.push_wants(u.user_id, 'quiz')
       and not exists (select 1 from core.push_marks k where k.user_id = u.user_id and k.kind = 'quiz' and k.ref = v_day::text)
  loop
    insert into core.push_marks (user_id, kind, ref) values (r.user_id, 'quiz', v_day::text);
    select * into v_txt from core.ntext(case when r.done > 0 then 'quiz_nudge_started' else 'quiz_nudge' end,
                                        jsonb_build_object('done', r.done));
    if core.personal_push(r.user_id, 'personal:quiz:' || r.user_id || ':' || v_day, v_txt.title, v_txt.body, '/quiz', p_now) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.quiz_nudge_sweep(timestamptz) from public, anon, authenticated;

-- in UTC, so both 14:00 (summer) and 15:00 (winter); the function keeps to 17:00 Athens and each person to once a day
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-quiz-nudge', '*/10 14-15 * * 2,5', $c$select core.quiz_nudge_sweep()$c$);
  end if;
end;
$$;
