-- Fix tournament pass logic - don't grant access until pass is actually used
-- The pass should only grant access AFTER it's used, not just because it exists

CREATE OR REPLACE FUNCTION check_tournament_access_with_pass
(
    p_user_id UUID,
    p_tournament_id UUID
)
RETURNS TABLE
(
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
    SELECT tournaments.buy_in_fee
    INTO tournament_buy_in
    FROM tournaments
    WHERE tournaments.id = p_tournament_id;

    -- Check if user has tournament pass
    SELECT profiles.has_tournament_pass, profiles.tournament_pass_used
    INTO user_has_pass
    , user_pass_used
    FROM profiles
    WHERE profiles.id = p_user_id;

-- Check if user has purchased access
SELECT EXISTS
(
        SELECT 1
FROM tournament_purchases
WHERE tournament_purchases.user_id = p_user_id AND tournament_purchases.tournament_id = p_tournament_id
    )
INTO user_has_purchase;

-- Return access information
IF user_has_purchase THEN
RETURN QUERY
SELECT TRUE, 'purchase'
::TEXT, tournament_buy_in;
    ELSIF user_has_pass AND NOT user_pass_used AND tournament_buy_in > 0 THEN
-- User has unused pass - don't grant access yet, just indicate pass is available
RETURN QUERY
SELECT FALSE, 'pass_available'
::TEXT, tournament_buy_in;
    ELSE
RETURN QUERY
SELECT FALSE, 'none'
::TEXT, tournament_buy_in;
END
IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
