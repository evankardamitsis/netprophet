-- Update bet resolution to send email notifications via webhook system
-- This adds email notifications when bets are won or lost

CREATE OR REPLACE FUNCTION resolve_bets_for_match(match_id_param UUID)
RETURNS void AS $$
DECLARE
    match_result_record RECORD;
    bet_record RECORD;
    prediction_data JSONB;
    bet_outcome TEXT;
    winnings_amount INTEGER;
    user_profile RECORD;
    user_language TEXT;
    user_email TEXT;
    match_name TEXT;
BEGIN
    -- Get the match result with player names
    SELECT 
        mr.*,
        CONCAT(pa.first_name, ' ', pa.last_name, ' vs ', pb.first_name, ' ', pb.last_name) as match_name
    INTO match_result_record
    FROM match_results mr
    JOIN matches m ON mr.match_id = m.id
    JOIN players pa ON m.player_a_id = pa.id
    JOIN players pb ON m.player_b_id = pb.id
    WHERE mr.match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
        RETURN;
    END IF;

    match_name := match_result_record.match_name;
    RAISE NOTICE 'Processing bets for match %: %', match_id_param, match_name;

    -- Process all active bets for this match
    FOR bet_record IN
        SELECT * FROM bets
        WHERE match_id = match_id_param AND status = 'active'
    LOOP
        prediction_data := bet_record.prediction;
        
        RAISE NOTICE 'Processing prediction % for user %', bet_record.id, bet_record.user_id;
        
        -- Get user's language preference and email
        SELECT 
            COALESCE(preferred_language, 'en'),
            email
        INTO user_language, user_email
        FROM profiles
        WHERE id = bet_record.user_id;
        
        -- Determine bet outcome based on prediction type
        bet_outcome := determine_bet_outcome(prediction_data, match_result_record);
        
        RAISE NOTICE 'Prediction outcome: %', bet_outcome;

        -- Calculate winnings if bet is won
        IF bet_outcome = 'won' THEN
            winnings_amount := bet_record.potential_winnings;
        ELSE
            winnings_amount := 0;
        END IF;

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
            -- Get full user profile
            SELECT * INTO user_profile
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
                INSERT INTO transactions (
                    user_id,
                    type,
                    amount,
                    description
                ) VALUES (
                    bet_record.user_id,
                    'win',
                    winnings_amount,
                    'Bet winnings: ' || bet_record.description
                );
                
                -- Send winnings email notification
                BEGIN
                    PERFORM send_winnings_email(
                        bet_record.user_id,
                        user_email,
                        match_name,
                        bet_record.description,
                        winnings_amount,
                        user_language
                    );
                    RAISE NOTICE 'Winnings email sent for bet %', bet_record.id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Error sending winnings email for bet %: %', bet_record.id, SQLERRM;
                END;
            END IF;
        ELSIF bet_outcome = 'lost' THEN
            -- Update lost bets count
            UPDATE profiles
            SET lost_bets = lost_bets + 1
            WHERE id = bet_record.user_id;
        END IF;

        -- Create in-app notification for the user with language preference
        RAISE NOTICE 'Creating notification for bet % with outcome % and winnings % in language %', bet_record.id, bet_outcome, winnings_amount, user_language;

        BEGIN
            PERFORM create_bet_notification(
                bet_record.user_id,
                bet_record.id,
                bet_outcome,
                winnings_amount,
                user_language
            );
            RAISE NOTICE 'Notification created successfully for prediction %', bet_record.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating notification for prediction %: %', bet_record.id, SQLERRM;
        END;

        RAISE NOTICE 'Resolved prediction %: % (winnings: %)', bet_record.id, bet_outcome, winnings_amount;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolve_bets_for_match(UUID) IS 'Resolves all bets for a match and sends email notifications for winnings';

