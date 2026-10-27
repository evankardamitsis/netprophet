-- 20270323000000_play_review_account: play-review@monadlabs.gr joins review@monadlabs.gr as the only accounts that may
-- have a password; everyone else is still refused.
begin;
select plan(7);

select lives_ok($$insert into auth.users (email, encrypted_password) values ('Play-Review@MonadLabs.gr', 'hash-x')$$,
                'the Play review account can be created with a password, in any case');
select lives_ok($$update auth.users set encrypted_password = 'hash-y' where lower(email) = 'play-review@monadlabs.gr'$$,
                'its password can be changed');
select lives_ok($$insert into auth.users (email, encrypted_password) values ('review@monadlabs.gr', 'hash-x')$$,
                'the Apple review account still can');

select throws_ok($$insert into auth.users (email, encrypted_password) values ('playreview@monadlabs.gr', 'hash-x')$$,
                 '42501', 'password_not_allowed', 'a near miss of the address is refused');
select throws_ok($$insert into auth.users (email, encrypted_password) values ('play-review@monadlabs.gr.evil.com', 'hash-x')$$,
                 '42501', 'password_not_allowed', 'and so is the address inside another domain');
select throws_ok($$insert into auth.users (email, encrypted_password) values ('someone@test.local', 'hash-x')$$,
                 '42501', 'password_not_allowed', 'every other address is still refused');

update auth.users set email = 'moved@test.local' where lower(email) = 'play-review@monadlabs.gr';
select is((select coalesce(encrypted_password, '') from auth.users where email = 'moved@test.local'), '',
          'the Play review account moved to another email loses its password');

select * from finish();
rollback;
