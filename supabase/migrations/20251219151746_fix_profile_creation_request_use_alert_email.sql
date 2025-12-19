-- Fix handle_profile_creation_request to use profile_creation_request template
-- The admin_notifications table was removed in favor of the email-based system
-- This migration is a placeholder - the actual implementation is in 20251219180000
-- which creates send_profile_creation_request_admin_email and updates this function

-- This migration file is kept for reference but the actual implementation
-- is in 20251219180000_update_profile_creation_request_with_form_data.sql
