-- Remove 2FA columns and clean up email templates
-- This migration removes all 2FA-related database columns and email templates

-- Remove two_factor_enabled column from profiles table (if it still exists)
ALTER TABLE profiles DROP COLUMN IF EXISTS two_factor_enabled;

-- Remove 2FA-related email templates
DELETE FROM email_templates WHERE type = '2fa';

-- Remove 2FA-related email template variables
DELETE FROM email_template_variables WHERE template_id IN (
    SELECT id
FROM email_templates
WHERE type = '2fa'
);

-- Remove 2FA-related email template versions
DELETE FROM email_template_versions WHERE template_id IN (
    SELECT id
FROM email_templates
WHERE type = '2fa'
);

-- Remove 2FA-related email logs
DELETE FROM email_logs WHERE type = '2fa';

-- Update email_logs table to remove '2fa' from the type constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check 
    CHECK (type IN ('promotional', 'notification', 'admin'));

-- Update the handle_new_user function to remove two_factor_enabled
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles
        (id, email, balance, daily_login_streak, has_received_welcome_bonus, created_at, updated_at)
    VALUES
        (
            NEW.id,
            NEW.email,
            0, -- Explicitly set balance to 0
            0, -- Set daily login streak to 0
            false, -- Set welcome bonus flag to false
            NEW.created_at,
            NEW.updated_at
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user
() IS 'Creates profile for new users without 2FA';
