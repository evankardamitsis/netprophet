-- v1 roster, tournaments, matches and results into v2 core (supabase-v2/migration-from-v1.md).
-- Input: schema v1 staged by tools/migrate/stage_v1.py. Users, profiles and claims are not part of this run.
-- Matches: by default only a test sample (the most recent finished ones with a result, -v sample=20); pass
-- -v sample=0 for all of them at cutover. Tournaments follow the matches that are imported.
-- Idempotent: rows already imported are skipped. Every match goes in on its own savepoint; a match that breaks
-- a v2 rule lands in etl.rejects with the reason instead of being forced in.
\set ON_ERROR_STOP on
\if :{?sample}
\else
  \set sample 20
\endif
begin;

create temp table pick on commit drop as
select m.id from v1.matches m
 where :sample = 0
    or m.id in (select m2.id from v1.matches m2 join v1.match_results r on r.match_id = m2.id
                 where m2.status = 'finished' order by m2.start_time desc, m2.id limit nullif(:sample, 0));

create schema if not exists etl;
create table if not exists etl.rejects (
  tbl    text not null,
  v1_id  uuid not null,
  reason text not null,
  row    jsonb,
  at     timestamptz not null default now()
);
delete from etl.rejects where tbl in ('matches', 'match_results');

-- players: all visible (v1 is_hidden meant "unclaimed placeholder"), the one demo player stays out
insert into core.players (id, first_name, surname, gender, birth_year, is_minor, hidden, source, status, created_at, updated_at)
select p.id, btrim(p.first_name), btrim(p.last_name),
       case p.gender when 'men' then 'm' when 'women' then 'f' end,
       case when p.age between 5 and 90 then extract(year from coalesce(p.updated_at, now()))::int - p.age end,
       p.age between 5 and 17,
       false, 'import', 'active',
       coalesce(p.updated_at, now()), coalesce(p.updated_at, now())
  from v1.players p
 where not coalesce(p.is_demo_player, false)
on conflict (id) do nothing;

insert into core.player_sports (player_id, sport_id, hand, initial_level)
select p.id, 'tennis',
       case p.hand when 'left' then 'L' when 'right' then 'R' end,
       nullif(p.ntrp_rating, 0)
  from v1.players p
 where exists (select 1 from core.players c where c.id = p.id)
on conflict do nothing;

-- tournaments and their categories
insert into core.tournaments (id, sport_id, name, venue, starts_on, ends_on, draw_state, active, source, external_ref, created_at, updated_at)
select t.id, 'tennis', btrim(t.name), nullif(btrim(t.location), ''), t.start_date, t.end_date,
       case t.status when 'upcoming' then 'open' when 'active' then 'drawn' else 'done' end,
       t.status <> 'cancelled', 'import', t.id::text,
       coalesce(t.created_at, now()), coalesce(t.updated_at, now())
  from v1.tournaments t
 where t.id in (select tournament_id from v1.matches where id in (select id from pick))
on conflict do nothing;

insert into core.tournament_events (id, tournament_id, name, format, gender, level_min, level_max, created_at)
select c.id, c.tournament_id, btrim(c.name), t.tournament_type,
       case c.gender when 'male' then 'm' when 'female' then 'f' when 'mixed' then 'mixed' end,
       case when c.skill_level_min ~ '^\d+(\.\d)?$' then c.skill_level_min::numeric end,
       case when c.skill_level_max ~ '^\d+(\.\d)?$' then c.skill_level_max::numeric end,
       coalesce(c.created_at, now())
  from v1.tournament_categories c
  join v1.tournaments t on t.id = c.tournament_id
 where exists (select 1 from core.tournaments ct where ct.id = c.tournament_id)
on conflict (id) do nothing;

-- matches, participants and results, one savepoint each
do $$
declare
  m        record;
  r        v1.match_results;
  v_status text;
  v_win    smallint;
  v_sets   jsonb;
  v_i      int;
  v_score  text;
  v_tb     text;
  v_a      int;
  v_b      int;
  v_set    jsonb;
  v_retired boolean;
  v_round  text;
