-- Update the create_bet_notification function to use notification templates
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
    player_a_name TEXT;
    player_b_name TEXT;
    template_record RECORD;
    template_type TEXT;
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
    
    -- Determine template type based on bet status
    CASE bet_status
        WHEN 'won' THEN
            template_type := 'bet_won';
        WHEN 'lost' THEN
            template_type := 'bet_lost';
        ELSE
            template_type := 'bet_resolved';
END CASE;

-- Get notification template
SELECT title, message
INTO template_record
FROM get_notification_template(template_type, user_language);

-- Replace placeholders in the template
notification_title := template_record.title;
    notification_message := template_record.message;
    
    -- Replace {player_a} and {player_b} placeholders
    notification_message := REPLACE
(notification_message, '{player_a}', player_a_name);
    notification_message := REPLACE
(notification_message, '{player_b}', player_b_name);

    -- Build notification data
    notification_data := jsonb_build_object
(
        'bet_id', bet_id,
        'match_id', match_details.match_id,
        'winnings', winnings_amount,
        'type', template_type,
        'match_details', jsonb_build_object
(
            'player_a', player_a_name,
            'player_b', player_b_name
        )
    );

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
        template_type,
        notification_title,
        notification_message,
        notification_data
    );
END;
$$ LANGUAGE plpgsql;
