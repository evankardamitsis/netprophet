-- Local stack only. Makes the local roster the hosted one before the v1 matches import, so the import sees what
-- v2 changed since 9 Oct: players merged into another (the match goes to the one kept), genders filled in (the
-- mixed-gender rules), minors and hidden players, and the sheet players the merges point to.
--   psql -X -f tools/migrate/sql/mirror_hosted_players.sql < hosted_players.csv
-- Input: the CSV from tools/migrate/sql/hosted_players.sql (read only on the hosted project). Idempotent.
-- Nothing here is ever sent back: the export after the import takes matches, participants and results only.
\set ON_ERROR_STOP on
begin;

create temp table hp (
  id uuid primary key, first_name text, surname text, gender text, birth_year int, is_minor boolean,
  hidden boolean, status text, merged_into uuid, source text
) on commit drop;
\copy hp from pstdin with (format csv, header true, null 'NULL')
select count(*) as hosted_rows_read from hp;

-- players v2 has and this copy does not (sheet imports, new players), first as plain rows
insert into core.players (id, first_name, surname, gender, birth_year, is_minor, hidden, source, status)
select h.id, h.first_name, h.surname, h.gender, h.birth_year, h.is_minor, h.hidden, h.source,
       case when h.status = 'merged' then 'active' else h.status end
  from hp h
on conflict (id) do nothing;

-- then the state of every hosted player, merges last (the target must exist)
update core.players c
   set first_name = h.first_name, surname = h.surname, gender = h.gender, birth_year = h.birth_year,
       is_minor = h.is_minor, hidden = h.hidden,
       status = case when h.status = 'merged' then c.status else h.status end
  from hp h
 where h.id = c.id;
update core.players c
   set status = 'merged', merged_into = h.merged_into
  from hp h
 where h.id = c.id and h.status = 'merged' and c.merged_into is distinct from h.merged_into;

commit;

select 'hosted players' as what, (select count(*) from core.players) as n
union all select '  merged', (select count(*) from core.players where status = 'merged')
union all select '  with gender', (select count(*) from core.players where gender is not null)
union all select '  minors', (select count(*) from core.players where is_minor)
union all select '  hidden', (select count(*) from core.players where hidden);
