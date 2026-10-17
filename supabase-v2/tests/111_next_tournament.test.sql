-- «Το επόμενο τουρνουά για σένα»: tournaments still to come or open for entry, the player's area first, then the
-- entry deadline soonest; free sees the first in full and how many more, Pro sees all; staff set the deadline and
-- the link; Pro gets one push two days before the deadline (area or an earlier edition), once.
begin;
select plan(23);

select tests.create_user('nt-pro@test.local') as pro \gset
select tests.create_user('nt-free@test.local') as free \gset
select tests.create_user('nt-ed@test.local', 'editor') as ed \gset
select tests.create_user('nt-far@test.local') as far \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active'), (:'far'::uuid, 'gift', 'active');
update core.profiles set area_id = 'glyfada' where user_id in (:'pro'::uuid, :'free'::uuid);
update core.profiles set area_id = 'pagrati' where user_id = :'far'::uuid;
select tests.mk_player('Νεξτ', 'Φαρίδης') as pf \gset
select tests.mk_player('Νεξτ', 'Αντίπαλος') as po \gset
update core.players set claimed_by_user_id = :'far'::uuid where id = :'pf'::uuid;
update core.profiles set claimed_player_id = :'pf'::uuid where user_id = :'far'::uuid;

select core.athens_day(now()) as today \gset
-- a: elsewhere, entry closes in 2 days; b: in Glyfada, entry closes in 10 days; c: in Glyfada, entry closes in 4 days;
-- d: in Glyfada, starts in 20 days, no deadline; e: started already, entry closed; f: closed for entry but starts later
insert into core.tournaments (id, sport_id, name, area_id, surface, starts_on, ends_on, entry_deadline, entry_link) values
  ('00000000-0000-0000-0000-00000000a111', 'tennis', 'Open Κηφισιάς 2026', 'kifisia', 'clay', :'today'::date + 6, :'today'::date + 8, :'today'::date + 2, 'https://example.org/a'),
  ('00000000-0000-0000-0000-00000000b111', 'tennis', 'Κύπελλο Β', 'glyfada', 'hard', :'today'::date + 14, null, :'today'::date + 10, null),
  ('00000000-0000-0000-0000-00000000c111', 'tennis', 'Κύπελλο Γ', 'glyfada', 'clay', :'today'::date + 8, null, :'today'::date + 4, 'https://example.org/c'),
  ('00000000-0000-0000-0000-00000000d111', 'tennis', 'Κύπελλο Δ', 'glyfada', null, :'today'::date + 20, null, null, null),
  ('00000000-0000-0000-0000-00000000e111', 'tennis', 'Κύπελλο Ε', 'glyfada', null, :'today'::date - 3, :'today'::date + 2, :'today'::date - 6, null),
  ('00000000-0000-0000-0000-00000000f111', 'tennis', 'Κύπελλο Ζ', 'pagrati', null, :'today'::date + 3, null, :'today'::date - 1, null);
insert into core.tournament_events (tournament_id, name, format, gender) values
  ('00000000-0000-0000-0000-00000000c111', 'Μ 40+', 'singles', 'm'),
  ('00000000-0000-0000-0000-00000000c111', 'MEDIUM', 'singles', 'm');
-- last year's Open Κηφισιάς, played by `far`'s player
insert into core.tournaments (id, sport_id, name, area_id, starts_on, ends_on) values
  ('00000000-0000-0000-0000-00000000a110', 'tennis', 'Open Κηφισιάς 2025', 'kifisia', :'today'::date - 360, :'today'::date - 358);
select tests.mk_match(:'pf'::uuid, :'po'::uuid, now() - interval '359 days', 'confirmed') as old_m \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-00000000a110' where id = :'old_m'::uuid;

-- the list (Pro, in Glyfada)
select tests.login(:'pro'::uuid);
create temp table up_pro as select api.upcoming_tournaments() as doc;
grant select on up_pro to public;
-- (seed tournaments may sit in the list too: compare ours only)
select is((select jsonb_agg(i ->> 'name' order by o) from up_pro, jsonb_array_elements(doc -> 'items') with ordinality x(i, o)
            where i ->> 'id' like '00000000-0000-0000-0000-00000000%'),
          '["Κύπελλο Γ", "Κύπελλο Β", "Κύπελλο Δ", "Open Κηφισιάς 2026", "Κύπελλο Ζ"]'::jsonb,
          'own area first, open entry soonest first, then the rest');
select is((select (doc ->> 'more')::int from up_pro), 0, 'Pro: nothing held back');
select ok(not exists (select 1 from up_pro, jsonb_array_elements(doc -> 'items') i where i ->> 'name' = 'Κύπελλο Ε'),
          'a tournament that started and closed entry is not in it');
