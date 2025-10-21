-- Remove duplicate admin email trigger for profile claims
-- The handle_player_claim function already sends the admin email,
-- so we don't need the trigger to send it again

DROP TRIGGER IF EXISTS admin_profile_claim_email_trigger
ON players;

-- Keep the function for potential future use, but don't use it for player claims
COMMENT ON FUNCTION trigger_admin_profile_claim_email
() IS 'Trigger function for admin profile claim emails (currently unused - email sent from handle_player_claim instead)';

