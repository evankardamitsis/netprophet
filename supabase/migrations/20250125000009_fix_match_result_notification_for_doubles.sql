-- Fix match result notification to handle doubles matches correctly
-- Update notify_match_result_entered() to show actual match info instead of "Player A vs Player B"

CREATE OR REPLACE FUNCTION notify_match_result_entered()
RETURNS TRIGGER AS $$
DECLARE
    match_info RECORD;
    tournament_name TEXT;
    match_display_text TEXT;
    player_a_name TEXT;
    player_b_name TEXT;
    player_a1_name TEXT;
    player_a2_name TEXT;
    player_b1_name TEXT;
    player_b2_name TEXT;
    match_type_value TEXT;
BEGIN
    -- Get match and tournament info including match_type and all players
    SELECT 
        m.id,
        m.match_type,
        t.name as tournament_name,
        pa.first_name || ' ' || pa.last_name as player_a_name,
        pb.first_name || ' ' || pb.last_name as player_b_name,
        pa1.first_name || ' ' || pa1.last_name as player_a1_name,
        pa2.first_name || ' ' || pa2.last_name as player_a2_name,
        pb1.first_name || ' ' || pb1.last_name as player_b1_name,
        pb2.first_name || ' ' || pb2.last_name as player_b2_name
    INTO match_info
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    LEFT JOIN players pa ON m.player_a_id = pa.id
    LEFT JOIN players pb ON m.player_b_id = pb.id
    LEFT JOIN players pa1 ON m.player_a1_id = pa1.id
    LEFT JOIN players pa2 ON m.player_a2_id = pa2.id
    LEFT JOIN players pb1 ON m.player_b1_id = pb1.id
    LEFT JOIN players pb2 ON m.player_b2_id = pb2.id
    WHERE m.id = NEW.match_id;

    -- Build match display text based on match type
    IF match_info.match_type = 'doubles' THEN
        -- For doubles: Show all 4 players or team names
        player_a1_name := COALESCE(match_info.player_a1_name, 'Player A1');
        player_a2_name := COALESCE(match_info.player_a2_name, 'Player A2');
        player_b1_name := COALESCE(match_info.player_b1_name, 'Player B1');
        player_b2_name := COALESCE(match_info.player_b2_name, 'Player B2');
        
        match_display_text := player_a1_name || ' & ' || player_a2_name || ' vs ' || 
                             player_b1_name || ' & ' || player_b2_name;
    ELSE
        -- For singles: Show two players
        player_a_name := COALESCE(match_info.player_a_name, 'Player A');
        player_b_name := COALESCE(match_info.player_b_name, 'Player B');
        
        match_display_text := player_a_name || ' vs ' || player_b_name;
    END IF;

    -- Create notification with proper match display
    PERFORM create_admin_notification(
        'match_result_entered',
        'Match Result Entered',
        'Match result entered: ' || match_display_text || 
        COALESCE(' (' || match_info.tournament_name || ')', ''),
        'info',
        jsonb_build_object(
            'match_id', NEW.match_id,
            'match_result_id', NEW.id,
            'tournament_name', match_info.tournament_name,
            'match_result', NEW.match_result,
            'winner_id', NEW.winner_id,
            'match_winner_team', NEW.match_winner_team,
            'match_type', match_info.match_type
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating match_result_entered notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION notify_match_result_entered() IS 'Creates admin notification when a match result is entered. Handles both singles and doubles matches correctly.';
