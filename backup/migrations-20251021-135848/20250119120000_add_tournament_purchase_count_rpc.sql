-- Add RPC function to get tournament purchase counts (bypasses RLS for admin)
CREATE OR REPLACE FUNCTION get_tournament_purchase_count
(p_tournament_id UUID)
RETURNS INTEGER AS $$
DECLARE
    purchase_count INTEGER;
BEGIN
    -- Count tournament purchases for the given tournament
    SELECT COUNT(*)
    INTO purchase_count
    FROM public.tournament_purchases
    WHERE tournament_id = p_tournament_id;

    RETURN COALESCE(purchase_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
