-- Remove custom 2FA system completely
-- This migration removes all custom 2FA tables, functions, and related data

-- Drop the two_factor_codes table and all its data
DROP TABLE IF EXISTS public.two_factor_codes
CASCADE;

-- Remove two_factor_enabled column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS two_factor_enabled;

-- Drop any 2FA-related functions
DROP FUNCTION IF EXISTS cleanup_expired_two_factor_codes
();

-- Remove any 2FA-related email templates
DELETE FROM email_templates WHERE type = '2fa';

-- Remove any 2FA-related email template variables
DELETE FROM email_template_variables WHERE template_id IN (
    SELECT id
FROM email_templates
WHERE type = '2fa'
);

-- Remove any 2FA-related email template versions
DELETE FROM email_template_versions WHERE template_id IN (
    SELECT id
FROM email_templates
WHERE type = '2fa'
);

-- Clean up any remaining 2FA-related data
DELETE FROM email_logs WHERE type = '2fa';
