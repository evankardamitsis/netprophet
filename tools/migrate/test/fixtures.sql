-- Small v1 staging fixture for tools/migrate/test/run.sh: the cases the 22 Oct 2026 cutover dry run found.
-- Only the columns the import reads. Player ids end in the player number, matches in 1xx.
\set ON_ERROR_STOP on
drop schema if exists v1 cascade;
create schema v1;

create table v1.players (
  id uuid primary key, first_name text, last_name text, gender text, age int, updated_at timestamptz,
  is_demo_player boolean, hand text, ntrp_rating numeric, claimed_by_user_id uuid, claimed_at timestamptz
);
create table v1.tournaments (
  id uuid primary key, name text, location text, start_date date, end_date date, status text, tournament_type text,
  created_at timestamptz, updated_at timestamptz
);
create table v1.tournament_categories (
  id uuid primary key, tournament_id uuid, name text, gender text, skill_level_min text, skill_level_max text,
  created_at timestamptz
);
create table v1.matches (
  id uuid primary key, tournament_id uuid, category_id uuid, match_type text, status text, round text,
  start_time timestamptz, locked boolean, lock_time timestamptz, created_at timestamptz, updated_at timestamptz,
  player_a_id uuid, player_b_id uuid, player_a1_id uuid, player_a2_id uuid, player_b1_id uuid, player_b2_id uuid
);
create table v1.match_results (
  id uuid primary key, match_id uuid, winner_id uuid, match_winner_team text, match_result text,
  set1_score text, set2_score text, set3_score text, set4_score text, set5_score text,
  set1_tiebreak_score text, set2_tiebreak_score text, set3_tiebreak_score text, set4_tiebreak_score text,
  set5_tiebreak_score text, super_tiebreak_score text, created_at timestamptz, updated_at timestamptz
);

insert into v1.players (id, first_name, last_name, gender, age, updated_at, is_demo_player, hand, ntrp_rating)
select ('00000000-0000-4000-8000-00000000000' || n)::uuid, 'ΠΑΙΚΤΗΣ', 'ΔΟΚΙΜΗΣ' || n, 'men', 0, '2026-06-01', false, 'right', 3.5
  from generate_series(1, 6) n;

insert into v1.tournaments values
  ('00000000-0000-4000-8000-000000000a01', 'Τουρνουά δοκιμής', 'Αθήνα', '2026-06-01', '2026-06-07', 'finished', 'singles',
   '2026-05-01', '2026-06-07');
insert into v1.tournament_categories values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a01', 'Ανδρών', 'male', '3.0', '4.0', '2026-05-01');

-- 101: singles 2-0, set 2 stored only as its tie-break «7-4» (A won it 7-6)
-- 102: singles 2-1, set 1 only a tie-break «3-7» (B won it), then 6-2 and a super tie-break 10-8 for A
-- 103: singles 2-0 with two v1 result rows; the later one (6-1 6-1) is kept
-- 104: singles 2-0 between player 5 and player 6; player 5 is merged into player 1 on v2
-- 105: singles 0-2 whose sets say A won both: v1 data error, rejected
insert into v1.matches (id, tournament_id, category_id, match_type, status, round, start_time, created_at, updated_at,
                        player_a_id, player_b_id) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000c01',
   'singles', 'finished', 'Round of 16', '2026-06-02 10:00+03', '2026-06-01', '2026-06-02',
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000c01',
   'singles', 'finished', 'Round of 16', '2026-06-02 11:00+03', '2026-06-01', '2026-06-02',
   '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000c01',
   'singles', 'finished', 'Quarterfinals', '2026-06-03 10:00+03', '2026-06-01', '2026-06-03',
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000c01',
   'singles', 'finished', 'Round of 16', '2026-06-02 12:00+03', '2026-06-01', '2026-06-02',
   '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000c01',
   'singles', 'finished', 'Round of 16', '2026-06-02 13:00+03', '2026-06-01', '2026-06-02',
   '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004');

insert into v1.match_results (id, match_id, winner_id, match_result, set1_score, set2_score, set1_tiebreak_score,
                              set2_tiebreak_score, super_tiebreak_score, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   '2-0', '6-3', null, null, '7-4', null, '2026-06-02', '2026-06-02'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000003',
   '2-1', null, '6-2', '3-7', null, '10-8', '2026-06-02', '2026-06-02'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   '2-0', '6-4', '6-4', null, null, null, '2026-06-03 12:00+03', '2026-06-03 12:00+03'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   '2-0', '6-1', '6-1', null, null, null, '2026-06-03 12:05+03', '2026-06-03 12:05+03'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000005',
   '2-0', '6-0', '6-0', null, null, null, '2026-06-02', '2026-06-02'),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000004',
   '0-2', '6-0', '6-1', null, null, null, '2026-06-02', '2026-06-02');
