-- M4: Pro draw alerts («Βγήκε η κλήρωση», monetization plan, «Τα τουρνουά σου»). When an organiser's draw sheet first
-- puts a Pro player's claimed profile in a draw, the player gets a push: the tournament, the category and the first
-- opponent (or the bye, or the group). Once per person per draw, never again on later runs. Not for a tournament
-- that is over, nor when the player's first match in it is already played (an old draw read for the first time).

create or replace function core.draw_alert(p_tournament uuid, p_tab text)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  d     core.tournament_draws;
  t     core.tournaments;
  r     record;
  v_n   int := 0;
  v_key text;
  v_opp jsonb;
  v_who text;
  v_body text;
  v_msg jsonb;
begin
  select * into d from core.tournament_draws where tournament_id = p_tournament and tab = p_tab;
  select * into t from core.tournaments where id = p_tournament;
  if d.tournament_id is null or t.id is null or core.tournament_state(t) = 'done' then return 0; end if;
  for r in
    select distinct on (p.claimed_by_user_id) p.claimed_by_user_id as user_id, (en ->> 'pos')::int as pos
      from jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
      join core.players p on p.id = (pl ->> 'player_id')::uuid
     where p.claimed_by_user_id is not null and core.is_pro(p.claimed_by_user_id)
  loop
    v_key := 'draw:' || r.user_id || ':' || p_tournament || ':' || p_tab;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    if d.format = 'knockout' then
      -- the first round pairs 1-2, 3-4, ...: skip when that match already has a winner
      continue when exists (select 1 from jsonb_array_elements(d.draw -> 'rounds' -> 0) m
                             where (m ->> 'slot')::int = (r.pos + 1) / 2 and m ->> 'winner' is not null);
      select en into v_opp from jsonb_array_elements(d.draw -> 'entrants') en
       where (en ->> 'pos')::int = case when r.pos % 2 = 1 then r.pos + 1 else r.pos - 1 end;
      if v_opp is null or coalesce((v_opp ->> 'bye')::boolean, false) then
        v_body := 'περνάς κατευθείαν στον 2ο γύρο';
      else
        select string_agg(coalesce(nullif(btrim(p.surname), ''), pl ->> 'raw'), ' / ' order by o) into v_who
          from jsonb_array_elements(v_opp -> 'players') with ordinality x(pl, o)
          left join core.players p on p.id = (pl ->> 'player_id')::uuid;
        v_body := 'πρώτος γύρος με ' || coalesce(v_who, v_opp ->> 'raw');
      end if;
    else
      v_body := 'παίζεις σε όμιλο';
    end if;
    v_msg := jsonb_build_object('title', 'Βγήκε η κλήρωση', 'body', t.name || ' · ' || d.tab || ': ' || v_body,
                                'data', jsonb_build_object('tournament_id', t.id, 'tab', d.tab));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'draw', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'draw', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.draw_alert(uuid, text) from public;

create or replace function core.draw_alert_on_change()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.draw_alert(new.tournament_id, new.tab);
  return null;
end;
$$;
create trigger draw_alert_on_change after insert or update of draw on core.tournament_draws
  for each row execute function core.draw_alert_on_change();
