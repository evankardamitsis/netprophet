-- Remove custom 2FA implementation
-- This migration removes all custom 2FA tables and functions

-- Drop the custom 2FA table (if it exists)
DROP TABLE IF EXISTS public.admin_2fa_codes
CASCADE;

-- Drop custom 2FA functions (if they exist)
DROP FUNCTION IF EXISTS generate_and_store_2fa_code
(UUID, TEXT);
DROP FUNCTION IF EXISTS verify_2fa_code
(UUID, TEXT);
DROP FUNCTION IF EXISTS user_has_custom_2fa_enabled
(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_2fa_codes
();

-- Drop any triggers related to custom 2FA (if they exist)
-- Note: We can't use IF EXISTS for triggers, so we'll just try to drop it
DO $$
BEGIN
    DROP TRIGGER IF EXISTS cleanup_2fa_codes_trigger
    ON public.admin_2fa_codes;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, which is fine
        NULL;
END $$;