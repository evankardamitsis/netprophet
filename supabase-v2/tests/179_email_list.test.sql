-- The website list: double opt-in (only the consent request goes to an unconfirmed address), the same answer in
-- every state, the brakes, confirm and unsubscribe by token, the Monday weekly only to confirmed people without an
-- account, and the switch and allow-list still deciding at send time.
begin;
select plan(37);

update core.email_settings set mode = 'allowlist', allowlist = '{}', kinds_off = '{}';

-- ── subscribe (anon) ──
select tests.as_anon();
select ok(api.list_subscribe('  Anna@Example.com ', 'site', 'el'), 'a new address is taken');
select ok(not api.list_subscribe('not an email'), 'something that is not an email is refused');
select ok(api.list_subscribe('anna@example.com'), 'asking again answers the same');
select throws_ok($$select count(*) from core.list_subscribers$$, '42501', null, 'the website cannot read the list');
select tests.logout();

select id as anna, token as anna_tok from core.list_subscribers where email = 'anna@example.com' \gset
select is((select count(*)::int from core.list_subscribers where email = 'anna@example.com'), 1, 'stored once, lowercased');
select is((select count(*)::int from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'),
          1, 'one consent email, the second ask within 10 minutes sends nothing');
select is((select to_email || ':' || coalesce(user_id::text, 'none') from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'),
          'anna@example.com:none', 'list emails carry the address, no account');

-- the brakes: every 10 minutes, at most 3 a day
update core.list_subscribers set last_confirm_at = now() - interval '11 minutes' where id = :'anna'::uuid;
update core.emails set dedupe_key = dedupe_key || ':a' where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna';
select api.list_subscribe('anna@example.com');
select is((select count(*)::int from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'), 2, 'after 10 minutes it can be asked again');
update core.list_subscribers set last_confirm_at = now() - interval '11 minutes' where id = :'anna'::uuid;
update core.emails set dedupe_key = dedupe_key || ':b' where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna' and dedupe_key not like '%:a';
select api.list_subscribe('anna@example.com');
update core.list_subscribers set last_confirm_at = now() - interval '11 minutes' where id = :'anna'::uuid;
update core.emails set dedupe_key = dedupe_key || ':c' where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna' and dedupe_key not like '%:a' and dedupe_key not like '%:b';
select ok(api.list_subscribe('anna@example.com'), 'a fourth ask the same day still answers the same');
select is((select count(*)::int from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'), 3, 'but no more than 3 consent emails a day');

-- ── send time: the consent request goes to an unconfirmed address, nothing else does ──
select api.admin_emails_due(50);
select is((select count(*)::int from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna' and reason = 'not_allowlisted'),
          3, 'the allow-list still applies to list emails: skipped, not kept');
update core.email_settings set allowlist = array['anna@example.com'];
select api.list_subscribe('anna@example.com');   -- the brake: nothing new yet
update core.list_subscribers set last_confirm_at = null where id = :'anna'::uuid;
delete from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna';
select api.list_subscribe('anna@example.com');
insert into core.emails (kind, dedupe_key, payload, to_email)
values ('site_weekly', 'test-weekly-unconfirmed', jsonb_build_object('subscriber_id', :'anna'), 'anna@example.com');
select is((select jsonb_agg(x ->> 'kind') from jsonb_array_elements(api.admin_emails_due(50)) x), '["site_confirm"]'::jsonb,
          'an unconfirmed address gets only the consent request');
select is((select status || ':' || reason from core.emails where dedupe_key = 'test-weekly-unconfirmed'), 'skipped:unconfirmed', 'the weekly to it is skipped');
select is((select e.status from core.emails e where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'), 'sending', 'the consent request is taken');
update core.emails set status = 'due' where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna';
select is((select x ->> 'unsubscribe_token' from jsonb_array_elements(api.admin_emails_due(50)) x limit 1), :'anna_tok',
          'it carries the subscriber''s token for the confirm link');
select is((select x ->> 'lang' from jsonb_array_elements(api.admin_emails_due(50)) x limit 1), null, 'a taken row is not handed out twice');

-- ── confirm and unsubscribe (anon) ──
select tests.as_anon();
select ok(not api.list_confirm(gen_random_uuid()), 'a wrong confirm token changes nothing');
select ok(api.list_confirm(:'anna_tok'::uuid), 'the Ναι button confirms');
select ok(api.list_confirm(:'anna_tok'::uuid), 'pressing it twice is fine');
select ok(api.list_subscribe('anna@example.com'), 'a confirmed address asking again answers the same');
select tests.logout();
select is((select count(*)::int from core.emails where kind = 'site_confirm' and payload ->> 'subscriber_id' = :'anna'), 1, 'and gets no new consent email');
select isnt((select confirmed_at from core.list_subscribers where id = :'anna'::uuid), null, 'confirmed');

select tests.as_anon();
select ok(not api.list_unsubscribe(gen_random_uuid()), 'a wrong unsubscribe token changes nothing');
select ok(api.list_unsubscribe(:'anna_tok'::uuid), 'the Διαγραφή link takes them off');
select ok(not api.list_confirm(:'anna_tok'::uuid), 'an old confirm link does not bring them back');
select ok(api.list_subscribe('anna@example.com', 'site', 'en'), 'an unsubscribed address asking again answers the same');
select tests.logout();
select isnt((select token from core.list_subscribers where id = :'anna'::uuid), :'anna_tok'::uuid, 'asking again makes a new token');
select is((select confirmed_at from core.list_subscribers where id = :'anna'::uuid), null, 'and needs a new confirm');

-- ── the global brake: 100 consent emails an hour for everyone ──
insert into core.emails (kind, dedupe_key, payload, status)
select 'site_confirm', 'flood:' || g, '{}'::jsonb, 'skipped' from generate_series(1, 100) g;
select tests.as_anon();
select ok(api.list_subscribe('late@example.com'), 'past the hourly brake the answer is the same');
select tests.logout();
select is((select count(*)::int from core.emails e join core.list_subscribers s on s.id::text = e.payload ->> 'subscriber_id'
            where s.email = 'late@example.com'), 0, 'but nothing is queued');
delete from core.emails where dedupe_key like 'flood:%';

-- ── the Monday weekly ──
-- three people: Bea confirmed, Chris confirmed but has an account, Dan never confirmed
insert into core.list_subscribers (email, confirmed_at) values ('bea@example.com', now()), ('chris@example.com', now());
insert into core.list_subscribers (email) values ('dan@example.com');
select tests.create_user('chris@example.com');

-- a week: one upset with 5 votes (1 for the winner), one final
insert into core.tournaments (sport_id, name) values ('tennis', 'Τεστ Open') returning id as tour \gset
select tests.mk_match_fresh() as up \gset
select tests.mk_match_fresh() as fin \gset
update core.matches set source = 'import', tournament_id = :'tour'::uuid, round = 'quarter' where id = :'up'::uuid;
update core.matches set source = 'import', tournament_id = :'tour'::uuid, round = 'final' where id = :'fin'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at)
select tests.create_user('voter' || g || '@test.local'), 'match', :'up'::uuid, case when g = 1 then 1 else 2 end, now() - interval '1 hour'
  from generate_series(1, 5) g;
update core.matches set starts_at = now() where id in (:'up'::uuid, :'fin'::uuid);
select tests.finish_match(:'up'::uuid, 1);
select tests.finish_match(:'fin'::uuid, 2);

-- next Monday, Athens time: at 08:00 nothing, at 10:00 the week before goes out
select (date_trunc('week', now() at time zone 'Europe/Athens') + interval '7 days 8 hours') at time zone 'Europe/Athens' as mon8 \gset
select (date_trunc('week', now() at time zone 'Europe/Athens') + interval '7 days 10 hours') at time zone 'Europe/Athens' as mon10 \gset
select is(core.list_weekly_sweep(:'mon8'::timestamptz), 0, 'before 09:00 on Monday nothing is queued');
select is(core.list_weekly_sweep(:'mon10'::timestamptz), 1, 'from 09:00 one weekly is queued');
select is(core.list_weekly_sweep(:'mon10'::timestamptz + interval '1 hour'), 0, 'the next tick does not queue it again');
select is((select s.email from core.emails e join core.list_subscribers s on s.id::text = e.payload ->> 'subscriber_id' where e.kind = 'site_weekly' and e.dedupe_key like 'site_weekly:%'),
          'bea@example.com', 'only to a confirmed subscriber without an account');
select is((select (payload -> 'upset' ->> 'pct') || ':' || (payload -> 'upset' -> 'winner' -> 0 ->> 'first') || ':' || (payload ->> 'played') || ':' || jsonb_array_length(payload -> 'titles')
             from core.emails where kind = 'site_weekly' and dedupe_key like 'site_weekly:%'),
          '20:Τεστ:2:1', 'the payload has the upset (20% saw it), the matches played and the title');

-- an account made after it was queued: skipped at send time
update core.email_settings set mode = 'on';
update core.emails set due_at = now() where kind = 'site_weekly' and dedupe_key like 'site_weekly:%';
select tests.create_user('bea@example.com');
select api.admin_emails_due(50);
select is((select status || ':' || reason from core.emails where kind = 'site_weekly' and dedupe_key like 'site_weekly:%'), 'skipped:has_account', 'once they have an account the list weekly stops');

-- the switch off still stops list emails
update core.email_settings set mode = 'off';
select api.list_subscribe('eve@example.com');
select api.admin_emails_due(50);
select is((select e.reason from core.emails e join core.list_subscribers s on s.id::text = e.payload ->> 'subscriber_id' where s.email = 'eve@example.com'),
          'off', 'off skips list emails too');

select * from finish();
rollback;
