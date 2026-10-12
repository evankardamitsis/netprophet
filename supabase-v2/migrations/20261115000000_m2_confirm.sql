-- M2 part 2: the other side confirms a player-logged match, in the app (the feed), or disputes it.
-- From the prototype's confirmation («Έγινε έτσι;» → «Έτσι έγινε» / «Όχι ακριβώς» → «Πώς έληξε;» / «Δεν έπαιξα εγώ»).
--   confirmed:            the match counts for levels.
--   same winner, other sets («2-1», not «2-0»): the score is corrected and confirmed; votes are untouched.
--   another winner, or «Δεν έπαιξα εγώ»: the match is disputed and waits for an admin (moderation, M2 part 5).
--   The points its votes earned are taken back with one correction row per person (founder: resolve at once, undo
--   on dispute). The σερί is never rewritten by a correction (packages/core README, rule 15).
-- The logger hears back through a notification row (a push for these comes later).

create or replace function core.dispute_match(p_match uuid, p_reason text)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  update core.matches set status = 'disputed', counts_for_levels = false,
         provenance = provenance || jsonb_build_object('disputed', jsonb_build_object('reason', p_reason, 'at', now()))
   where id = p_match;
  -- one correction row per person: whatever this match paid them, back out (idempotent per person and match)
  perform core.award_points(l.user_id, -l.total, 'correction', 'match', p_match, 'dispute:' || p_match || ':' || l.user_id)
     from (select user_id, sum(delta)::int as total
             from core.points_ledger
            where ref_type = 'match' and ref_id = p_match and reason <> 'correction'
            group by user_id having sum(delta) <> 0) l;
end;
$$;
revoke all on function core.dispute_match(uuid, text) from public;

-- what waits for the viewer's own player: player-logged matches against them, not answered yet
create or replace function api.get_confirmations()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  if v_me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
             'tournament', t.name, 'sides', core.match_sides_json(m.id),
             'my_side', (select mp.side from core.match_participants mp where mp.match_id = m.id and mp.player_id = v_me),
             'winner_side', r.winner_side, 'score', r.score_summary,
             'logged_by', (select jsonb_build_object('first_name', pr.first_name, 'surname', pr.surname)
                             from core.profiles pr where pr.user_id = m.logged_by))
           order by m.starts_at desc)
      from core.match_confirmations c
      join core.matches m on m.id = c.match_id
      join core.match_results r on r.match_id = m.id
      left join core.tournaments t on t.id = m.tournament_id
     where c.player_id = v_me and c.state = 'pending' and m.status = 'confirmed'), '[]'::jsonb);
end;
$$;

-- p_answer: 'yes' | 'fix' | 'not_me'; for 'fix', p_fix = {winner: 'me' | 'them', sets: '2-0' | '2-1'} from the viewer's side
create or replace function api.answer_confirmation(p_match_id uuid, p_answer text, p_fix jsonb default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_me      uuid;
  v_side    smallint;
  v_m       core.matches;
  v_r       core.match_results;
  v_winner  smallint;
  v_lost    int;
  v_outcome text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_answer not in ('yes', 'fix', 'not_me') then raise exception 'bad_answer' using errcode = '22023'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  if not exists (select 1 from core.match_confirmations
                  where match_id = p_match_id and player_id = v_me and state = 'pending') then
    raise exception 'nothing_to_confirm' using errcode = 'P0002';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  select * into v_r from core.match_results where match_id = p_match_id;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = v_me;

  if p_answer = 'yes' then
    update core.match_confirmations set state = 'confirmed', via = 'feed', at = now()
     where match_id = p_match_id and player_id = v_me;
    update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
    v_outcome := 'confirmed';
  elsif p_answer = 'not_me' then
    update core.match_confirmations set state = 'not_me', via = 'feed', at = now()
     where match_id = p_match_id and player_id = v_me;
    perform core.dispute_match(p_match_id, 'not_me');
    v_outcome := 'disputed';
  else
    if p_fix is null or (p_fix ->> 'winner') not in ('me', 'them') or (p_fix ->> 'sets') not in ('2-0', '2-1') then
      raise exception 'bad_fix' using errcode = '22023';
    end if;
    v_winner := case when p_fix ->> 'winner' = 'me' then v_side else 3 - v_side end;
    v_lost := split_part(p_fix ->> 'sets', '-', 2)::int;
    if v_winner = v_r.winner_side then
      -- the same winner: correct the sets, votes stand
      update core.match_results set sets = '[]'::jsonb, sets_won = 2, sets_lost = v_lost,
             result_version = result_version + 1, entered_at = now()
       where match_id = p_match_id;
      update core.match_confirmations set state = 'confirmed', via = 'feed', proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = v_me;
      update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
      v_outcome := 'corrected';
    else
      update core.match_confirmations set state = 'disputed', via = 'feed', proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = v_me;
      perform core.dispute_match(p_match_id, 'other_winner');
      v_outcome := 'disputed';
    end if;
  end if;

  -- the logger hears back
  if v_m.logged_by is not null then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_m.logged_by, 'confirmation',
            jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome, 'by_player', v_me),
            'in_app', 'confirmation:' || p_match_id || ':' || v_me)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome);
end;
$$;

revoke all on function api.get_confirmations() from public, anon;
revoke all on function api.answer_confirmation(uuid, text, jsonb) from public, anon;
grant execute on function api.get_confirmations() to authenticated, service_role;
grant execute on function api.answer_confirmation(uuid, text, jsonb) to authenticated, service_role;
