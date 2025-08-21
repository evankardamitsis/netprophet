-- Add debugging to bet resolution function to see if notifications are being created
CREATE OR REPLACE FUNCTION resolve_bets_for_match
(match_id_param UUID)
RETURNS void AS $$
DECLARE
    match_result_record RECORD;
    bet_record RECORD;
    prediction_data JSONB;
    bet_outcome TEXT;
    winnings_amount INTEGER;
    user_profile RECORD;
    notification_result TEXT;
BEGIN
    -- Get the match result
    SELECT *
    INTO match_result_record
    FROM match_results
    WHERE match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
    RETURN;
END
IF;

    RAISE NOTICE 'Processing bets for match %', match_id_param;

    -- Process all active bets for this match
    FOR bet_record IN
SELECT *
FROM bets
WHERE match_id = match_id_param
    AND status = 'active'
LOOP
        prediction_data := bet_record.prediction;
        
        RAISE NOTICE 'Processing bet % for user %', bet_record.id, bet_record.user_id;
        
        -- Determine bet outcome based on prediction type
        bet_outcome := determine_bet_outcome
(prediction_data, match_result_record);
        
        RAISE NOTICE 'Bet outcome: %', bet_outcome;

-- Calculate winnings if bet is won
IF bet_outcome = 'won' THEN
            winnings_amount := bet_record.potential_winnings;
        ELSE
            winnings_amount := 0;
END
IF;

        -- Update bet status
        UPDATE bets
        SET 
            status = bet_outcome,
            outcome = bet_outcome,
            resolved_at = NOW(),
            winnings_paid = winnings_amount
        WHERE id = bet_record.id;

-- If bet is won, update user's wallet
IF bet_outcome = 'won' AND winnings_amount > 0 THEN
-- Get user profile
SELECT *
INTO user_profile
FROM profiles
WHERE id = bet_record.user_id;

IF FOUND THEN
-- Update user's balance and stats
UPDATE profiles
                SET 
                    balance = balance + winnings_amount,
                    total_winnings = total_winnings + winnings_amount,
                    won_bets = won_bets + 1
                WHERE id = bet_record.user_id;

-- Record transaction
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
        'win',
        winnings_amount,
        'Bet winnings: ' || bet_record.description
                );
END
IF;
        ELSIF bet_outcome = 'lost' THEN
-- Update lost bets count
UPDATE profiles
            SET lost_bets = lost_bets + 1
            WHERE id = bet_record.user_id;
END
IF;

        -- Create notification for the user
        RAISE NOTICE 'Creating notification for bet % with outcome % and winnings %', bet_record.id, bet_outcome, winnings_amount;

BEGIN
            PERFORM create_bet_notification
(
                bet_record.user_id,
                bet_record.id,
                bet_outcome,
                winnings_amount
            );
            RAISE NOTICE 'Notification created successfully for bet %', bet_record.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating notification for bet %: %', bet_record.id, SQLERRM;
END;

        RAISE NOTICE 'Resolved bet %: % (winnings: %)', bet_record.id, bet_outcome, winnings_amount;
END LOOP;
END;
$$ LANGUAGE plpgsql;
