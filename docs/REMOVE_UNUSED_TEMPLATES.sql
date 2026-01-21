-- Remove unused email templates from database
-- This marks them as inactive (safer) or deletes them completely

-- Option 1: Mark as inactive (RECOMMENDED - can rollback if needed)
UPDATE email_templates
SET is_active = false
WHERE (type = 'welcome' AND language IN ('en', 'el'))
   OR (type = 'winnings' AND language IN ('en', 'el'));

-- Verify the change
SELECT type, language, name, is_active
FROM email_templates
WHERE type IN ('welcome', 'welcome_email', 'winnings')
ORDER BY type, language;

-- Option 2: Delete completely (permanent - use with caution)
-- Uncomment the lines below if you want to permanently delete instead of just marking inactive

-- DELETE FROM email_templates
-- WHERE (type = 'welcome' AND language IN ('en', 'el'))
--    OR (type = 'winnings' AND language IN ('en', 'el'));

-- Verify deletion
-- SELECT type, language, name
-- FROM email_templates
-- WHERE type IN ('welcome', 'welcome_email', 'winnings')
-- ORDER BY type, language;
