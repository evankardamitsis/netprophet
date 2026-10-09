-- Remove every demo match (source_ref 'demo:%' or provenance.demo) and what it produced, before launch.
-- Run from the repo root: supabase --workdir .supabase-v2 db query --linked -f "$PWD/tools/demo/clear_demo.sql"
begin;

create temp table demo_m on commit drop as
select id from core.matches where source_ref like 'demo:%' or provenance ->> 'demo' = 'true';

create temp table demo_v on commit drop as
select id, user_id from core.votes where subject_type = 'match' and subject_id in (select id from demo_m);

delete from core.feed_inbox where payload ->> 'match_id' in (select id::text from demo_m);
delete from core.notifications where payload ->> 'match_id' in (select id::text from demo_m);
delete from core.outbox where payload ->> 'match_id' in (select id::text from demo_m);
delete from core.streak_events where vote_id in (select id from demo_v);
update core.freezes set used_at = null, used_on_vote_id = null where used_on_vote_id in (select id from demo_v);

-- the ledger is append-only for the app; demo points are the one thing allowed to leave it
alter table core.points_ledger disable trigger points_ledger_no_change;
delete from core.points_ledger where ref_type = 'match' and ref_id in (select id from demo_m);
alter table core.points_ledger enable trigger points_ledger_no_change;

delete from core.votes where id in (select id from demo_v);
delete from core.matches where id in (select id from demo_m);          -- participants, results, kudos, reactions cascade
delete from core.tournaments where external_ref like 'demo:%';

-- people who voted on demo matches: points recomputed from what is left, σερί and counters restart
update core.user_game_state g
   set total_points = coalesce((select sum(delta) from core.points_ledger l where l.user_id = g.user_id), 0),
       votes_cast = (select count(*) from core.votes v where v.user_id = g.user_id),
       votes_correct = (select count(*) from core.votes v where v.user_id = g.user_id and v.outcome = 'correct'),
       streak = 0, chain = 0, votes_since_free_freeze = 0,
       version = version + 1, updated_at = now()
 where g.user_id in (select distinct user_id from demo_v);

select (select count(*) from demo_m) as demo_matches_removed, (select count(*) from demo_v) as demo_votes_removed;
commit;
