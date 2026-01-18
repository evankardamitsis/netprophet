-- Create trigger to automatically send prediction result emails when bets are resolved
-- This ensures that whenever a bet's status changes to 'won' or 'lost', 
-- an email notification is automatically created

-- Function to trigger when bet status changes
CREATE OR REPLACE FUNCTION trigger_bet_resolution_email()
RETURNS TRIGGER AS $$
DECLARE
    user_language TEXT;
BEGIN
    -- Only process when status changes to 'won' or 'lost'
    IF (NEW.status = 'won' OR NEW.status = 'lost') AND 
       (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        
        -- Get user's language preference
        SELECT COALESCE(preferred_language, 'en')
        INTO user_language
        FROM profiles
        WHERE id = NEW.user_id;

        -- Call create_bet_notification which will:
        -- 1. Create in-app notification
        -- 2. Send email via send_prediction_result_email
        BEGIN
            PERFORM create_bet_notification(
                NEW.user_id,
                NEW.id,
                NEW.status,
                COALESCE(NEW.winnings_paid, 0),
                user_language
            );
            
            RAISE LOG 'Bet notification and email created for bet % (status: %)', NEW.id, NEW.status;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the bet update
            RAISE LOG 'Error creating bet notification for bet %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bets table
DROP TRIGGER IF EXISTS trigger_bet_resolution_email ON bets;
CREATE TRIGGER trigger_bet_resolution_email
    AFTER UPDATE OF status ON bets
    FOR EACH ROW
    WHEN ((NEW.status = 'won' OR NEW.status = 'lost') AND (OLD.status IS NULL OR OLD.status != NEW.status))
    EXECUTE FUNCTION trigger_bet_resolution_email();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_bet_resolution_email() TO service_role;

-- Add comment
COMMENT ON FUNCTION trigger_bet_resolution_email() IS 
'Automatically creates bet notification and sends email when bet status changes to won or lost.';
COMMENT ON TRIGGER trigger_bet_resolution_email ON bets IS 
'Triggers email notification when bet is resolved (won or lost).';

-- For existing resolved bets that didn't get emails, we can manually trigger them
-- Run this to send emails for recently resolved bets that don't have emails yet:
-- 
-- SELECT create_bet_notification(
--     b.user_id,
--     b.id,
--     b.status,
--     COALESCE(b.winnings_paid, 0),
--     COALESCE(p.preferred_language, 'en')
-- )
-- FROM bets b
-- JOIN profiles p ON b.user_id = p.id
-- WHERE b.status IN ('won', 'lost')
--   AND b.resolved_at IS NOT NULL
--   AND NOT EXISTS (
--       SELECT 1 
--       FROM email_logs 
--       WHERE type = 'user' 
--         AND template IN ('prediction_result_won', 'prediction_result_lost')
--         AND variables->>'bet_id' = b.id::TEXT
--   )
-- ORDER BY b.resolved_at DESC
-- LIMIT 100;