begin
  for m in select * from v1.matches where id in (select id from pick) order by start_time, id loop
    continue when exists (select 1 from core.matches where source = 'import' and source_ref = 'v1:' || m.id);

    select * into r from v1.match_results where match_id = m.id;
    v_status := case m.status
                  when 'cancelled' then 'void'
                  when 'finished' then case when r.id is not null then 'confirmed' else 'played' end
                  else 'scheduled' end;
    v_round := case m.round::text
                 when 'Round of 64' then 'round64' when 'Round of 32' then 'round32' when 'Round of 16' then 'round16'
                 when 'Quarterfinals' then 'quarter' when 'Semifinals' then 'semi' when 'Finals' then 'final' end;

    begin
      insert into core.matches (id, sport_id, format, status, starts_at, locked_at, tournament_id, event_id, round,
                                source, source_ref, counts_for_levels, approved, provenance, created_at, updated_at)
      values (m.id, 'tennis', m.match_type::text, v_status, m.start_time,
              case when m.locked then m.lock_time end,
              m.tournament_id, m.category_id, v_round,
              'import', 'v1:' || m.id, v_status = 'confirmed', true,
              jsonb_build_object('v1_id', m.id, 'v1_status', m.status),
              coalesce(m.created_at, now()), coalesce(m.updated_at, now()));

      if m.match_type::text = 'singles' then
        insert into core.match_participants (match_id, side, player_id, position) values
          (m.id, 1, m.player_a_id, 1), (m.id, 2, m.player_b_id, 1);
      else
        insert into core.match_participants (match_id, side, player_id, position) values
          (m.id, 1, m.player_a1_id, 1), (m.id, 1, m.player_a2_id, 2),
          (m.id, 2, m.player_b1_id, 1), (m.id, 2, m.player_b2_id, 2);
      end if;
      -- sides and gender rules are a deferred check: run it now, inside this savepoint
      set constraints core.match_participants_check immediate;
      set constraints core.match_participants_check deferred;

      if r.id is not null then
        -- v1 scores read from side A: «2-1» means A won two sets
        v_a := split_part(regexp_replace(r.match_result, '\s*ret.*$', '', 'i'), '-', 1)::int;
        v_b := split_part(regexp_replace(r.match_result, '\s*ret.*$', '', 'i'), '-', 2)::int;
        v_retired := r.match_result ~* 'ret';
        v_win := case when v_a > v_b then 1 when v_b > v_a then 2 end;
        if v_win is null and v_retired then
          v_win := case when r.winner_id in (m.player_a_id, m.player_a1_id, m.player_a2_id) or r.match_winner_team = 'team_a' then 1 else 2 end;
        end if;
        if v_win is null then
          raise exception 'result_without_winner: %', r.match_result;
        end if;
        if (v_win = 1) <> (r.winner_id in (m.player_a_id, m.player_a1_id, m.player_a2_id) or coalesce(r.match_winner_team, '') = 'team_a') then
          raise exception 'winner_disagrees: score % but winner_id says the other side', r.match_result;
        end if;

        -- sets, winner first; tie-breaks too
        v_sets := '[]'::jsonb;
        for v_i in 1..5 loop
          v_score := case v_i when 1 then r.set1_score when 2 then r.set2_score when 3 then r.set3_score
                              when 4 then r.set4_score else r.set5_score end;
          exit when v_score is null;
          v_tb := case v_i when 1 then r.set1_tiebreak_score when 2 then r.set2_tiebreak_score
                           when 3 then r.set3_tiebreak_score when 4 then r.set4_tiebreak_score else r.set5_tiebreak_score end;
          v_a := split_part(v_score, '-', 1)::int;
          v_b := split_part(v_score, '-', 2)::int;
          v_set := case when v_win = 1 then jsonb_build_object('w', v_a, 'l', v_b) else jsonb_build_object('w', v_b, 'l', v_a) end;
          if v_tb ~ '^\d+-\d+$' then
            v_set := v_set || jsonb_build_object('tb', case when v_win = 1
              then jsonb_build_array(split_part(v_tb, '-', 1)::int, split_part(v_tb, '-', 2)::int)
              else jsonb_build_array(split_part(v_tb, '-', 2)::int, split_part(v_tb, '-', 1)::int) end);
          end if;
          v_sets := v_sets || jsonb_build_array(v_set);
        end loop;
        if r.super_tiebreak_score ~ '^\d+-\d+$' then
          v_a := split_part(r.super_tiebreak_score, '-', 1)::int;
          v_b := split_part(r.super_tiebreak_score, '-', 2)::int;
          v_sets := v_sets || jsonb_build_array(case when v_win = 1
            then jsonb_build_object('w', v_a, 'l', v_b, 'stb', true)
            else jsonb_build_object('w', v_b, 'l', v_a, 'stb', true) end);
        end if;

        if jsonb_array_length(v_sets) = 0 and not v_retired then
          -- v2 needs the sets of a finished match: keep the match as played, report the result
          update core.matches set status = 'played', counts_for_levels = false where id = m.id;
          insert into etl.rejects (tbl, v1_id, reason, row)
          values ('match_results', m.id, 'no_set_scores: only «' || r.match_result || '» in v1', to_jsonb(r));
        else
          insert into core.match_results (match_id, winner_side, sets, retired, result_version, entered_at)
          values (m.id, v_win, v_sets, v_retired, 1, coalesce(r.created_at, now()));
        end if;
      end if;
    exception when others then
      insert into etl.rejects (tbl, v1_id, reason, row) values ('matches', m.id, sqlerrm, to_jsonb(m));
    end;
  end loop;
end $$;

commit;

-- report
select 'players' as what, count(*) from core.players where source = 'import'
union all select 'player levels (from NTRP)', count(*) from core.player_sports where initial_level is not null
union all select 'tournaments', count(*) from core.tournaments where source = 'import'
union all select 'tournament events', count(*) from core.tournament_events e join core.tournaments t on t.id = e.tournament_id and t.source = 'import'
union all select 'matches', count(*) from core.matches where source = 'import'
union all select '  confirmed with result', count(*) from core.matches m join core.match_results r on r.match_id = m.id where m.source = 'import'
union all select '  played, no result', count(*) from core.matches where source = 'import' and status = 'played'
union all select '  scheduled (past)', count(*) from core.matches where source = 'import' and status = 'scheduled'
union all select '  void (cancelled)', count(*) from core.matches where source = 'import' and status = 'void'
union all select 'rejected matches', count(*) from etl.rejects where tbl = 'matches'
union all select 'results kept out (no sets)', count(*) from etl.rejects where tbl = 'match_results';

select tbl, reason, count(*) from etl.rejects group by 1, 2 order by 3 desc;
