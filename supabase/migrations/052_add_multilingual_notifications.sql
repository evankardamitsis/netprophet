-- Add multilingual support to notifications
-- Update the create_bet_notification function to support different languages

CREATE OR REPLACE FUNCTION create_bet_notification(
    user_uuid UUID,
    bet_id UUID,
    bet_status TEXT,
    winnings_amount INTEGER DEFAULT 0,
    user_language TEXT DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
    match_details RECORD;
    player_a_name TEXT;
    player_b_name TEXT;
BEGIN
    -- Get match details from the bet
    SELECT
        m.id as match_id,
        CONCAT(pa.first_name, ' ', pa.last_name) as player_a_name,
        CONCAT(pb.first_name, ' ', pb.last_name) as player_b_name
    INTO match_details
    FROM bets b
        JOIN matches m ON b.match_id = m.id
        JOIN players pa ON m.player_a_id = pa.id
        JOIN players pb ON m.player_b_id = pb.id
    WHERE b.id = bet_id;

    -- Set player names
    player_a_name := COALESCE(match_details.player_a_name, 'Player A');
    player_b_name := COALESCE(match_details.player_b_name, 'Player B');
    
    -- Determine notification content based on bet status and language
    CASE bet_status
        WHEN 'won' THEN
            IF user_language = 'el' THEN
                notification_title := '🎉 Η πρόβλεψη σου κέρδισε!';
                notification_message := CONCAT('Συγχαρητήρια! Η πρόβλεψη σου για ', player_a_name, ' vs ', player_b_name, ' κέρδισε.');
            ELSE
                notification_title := '🎉 Your prediction won!';
                notification_message := CONCAT('Congratulations! Your prediction on ', player_a_name, ' vs ', player_b_name, ' has been won.');
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'winnings', winnings_amount,
                'type', 'bet_won',
                'match_details', jsonb_build_object(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
        WHEN 'lost' THEN
            IF user_language = 'el' THEN
                notification_title := '❌ Το Στοίχημα Έχασε';
                notification_message := CONCAT('Το στοίχημά σου για ', player_a_name, ' vs ', player_b_name, ' έχασε. Καλή τύχη την επόμενη φορά!');
            ELSE
                notification_title := '❌ Bet Lost';
                notification_message := CONCAT('Your bet on ', player_a_name, ' vs ', player_b_name, ' has been lost. Better luck next time!');
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_lost',
                'match_details', jsonb_build_object(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
        ELSE
            IF user_language = 'el' THEN
                notification_title := '📊 Η πρόβλεψη σου επιλύθηκε';
                notification_message := CONCAT('Η πρόβλεψη σου για ', player_a_name, ' vs ', player_b_name, ' επιλύθηκε.');
            ELSE
                notification_title := '📊 Prediction Resolved';
                notification_message := CONCAT('Your prediction on ', player_a_name, ' vs ', player_b_name, ' has been resolved.');
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_resolved',
                'match_details', jsonb_build_object(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
    END CASE;

    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        user_uuid,
        CASE bet_status
            WHEN 'won' THEN 'bet_won'
            WHEN 'lost' THEN 'bet_lost'
            ELSE 'bet_resolved'
        END,
        notification_title,
        notification_message,
        notification_data
    );
END;
$$ LANGUAGE plpgsql;

-- Update the resolve_bets_for_match function to pass user language
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
BEGIN
    -- Get the match result
    SELECT * INTO match_result_record
    FROM match_results
    WHERE match_id = match_id_param
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No match result found for match %', match_id_param;
        RETURN;
    END IF;

    RAISE NOTICE 'Processing bets for match %', match_id_param;

    -- Process all active bets for this match
    FOR bet_record IN
        SELECT * FROM bets
        WHERE match_id = match_id_param AND status = 'active'
    LOOP
        prediction_data := bet_record.prediction;
        
        RAISE NOTICE 'Processing prediction % for user %', bet_record.id, bet_record.user_id;
        
        -- Get user's language preference (default to 'en' if not set)
        SELECT COALESCE(language_preference, 'en') INTO user_language
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
            -- Get user profile
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
            END IF;
        ELSIF bet_outcome = 'lost' THEN
            -- Update lost bets count
            UPDATE profiles
            SET lost_bets = lost_bets + 1
            WHERE id = bet_record.user_id;
        END IF;

        -- Create notification for the user with language preference
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

-- Add language_preference column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'language_preference') THEN
        ALTER TABLE profiles ADD COLUMN language_preference TEXT DEFAULT 'en';
    END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER, TEXT) IS 'Creates a multilingual notification for a user when their prediction is resolved';
