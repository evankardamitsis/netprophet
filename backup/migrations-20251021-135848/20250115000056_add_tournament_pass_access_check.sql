-- Add tournament pass access check function
-- This function checks if user has access via purchase OR tournament pass

CREATE OR REPLACE FUNCTION check_tournament_access_with_pass(
    p_user_id UUID,
    p_tournament_id UUID
)
RETURNS TABLE(
    has_access BOOLEAN,
    access_type TEXT,
    buy_in_fee INTEGER
) AS $$
DECLARE
    tournament_buy_in INTEGER;
    user_has_pass BOOLEAN;
    user_pass_used BOOLEAN;
    user_has_purchase BOOLEAN;
BEGIN
    -- Get tournament buy-in fee
    SELECT tournaments.buy_in_fee INTO tournament_buy_in
    FROM tournaments
    WHERE tournaments.id = p_tournament_id;
    
    -- Check if user has tournament pass
    SELECT profiles.has_tournament_pass, profiles.tournament_pass_used
    INTO user_has_pass, user_pass_used
    FROM profiles
    WHERE profiles.id = p_user_id;
    
    -- Check if user has purchased access
    SELECT EXISTS(
        SELECT 1 FROM tournament_purchases
        WHERE user_id = p_user_id AND tournament_id = p_tournament_id
    ) INTO user_has_purchase;
    
    -- Return access information
    IF user_has_purchase THEN
        RETURN QUERY SELECT TRUE, 'purchase'::TEXT, tournament_buy_in;
    ELSIF user_has_pass AND NOT user_pass_used AND tournament_buy_in > 0 THEN
        RETURN QUERY SELECT TRUE, 'pass'::TEXT, tournament_buy_in;
    ELSE
        RETURN QUERY SELECT FALSE, 'none'::TEXT, tournament_buy_in;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to use tournament pass for a specific tournament
CREATE OR REPLACE FUNCTION use_tournament_pass_for_tournament(
    p_user_id UUID,
    p_tournament_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_has_pass BOOLEAN;
    user_pass_used BOOLEAN;
    tournament_buy_in INTEGER;
BEGIN
    -- Check if user has an unused pass
    SELECT profiles.has_tournament_pass, profiles.tournament_pass_used
    INTO user_has_pass, user_pass_used
    FROM profiles
    WHERE profiles.id = p_user_id;
    
    -- Get tournament buy-in fee
    SELECT tournaments.buy_in_fee INTO tournament_buy_in
    FROM tournaments
    WHERE tournaments.id = p_tournament_id;
    
    -- If no pass, already used, or tournament is free, return false
    IF NOT user_has_pass OR user_pass_used OR tournament_buy_in = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Mark pass as used
    UPDATE profiles
    SET tournament_pass_used = true
    WHERE profiles.id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
