-- Edit a published result (founder, 6 Nov 2026: "in similar cases we need to open a edit result change and republish").
-- Admin only, as taking points back is (20270116000000_remove_match). A different winner: the votes flip, whoever is now
-- right gets the base points and whoever is now wrong loses what the match paid them, dated in the month they earned it.
-- Chain and upset bonuses are not worked out again and the σερί is never rewritten (packages/core README, rule 15), as in
-- the moderation desk. The same winner with another score moves no points. No push: a result card not yet seen shows the
-- new result, one seen stays seen. A later read of the source does not overwrite an edit (core.ingest_apply leaves a
-- resolved match alone). The ledger allows one row per reason per match and rows never change, so each edit has its own
-- row, referring to core.result_edits.

create table core.result_edits (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references core.matches (id) on delete cascade,
  before     jsonb not null,
  after      jsonb not null,
  edited_by  uuid,
  created_at timestamptz not null default now()
);
create index result_edits_match_idx on core.result_edits (match_id);
alter table core.result_edits enable row level security;
comment on table core.result_edits is 'Each edit of a published result: what it was, what it became, who did it. Server only.';

create or replace function api.admin_edit_result(
  p_match_id uuid, p_winner_side int, p_sets jsonb,
  p_retired boolean default false, p_walkover boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m     core.matches;
  v_r     core.match_results;
  v_sets  jsonb := coalesce(p_sets, '[]'::jsonb);
  v_flip  boolean;
  v_edit  uuid;
  v_pts   int;
  v_ok    boolean;
  v_out   text;
  v_new   int;
  v_diff  int;
  v_votes int := 0;
  v_moved int := 0;
  r       record;
begin
  if not (core.is_service() or core.is_admin()) then
    raise exception 'admin_only: only an admin can edit a published result' using errcode = '42501';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  select * into v_r from core.match_results where match_id = p_match_id for update;
  if v_r.match_id is null or v_m.status <> 'confirmed' then
    raise exception 'not_published: only a published result can be edited' using errcode = '22023';
  end if;
  if v_r.winner_side = p_winner_side and v_r.sets = v_sets and v_r.retired = coalesce(p_retired, false)
     and v_r.walkover = coalesce(p_walkover, false) then
    return jsonb_build_object('match_id', p_match_id, 'changed', false, 'votes_changed', 0, 'points_moved', 0);
  end if;
  v_flip := v_r.winner_side <> p_winner_side;

  insert into core.result_edits (match_id, before, after, edited_by)
  values (p_match_id,
          jsonb_build_object('winner_side', v_r.winner_side, 'sets', v_r.sets, 'retired', v_r.retired, 'walkover', v_r.walkover),
          jsonb_build_object('winner_side', p_winner_side, 'sets', v_sets, 'retired', coalesce(p_retired, false), 'walkover', coalesce(p_walkover, false)),
          auth.uid())
  returning id into v_edit;

  -- entered_at stays: it is what the push sweep reads as a new result
  update core.match_results
     set winner_side = p_winner_side::smallint, sets = v_sets, sets_won = null, sets_lost = null,
         retired = coalesce(p_retired, false), walkover = coalesce(p_walkover, false), entered_by = auth.uid(),
         result_version = result_version + 1
   where match_id = p_match_id
  returning * into v_r;

  if v_flip then
    v_pts := (core.sport_rules(v_m.sport_id) ->> 'correct')::int;
    for r in select v.id, v.user_id, v.option, v.resolved_at, v.outcome
               from core.votes v
              where v.subject_type = 'match' and v.subject_id = p_match_id and v.resolved_at is not null and v.outcome in ('correct', 'wrong')
    loop
      perform pg_advisory_xact_lock(hashtextextended('user:' || r.user_id::text, 0));
      v_ok := r.option = p_winner_side;
      v_out := case when v_ok then 'correct' else 'wrong' end;
      v_new := case when v_ok then v_pts else 0 end;
      select v_new - coalesce(sum(l.delta), 0)::int into v_diff
        from core.points_ledger l
       where l.user_id = r.user_id
         and ((l.ref_type = 'match' and l.ref_id = p_match_id)
              or (l.ref_type = 'admin' and l.ref_id in (select e.id from core.result_edits e where e.match_id = p_match_id)));
      perform core.award_points(r.user_id, v_diff, 'admin_adjust', 'admin', v_edit, 'edit:' || v_edit || ':' || r.user_id, r.resolved_at);
      v_moved := v_moved + abs(v_diff);
      update core.votes set outcome = v_out, is_upset_call = false, points = v_new where id = r.id;
      if r.outcome <> v_out then
        update core.user_game_state
           set votes_correct = greatest(votes_correct + case when v_ok then 1 else -1 end, 0), updated_at = now()
         where user_id = r.user_id;
        v_votes := v_votes + 1;
      end if;
      update core.feed_inbox
         set payload = payload || jsonb_build_object('outcome', v_out, 'points', v_new, 'upset', false)
       where kind = 'result' and user_id = r.user_id and ref = 'match:' || p_match_id;
    end loop;
  end if;

  update core.feed_inbox
     set payload = payload || jsonb_build_object('winner_side', v_r.winner_side, 'score', v_r.score_summary, 'sets', v_r.sets)
   where kind = 'result' and ref = 'match:' || p_match_id;

  -- votes still waiting close on the new result
  perform core.release_result(p_match_id);
  if v_m.counts_for_levels then
    perform core.recompute_levels(v_m.sport_id);
  end if;
  return jsonb_build_object('match_id', p_match_id, 'changed', true, 'result_version', v_r.result_version,
                            'votes_changed', v_votes, 'points_moved', v_moved);
end;
$$;
revoke all on function api.admin_edit_result(uuid, int, jsonb, boolean, boolean) from public, anon;
grant execute on function api.admin_edit_result(uuid, int, jsonb, boolean, boolean) to authenticated, service_role;

-- removing a match (latest: 20270116000000_remove_match): what edits moved comes back off too
create or replace function api.admin_void_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m       core.matches;
  v_result  boolean;
  v_back    int := 0;
  r         record;
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.status = 'void' then
    return jsonb_build_object('match_id', p_match_id, 'status', 'void', 'points_taken_back', 0);
  end if;
  v_result := v_m.resolved_at is not null or exists (select 1 from core.match_results where match_id = p_match_id);

  if v_result then
    -- taking points back is an admin's call, as deleting a tournament is
    if not (core.is_service() or core.is_admin()) then
      raise exception 'admin_only: only an admin can remove a match that has a result' using errcode = '42501';
    end if;
    update core.votes set outcome = 'none', points = 0
     where subject_type = 'match' and subject_id = p_match_id and resolved_at is not null;
    -- one entry per user, dated in the month the points were earned so this month's Ladder is not charged for an
    -- older match; the ledger keeps one row per reason per match, so it is a correction unless one is there already
    for r in select l.user_id, sum(l.delta)::int as net, min(l.created_at) as earned_at,
                    bool_or(l.ref_type = 'match' and l.reason = 'correction') as corrected
               from core.points_ledger l
              where (l.ref_type = 'match' and l.ref_id = p_match_id)
                 or (l.ref_type = 'admin' and l.ref_id in (select e.id from core.result_edits e where e.match_id = p_match_id))
              group by l.user_id having sum(l.delta) <> 0
    loop
      v_back := v_back + r.net;
      perform core.award_points(r.user_id, -r.net, case when r.corrected then 'admin_adjust' else 'correction' end,
                                'match', p_match_id, 'remove:' || p_match_id || ':' || r.user_id, r.earned_at);
    end loop;
    delete from core.feed_inbox where kind = 'result' and (payload ->> 'match_id')::uuid = p_match_id;
  end if;

  update core.matches
     set status = 'void', counts_for_levels = case when v_result then false else counts_for_levels end, updated_at = now(),
         provenance = provenance || jsonb_build_object('removed', jsonb_build_object('by', auth.uid(), 'at', now(), 'had_result', v_result))
   where id = p_match_id;
  if v_result then
    perform core.recompute_levels(v_m.sport_id);
  end if;
  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':void')
  on conflict (idempotency_key) do nothing;
  return jsonb_build_object('match_id', p_match_id, 'status', 'void', 'points_taken_back', v_back);
end;
$$;
