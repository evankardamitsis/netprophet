-- Add tournament buy-in functionality
-- Users must purchase entry to tournaments before placing predictions

-- Add buy_in_fee column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN buy_in_fee INTEGER DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.tournaments.buy_in_fee IS 'Entry fee in coins for the tournament. 0 means free tournament.';

-- Create table to track tournament purchases
CREATE TABLE public.tournament_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    purchase_amount INTEGER NOT NULL,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate purchases
ALTER TABLE public.tournament_purchases 
ADD CONSTRAINT unique_user_tournament_purchase 
UNIQUE (user_id, tournament_id);

-- Enable RLS for tournament_purchases
ALTER TABLE public.tournament_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own tournament purchases
CREATE POLICY "Users can view their own tournament purchases" ON public.tournament_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own tournament purchases
CREATE POLICY "Users can insert their own tournament purchases" ON public.tournament_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can view all tournament purchases
CREATE POLICY "Admins can view all tournament purchases" ON public.tournament_purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Function to check if user has access to a tournament
CREATE OR REPLACE FUNCTION user_has_tournament_access(p_user_id UUID, p_tournament_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    tournament_fee INTEGER;
    has_purchased BOOLEAN;
BEGIN
    -- Get tournament buy-in fee
    SELECT buy_in_fee INTO tournament_fee
    FROM public.tournaments
    WHERE id = p_tournament_id;
    
    -- If tournament not found, deny access
    IF tournament_fee IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If tournament is free (fee = 0), grant access
    IF tournament_fee = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has purchased access to this tournament
    SELECT EXISTS (
        SELECT 1 FROM public.tournament_purchases
        WHERE user_id = p_user_id AND tournament_id = p_tournament_id
    ) INTO has_purchased;
    
    RETURN has_purchased;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase tournament access
CREATE OR REPLACE FUNCTION purchase_tournament_access(p_user_id UUID, p_tournament_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_balance INTEGER
) AS $$
DECLARE
    tournament_fee INTEGER;
    current_balance INTEGER;
    new_balance INTEGER;
    has_purchased BOOLEAN;
BEGIN
    -- Get tournament buy-in fee
    SELECT buy_in_fee INTO tournament_fee
    FROM public.tournaments
    WHERE id = p_tournament_id;
    
    -- If tournament not found
    IF tournament_fee IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Tournament not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- If tournament is free, no purchase needed
    IF tournament_fee = 0 THEN
        RETURN QUERY SELECT TRUE, 'Tournament is free'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if user already has access
    SELECT EXISTS (
        SELECT 1 FROM public.tournament_purchases
        WHERE user_id = p_user_id AND tournament_id = p_tournament_id
    ) INTO has_purchased;
    
    IF has_purchased THEN
        RETURN QUERY SELECT FALSE, 'Already purchased access to this tournament'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Get current user balance
    SELECT balance INTO current_balance
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check if user has enough coins
    IF current_balance < tournament_fee THEN
        RETURN QUERY SELECT FALSE, 'Insufficient balance'::TEXT, current_balance;
        RETURN;
    END IF;
    
    -- Deduct fee from user balance
    new_balance := current_balance - tournament_fee;
    
    UPDATE public.profiles
    SET balance = new_balance
    WHERE id = p_user_id;
    
    -- Record the purchase
    INSERT INTO public.tournament_purchases (user_id, tournament_id, purchase_amount)
    VALUES (p_user_id, p_tournament_id, tournament_fee);
    
    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (p_user_id, 'tournament_entry', -tournament_fee, 'Tournament entry fee');
    
    RETURN QUERY SELECT TRUE, 'Tournament access purchased successfully'::TEXT, new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
