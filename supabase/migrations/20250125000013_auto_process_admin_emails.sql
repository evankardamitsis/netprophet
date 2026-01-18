-- Auto-process admin emails when inserted
-- NOTE: This migration adds logging and verification helpers
-- THE MAIN FIX REQUIRES CREATING A DATABASE WEBHOOK IN SUPABASE DASHBOARD
-- See ADMIN_EMAIL_WEBHOOK_SETUP.md for complete setup instructions

-- Add logging to verify admin emails are being created
CREATE OR REPLACE FUNCTION verify_admin_email_logging()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when admin emails are inserted (for debugging)
    IF NEW.type = 'admin' AND NEW.status = 'pending' THEN
        RAISE LOG '[ADMIN EMAIL] Email logged for admin: %, template: %, user_email: %', 
            NEW.to_email, NEW.template, COALESCE(NEW.variables->>'user_email', 'N/A');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log admin email creation (for monitoring)
DROP TRIGGER IF EXISTS verify_admin_email_logging_trigger ON email_logs;
CREATE TRIGGER verify_admin_email_logging_trigger
    AFTER INSERT ON email_logs
    FOR EACH ROW
    WHEN (NEW.type = 'admin' AND NEW.status = 'pending')
    EXECUTE FUNCTION verify_admin_email_logging();

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_admin_email_logging() TO service_role;

COMMENT ON FUNCTION verify_admin_email_logging() IS 'Logs when admin emails are inserted for debugging. The actual email processing requires a database webhook to be configured in Supabase Dashboard.';

-- NOTE: The actual email processing requires a database webhook to be configured
-- in Supabase Dashboard. See ADMIN_EMAIL_WEBHOOK_SETUP.md for instructions.
--
-- This migration only adds logging to help diagnose issues.
-- The webhook must be created manually in the dashboard:
-- 1. Go to Database → Webhooks
-- 2. Create webhook: table=email_logs, event=INSERT, condition: type='admin' AND status='pending'
-- 3. Type: Supabase Edge Function, Function: process-admin-notifications
