-- Fix potential_winnings field type to DECIMAL(10,2)
-- This migration ensures the potential_winnings field can accept decimal values like 2.35

-- Alter the potential_winnings column to DECIMAL(10,2)
ALTER TABLE public.bets ALTER COLUMN potential_winnings TYPE
DECIMAL
(10,2);
