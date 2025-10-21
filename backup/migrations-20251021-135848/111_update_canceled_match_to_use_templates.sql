-- Update the handle_canceled_match function to use notification templates
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
    template_record RECORD;
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

-- Get notification template
SELECT title, message
INTO template_record
FROM get_notification_template('match_cancelled', user_language);

-- Replace placeholders in the template
notification_title := template_record.title;
        notification_message := template_record.message;
        
        -- Replace {player_a} and {player_b} placeholders
        notification_message := REPLACE
(notification_message, '{player_a}', player_a_name);
        notification_message := REPLACE
(notification_message, '{player_b}', player_b_name);

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
