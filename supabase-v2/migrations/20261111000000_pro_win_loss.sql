-- Pro: «Πού κερδίζεις, πού χάνεις». Your player's wins and losses split by what the results can tell:
-- time of day (Athens), deciding sets, after losing the first set, tie-break sets, left-handed opponents,
-- singles / doubles, tournaments / friendlies. No surfaces (v1 never carried them over). Which splits are
-- strengths or weaknesses is decided by the app from these counts. Pro only; without a player, nothing.

create or replace function api.get_win_loss()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_claimed uuid;
  v_sport   text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id, primary_sport into v_claimed, v_sport
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not core.is_pro(v_uid) then raise exception 'pro_required' using errcode = '42501'; end if;
  if v_claimed is null then return jsonb_build_object('total', null, 'rows', '[]'::jsonb); end if;

  return (
    with res as (
      select r.*, m.tournament_id,
             extract(hour from r.starts_at at time zone 'Europe/Athens')::int as hour,
             -- the first set went your way: a set is winner-first, so the match winner took it when w > l
             case when jsonb_array_length(r.sets) > 0
                  then r.won = (((r.sets -> 0) ->> 'w')::int > ((r.sets -> 0) ->> 'l')::int) end as first_won
        from core.player_results(v_claimed, v_sport) r
        join core.matches m on m.id = r.match_id
       where not r.walkover
    ),
    tb as (
      select r.won = ((s ->> 'w')::int > (s ->> 'l')::int) as set_won
        from res r cross join lateral jsonb_array_elements(r.sets) s
       where (s ? 'tb') or (s ? 'stb')
          or (greatest((s ->> 'w')::int, (s ->> 'l')::int) = 7 and least((s ->> 'w')::int, (s ->> 'l')::int) = 6)
    ),
    lefty as (
      select r.won
        from res r
       where r.format = 'singles'
         and exists (select 1 from core.match_participants o
                       join core.player_sports ps on ps.player_id = o.player_id and ps.sport_id = v_sport
                      where o.match_id = r.match_id and o.side <> r.side and ps.hand = 'L')
    ),
    splits (key, w, l) as (
      select 'morning', count(*) filter (where won), count(*) filter (where not won) from res where hour < 14
      union all select 'evening', count(*) filter (where won), count(*) filter (where not won) from res where hour >= 18
      union all select 'deciding', count(*) filter (where won), count(*) filter (where not won) from res where jsonb_array_length(sets) >= 3
      union all select 'lost_first', count(*) filter (where won), count(*) filter (where not won) from res where first_won = false
      union all select 'tiebreaks', count(*) filter (where set_won), count(*) filter (where not set_won) from tb
      union all select 'lefties', count(*) filter (where won), count(*) filter (where not won) from lefty
      union all select 'singles', count(*) filter (where won), count(*) filter (where not won) from res where format = 'singles'
      union all select 'doubles', count(*) filter (where won), count(*) filter (where not won) from res where format <> 'singles'
      union all select 'tournament', count(*) filter (where won), count(*) filter (where not won) from res where tournament_id is not null
      union all select 'friendly', count(*) filter (where won), count(*) filter (where not won) from res where tournament_id is null
    )
    select jsonb_build_object(
      'total', (select jsonb_build_object('w', count(*) filter (where won), 'l', count(*) filter (where not won)) from res),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'w', w, 'l', l)) from splits where w + l > 0), '[]'::jsonb)));
end;
$$;

revoke all on function api.get_win_loss() from public, anon;
grant execute on function api.get_win_loss() to authenticated, service_role;
