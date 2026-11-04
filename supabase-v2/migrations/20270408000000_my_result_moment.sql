-- The Pro player's own result, full screen (founder, 4 Nov 2026: "when his results come in, a separate animation by the
-- result when he opens the app again, win or loss, with a link to his stats"). A Pro account with a claimed player gets
-- one celebration per match on feed_inbox, type my_result, with the numbers the screen shows: this year's record, wins in
-- a row and, in singles, the record against this opponent, as they stand after this match. Pro is checked when it is
-- queued. A walkover has no screen. A corrected result updates a screen not yet seen and never replays one already seen.
-- A match in review queues when staff approve it; a removed match drops its unseen screen. From now on only.

create or replace function core.my_result_payload(p_match uuid, p_player uuid, p_side smallint)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_m     core.matches;
  v_r     core.match_results;
  v_year  int;
  v_w     int;
  v_l     int;
  v_row   int;
  v_opp   uuid;
  v_hw    int;
  v_hl    int;
  v_score text;
begin
  select * into v_m from core.matches where id = p_match;
  select * into v_r from core.match_results where match_id = p_match;
  v_year := extract(year from coalesce(v_m.starts_at, v_r.entered_at) at time zone 'Europe/Athens');
  with mine as (
    select m.id, m.format, mr.winner_side = mp.side as won, coalesce(m.starts_at, mr.entered_at) as at
      from core.match_participants mp
      join core.matches m on m.id = mp.match_id
      join core.match_results mr on mr.match_id = m.id
     where mp.player_id = p_player and m.approved and m.status <> 'void' and not mr.walkover
  )
  select count(*) filter (where won and extract(year from at at time zone 'Europe/Athens') = v_year)::int,
         count(*) filter (where not won and extract(year from at at time zone 'Europe/Athens') = v_year)::int,
         coalesce((select count(*)::int from mine x
                    where x.at > coalesce((select max(l.at) from mine l where not l.won), '-infinity'::timestamptz)), 0)
    into v_w, v_l, v_row
    from mine;
  if v_m.format = 'singles' then
    select mp.player_id into v_opp from core.match_participants mp where mp.match_id = p_match and mp.side <> p_side limit 1;
    select count(*) filter (where mr.winner_side = a.side)::int, count(*) filter (where mr.winner_side <> a.side)::int
      into v_hw, v_hl
      from core.match_participants a
      join core.match_participants b on b.match_id = a.match_id and b.player_id = v_opp and b.side <> a.side
      join core.matches m on m.id = a.match_id and m.format = 'singles' and m.approved and m.status <> 'void'
      join core.match_results mr on mr.match_id = m.id and not mr.walkover
     where a.player_id = p_player;
  end if;
  select coalesce(string_agg((x ->> 'w') || '-' || (x ->> 'l'), ' ' order by o), nullif(v_r.score_summary, ''))
    into v_score from jsonb_array_elements(v_r.sets) with ordinality y(x, o);
  return jsonb_build_object('type', 'my_result', 'match_id', p_match, 'win', v_r.winner_side = p_side, 'score', v_score,
                            'opponent', core.opponents_acc(p_match, p_side), 'year_wins', v_w, 'year_losses', v_l,
                            'wins_in_row', case when v_r.winner_side = p_side then v_row else 0 end,
                            'h2h_wins', v_hw, 'h2h_losses', v_hl);
end;
$$;
revoke all on function core.my_result_payload(uuid, uuid, smallint) from public, anon, authenticated;

-- queue the screen for each Pro player of the match; true replaces a screen not yet seen (a corrected result)
create or replace function core.my_result_moment(p_match uuid, p_replace boolean default false)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r   record;
  v_n int := 0;
begin
  if p_replace then
    delete from core.feed_inbox i using core.match_participants mp, core.players p
     where mp.match_id = p_match and p.id = mp.player_id and i.user_id = p.claimed_by_user_id
       and i.kind = 'celebration' and i.ref = 'my_result:' || p_match and i.seen_at is null;
  end if;
  if not exists (select 1 from core.matches m join core.match_results mr on mr.match_id = m.id
                  where m.id = p_match and m.approved and m.status <> 'void' and not mr.walkover) then
    return 0;
  end if;
  for r in
    select p.claimed_by_user_id as user_id, p.id as player, mp.side
      from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and p.claimed_by_user_id is not null and not p.hidden and not p.is_minor
       and core.is_pro(p.claimed_by_user_id)
  loop
    insert into core.feed_inbox (user_id, kind, ref, payload)
    values (r.user_id, 'celebration', 'my_result:' || p_match, core.my_result_payload(p_match, r.player, r.side))
    on conflict (user_id, kind, ref) do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.my_result_moment(uuid, boolean) from public, anon, authenticated;

create or replace function core.my_result_on_result()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  -- a correction only reaches a screen not yet seen: one seen stays seen (the unique ref keeps it from coming back)
  perform core.my_result_moment(new.match_id, tg_op = 'UPDATE');
  return null;
end;
$$;
create trigger my_result_on_insert after insert on core.match_results for each row execute function core.my_result_on_result();
create trigger my_result_on_update after update of winner_side, sets, walkover on core.match_results for each row
  when (old.winner_side is distinct from new.winner_side or old.sets is distinct from new.sets or old.walkover is distinct from new.walkover)
  execute function core.my_result_on_result();

create or replace function core.my_result_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.my_result_moment(new.id, new.status = 'void');
  return null;
end;
$$;
create trigger my_result_on_match after update of approved, status on core.matches for each row
  when ((new.approved and not old.approved) or (new.status = 'void' and old.status <> 'void'))
  execute function core.my_result_on_match();
