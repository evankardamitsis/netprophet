-- Test script for notification templates
-- This script will help verify that the notification templates system is working correctly

-- 1. Check if notification templates were created
SELECT
    id,
    type,
    language,
    title,
    message,
    created_at,
    updated_at
FROM notification_templates
ORDER BY type, language;

-- 2. Test the get_notification_template function
SELECT *
FROM get_notification_template('match_cancelled', 'en');
SELECT *
FROM get_notification_template('match_cancelled', 'el');
SELECT *
FROM get_notification_template('bet_won', 'en');
SELECT *
FROM get_notification_template('bet_won', 'el');

-- 3. Check if the function works with non-existent templates
SELECT *
FROM get_notification_template('non_existent', 'en');

-- 4. Count templates by type and language
SELECT
    type,
    language,
    COUNT(*) as template_count
FROM notification_templates
GROUP BY type, language
ORDER BY type, language;
