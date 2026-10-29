-- 20270322000000_review_password_only: only review@monadlabs.gr may have a password; every other account signs in
-- with the email code, Google or Apple, so password sign-in has nothing to check for them.
begin;
select plan(11);

-- the founder creates the review account with a password (dashboard, Admin API): allowed, in any case
select lives_ok($$insert into auth.users (email, encrypted_password) values ('Review@MonadLabs.gr', 'hash-x')$$,
                'the review account can be created with a password');
select isnt((select encrypted_password from auth.users where lower(email) = 'review@monadlabs.gr'), null,
            'and it keeps it');
select ok(exists (select 1 from core.profiles pr join auth.users u on u.id = pr.user_id where lower(u.email) = 'review@monadlabs.gr'),
          'it gets a profile like any other account');
select lives_ok($$update auth.users set encrypted_password = 'hash-y' where lower(email) = 'review@monadlabs.gr'$$,
                'its password can be changed');

-- everyone else: no password, ever
-- the code sign-up comes with Supabase's own random password (20270325000000): the account is made, without it
select lives_ok($$insert into auth.users (email, encrypted_password) values ('someone@test.local', 'hash-x')$$,
                'a new account with a password is made for any other address');
select is((select encrypted_password from auth.users where email = 'someone@test.local'), '', 'and without the password');
select lives_ok($$insert into auth.users (email, encrypted_password) values ('otp@test.local', '')$$,
                'a code sign-up (no password) goes through');
select lives_ok($$insert into auth.users (email) values ('google@test.local')$$, 'and so does Google or Apple (null password)');
select throws_ok($$update auth.users set encrypted_password = 'hash-x' where email = 'otp@test.local'$$,
                 '42501', 'password_not_allowed', 'an account cannot set a password later');
select lives_ok($$update auth.users set email = 'otp2@test.local' where email = 'otp@test.local'$$,
                'changing email without a password still works');

-- the review account leaving its address leaves its password behind
update auth.users set email = 'moved@test.local' where lower(email) = 'review@monadlabs.gr';
select is((select coalesce(encrypted_password, '') from auth.users where email = 'moved@test.local'), '',
          'a review account moved to another email loses its password');

select * from finish();
rollback;
