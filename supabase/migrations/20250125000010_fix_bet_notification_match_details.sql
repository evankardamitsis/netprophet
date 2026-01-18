-- Fix bet notification to show actual match details instead of "Player A vs Player B"
-- Update create_bet_notification() to handle singles and doubles matches correctly

CREATE OR REPLACE FUNCTION create_bet_notification
(
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
    match_display_text TEXT;
    player_a_name TEXT;
    player_b_name TEXT;
    player_a1_name TEXT;
    player_a2_name TEXT;
    player_b1_name TEXT;
    player_b2_name TEXT;
    tournament_name TEXT;
BEGIN
    -- Get match details including all players and match type
    SELECT 
        m.id as match_id,
        m.match_type,
        t.name as tournament_name,
        pa.first_name || ' ' || pa.last_name as player_a_name,
        pb.first_name || ' ' || pb.last_name as player_b_name,
        pa1.first_name || ' ' || pa1.last_name as player_a1_name,
        pa2.first_name || ' ' || pa2.last_name as player_a2_name,
        pb1.first_name || ' ' || pb1.last_name as player_b1_name,
        pb2.first_name || ' ' || pb2.last_name as player_b2_name
    INTO match_details
    FROM bets b
        JOIN matches m ON b.match_id = m.id
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN players pa ON m.player_a_id = pa.id
        LEFT JOIN players pb ON m.player_b_id = pb.id
        LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
        LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
        LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
        LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE b.id = bet_id;

    -- Build match display text based on match type
    IF match_details.match_type = 'doubles' THEN
        -- For doubles: Show all 4 players
        player_a1_name := COALESCE(match_details.player_a1_name, 'Player A1');
        player_a2_name := COALESCE(match_details.player_a2_name, 'Player A2');
        player_b1_name := COALESCE(match_details.player_b1_name, 'Player B1');
        player_b2_name := COALESCE(match_details.player_b2_name, 'Player B2');
        
        match_display_text := player_a1_name || ' & ' || player_a2_name || ' vs ' || 
                             player_b1_name || ' & ' || player_b2_name;
    ELSE
        -- For singles: Show two players
        player_a_name := COALESCE(match_details.player_a_name, 'Player A');
        player_b_name := COALESCE(match_details.player_b_name, 'Player B');
        
        match_display_text := player_a_name || ' vs ' || player_b_name;
    END IF;

    tournament_name := COALESCE(match_details.tournament_name, '');

    -- Determine notification content based on bet status and language
    CASE bet_status
        WHEN 'won' THEN
            IF user_language = 'el' THEN
                notification_title := '🎉 Η πρόβλεψη σου κέρδισε!';
                notification_message := CONCAT('Συγχαρητήρια! Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' κέρδισε.';
            ELSE
                notification_title := '🎉 Your prediction won!';
                notification_message := CONCAT('Congratulations! Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been won.';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'winnings', winnings_amount,
                'type', 'bet_won',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
                )
            );
        WHEN 'lost' THEN
            IF user_language = 'el' THEN
                notification_title := '❌ Η πρόβλεψη σου έχασε';
                notification_message := CONCAT('Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' έχασε. Καλή τύχη την επόμενη φορά!';
            ELSE
                notification_title := '❌ Your prediction lost';
                notification_message := CONCAT('Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been lost. Better luck next time!';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_lost',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
                )
            );
        ELSE
            IF user_language = 'el' THEN
                notification_title := '📊 Η πρόβλεψη σου επιλύθηκε';
                notification_message := CONCAT('Η πρόβλεψη σου για ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' επιλύθηκε.';
            ELSE
                notification_title := '📊 Prediction Resolved';
                notification_message := CONCAT('Your prediction on ', match_display_text);
                IF tournament_name != '' THEN
                    notification_message := notification_message || CONCAT(' (', tournament_name, ')');
                END IF;
                notification_message := notification_message || ' has been resolved.';
            END IF;
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_resolved',
                'match_details', jsonb_build_object(
                    'match_type', match_details.match_type,
                    'player_a', player_a_name,
                    'player_b', player_b_name,
                    'player_a1', player_a1_name,
                    'player_a2', player_a2_name,
                    'player_b1', player_b1_name,
                    'player_b2', player_b2_name,
                    'tournament_name', tournament_name
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER, TEXT) IS 'Creates a notification for a user when their bet is resolved. Shows actual match details including singles and doubles matches.';