select is((select doc -> 'items' -> 0 -> 'categories' from up_pro), '["MEDIUM", "Μ 40+"]'::jsonb, 'with the organiser''s categories');
select is((select doc -> 'items' -> 0 ->> 'entry_link' from up_pro), 'https://example.org/c', 'with where to sign up');
select is((select (doc -> 'items' -> 0 ->> 'entry_open')::boolean from up_pro), true, 'entry is open');
select is((select (i ->> 'entry_open')::boolean from up_pro, jsonb_array_elements(doc -> 'items') i where i ->> 'name' = 'Κύπελλο Ζ'), false, 'closed for entry but still to start: shown, marked closed');

-- a woman: Κύπελλο Γ has men's categories only, so it goes after the Glyfada ones that fit
select tests.logout();
update core.profiles set gender = 'f' where user_id = :'pro'::uuid;
select tests.login(:'pro'::uuid);
select is((select jsonb_agg(i ->> 'name' order by o) from jsonb_array_elements(api.upcoming_tournaments() -> 'items') with ordinality x(i, o)
            where i ->> 'near' = 'true' and i ->> 'id' like '00000000-0000-0000-0000-00000000%'),
          '["Κύπελλο Β", "Κύπελλο Δ", "Κύπελλο Γ"]'::jsonb, 'a tournament not for your gender sorts after the ones that are');
select tests.logout();
update core.profiles set gender = null where user_id = :'pro'::uuid;

-- free: the first one in full, a count of the rest
select tests.login(:'free'::uuid);
create temp table up_free as select api.upcoming_tournaments() as doc;
grant select on up_free to public;
select is((select jsonb_array_length(doc -> 'items') from up_free), 1, 'free: one tournament');
select is((select doc -> 'items' -> 0 ->> 'entry_deadline' from up_free), (:'today'::date + 4)::text, 'free: the first in full, deadline included');
select is((select (doc ->> 'more')::int from up_free), (select jsonb_array_length(doc -> 'items') - 1 from up_pro), 'free: how many more Pro shows');
select is((select (doc ->> 'pro')::boolean from up_free), false, 'free: not Pro');

-- an earlier edition, far from Glyfada
select tests.login(:'far'::uuid);
select is((select i ->> 'played_before' from jsonb_array_elements(api.upcoming_tournaments() -> 'items') i where i ->> 'name' = 'Open Κηφισιάς 2026'),
          'true', 'played last year''s edition');
select tests.logout();

-- staff only setters
select tests.login(:'free'::uuid);
select throws_ok($$select api.admin_set_tournament_entry('00000000-0000-0000-0000-00000000d111', current_date + 9, 'https://x.org')$$,
                 '42501', null, 'a player cannot set an entry deadline');
select throws_ok($$select api.admin_save_tournament('{"id": "00000000-0000-0000-0000-00000000d111", "name": "X", "entry_link": "https://x.org"}')$$,
                 '42501', null, 'a player cannot save a tournament');
select tests.as_anon();
select throws_ok($$select api.upcoming_tournaments()$$, null, null, 'anonymous callers get nothing');
select tests.login(:'ed'::uuid);
select lives_ok($$select api.admin_set_tournament_entry('00000000-0000-0000-0000-00000000d111', current_date + 9, 'https://x.org/d')$$,
                'staff set the deadline and the link');
select throws_ok($$select api.admin_set_tournament_entry('00000000-0000-0000-0000-00000000d111', null, 'not a link')$$,
                 '22023', null, 'the link must be a web address');
select is((select i ->> 'entry_link' from jsonb_array_elements(api.admin_tournaments()) i where i ->> 'id' = '00000000-0000-0000-0000-00000000d111'),
          'https://x.org/d', 'the admin list carries the link');
select lives_ok($$select api.admin_save_tournament('{"id": "00000000-0000-0000-0000-00000000d111", "name": "Κύπελλο Δ", "area_id": "glyfada", "starts_on": "2100-01-01", "entry_deadline": ""}')$$,
                'saving the form with an empty deadline clears it');
select tests.logout();

-- the reminder: two days before, 10:00 Athens on
create temp view er as select user_id, dedupe_key, payload from core.notifications where type = 'entry';
grant select on er to public;
select is(core.entry_reminders((:'today'::date + time '09:00') at time zone 'Europe/Athens'), 0, 'not before 10:00');
select is(core.entry_reminders((:'today'::date + time '10:30') at time zone 'Europe/Athens'), 1,
          'one push: the Pro player who played last year''s edition (the deadline is in two days; nobody else is near it)');
select is(core.entry_reminders((:'today'::date + time '15:00') at time zone 'Europe/Athens')
          + core.entry_reminders((:'today'::date + 1 + time '11:00') at time zone 'Europe/Athens'), 0, 'only once per tournament and person');

select * from finish();
rollback;
