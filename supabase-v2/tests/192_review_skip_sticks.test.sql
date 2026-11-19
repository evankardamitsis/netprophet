-- A skipped review card is not opened again for the same row (founder, 19 Nov 2026)
begin;
select plan(5);

select tests.create_user('sk-adm@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Skip Open", "source_kind": "sheet", "source_url": "https://docs.google.com/spreadsheets/d/sk", "ongoing": true, "season_start_year": 2026}') as t \gset
select tests.logout();

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'sk1', '{"row": {"fingerprint": "sk1"}, "unclear": []}') returning id as rv \gset
select tests.login(:'adm'::uuid);
select api.admin_resolve_ingest_review(:'rv'::uuid, '{"dismiss": true}');
select tests.logout();

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'sk1', '{"row": {"fingerprint": "sk1"}, "unclear": []}') on conflict do nothing;
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'sk1' and status = 'open'), 0,
          'the next read does not open the skipped row again');
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'sk1'), 1, 'only the skipped card exists');

insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'sk2', '{"row": {"fingerprint": "sk2"}, "unclear": []}') on conflict do nothing;
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'sk2' and status = 'open'), 1,
          'a changed row (new fingerprint) gets a card');
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'walkover', 'sk1', '{"row": {"fingerprint": "sk1"}}') on conflict do nothing;
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'sk1' and kind = 'walkover'), 1,
          'another kind of question on the same row still comes');

-- a card a read closed by itself (the row left the sheet) is not a skip: the row comes back, so does its card
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload, status, resolved_at)
values (:'t'::uuid, 'people', 'sk3', '{"row": {"fingerprint": "sk3"}, "closed": {"by": "sheet", "reason": "row_gone"}}', 'dismissed', now());
insert into core.ingest_reviews (tournament_id, kind, fingerprint, payload)
values (:'t'::uuid, 'people', 'sk3', '{"row": {"fingerprint": "sk3"}, "unclear": []}') on conflict do nothing;
select is((select count(*)::int from core.ingest_reviews where tournament_id = :'t'::uuid and fingerprint = 'sk3' and status = 'open'), 1,
          'a row back on the sheet gets its card again');

select * from finish();
rollback;
