-- Checks after import_roster_matches.sql ran on tools/migrate/test/fixtures.sql. Any failure raises.
\set ON_ERROR_STOP on
do $$
declare
  v_sets jsonb;
  v_n    int;
  v_side int;
  v_fail text[] := '{}';
begin
  -- 101: the tie-break-only set became 7-6 with its tie-break
  select sets into v_sets from core.match_results where match_id = '00000000-0000-4000-8000-000000000101';
  if v_sets is distinct from '[{"w":6,"l":3},{"w":7,"l":6,"tb":[7,4]}]'::jsonb then
    v_fail := v_fail || ('101 sets: ' || coalesce(v_sets::text, 'none'));
  end if;

  -- 102: B won the first set on a tie-break, A won the match: winner first, so that set reads 6-7 [3,7]
  select sets into v_sets from core.match_results where match_id = '00000000-0000-4000-8000-000000000102';
  if v_sets is distinct from '[{"w":6,"l":7,"tb":[3,7]},{"w":6,"l":2},{"w":10,"l":8,"stb":true}]'::jsonb then
    v_fail := v_fail || ('102 sets: ' || coalesce(v_sets::text, 'none'));
  end if;

  -- 103: the later of the two v1 result rows, and a note about it
  select sets into v_sets from core.match_results where match_id = '00000000-0000-4000-8000-000000000103';
  if v_sets is distinct from '[{"w":6,"l":1},{"w":6,"l":1}]'::jsonb then
    v_fail := v_fail || ('103 sets: ' || coalesce(v_sets::text, 'none'));
  end if;
  if not exists (select 1 from etl.rejects where tbl = 'notes' and v1_id = '00000000-0000-4000-8000-000000000103'
                   and reason like 'duplicate_result%') then
    v_fail := v_fail || '103 note missing'::text;
  end if;

  -- 104: player 5 was merged into player 1, so player 1 plays side 1
  select side into v_side from core.match_participants
   where match_id = '00000000-0000-4000-8000-000000000104' and player_id = '00000000-0000-4000-8000-000000000001';
  if v_side is distinct from 1 then v_fail := v_fail || '104 merged player not moved'::text; end if;
  select count(*) into v_n from core.match_participants where player_id = '00000000-0000-4000-8000-000000000005';
  if v_n <> 0 then v_fail := v_fail || '104 merged row still plays'::text; end if;
  if not exists (select 1 from etl.rejects where tbl = 'notes' and v1_id = '00000000-0000-4000-8000-000000000104'
                   and reason like 'merged_player%') then
    v_fail := v_fail || '104 note missing'::text;
  end if;

  -- 105: v1 data error stays out, with the reason
  if exists (select 1 from core.matches where id = '00000000-0000-4000-8000-000000000105') then
    v_fail := v_fail || '105 imported'::text;
  end if;
  if not exists (select 1 from etl.rejects where tbl = 'matches' and v1_id = '00000000-0000-4000-8000-000000000105') then
    v_fail := v_fail || '105 not in rejects'::text;
  end if;

  select count(*) into v_n from core.matches where source_ref like 'v1:%';
  if v_n <> 4 then v_fail := v_fail || ('matches imported: ' || v_n); end if;

  if cardinality(v_fail) > 0 then
    raise exception 'migrate test failed: %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'migrate test: all checks passed';
end $$;
