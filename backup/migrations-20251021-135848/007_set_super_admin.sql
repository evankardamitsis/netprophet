-- 007_set_super_admin.sql
-- Set is_super_admin = true for kardamitsis.e@gmail.com

-- If your SQL dialect does not support ALTER COLUMN SET DEFAULT, comment this out:
-- ALTER TABLE app_users ALTER COLUMN is_super_admin SET DEFAULT false;

-- Set the user as super admin
UPDATE app_users
SET is_super_admin = true
WHERE email = 'kardamitsis.e@gmail.com'; 