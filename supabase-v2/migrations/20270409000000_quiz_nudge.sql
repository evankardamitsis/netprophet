-- «Quiz της ημέρας» push (founder, 4 Nov 2026: "players that have not completed it get a couple every week not every
-- day"; "finished for pro should mean all answers"). Tuesday and Friday at 17:00 Athens, to accounts with a device with
-- questions left today: every card of their set answered is finished, so 6 free and 12 Pro. The +30 still comes with the
-- sixth answer, so a Pro past it gets a line without the +30. It is a personal push, so it counts for the 3 a day
-- (core.personal_push) and a day already full skips it. Marked once considered, sent or not. Switch: quiz. The texts are
-- core.notification_texts, editable in the admin.

insert into core.notification_texts (key, label_el, title, body, placeholders, pro, sort) values
  ('quiz_nudge', 'Το quiz της ημέρας δεν έχει ξεκινήσει, Τρίτη και Παρασκευή στις 17:00 ({n}: 6, ή 12 με Pro)',
   'Quiz της ημέρας', '{n} γρήγορες ερωτήσεις και +30 πόντοι. Ακόμα προλαβαίνεις.', '{n}', false, 183),
  ('quiz_nudge_started', 'Το quiz της ημέρας έμεινε στη μέση, πριν το +30 ({done}: πόσες απάντησε, {total}: 6, ή 12 με Pro)',
   'Έχεις κάνει {done} από τα {total}', 'Τελείωσε το quiz της ημέρας και πάρε +30.', '{done,total}', false, 184),
  ('quiz_nudge_rest', 'Pro που πήρε το +30 και έχει ακόμα ερωτήσεις ({done}: πόσες απάντησε, {total}: όλες)',
   'Έχεις κάνει {done} από τα {total}', 'Το +30 το πήρες. Τελείωσε και τις υπόλοιπες.', '{done,total}', true, 185)
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
    select x.user_id, x.paid, x.done, coalesce(nullif(x.cards, 0), case when core.is_pro(x.user_id) then 12 else 6 end) as total
      from (
        select u.user_id, s.awarded_at is not null as paid,
               (select count(*)::int from core.quiz_set_cards c where c.set_id = s.id) as cards,
               (select count(*)::int from core.votes v join core.quiz_set_cards c on c.id = v.subject_id
                 where v.user_id = u.user_id and v.subject_type = 'card' and c.set_id = s.id) as done
          from (select distinct pt.user_id from core.push_tokens pt) u
          left join core.quiz_sets s on s.user_id = u.user_id and s.quiz_day = v_day
         where core.push_wants(u.user_id, 'quiz')
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

-- in UTC, so both 14:00 (summer) and 15:00 (winter); the function keeps to 17:00 Athens and each person to once a day
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-quiz-nudge', '*/10 14-15 * * 2,5', $c$select core.quiz_nudge_sweep()$c$);
  end if;
end;
$$;
