-- 10 upcoming demo matches between real roster players, for testing the feed before launch.
-- Every demo row is marked where players never see it:
--   core.matches.source_ref = 'demo:<n>' and provenance = {"demo": true}
--   core.tournaments.external_ref = 'demo:open'
-- tools/demo/clear_demo.sql removes them and everything they produced (votes, points, feed items).
-- Safe to re-run: does nothing if demo matches already exist.
do $$
declare
  v_t      uuid;
  v_men    uuid[];
  v_women  uuid[];
  v_base   timestamptz;
  v_id     uuid;
  -- n, format, round, venue, area, hours after the first slot
  v_plan   jsonb := '[
    [1, "singles", "quarter", "Γλυφάδα", "glyfada", 0],
    [2, "singles", "quarter", "Γλυφάδα", "glyfada", 1.5],
    [3, "doubles", "Φιλικό", "Κηφισιά", "kifisia", 3],
    [4, "singles", "Φιλικό", "Παγκράτι", "pagrati", 20],
    [5, "singles", "semi", "Γλυφάδα", "glyfada", 22],
    [6, "singles", "Φιλικό", "Μαρούσι", "marousi", 26],
    [7, "doubles", "Φιλικό", "Βούλα", "voula", 44],
    [8, "singles", "semi", "Γλυφάδα", "glyfada", 46],
    [9, "singles", "Φιλικό", "Χαλάνδρι", "halandri", 68],
    [10, "singles", "final", "Γλυφάδα", "glyfada", 70]
  ]';
  v_row    jsonb;
  v_n      int;
  v_fmt    text;
  v_m      int := 1;   -- next unused man
  v_w      int := 1;   -- next unused woman
  v_women_turn boolean;
begin
  if exists (select 1 from core.matches where source_ref like 'demo:%') then
    raise notice 'demo matches already exist, nothing to do';
    return;
  end if;

  insert into core.tournaments (sport_id, name, venue, area_id, starts_on, ends_on, draw_state, active, source, external_ref)
  values ('tennis', 'Demo Open Γλυφάδας', 'Γλυφάδα', 'glyfada', core.athens_day(), core.athens_day() + 4, 'drawn', true, 'admin', 'demo:open')
  returning id into v_t;

  -- real players with a known gender and an NTRP level, random each run
  select array_agg(id) into v_men from (
    select p.id from core.players p join core.player_sports s on s.player_id = p.id
     where p.gender = 'm' and s.initial_level is not null and not p.hidden order by random() limit 28) x;
  select array_agg(id) into v_women from (
    select p.id from core.players p join core.player_sports s on s.player_id = p.id
     where p.gender = 'f' and s.initial_level is not null and not p.hidden order by random() limit 4) x;

  -- first slot: the next full hour in Athens at least 2 hours from now, never before 09:00
  v_base := date_trunc('hour', now()) + interval '2 hours';

  for v_row in select * from jsonb_array_elements(v_plan) loop
    v_n := (v_row ->> 0)::int;
    v_fmt := v_row ->> 1;
    v_women_turn := v_n in (6, 9) and coalesce(array_length(v_women, 1), 0) >= v_w + 1;

    insert into core.matches (sport_id, format, status, starts_at, venue, area_id, tournament_id, round,
                              source, source_ref, counts_for_levels, approved, provenance)
    values ('tennis', v_fmt, 'scheduled', v_base + make_interval(mins => ((v_row ->> 5)::numeric * 60)::int),
            v_row ->> 3, v_row ->> 4,
            case when v_row ->> 2 in ('quarter', 'semi', 'final') then v_t end,
            v_row ->> 2, 'admin', 'demo:' || v_n, false, true,
            jsonb_build_object('demo', true))
    returning id into v_id;

    if v_fmt = 'singles' and v_women_turn then
      insert into core.match_participants (match_id, side, player_id, position) values
        (v_id, 1, v_women[v_w], 1), (v_id, 2, v_women[v_w + 1], 1);
      v_w := v_w + 2;
    elsif v_fmt = 'singles' then
      insert into core.match_participants (match_id, side, player_id, position) values
        (v_id, 1, v_men[v_m], 1), (v_id, 2, v_men[v_m + 1], 1);
      v_m := v_m + 2;
    else
      insert into core.match_participants (match_id, side, player_id, position) values
        (v_id, 1, v_men[v_m], 1), (v_id, 1, v_men[v_m + 1], 2),
        (v_id, 2, v_men[v_m + 2], 1), (v_id, 2, v_men[v_m + 3], 2);
      v_m := v_m + 4;
    end if;
  end loop;
end $$;

select m.source_ref, m.format, to_char(m.starts_at at time zone 'Europe/Athens', 'Dy DD/MM HH24:MI') as athens,
       coalesce(t.name, m.venue) as place, m.round,
       (select string_agg(p.first_name || ' ' || p.surname, ' / ' order by mp.position)
          from core.match_participants mp join core.players p on p.id = mp.player_id
         where mp.match_id = m.id and mp.side = 1) as side_1,
       (select string_agg(p.first_name || ' ' || p.surname, ' / ' order by mp.position)
          from core.match_participants mp join core.players p on p.id = mp.player_id
         where mp.match_id = m.id and mp.side = 2) as side_2
  from core.matches m left join core.tournaments t on t.id = m.tournament_id
 where m.source_ref like 'demo:%'
 order by m.starts_at;
