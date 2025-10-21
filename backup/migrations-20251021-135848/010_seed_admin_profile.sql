-- 010_seed_admin_profile.sql
-- Insert admin user into profiles table

INSERT INTO profiles
    (id, email, is_admin)
SELECT id, email, true
FROM app_users
WHERE email = 'kardamitsis.e@gmail.com'
    AND NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = app_users.id
  ); 