-- Handle canceled matches by refunding active bets and sending notifications
-- This function will be called when a match status is changed to 'cancelled'

CREATE OR REPLACE FUNCTION handle_canceled_match
(match_id_param UUID)
RETURNS void AS $$
DECLARE
    bet_record RECORD;
    user_profile RECORD;
    user_language TEXT;
    match_details RECORD;
    player_a_name TEXT;
    player_b_name TEXT;
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
BEGIN
    -- Get match details
    SELECT
        m.id as match_id,
        CONCAT(pa.first_name, ' ', pa.last_name) as player_a_name,
        CONCAT(pb.first_name, ' ', pb.last_name) as player_b_name
    INTO match_details
    FROM matches m
        JOIN players pa ON m.player_a_id = pa.id
        JOIN players pb ON m.player_b_id = pb.id
    WHERE m.id = match_id_param;

    -- Set player names
    player_a_name := COALESCE
    (match_details.player_a_name, 'Player A');
player_b_name := COALESCE
(match_details.player_b_name, 'Player B');

    RAISE NOTICE 'Processing canceled match %: % vs %', match_id_param, player_a_name, player_b_name;

    -- Process all active bets for this match
    FOR bet_record IN
SELECT *
FROM bets
WHERE match_id = match_id_param
    AND status = 'active'
LOOP
        RAISE NOTICE 'Processing bet % for user %', bet_record.id, bet_record.user_id;

-- Get user's language preference (default to 'en' if not set)
SELECT COALESCE(language_preference, 'en')
INTO user_language
FROM profiles
WHERE id = bet_record.user_id;

-- Update bet status to cancelled
UPDATE bets
        SET 
            status = 'cancelled',
            outcome = 'cancelled',
            resolved_at = NOW(),
            winnings_paid = bet_record.bet_amount -- Refund the original bet amount
        WHERE id = bet_record.id;

-- Refund the user's bet amount
UPDATE profiles
        SET 
            balance = balance + bet_record.bet_amount
        WHERE id = bet_record.user_id;

-- Record refund transaction
INSERT INTO transactions
    (
    user_id,
    type,
    amount,
    description
    )
VALUES
    (
        bet_record.user_id,
        'refund',
        bet_record.bet_amount,
        'Match cancelled refund: ' || player_a_name || ' vs ' || player_b_name
        );

-- Create notification content based on language
IF user_language = 'el' THEN
            notification_title := '🚫 Ακύρωση Αγώνα';
            notification_message := CONCAT
('Ο αγώνας ', player_a_name, ' vs ', player_b_name, ' ακυρώθηκε. Το στοίχημά σου επιστράφηκε.');
        ELSE
            notification_title := '🚫 Match Cancelled';
            notification_message := CONCAT
('The match ', player_a_name, ' vs ', player_b_name, ' has been cancelled. Your bet has been refunded.');
END
IF;

        notification_data := jsonb_build_object
(
            'bet_id', bet_record.id,
            'match_id', match_details.match_id,
            'refund_amount', bet_record.bet_amount,
            'type', 'match_cancelled',
            'match_details', jsonb_build_object
(
                'player_a', player_a_name,
                'player_b', player_b_name
            )
        );

-- Create notification for the user
INSERT INTO public.notifications
    (
    user_id,
    type,
    title,
    message,
    data
    )
VALUES
    (
        bet_record.user_id,
        'match_cancelled',
        notification_title,
        notification_message,
        notification_data
        );

RAISE NOTICE 'Refunded bet %: % coins to user %', bet_record.id, bet_record.bet_amount, bet_record.user_id;
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically handle canceled matches
CREATE OR REPLACE FUNCTION trigger_handle_canceled_match
()
RETURNS TRIGGER AS $$
BEGIN
    -- If match status changed to 'cancelled', handle the cancellation
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM handle_canceled_match
    (NEW.id);
END
IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_handle_canceled_match
ON matches;
CREATE TRIGGER trigger_handle_canceled_match
    AFTER
UPDATE ON matches
    FOR EACH ROW
EXECUTE FUNCTION trigger_handle_canceled_match
();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_canceled_match
(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_handle_canceled_match
() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION handle_canceled_match
(UUID) IS 'Handles canceled matches by refunding active bets and sending notifications to users';
COMMENT ON FUNCTION trigger_handle_canceled_match
() IS 'Trigger function to automatically handle canceled matches';
