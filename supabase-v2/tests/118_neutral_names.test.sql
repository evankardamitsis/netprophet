-- New accounts never show their email (founder, 18 Oct 2026): no name means «Παίκτης 1234», and accounts that show
-- their email or its local part today get a neutral name.
begin;
select plan(8);

-- email OTP: no name at all
insert into auth.users (id, email, raw_user_meta_data) values ('51000000-0000-0000-0000-000000000001', 'maria.k@test.local', '{}');
select matches((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000001'),
               '^Παίκτης [1-9][0-9]{3}$', 'no name: a neutral «Παίκτης» and four digits');
select ok((select position('maria' in display_name) = 0 from core.profiles where user_id = '51000000-0000-0000-0000-000000000001'),
          'never the email''s local part');

-- a provider name stays; a provider «name» that is an email address does not
insert into auth.users (id, email, raw_user_meta_data)
values ('51000000-0000-0000-0000-000000000002', 'nikos@test.local', '{"full_name": "Νίκος Ροδίτης"}'),
       ('51000000-0000-0000-0000-000000000003', 'eleni@test.local', '{"full_name": "eleni@test.local"}');
select is((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000002'), 'Νίκος Ροδίτης',
          'a real name from the provider stays');
select matches((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000003'),
               '^Παίκτης [0-9]{4}$', 'an email as a name counts as no name');

-- accounts from before: the email or its local part goes, a chosen name stays
insert into auth.users (id, email, raw_user_meta_data)
values ('51000000-0000-0000-0000-000000000004', 'old.one@test.local', '{"full_name": "Παλιός"}'),
       ('51000000-0000-0000-0000-000000000005', 'old.two@test.local', '{"full_name": "Παλιά"}'),
       ('51000000-0000-0000-0000-000000000006', 'kept@test.local', '{"full_name": "Κρατάει"}');
update core.profiles set display_name = 'old.one' where user_id = '51000000-0000-0000-0000-000000000004';
update core.profiles set display_name = 'Old.Two@test.local' where user_id = '51000000-0000-0000-0000-000000000005';
select ok(core.neutralize_email_names() >= 2, 'the fix finds them');
select matches((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000004'),
               '^Παίκτης [0-9]{4}$', 'the email''s local part is replaced');
select matches((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000005'),
               '^Παίκτης [0-9]{4}$', 'so is the whole address');
select is((select display_name from core.profiles where user_id = '51000000-0000-0000-0000-000000000006'), 'Κρατάει',
          'a name someone chose stays');

select * from finish();
rollback;
