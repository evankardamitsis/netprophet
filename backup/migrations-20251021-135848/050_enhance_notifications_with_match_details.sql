-- Enhance notifications with match details
CREATE OR REPLACE FUNCTION create_bet_notification
(
    user_uuid UUID,
    bet_id UUID,
    bet_status TEXT,
    winnings_amount INTEGER DEFAULT 0
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
    player_a_name := COALESCE
    (match_details.player_a_name, 'Player A');
player_b_name := COALESCE
(match_details.player_b_name, 'Player B');
    
    -- Determine notification content based on bet status
    CASE bet_status
        WHEN 'won' THEN
            notification_title := '🎉 Bet Won!';
            notification_message := CONCAT
('Congratulations! Your bet on ', player_a_name, ' vs ', player_b_name, ' has been won.');
            notification_data := jsonb_build_object
(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'winnings', winnings_amount,
                'type', 'bet_won',
                'match_details', jsonb_build_object
(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
        WHEN 'lost' THEN
            notification_title := '❌ Bet Lost';
            notification_message := CONCAT
('Your bet on ', player_a_name, ' vs ', player_b_name, ' has been lost. Better luck next time!');
            notification_data := jsonb_build_object
(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_lost',
                'match_details', jsonb_build_object
(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
        ELSE
            notification_title := '📊 Bet Resolved';
            notification_message := CONCAT
('Your bet on ', player_a_name, ' vs ', player_b_name, ' has been resolved.');
            notification_data := jsonb_build_object
(
                'bet_id', bet_id,
                'match_id', match_details.match_id,
                'type', 'bet_resolved',
                'match_details', jsonb_build_object
(
                    'player_a', player_a_name,
                    'player_b', player_b_name
                )
            );
END CASE;

-- Insert the notification
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
