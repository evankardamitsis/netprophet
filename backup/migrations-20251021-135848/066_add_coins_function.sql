-- Function to add coins to user balance
CREATE OR REPLACE FUNCTION add_coins_to_balance
(user_uuid UUID, coins_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Update the user's balance
    UPDATE profiles
    SET balance = COALESCE(balance, 0) + coins_to_add
    WHERE id = user_uuid;

    -- Check if any rows were affected
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_uuid;
END
IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
