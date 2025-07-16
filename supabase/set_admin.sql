-- Script to set a user as admin
-- Replace 'your-email@example.com' with your actual email address

UPDATE profiles 
SET is_admin = TRUE 
WHERE email = 'kardamitsis.e@gmail.com';

-- Verify the update
SELECT id, email, is_admin, created_at
FROM profiles
WHERE email = 'kardamitsis.e@gmail.com'; 