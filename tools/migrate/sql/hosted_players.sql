-- Read only. The hosted roster as it is now, for tools/migrate/sql/mirror_hosted_players.sql:
--   supabase --workdir .supabase-v2 db query --linked -o csv -f tools/migrate/sql/hosted_players.sql > hosted_players.csv
-- No account data: names, gender and the roster state only (the same the app shows on Παίκτες).
select p.id, p.first_name, p.surname, p.gender, p.birth_year, p.is_minor, p.hidden, p.status, p.merged_into, p.source
  from core.players p
 order by p.id;
