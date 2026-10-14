-- Pro match reminders: «Αύριο παίζεις» from 20:00 the evening before, «Σε λίγο παίζεις» in the last two hours, once
-- each, only for Pro, again when the match moves; a postponed match stays quiet.
begin;
select plan(9);

select tests.create_user('rm-pro@test.local') as pro \gset
select tests.create_user('rm-free@test.local') as free \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
select tests.mk_player('Ρεμ', 'Πρόος') as p1 \gset
select tests.mk_player('Ρεμ', 'Φρίος') as p2 \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p1'::uuid;
update core.players set claimed_by_user_id = :'free'::uuid where id = :'p2'::uuid;

-- tomorrow 10:00 Athens
select ((core.athens_day(now()) + 1) + time '10:00') at time zone 'Europe/Athens' as starts \gset
select tests.mk_match(:'p1'::uuid, :'p2'::uuid, :'starts'::timestamptz) as m \gset
create temp view rm as select type, dedupe_key, payload from core.notifications where type = 'reminder';
grant select on rm to public;

-- 19:50 the evening before: nothing yet
select is(core.match_reminders((core.athens_day(now()) + time '19:50') at time zone 'Europe/Athens'), 0, 'before 20:00: nothing');
select is(core.match_reminders((core.athens_day(now()) + time '20:05') at time zone 'Europe/Athens'), 1, 'from 20:00 the evening before: one reminder');
select is((select payload ->> 'title' from rm where dedupe_key like 'reminder:eve:' || :'pro' || '%'), 'Αύριο παίζεις', 'it says «Αύριο παίζεις»');
select ok((select payload ->> 'body' from rm limit 1) like '%με Φρίος', 'with the opponent');
select is(core.match_reminders((core.athens_day(now()) + time '22:00') at time zone 'Europe/Athens'), 0, 'only once');
select is(core.match_reminders(:'starts'::timestamptz - interval '1 hour 55 minutes'), 1, 'two hours before: «Σε λίγο παίζεις»');
select is((select count(*)::int from rm where dedupe_key like '%' || :'free' || '%'), 0, 'never for a free player');

-- moved an hour later: it reminds again
update core.matches set starts_at = starts_at + interval '1 hour' where id = :'m'::uuid;
select is(core.match_reminders(:'starts'::timestamptz - interval '55 minutes'), 1, 'a moved match reminds again');

-- postponed: quiet
update core.matches set postponed_at = now() where id = :'m'::uuid;
update core.matches set starts_at = starts_at + interval '1 day' where id = :'m'::uuid;
select is(core.match_reminders(:'starts'::timestamptz + interval '1 day' - interval '1 hour'), 0, 'a postponed match stays quiet');

select * from finish();
rollback;
