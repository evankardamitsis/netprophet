-- Stop a match result contradicting itself at the point of entry.
--
-- Three fields describe the same match and can disagree: the set scores, the
-- `match_result` shorthand, and `winner_id`. When they do, whatever reads them
-- names the loser as the winner — the worst thing a result can say.
--
-- Two rows in the table already disagree (see the report query at the bottom).
-- A trigger fires only on write, so those are left alone for a human to correct
-- rather than being silently rewritten.
--
-- Orientation is settled, not assumed: on all 159 rows where the per-set winner
-- ids are populated, the set score agrees with them read side-a first. So
-- "3-6" always means side a lost that set.
--
-- Deliberately permissive. It blocks contradictions, not incompleteness — a
-- retirement, a half-entered card or an unreadable score all pass, because the
-- goal is to stop wrong data, not to stop work in progress.

create or replace function public.check_match_result_coherence()
returns trigger
language plpgsql
as $$
declare
    v_match        public.matches%rowtype;
    v_scores       text[];
    v_score        text;
    v_left         int;
    v_right        int;
    v_a_sets       int := 0;
    v_b_sets       int := 0;
    v_readable     int := 0;
    v_sets_say     text;
    v_winner_side  text;
    v_a_ids        uuid[];
    v_b_ids        uuid[];
    v_result_left  int;
    v_result_right int;
begin
    -- A retirement leaves partial scores on purpose.
    if coalesce(new.match_result, '') ilike '%ret%' then
        return new;
    end if;

    select * into v_match from public.matches where id = new.match_id;
    if not found then
        return new;
    end if;

    v_scores := array_remove(array[
        new.set1_score, new.set2_score, new.set3_score,
        new.set4_score, new.set5_score, new.super_tiebreak_score
    ], null);

    foreach v_score in array v_scores loop
        begin
            v_left  := split_part(v_score, '-', 1)::int;
            v_right := split_part(v_score, '-', 2)::int;
        exception when others then
            -- Unreadable: no basis to judge, so do not stand in the way.
            return new;
        end;
        v_readable := v_readable + 1;
        if v_left > v_right then
            v_a_sets := v_a_sets + 1;
        elsif v_right > v_left then
            v_b_sets := v_b_sets + 1;
        end if;
    end loop;

    if v_readable = 0 or v_a_sets = v_b_sets then
        return new;
    end if;
    v_sets_say := case when v_a_sets > v_b_sets then 'a' else 'b' end;

    if v_match.match_type = 'doubles' then
        v_a_ids := array_remove(array[v_match.player_a1_id, v_match.player_a2_id], null);
        v_b_ids := array_remove(array[v_match.player_b1_id, v_match.player_b2_id], null);
    else
        v_a_ids := array_remove(array[v_match.player_a_id], null);
        v_b_ids := array_remove(array[v_match.player_b_id], null);
    end if;

    v_winner_side := case
        when new.winner_id = any(v_a_ids) then 'a'
        when new.winner_id = any(v_b_ids) then 'b'
        else null
    end;

    if v_winner_side is not null and v_winner_side <> v_sets_say then
        raise exception using
            errcode = 'check_violation',
            message = format(
                'Ο νικητής δεν συμφωνεί με το σκορ. Τα σετ (%s) δίνουν τη νίκη στην άλλη πλευρά.',
                array_to_string(v_scores, ', ')
            ),
            hint = 'Set scores are written from side A first: "3-6" means side A lost that set.';
    end if;

    begin
        v_result_left  := split_part(new.match_result, '-', 1)::int;
        v_result_right := split_part(new.match_result, '-', 2)::int;
    exception when others then
        return new;
    end;

    if v_result_left <> v_result_right
       and (case when v_result_left > v_result_right then 'a' else 'b' end) <> v_sets_say then
        raise exception using
            errcode = 'check_violation',
            message = format(
                'Το %s δεν συμφωνεί με τα σετ (%s).',
                new.match_result, array_to_string(v_scores, ', ')
            ),
            hint = 'Set scores are written from side A first: "3-6" means side A lost that set.';
    end if;

    return new;
end;
$$;

comment on function public.check_match_result_coherence() is
    'Rejects a match result whose set scores, match_result and winner_id disagree. Blocks contradictions only; incomplete entries pass.';

drop trigger if exists match_result_coherence on public.match_results;
create trigger match_result_coherence
    before insert or update on public.match_results
    for each row execute function public.check_match_result_coherence();

-- Rows already stored that the trigger would now reject. Two at the time of
-- writing; both need a person to decide whether the winner or the scores are
-- the wrong half.
--
--   select r.match_id, r.match_result, r.winner_id,
--          concat_ws(', ', r.set1_score, r.set2_score, r.set3_score,
--                    r.super_tiebreak_score) as sets
--   from public.match_results r
--   join public.matches m on m.id = r.match_id
--   where coalesce(r.match_result, '') not ilike '%ret%'
--     and r.winner_id is distinct from null
--     and (
--       case when r.winner_id in (m.player_a_id, m.player_a1_id, m.player_a2_id)
--            then 'a' else 'b' end
--     ) <> (
--       case when (case when split_part(r.set1_score,'-',1)::int
--                          > split_part(r.set1_score,'-',2)::int then 1 else 0 end
--                + case when split_part(coalesce(r.set2_score,'0-0'),'-',1)::int
--                          > split_part(coalesce(r.set2_score,'0-0'),'-',2)::int then 1 else 0 end
--                + case when split_part(coalesce(r.super_tiebreak_score,'0-0'),'-',1)::int
--                          > split_part(coalesce(r.super_tiebreak_score,'0-0'),'-',2)::int then 1 else 0 end) >= 2
--            then 'a' else 'b' end
--     );
