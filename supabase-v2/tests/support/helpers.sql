-- Test helpers (not a migration). Loaded after the migrations and seed, before the pgTAP files.
create schema if not exists tests;
grant usage on schema tests to public;

-- create an auth user (the on_auth_user_created trigger builds profile + game state)
create or replace function tests.create_user(p_email text, p_role text default 'user', p_name text default null)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, p_email, jsonb_build_object('full_name', coalesce(p_name, p_email)));
  if p_role <> 'user' then
    update core.profiles set role = p_role where user_id = v_id;
  end if;
  return v_id;
end $$;

create or replace function tests.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end $$;

create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  execute 'set local role anon';
end $$;

create or replace function tests.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  execute 'set local role service_role';
end $$;

create or replace function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end $$;

create or replace function tests.mk_player(p_first text, p_surname text, p_gender text default 'm')
returns uuid language sql as $$
  insert into core.players (first_name, surname, gender) values (p_first, p_surname, p_gender) returning id
$$;

-- singles match between two players; p_starts_at defaults to tomorrow
create or replace function tests.mk_match(p_a uuid, p_b uuid, p_starts_at timestamptz default now() + interval '1 day',
                                          p_status text default 'scheduled')
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into core.matches (sport_id, format, status, starts_at, source) values ('tennis', 'singles', p_status, p_starts_at, 'admin')
  returning id into v_id;
  insert into core.match_participants (match_id, side, player_id) values (v_id, 1, p_a), (v_id, 2, p_b);
  set constraints core.match_participants_check immediate;
  set constraints core.match_participants_check deferred;
  return v_id;
end $$;

-- a fresh pair of players + match
create or replace function tests.mk_match_fresh(p_starts_at timestamptz default now() + interval '1 day')
returns uuid language sql as $$
  select tests.mk_match(tests.mk_player('Τεστ', 'Α' || gen_random_uuid()::text), tests.mk_player('Τεστ', 'Β' || gen_random_uuid()::text), p_starts_at)
$$;

-- enter a 2-0 result with winner side p_side as service, then resolve
create or replace function tests.finish_match(p_match uuid, p_side int default 1)
returns jsonb language plpgsql as $$
declare v_out jsonb;
begin
  perform tests.as_service();
  perform api.admin_set_result(p_match, p_side, '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb);
  v_out := api.resolve_match(p_match);
  perform tests.logout();
  return v_out;
end $$;

-- one resolved vote for p_user on a fresh match: side 1 is voted, p_correct decides whether side 1 wins
create or replace function tests.play(p_user uuid, p_correct boolean)
returns uuid language plpgsql as $$
declare v_m uuid := tests.mk_match_fresh();
begin
  insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
  values (p_user, 'match', v_m, 1, clock_timestamp(), core.athens_day());
  perform tests.finish_match(v_m, case when p_correct then 1 else 2 end);
  return v_m;
end $$;

create or replace function tests.state(p_user uuid) returns core.user_game_state language sql as $$
  select * from core.user_game_state where user_id = p_user
$$;

create or replace function tests.unused_freezes(p_user uuid) returns int language sql as $$
  select count(*)::int from core.freezes where user_id = p_user and used_at is null
$$;

-- rows affected by a DML statement, run as the current role (RLS applies)
create or replace function tests.rowcount(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
