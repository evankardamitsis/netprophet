-- Test script for profile activation notification
-- Run this in Supabase SQL Editor to test the functionality

-- Step 1: Check if the email template exists
SELECT
    id,
    name,
    type,
    language,
    subject,
    is_active
FROM email_templates
WHERE type = 'profile_activated'
    AND language = 'en';

-- Step 2: Find a test player that is linked to a user
-- (Replace with actual values from your database)
SELECT
    p.id as player_id,
    p.first_name,
    p.last_name,
    p.claimed_by_user_id,
    p.is_active,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name
FROM players p
    LEFT JOIN profiles u ON p.claimed_by_user_id = u.id
WHERE p.claimed_by_user_id IS NOT NULL
    AND p.is_active = true
LIMIT 5;

-- Step 3: Test the notification function with actual values
-- REPLACE 'YOUR_USER_ID' and 'YOUR_PLAYER_ID' with values from Step 2
-- Example:
-- SELECT send_profile_activated_notification(
--     'abc-123-user-id'::uuid,
--     'xyz-789-player-id'::uuid
-- );

-- Step 4: Verify the email was logged
-- Run this AFTER running the function in Step 3
SELECT
    id,
    user_id,
    to_email,
    template,
    type,
    language,
    status,
    sent_at,
    variables
FROM email_logs
WHERE template = 'profile_activated'
ORDER BY sent_at DESC
LIMIT 5;

-- Step 5: Check the variables to ensure they're correct
-- This will show you the email content that will be sent
SELECT 
    id,
    to_email,
    status,
    variables->>'user_name' as user_name
,
    variables->>'player_first_name' as player_first_name,
    variables->>'player_last_name' as player_last_name,
    variables->>'player_id' as player_id,
    sent_at
FROM email_logs
WHERE template = 'profile_activated'
ORDER BY sent_at DESC
LIMIT 1;

